import { NextRequest, NextResponse } from "next/server"
import { getAuthSession } from "@/lib/auth"
import { isPrismaUniqueConstraintError } from "@/lib/db"
import { parseWorkshopInput } from "@/lib/workshop-input"
import { ensureWorkshopCoordinates } from "@/lib/geocode"
import { createOwnerWorkshop, getOwnerWorkshops } from "@/lib/workshop-repository"

export async function GET() {
  try {
    const session = await getAuthSession()
    if (!session) {
      return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 })
    }

    const workshops = await getOwnerWorkshops(session.user.id)
    return NextResponse.json({ workshops })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memuat bengkel." },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) {
      return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 })
    }

    const parsed = parseWorkshopInput(await request.json())
    const data = await ensureWorkshopCoordinates(parsed)
    const workshop = await createOwnerWorkshop(session.user.id, data)
    return NextResponse.json({ workshop }, { status: 201 })
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      return NextResponse.json(
        { error: "Listing Google Maps tersebut sudah terhubung ke bengkel lain." },
        { status: 409 },
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Data tidak valid." },
      { status: 400 },
    )
  }
}
