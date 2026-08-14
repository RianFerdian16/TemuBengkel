import { NextRequest, NextResponse } from "next/server"
import { geocodeWorkshopAddress, reverseGeocodeCoordinates } from "@/lib/geocode"
import { enforceRateLimit, rateLimitResponse } from "@/lib/rate-limit"

function finiteNumber(value: string | null) {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export async function GET(request: NextRequest) {
  try {
    await enforceRateLimit(request, "geocode", 60, 60 * 1000, { failOpen: true })
    const latitude = finiteNumber(request.nextUrl.searchParams.get("lat"))
    const longitude = finiteNumber(request.nextUrl.searchParams.get("lng"))

    if (latitude !== undefined || longitude !== undefined) {
      if (latitude === undefined || longitude === undefined) {
        return NextResponse.json({ error: "Latitude dan longitude harus dikirim bersama." }, { status: 400 })
      }
      const result = await reverseGeocodeCoordinates(latitude, longitude)
      return NextResponse.json(result, { headers: { "Cache-Control": "private, max-age=60" } })
    }

    const address = request.nextUrl.searchParams.get("address")?.trim() || ""
    if (address.length < 3 || address.length > 1000) {
      return NextResponse.json({ error: "Tulis alamat bengkel terlebih dahulu." }, { status: 400 })
    }
    const coordinates = await geocodeWorkshopAddress(address)
    return NextResponse.json(coordinates, { headers: { "Cache-Control": "private, max-age=60" } })
  } catch (error) {
    const limited = rateLimitResponse(error)
    if (limited) return NextResponse.json(limited.body, { status: limited.status, headers: limited.headers })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Lokasi tidak dapat ditemukan." },
      { status: 404 },
    )
  }
}
