import { NextRequest, NextResponse } from "next/server"
import { getAuthSession } from "@/lib/auth"
import { isPrismaUniqueConstraintError } from "@/lib/db"
import { parseWorkshopInput } from "@/lib/workshop-input"
import { ensureWorkshopCoordinates } from "@/lib/geocode"
import {
  deleteOwnerWorkshop,
  getOwnerWorkshopById,
  updateOwnerWorkshop,
} from "@/lib/workshop-repository"

function cleanId(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ? id : null
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const safeId = cleanId(id)
  if (!safeId) return NextResponse.json({ error: "ID tidak valid." }, { status: 400 })

  try {
    const session = await getAuthSession()
    if (!session) return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 })

    const workshop = await getOwnerWorkshopById(session.user.id, safeId)
    if (!workshop) return NextResponse.json({ error: "Bengkel tidak ditemukan." }, { status: 404 })
    return NextResponse.json({ workshop })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memuat bengkel." },
      { status: 500 },
    )
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const safeId = cleanId(id)
  if (!safeId) return NextResponse.json({ error: "ID tidak valid." }, { status: 400 })

  try {
    const session = await getAuthSession()
    if (!session) return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 })

    const parsed = parseWorkshopInput(await request.json())
    const data = await ensureWorkshopCoordinates(parsed)
    const workshop = await updateOwnerWorkshop(session.user.id, safeId, data)
    if (!workshop) return NextResponse.json({ error: "Bengkel tidak ditemukan." }, { status: 404 })
    return NextResponse.json({ workshop })
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

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const safeId = cleanId(id)
  if (!safeId) return NextResponse.json({ error: "ID tidak valid." }, { status: 400 })

  try {
    const session = await getAuthSession()
    if (!session) return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 })

    const deleted = await deleteOwnerWorkshop(session.user.id, safeId)
    if (!deleted) return NextResponse.json({ error: "Bengkel tidak ditemukan." }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menghapus bengkel." },
      { status: 500 },
    )
  }
}
