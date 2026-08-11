import { NextRequest, NextResponse } from "next/server"
import { searchWorkshops } from "@/lib/workshop-data"

function finiteNumber(value: string | null) {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const latitude = finiteNumber(params.get("lat"))
  const longitude = finiteNumber(params.get("lng"))
  const radiusMeters = finiteNumber(params.get("radius"))
  const query = params.get("q")?.slice(0, 120) || undefined
  const locationText = params.get("location")?.slice(0, 160) || undefined

  if ((latitude === undefined) !== (longitude === undefined)) {
    return NextResponse.json({ error: "Latitude dan longitude harus dikirim bersama." }, { status: 400 })
  }

  try {
    const workshops = await searchWorkshops({ query, locationText, latitude, longitude, radiusMeters })
    return NextResponse.json({ workshops }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pencarian bengkel gagal"
    return NextResponse.json({ error: message }, { status: 503 })
  }
}
