import { getGoogleMapsServerKey } from "@/lib/config"
import {
  type GoogleReview,
  type PlaceAttribution,
  type WorkshopDetail,
  type Workshop,
  type WorkshopPhoto,
  haversineDistanceMeters,
} from "@/lib/workshops"

const PLACES_BASE = "https://places.googleapis.com/v1"
const LEGACY_DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json"
const LEGACY_PHOTO_URL = "https://maps.googleapis.com/maps/api/place/photo"
const LEGACY_PREFIX = "legacy:"

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
      flagContentUri: photo?.flagContentUri || undefined,
      widthPx: typeof photo?.widthPx === "number" ? photo.widthPx : undefined,
      heightPx: typeof photo?.heightPx === "number" ? photo.heightPx : undefined,
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

function normalizeNewReviews(reviews: unknown): GoogleReview[] {
  if (!Array.isArray(reviews)) return []
  return reviews.slice(0, 5).map((review: any) => ({
    rating: typeof review?.rating === "number" ? review.rating : undefined,
    text: review?.text?.text,
    originalText: review?.originalText?.text,
    textLanguageCode: review?.text?.languageCode,
    originalTextLanguageCode: review?.originalText?.languageCode,
    relativePublishTimeDescription: review?.relativePublishTimeDescription,
    publishTime: review?.publishTime,
    authorName: review?.authorAttribution?.displayName,
    authorUri: review?.authorAttribution?.uri,
    authorPhotoUri: review?.authorAttribution?.photoUri,
    googleMapsUri: review?.googleMapsUri,
    flagContentUri: review?.flagContentUri,
  }))
}

function normalizeAttributions(attributions: unknown): PlaceAttribution[] {
  if (!Array.isArray(attributions)) return []
  return attributions
    .map((item: any) => ({
      provider: item?.provider || undefined,
      providerUri: item?.providerUri || undefined,
    }))
    .filter((item) => Boolean(item.provider || item.providerUri))
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
}

type LegacyDetails = {
  place_id?: string
  name?: string
  rating?: number
  user_ratings_total?: number
  url?: string
  photos?: Array<{
    photo_reference?: string
    width?: number
    height?: number
    html_attributions?: string[]
  }>
  reviews?: Array<{
    author_name?: string
    author_url?: string
    language?: string
    profile_photo_url?: string
    rating?: number
    relative_time_description?: string
    text?: string
    time?: number
  }>
}

async function fetchLegacyDetails(placeId: string): Promise<LegacyDetails | null> {
  const params = new URLSearchParams({
    place_id: placeId,
    fields: "place_id,name,rating,user_ratings_total,url,photo,reviews",
    language: "id",
    reviews_sort: "most_relevant",
    key: apiKey(),
  })

  const response = await fetch(`${LEGACY_DETAILS_URL}?${params.toString()}`, {
    cache: "no-store",
  })
  if (!response.ok) return null

  const payload = (await response.json()) as {
    status?: string
    error_message?: string
    result?: LegacyDetails
  }

  if (payload.status !== "OK" || !payload.result) return null
  if (payload.result.place_id && payload.result.place_id !== placeId) return null
  return payload.result
}

function legacyPhotos(place: LegacyDetails | null): WorkshopPhoto[] {
  if (!place || !Array.isArray(place.photos)) return []
  return place.photos
    .slice(0, 10)
    .map((photo) => {
      const ref = String(photo.photo_reference || "")
      const labels = Array.isArray(photo.html_attributions)
        ? photo.html_attributions.map((item) => stripHtml(String(item))).filter(Boolean)
        : []
      return {
        name: ref ? `${LEGACY_PREFIX}${ref}` : "",
        googleMapsUri: place.url || undefined,
        widthPx: typeof photo.width === "number" ? photo.width : undefined,
        heightPx: typeof photo.height === "number" ? photo.height : undefined,
        authorAttributions: labels.map((displayName) => ({ displayName })),
      }
    })
    .filter((photo) => Boolean(photo.name))
}

function legacyReviews(place: LegacyDetails | null): GoogleReview[] {
  if (!place || !Array.isArray(place.reviews)) return []
  return place.reviews.slice(0, 5).map((review) => ({
    rating: typeof review.rating === "number" ? review.rating : undefined,
    text: review.text || undefined,
    originalText: review.text || undefined,
    textLanguageCode: review.language || undefined,
    originalTextLanguageCode: review.language || undefined,
    relativePublishTimeDescription: review.relative_time_description || undefined,
    publishTime:
      typeof review.time === "number" ? new Date(review.time * 1000).toISOString() : undefined,
    authorName: review.author_name || undefined,
    authorUri: review.author_url || undefined,
    authorPhotoUri: review.profile_photo_url || undefined,
    googleMapsUri: place.url || undefined,
  }))
}

function mapGooglePlace(place: any, origin?: { latitude: number; longitude: number }): Workshop {
  const latitude = typeof place?.location?.latitude === "number" ? place.location.latitude : undefined
  const longitude = typeof place?.location?.longitude === "number" ? place.location.longitude : undefined
  const distanceMeters =
    origin && typeof latitude === "number" && typeof longitude === "number"
      ? haversineDistanceMeters(origin, { latitude, longitude })
      : undefined
  const photos = normalizePhotos(place.photos)

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
    photoNames: photos.map((photo) => photo.name),
    photos,
    attributions: normalizeAttributions(place.attributions),
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
  const alreadyWorkshopQuery = Boolean(service && /\b(?:bengkel|workshop|garage|motor)\b/i.test(service))
  let textQuery = service ? (alreadyWorkshopQuery ? service : `${service} bengkel motor`) : "bengkel motor"
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
        "places.googleMapsUri",
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

async function fetchNewPlace(placeId: string) {
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
    "attributions",
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
  return response.json()
}

export async function getGoogleWorkshopDetail(placeId: string): Promise<WorkshopDetail | null> {
  if (!placeId) return null

  const place = await fetchNewPlace(placeId)
  if (!place) return null

  // Detail page only requests fields that are actually rendered.
  // Photos/reviews and the legacy fallback were intentionally removed to reduce
  // latency, quota use, and duplicate Google Places requests.
  return mapGooglePlace(place)
}

export async function fetchGooglePhoto(photoName: string, maxWidthPx = 1200) {
  if (photoName.startsWith(LEGACY_PREFIX)) {
    const photoReference = photoName.slice(LEGACY_PREFIX.length)
    if (!photoReference) throw new Error("Legacy photo reference tidak valid")
    const width = Math.min(Math.max(Math.round(maxWidthPx), 200), 1600)
    const params = new URLSearchParams({
      maxwidth: String(width),
      photo_reference: photoReference,
      key: apiKey(),
    })
    const response = await fetch(`${LEGACY_PHOTO_URL}?${params.toString()}`, {
      redirect: "follow",
      cache: "no-store",
    })
    if (!response.ok) throw new Error(`Google Place Photo Legacy gagal (${response.status})`)
    return response
  }

  const width = Math.min(Math.max(Math.round(maxWidthPx), 200), 2400)
  const response = await fetch(
    `${PLACES_BASE}/${photoName}/media?maxWidthPx=${width}&key=${encodeURIComponent(apiKey())}`,
    {
      redirect: "follow",
      cache: "no-store",
    },
  )
  if (!response.ok) throw new Error(`Google Place Photo gagal (${response.status})`)
  return response
}
