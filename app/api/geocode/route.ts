import { NextRequest, NextResponse } from "next/server"
import { geocodeWorkshopAddress } from "@/lib/geocode"

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address")?.trim() || ""

  if (address.length < 5 || address.length > 1000) {
    return NextResponse.json({ error: "Tulis alamat bengkel terlebih dahulu." }, { status: 400 })
  }

  try {
    const coordinates = await geocodeWorkshopAddress(address)
    return NextResponse.json(coordinates, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Alamat tidak dapat ditemukan." },
      { status: 404 },
    )
  }
}
