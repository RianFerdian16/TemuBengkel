import { NextRequest, NextResponse } from "next/server"
import { getGoogleWorkshopDetail } from "@/lib/google-places"
import { getGoogleMapsServerKey } from "@/lib/config"

export async function GET(request: NextRequest) {
  const placeId = request.nextUrl.searchParams.get("placeId")?.trim()
  if (!placeId || placeId.length > 300) {
    return NextResponse.json({ error: "Place ID tidak valid" }, { status: 400 })
  }

  if (!getGoogleMapsServerKey()) {
    return NextResponse.json(
      { error: "GOOGLE_MAPS_SERVER_API_KEY belum dikonfigurasi" },
      { status: 503 },
    )
  }

  try {
    const place = await getGoogleWorkshopDetail(placeId)
    if (!place) {
      return NextResponse.json({ error: "Place tidak ditemukan" }, { status: 404 })
    }

    const photos = Array.isArray(place.photos) ? place.photos : []
    const reviews = Array.isArray(place.reviews) ? place.reviews : []
    const usingLegacy = photos.some((photo) => photo.name.startsWith("legacy:"))

    return NextResponse.json(
      {
        placeId: place.googlePlaceId || place.id || placeId,
        rating: place.rating,
        reviewCount: place.reviewCount,
        googleMapsUri: place.googleMapsUri,
        photos,
        reviews,
        counts: { photos: photos.length, reviews: reviews.length },
        source: photos.length || reviews.length ? (usingLegacy ? "legacy-details" : "new-details") : "none",
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    )
  } catch (error) {
    return NextResponse.json(
      {
        error: "Gagal mengambil media Google Places",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 502 },
    )
  }
}
