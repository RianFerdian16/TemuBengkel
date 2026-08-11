import { NextRequest, NextResponse } from "next/server"
import { signInWithPassword } from "@/lib/auth"
import { integrationStatus } from "@/lib/config"

export async function POST(request: NextRequest) {
  if (!integrationStatus.database) {
    return NextResponse.json({ error: "Database Neon belum dikonfigurasi." }, { status: 503 })
  }

  const body = await request.json().catch(() => ({}))
  const email = String(body.email || "").trim().toLowerCase()
  const password = String(body.password || "")

  if (!email || !password) {
    return NextResponse.json({ error: "Email dan kata sandi wajib diisi." }, { status: 400 })
  }

  try {
    const user = await signInWithPassword(email, password)
    return NextResponse.json({ user })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Login gagal." },
      { status: 401 },
    )
  }
}
