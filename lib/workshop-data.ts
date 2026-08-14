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
    openingHours: owner.openingHours?.length ? owner.openingHours : google.openingHours,
    isOpenNow: owner.openingHours?.length ? owner.isOpenNow : google.isOpenNow,
    description: owner.description || google.description,
    mechanicCallAvailable: owner.mechanicCallAvailable,
  }
}

function normalizeSearchText(value: string | undefined) {
  return (value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("id-ID")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function matchesOwnerText(item: Workshop, value: string | undefined) {
  const needle = normalizeSearchText(value)
  if (!needle) return true

  const haystack = normalizeSearchText([
    item.name,
    item.address,
    item.description,
    ...(item.services || []),
  ].filter(Boolean).join(" "))

  // Exact phrase first, then token matching so searches like
  // "Bengkel Suka Ria" and "Cikarang Selatan" remain forgiving.
  if (haystack.includes(needle)) return true
  const tokens = needle.split(/\s+/).filter((token) => token.length >= 2)
  return tokens.length > 0 && tokens.every((token) => haystack.includes(token))
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
  const hasCoordinates = typeof options.latitude === "number" && typeof options.longitude === "number"
  const hasManualText = Boolean(options.locationText?.trim())

  // A service/name query should also apply to owner-created listings.
  if (options.query?.trim()) {
    owners = owners.filter((item) => matchesOwnerText(item, options.query))
  }

  if (hasCoordinates) {
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
        // Owner-only rows may be appended when their approved coordinates are nearby.
        if (typeof item.distanceMeters !== "number") return false
        return item.distanceMeters <= (options.radiusMeters || 10_000)
      })
  } else if (hasManualText) {
    // V27: manual search is also a direct search over APPROVED owner listings.
    // Previously these rows were only allowed to enrich a Google Place ID, which
    // meant an approved owner-only workshop could never be found by its own name.
    owners = owners.filter((item) => {
      if (item.googlePlaceId && googlePlaceIds.has(item.googlePlaceId)) return true
      return matchesOwnerText(item, options.locationText)
    })
  } else {
    // No location context: do not append the whole owner database globally.
    owners = owners.filter((item) => Boolean(item.googlePlaceId && googlePlaceIds.has(item.googlePlaceId)))
  }

  const merged = mergeWorkshops(google, owners)
  if (hasCoordinates) {
    merged.sort((a, b) => (a.distanceMeters ?? Number.MAX_VALUE) - (b.distanceMeters ?? Number.MAX_VALUE))
  } else if (hasManualText) {
    const needle = normalizeSearchText(options.locationText)
    merged.sort((a, b) => {
      const aName = normalizeSearchText(a.name)
      const bName = normalizeSearchText(b.name)
      const aExact = aName === needle ? 0 : aName.includes(needle) ? 1 : a.source === "owner" ? 2 : 3
      const bExact = bName === needle ? 0 : bName.includes(needle) ? 1 : b.source === "owner" ? 2 : 3
      return aExact - bExact
    })
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
