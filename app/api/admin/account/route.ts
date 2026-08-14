import { NextRequest, NextResponse } from "next/server"
import { getAdminAuthSession, hashPassword, verifyPassword } from "@/lib/auth"
import { getPrisma } from "@/lib/db"

export async function PATCH(request: NextRequest) {
  try {
    const session = await getAdminAuthSession()
    if (!session) return NextResponse.json({ error: "Akses admin diperlukan." }, { status: 401 })
    const body = await request.json().catch(() => ({}))
    const fullName = String(body.fullName || "").trim()
    const currentPassword = String(body.currentPassword || "")
    const newPassword = String(body.newPassword || "")
    if (fullName.length < 2 || fullName.length > 120) {
      return NextResponse.json({ error: "Nama harus 2–120 karakter." }, { status: 400 })
    }

    const prisma = getPrisma() as any
    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!user) return NextResponse.json({ error: "Akun admin tidak ditemukan." }, { status: 404 })

    let passwordHash: string | undefined
    if (newPassword) {
      if (newPassword.length < 8) return NextResponse.json({ error: "Kata sandi baru minimal 8 karakter." }, { status: 400 })
      if (!(await verifyPassword(currentPassword, user.passwordHash))) {
        return NextResponse.json({ error: "Kata sandi saat ini salah." }, { status: 400 })
      }
      passwordHash = await hashPassword(newPassword)
    }

    await prisma.user.update({ where: { id: user.id }, data: { fullName, ...(passwordHash ? { passwordHash } : {}) } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal memperbarui akun admin." }, { status: 400 })
  }
}
