import { NextRequest, NextResponse } from "next/server"
import { issueEmailVerificationToken } from "@/lib/auth"
import { appBaseUrl, emailDeliveryConfigured, sendVerificationEmail } from "@/lib/email"
import { enforceRateLimit, rateLimitResponse } from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
  try {
    await enforceRateLimit(request, "resend-verification", 5, 60 * 60 * 1000)
    const body = await request.json().catch(() => ({}))
    const email = String(body.email || "").trim().toLowerCase()
    if (!email) return NextResponse.json({ error: "Masukkan email akun." }, { status: 400 })
    if (!emailDeliveryConfigured()) return NextResponse.json({ error: "Layanan email production belum dikonfigurasi." }, { status: 503 })
    const result = await issueEmailVerificationToken(email)
    if (result) {
      const url = `${appBaseUrl(request.nextUrl.origin)}/api/auth/verify-email?token=${encodeURIComponent(result.token)}`
      await sendVerificationEmail(result.user.email, url).catch(() => null)
    }
    return NextResponse.json({ ok: true, message: "Jika akun belum terverifikasi, email baru sudah dikirim." })
  } catch (error) {
    const limited = rateLimitResponse(error)
    if (limited) return NextResponse.json(limited.body, { status: limited.status, headers: limited.headers })
    return NextResponse.json({ error: "Email verifikasi belum dapat dikirim." }, { status: 500 })
  }
}
