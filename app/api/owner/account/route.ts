import { randomUUID } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { getAuthSession, hashPassword, revokeAllUserSessions, verifyPassword } from "@/lib/auth"
import { getPrisma } from "@/lib/db"

export async function GET() {
  try {
    const session = await getAuthSession()
    if (!session) return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 })
    return NextResponse.json({ user: session.user })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal memuat akun." }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 })
    const body = await request.json().catch(() => ({}))
    const fullName = String(body.fullName || "").trim()
    const currentPassword = String(body.currentPassword || "")
    const newPassword = String(body.newPassword || "")
    if (fullName.length < 2 || fullName.length > 120) {
      return NextResponse.json({ error: "Nama harus 2–120 karakter." }, { status: 400 })
    }

    const prisma = getPrisma() as any
    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!user || user.deletedAt) return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 })

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
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal memperbarui akun." }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 })
    const body = await request.json().catch(() => ({}))
    const confirmation = String(body.confirmation || "").trim()
    const currentPassword = String(body.currentPassword || "")
    if (confirmation !== "HAPUS AKUN") {
      return NextResponse.json({ error: "Ketik HAPUS AKUN untuk mengonfirmasi." }, { status: 400 })
    }

    const prisma = getPrisma() as any
    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!user || user.deletedAt) return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 })
    if (!(await verifyPassword(currentPassword, user.passwordHash))) {
      return NextResponse.json({ error: "Kata sandi saat ini salah." }, { status: 400 })
    }

    const tombstone = randomUUID().replace(/-/g, "")
    await prisma.$transaction([
      prisma.workshop.updateMany({
        where: { ownerId: user.id },
        data: {
          status: "REJECTED",
          rejectionReason: "Akun pemilik telah dihapus.",
          reviewedAt: new Date(),
          reviewedById: null,
        },
      }),
      prisma.session.deleteMany({ where: { userId: user.id } }),
      prisma.user.update({
        where: { id: user.id },
        data: {
          fullName: "Akun dihapus",
          email: `deleted+${tombstone}@temubengkel.invalid`,
          passwordHash: `deleted$${tombstone}`,
          deletedAt: new Date(),
        },
      }),
    ])

    await revokeAllUserSessions(user.id, "owner").catch(() => null)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal menghapus akun." }, { status: 400 })
  }
}
