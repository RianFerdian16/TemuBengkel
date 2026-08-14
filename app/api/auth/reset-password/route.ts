import { NextRequest, NextResponse } from "next/server"
import { resetPasswordWithToken } from "@/lib/auth"
import { enforceRateLimit, rateLimitResponse } from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
  try {
    await enforceRateLimit(request, "reset-password", 8, 60 * 60 * 1000)
    const body = await request.json().catch(() => ({}))
    const token = String(body.token || "")
    const password = String(body.password || "")
    if (!token) return NextResponse.json({ error: "Token reset tidak tersedia." }, { status: 400 })
    if (password.length < 8 || password.length > 128) return NextResponse.json({ error: "Kata sandi harus 8–128 karakter." }, { status: 400 })
    const role = await resetPasswordWithToken(token, password)
    return NextResponse.json({ ok: true, role, message: "Kata sandi berhasil diperbarui. Silakan masuk kembali." })
  } catch (error) {
    const limited = rateLimitResponse(error)
    if (limited) return NextResponse.json(limited.body, { status: limited.status, headers: limited.headers })
    return NextResponse.json({ error: error instanceof Error ? error.message : "Reset kata sandi gagal." }, { status: 400 })
  }
}
