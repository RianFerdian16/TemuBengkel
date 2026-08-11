export type WorkshopStatus = "pending" | "approved" | "rejected"

export type WorkshopPhoto = {
  name: string
  googleMapsUri?: string
  authorAttributions?: { displayName?: string; uri?: string; photoUri?: string }[]
}

export type Workshop = {
  id: string
  ownerListingId?: string
  ownerId?: string
  googlePlaceId?: string
  name: string
  address?: string
  phone?: string
  whatsapp?: string
  latitude?: number
  longitude?: number
  rating?: number
  reviewCount?: number
  openingHours?: string[]
  isOpenNow?: boolean
  services?: string[]
  photoNames?: string[]
  photos?: WorkshopPhoto[]
  description?: string
  mechanicCallAvailable?: boolean
  status?: WorkshopStatus
  distanceMeters?: number
  googleMapsUri?: string
  websiteUri?: string
  source: "google" | "owner"
}

export type GoogleReview = {
  rating?: number
  text?: string
  relativePublishTimeDescription?: string
  authorName?: string
  authorUri?: string
  authorPhotoUri?: string
  googleMapsUri?: string
}

export type WorkshopDetail = Workshop & {
  reviews?: GoogleReview[]
}

export function mapsUrl(workshop: Workshop) {
  if (workshop.googleMapsUri) return workshop.googleMapsUri
  if (workshop.googlePlaceId) {
    const query = workshop.name || "Bengkel motor"
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}&query_place_id=${encodeURIComponent(workshop.googlePlaceId)}`
  }
  if (typeof workshop.latitude === "number" && typeof workshop.longitude === "number") {
    return `https://www.google.com/maps/search/?api=1&query=${workshop.latitude},${workshop.longitude}`
  }
  if (workshop.address) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(workshop.address)}`
  return null
}

export function whatsappUrl(phone?: string) {
  if (!phone) return null
  let normalized = phone.replace(/\D/g, "")
  if (normalized.startsWith("0")) normalized = `62${normalized.slice(1)}`
  if (normalized.startsWith("620")) normalized = `62${normalized.slice(3)}`
  return normalized ? `https://wa.me/${normalized}` : null
}

export function telUrl(phone?: string) {
  if (!phone) return null
  const normalized = phone.replace(/[^0-9+]/g, "")
  return normalized ? `tel:${normalized}` : null
}

export function haversineDistanceMeters(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
) {
  const toRad = (value: number) => (value * Math.PI) / 180
  const earthRadius = 6_371_000
  const dLat = toRad(to.latitude - from.latitude)
  const dLng = toRad(to.longitude - from.longitude)
  const lat1 = toRad(from.latitude)
  const lat2 = toRad(to.latitude)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * earthRadius * Math.asin(Math.sqrt(a))
}

export function formatDistance(distanceMeters?: number) {
  if (typeof distanceMeters !== "number" || Number.isNaN(distanceMeters)) return null
  if (distanceMeters < 1000) return `${Math.max(50, Math.round(distanceMeters / 50) * 50)} m`
  return `${(distanceMeters / 1000).toFixed(distanceMeters < 10_000 ? 1 : 0)} km`
}

export function mergeWorkshops(primary: Workshop[], ownerListings: Workshop[]) {
  const ownerByPlaceId = new Map(
    ownerListings.filter((item) => item.googlePlaceId).map((item) => [item.googlePlaceId as string, item]),
  )

  const merged = primary.map((item) => {
    const owner = item.googlePlaceId ? ownerByPlaceId.get(item.googlePlaceId) : undefined
    if (!owner) return item
    return {
      ...item,
      ownerListingId: owner.id,
      whatsapp: owner.whatsapp || item.whatsapp,
      services: owner.services?.length ? owner.services : item.services,
      description: owner.description || item.description,
      mechanicCallAvailable: owner.mechanicCallAvailable,
    }
  })

  const primaryPlaceIds = new Set(primary.map((item) => item.googlePlaceId).filter(Boolean))
  for (const listing of ownerListings) {
    if (listing.googlePlaceId && primaryPlaceIds.has(listing.googlePlaceId)) continue
    merged.push({ ...listing, id: `owner:${listing.id}` })
  }

  return merged
}
