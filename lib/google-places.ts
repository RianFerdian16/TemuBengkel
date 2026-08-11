import { getGoogleMapsServerKey } from "@/lib/config"
import { type WorkshopDetail, type Workshop, type WorkshopPhoto, haversineDistanceMeters } from "@/lib/workshops"

const PLACES_BASE = "https://places.googleapis.com/v1"

function apiKey() {
  const key = getGoogleMapsServerKey()
  if (!key) throw new Error("Google Maps server API key belum dikonfigurasi")
  return key
}

function normalizePhotos(photos: unknown): WorkshopPhoto[] {
  if (!Array.isArray(photos)) return []
  return photos
    .map((photo: any) => ({
      name: String(photo?.name || ""),
      googleMapsUri: photo?.googleMapsUri || undefined,
      authorAttributions: Array.isArray(photo?.authorAttributions)
        ? photo.authorAttributions.map((author: any) => ({
            displayName: author?.displayName || undefined,
            uri: author?.uri || undefined,
            photoUri: author?.photoUri || undefined,
          }))
        : [],
    }))
    .filter((photo) => Boolean(photo.name))
}

function mapGooglePlace(place: any, origin?: { latitude: number; longitude: number }): Workshop {
  const latitude = typeof place?.location?.latitude === "number" ? place.location.latitude : undefined
  const longitude = typeof place?.location?.longitude === "number" ? place.location.longitude : undefined
  const distanceMeters =
    origin && typeof latitude === "number" && typeof longitude === "number"
      ? haversineDistanceMeters(origin, { latitude, longitude })
      : undefined

  return {
    id: String(place.id || ""),
    googlePlaceId: String(place.id || ""),
    name: place?.displayName?.text || "Bengkel motor",
    address: place.formattedAddress,
    phone: place.nationalPhoneNumber || place.internationalPhoneNumber,
    latitude,
    longitude,
    rating: typeof place.rating === "number" ? place.rating : undefined,
    reviewCount: typeof place.userRatingCount === "number" ? place.userRatingCount : undefined,
    openingHours: Array.isArray(place?.regularOpeningHours?.weekdayDescriptions)
      ? place.regularOpeningHours.weekdayDescriptions
      : undefined,
    isOpenNow:
      typeof place?.currentOpeningHours?.openNow === "boolean" ? place.currentOpeningHours.openNow : undefined,
    photoNames: normalizePhotos(place.photos).map((photo) => photo.name),
    photos: normalizePhotos(place.photos),
    distanceMeters,
    googleMapsUri: place.googleMapsUri,
    websiteUri: place.websiteUri,
    source: "google",
  }
}

export async function searchGoogleWorkshops(options: {
  query?: string
  locationText?: string
  latitude?: number
  longitude?: number
  radiusMeters?: number
}) {
  const service = options.query?.trim()
  const locationText = options.locationText?.trim()
  let textQuery = service ? `${service} bengkel motor` : "bengkel motor"
  if (locationText && typeof options.latitude !== "number") textQuery += ` di ${locationText}`

  const body: Record<string, unknown> = {
    textQuery,
    maxResultCount: 20,
    languageCode: "id",
    regionCode: "ID",
  }

  if (typeof options.latitude === "number" && typeof options.longitude === "number") {
    body.locationBias = {
      circle: {
        center: { latitude: options.latitude, longitude: options.longitude },
        radius: Math.min(Math.max(options.radiusMeters || 10_000, 1000), 50_000),
      },
    }
  }

  const response = await fetch(`${PLACES_BASE}/places:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey(),
      "X-Goog-FieldMask": [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.location",
        "places.rating",
        "places.userRatingCount",
        "places.currentOpeningHours",
        "places.regularOpeningHours",
        "places.nationalPhoneNumber",
        "places.googleMapsUri",
        "places.photos",
      ].join(","),
    },
    body: JSON.stringify(body),
    cache: "no-store",
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`Google Places gagal (${response.status}): ${message.slice(0, 500)}`)
  }

  const payload = (await response.json()) as { places?: unknown[] }
  const origin =
    typeof options.latitude === "number" && typeof options.longitude === "number"
      ? { latitude: options.latitude, longitude: options.longitude }
      : undefined

  const workshops = (payload.places || []).map((place) => mapGooglePlace(place, origin))
  if (origin) workshops.sort((a, b) => (a.distanceMeters ?? Number.MAX_VALUE) - (b.distanceMeters ?? Number.MAX_VALUE))
  return workshops
}

export async function getGoogleWorkshopDetail(placeId: string): Promise<WorkshopDetail | null> {
  if (!placeId) return null
  const fieldMask = [
    "id",
    "displayName",
    "formattedAddress",
    "location",
    "rating",
    "userRatingCount",
    "currentOpeningHours",
    "regularOpeningHours",
    "nationalPhoneNumber",
    "internationalPhoneNumber",
    "googleMapsUri",
    "websiteUri",
    "photos",
    "reviews",
  ].join(",")

  const response = await fetch(
    `${PLACES_BASE}/places/${encodeURIComponent(placeId)}?languageCode=id&regionCode=ID`,
    {
      headers: {
        "X-Goog-Api-Key": apiKey(),
        "X-Goog-FieldMask": fieldMask,
      },
      cache: "no-store",
    },
  )

  if (response.status === 404) return null
  if (!response.ok) {
    const message = await response.text()
    throw new Error(`Google Place Details gagal (${response.status}): ${message.slice(0, 500)}`)
  }

  const place = await response.json()
  const base = mapGooglePlace(place)
  return {
    ...base,
    reviews: Array.isArray(place.reviews)
      ? place.reviews.slice(0, 5).map((review: any) => ({
          rating: typeof review.rating === "number" ? review.rating : undefined,
          text: review?.text?.text,
          relativePublishTimeDescription: review.relativePublishTimeDescription,
          authorName: review?.authorAttribution?.displayName,
          authorUri: review?.authorAttribution?.uri,
          authorPhotoUri: review?.authorAttribution?.photoUri,
          googleMapsUri: review?.googleMapsUri,
        }))
      : [],
  }
}

export async function fetchGooglePhoto(photoName: string, maxWidthPx = 1200) {
  const width = Math.min(Math.max(maxWidthPx, 200), 1600)
  const response = await fetch(
    `${PLACES_BASE}/${photoName}/media?maxWidthPx=${width}&key=${encodeURIComponent(apiKey())}`,
    { redirect: "follow", cache: "no-store" },
  )
  if (!response.ok) throw new Error(`Google Place Photo gagal (${response.status})`)
  return response
}
