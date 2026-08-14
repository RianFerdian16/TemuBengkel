import { integrationStatus } from "@/lib/config"
import { geocodeSearchContext } from "@/lib/geocode"
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

  if (haystack.includes(needle)) return true
  const tokens = needle.split(/\s+/).filter((token) => token.length >= 2)
  return tokens.length > 0 && tokens.every((token) => haystack.includes(token))
}

function withDistance(item: Workshop, origin?: { latitude: number; longitude: number }) {
  if (!origin || typeof item.latitude !== "number" || typeof item.longitude !== "number") return item
  return {
    ...item,
    distanceMeters: haversineDistanceMeters(origin, { latitude: item.latitude, longitude: item.longitude }),
  }
}

export type PublicSearchResult = {
  workshops: Workshop[]
  origin?: { latitude: number; longitude: number; label?: string; source: "device" | "query" }
  capped: boolean
  warning?: string
}

export async function searchWorkshops(options: {
  query?: string
  locationText?: string
  latitude?: number
  longitude?: number
  radiusMeters?: number
}): Promise<PublicSearchResult> {
  const searchText = (options.query || options.locationText || "").trim()
  const hasCoordinates = typeof options.latitude === "number" && typeof options.longitude === "number"
  const requestedOrigin = hasCoordinates
    ? { latitude: options.latitude as number, longitude: options.longitude as number }
    : undefined
  const radiusMeters = Math.min(Math.max(options.radiusMeters || 15_000, 1_000), 50_000)

  const googlePromise = integrationStatus.googleMaps
    ? searchGoogleWorkshops({
        query: searchText || undefined,
        latitude: requestedOrigin?.latitude,
        longitude: requestedOrigin?.longitude,
        radiusMeters,
      })
    : Promise.resolve([] as Workshop[])

  const ownersPromise = integrationStatus.database
    ? getPublicOwnerWorkshops()
    : Promise.resolve([] as Workshop[])

  const contextPromise = !requestedOrigin && searchText
    ? geocodeSearchContext(searchText).catch(() => null)
    : Promise.resolve(null)

  const [googleResult, ownersResult, contextResult] = await Promise.allSettled([
    googlePromise,
    ownersPromise,
    contextPromise,
  ])

  const google: Workshop[] = googleResult.status === "fulfilled" ? (googleResult.value as Workshop[]) : []
  let owners: Workshop[] = ownersResult.status === "fulfilled" ? (ownersResult.value as Workshop[]) : []
  const context = contextResult.status === "fulfilled"
    ? (contextResult.value as { latitude: number; longitude: number; matchedAddress: string } | null)
    : null

  if (googleResult.status === "rejected" && ownersResult.status === "rejected") {
    throw googleResult.reason instanceof Error ? googleResult.reason : new Error("Pencarian bengkel sedang tidak tersedia.")
  }

  const origin = requestedOrigin
    ? { ...requestedOrigin, source: "device" as const }
    : context
      ? { latitude: context.latitude, longitude: context.longitude, label: context.matchedAddress, source: "query" as const }
      : undefined

  const googleWithDistance = google.map((item) => withDistance(item, origin))
  const googlePlaceIds = new Set(googleWithDistance.map((item) => item.googlePlaceId).filter(Boolean))

  owners = owners.map((item) => withDistance(item, origin))

  if (searchText) {
    const directOwnerMatches = owners.filter((item) => matchesOwnerText(item, searchText))
    const hasDirectOwnerMatch = directOwnerMatches.length > 0
    owners = owners.filter((item) => {
      if (item.googlePlaceId && googlePlaceIds.has(item.googlePlaceId)) return true
      if (matchesOwnerText(item, searchText)) return true
      // If the text directly matches a TemuBengkel listing, keep the result precise.
      // Only broaden to nearby owner listings when the text behaves like an area/address query.
      if (hasDirectOwnerMatch) return false
      return Boolean(origin && typeof item.distanceMeters === "number" && item.distanceMeters <= radiusMeters)
    })
  } else if (origin) {
    owners = owners.filter((item) => {
      if (item.googlePlaceId && googlePlaceIds.has(item.googlePlaceId)) return true
      return typeof item.distanceMeters === "number" && item.distanceMeters <= radiusMeters
    })
  } else {
    owners = owners.filter((item) => Boolean(item.googlePlaceId && googlePlaceIds.has(item.googlePlaceId)))
  }

  const merged = mergeWorkshops(googleWithDistance, owners)
  const needle = normalizeSearchText(searchText)

  merged.sort((a, b) => {
    if (needle) {
      const aName = normalizeSearchText(a.name)
      const bName = normalizeSearchText(b.name)
      const aRank = aName === needle ? 0 : aName.includes(needle) ? 1 : matchesOwnerText(a, searchText) ? 2 : 3
      const bRank = bName === needle ? 0 : bName.includes(needle) ? 1 : matchesOwnerText(b, searchText) ? 2 : 3
      if (aRank !== bRank) return aRank - bRank
    }
    return (a.distanceMeters ?? Number.MAX_VALUE) - (b.distanceMeters ?? Number.MAX_VALUE)
  })

  const warnings: string[] = []
  if (googleResult.status === "rejected" && merged.length) warnings.push("Sebagian data Google Maps sedang tidak tersedia; listing TemuBengkel tetap ditampilkan.")
  if (ownersResult.status === "rejected" && googleWithDistance.length) warnings.push("Listing pemilik TemuBengkel sedang tidak tersedia; hasil Google Maps tetap ditampilkan.")

  return {
    workshops: merged,
    origin,
    capped: googleWithDistance.length >= 20,
    warning: warnings[0],
  }
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
