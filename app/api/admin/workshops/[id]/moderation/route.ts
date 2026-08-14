import { NextRequest, NextResponse } from "next/server"
import { getAdminAuthSession } from "@/lib/auth"
import { moderateWorkshop } from "@/lib/admin-repository"

function cleanId(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ? id : null
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const safeId = cleanId(id)
  if (!safeId) return NextResponse.json({ error: "ID bengkel tidak valid." }, { status: 400 })

  try {
    const session = await getAdminAuthSession()
    if (!session) return NextResponse.json({ error: "Akses admin diperlukan." }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const action = body.action === "approve" ? "approve" : body.action === "reject" ? "reject" : null
    if (!action) return NextResponse.json({ error: "Aksi moderasi tidak valid." }, { status: 400 })

    const workshop = await moderateWorkshop({
      id: safeId,
      adminId: session.user.id,
      action,
      reason: body.reason,
    })
    if (!workshop) return NextResponse.json({ error: "Bengkel tidak ditemukan." }, { status: 404 })
    return NextResponse.json({ workshop })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Moderasi gagal." }, { status: 400 })
  }
}
