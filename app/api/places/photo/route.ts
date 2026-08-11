import { NextRequest, NextResponse } from "next/server"
import { fetchGooglePhoto } from "@/lib/google-places"

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name")
  const width = Number(request.nextUrl.searchParams.get("w") || 1200)

  if (!name || !/^places\/.+\/photos\/.+/.test(name)) {
    return NextResponse.json({ error: "Photo reference tidak valid" }, { status: 400 })
  }

  try {
    const upstream = await fetchGooglePhoto(name, Number.isFinite(width) ? width : 1200)
    const bytes = await upstream.arrayBuffer()
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "image/jpeg",
        "Cache-Control": "no-store",
      },
    })
  } catch {
    return NextResponse.json({ error: "Foto tidak tersedia" }, { status: 404 })
  }
}
