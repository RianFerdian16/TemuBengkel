import { NextRequest, NextResponse } from "next/server"
import { registerOwner } from "@/lib/auth"
import { integrationStatus } from "@/lib/config"
import { isPrismaUniqueConstraintError } from "@/lib/db"
import { enforceRateLimit, rateLimitResponse } from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
  if (!integrationStatus.database) return NextResponse.json({ error: "Database Neon belum dikonfigurasi." }, { status: 503 })
  try {
    await enforceRateLimit(request, "owner-register", 5, 60 * 60 * 1000)
    const body = await request.json().catch(() => ({}))
    const fullName = String(body.fullName || "").trim()
    const email = String(body.email || "").trim().toLowerCase()
    const password = String(body.password || "")
    if (fullName.length < 2 || fullName.length > 120) return NextResponse.json({ error: "Nama pemilik harus 2–120 karakter." }, { status: 400 })
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) return NextResponse.json({ error: "Email tidak valid." }, { status: 400 })
    if (password.length < 8 || password.length > 128) return NextResponse.json({ error: "Kata sandi harus 8–128 karakter." }, { status: 400 })

    const user = await registerOwner(email, password, fullName)
    return NextResponse.json({ user, signedIn: true, message: "Akun berhasil dibuat." }, { status: 201 })
  } catch (error) {
    const limited = rateLimitResponse(error)
    if (limited) return NextResponse.json(limited.body, { status: limited.status, headers: limited.headers })
    if (isPrismaUniqueConstraintError(error)) return NextResponse.json({ error: "Email tersebut sudah terdaftar." }, { status: 409 })
    return NextResponse.json({ error: error instanceof Error ? error.message : "Pendaftaran gagal." }, { status: 500 })
  }
}
