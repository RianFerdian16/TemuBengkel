import { integrationStatus } from "@/lib/config"
import { getGoogleWorkshopDetail, searchGoogleWorkshops } from "@/lib/google-places"
import {
  getPublicOwnerWorkshopById,
  getPublicOwnerWorkshopByPlaceId,
  getPublicOwnerWorkshops,
} from "@/lib/workshop-repository"
import { haversineDistanceMeters, mergeWorkshops, type Workshop, type WorkshopDetail } from "@/lib/workshops"

function enrichWithOwner<T extends Workshop>(google: T, owner?: Workshop | null): T {
  if (!owner) return google
  return {
    ...google,
    ownerListingId: owner.id,
    whatsapp: owner.whatsapp || google.whatsapp,
    services: owner.services?.length ? owner.services : google.services,
    description: owner.description || google.description,
    mechanicCallAvailable: owner.mechanicCallAvailable,
  }
}

export async function searchWorkshops(options: {
  query?: string
  locationText?: string
  latitude?: number
  longitude?: number
  radiusMeters?: number
}) {
  const google = await searchGoogleWorkshops(options)
  let owners: Workshop[] = []
  if (integrationStatus.database) {
    owners = await getPublicOwnerWorkshops().catch(() => [])
  }

  const googlePlaceIds = new Set(google.map((item) => item.googlePlaceId).filter(Boolean))

  if (typeof options.latitude === "number" && typeof options.longitude === "number") {
    owners = owners
      .map((item) => {
        if (typeof item.latitude !== "number" || typeof item.longitude !== "number") return item
        return {
          ...item,
          distanceMeters: haversineDistanceMeters(
            { latitude: options.latitude as number, longitude: options.longitude as number },
            { latitude: item.latitude, longitude: item.longitude },
          ),
        }
      })
      .filter((item) => {
        // Always retain a linked owner row when it enriches a Google result.
        if (item.googlePlaceId && googlePlaceIds.has(item.googlePlaceId)) return true
        // Owner-only rows may be appended only when their coordinates are genuinely nearby.
        if (typeof item.distanceMeters !== "number") return false
        return item.distanceMeters <= (options.radiusMeters || 10_000)
      })
  } else {
    // Without coordinates, owner rows are used only to enrich Google results, never appended globally.
    owners = owners.filter((item) => Boolean(item.googlePlaceId && googlePlaceIds.has(item.googlePlaceId)))
  }

  const merged = mergeWorkshops(google, owners)
  if (typeof options.latitude === "number" && typeof options.longitude === "number") {
    merged.sort((a, b) => (a.distanceMeters ?? Number.MAX_VALUE) - (b.distanceMeters ?? Number.MAX_VALUE))
  }
  return merged
}

export async function getWorkshopDetail(id: string): Promise<WorkshopDetail | null> {
  if (id.startsWith("owner:")) {
    if (!integrationStatus.database) return null
    const owner = await getPublicOwnerWorkshopById(id.slice("owner:".length)).catch(() => null)
    if (!owner) return null
    if (owner.googlePlaceId && integrationStatus.googleMaps) {
      const google = await getGoogleWorkshopDetail(owner.googlePlaceId).catch(() => null)
      if (google) return enrichWithOwner(google, owner)
    }
    return owner
  }

  if (!integrationStatus.googleMaps) return null
  const google = await getGoogleWorkshopDetail(id).catch(() => null)
  if (!google) return null
  if (!integrationStatus.database) return google
  const owner = await getPublicOwnerWorkshopByPlaceId(id).catch(() => null)
  return enrichWithOwner(google, owner)
}
