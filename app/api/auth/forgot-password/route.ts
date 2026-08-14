import { NextRequest, NextResponse } from "next/server"
import { issuePasswordResetToken } from "@/lib/auth"
import { appBaseUrl, emailDeliveryConfigured, sendPasswordResetEmail } from "@/lib/email"
import { enforceRateLimit, rateLimitResponse } from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
  try {
    await enforceRateLimit(request, "forgot-password", 5, 60 * 60 * 1000)
    const body = await request.json().catch(() => ({}))
    const email = String(body.email || "").trim().toLowerCase()
    if (!email) return NextResponse.json({ error: "Masukkan email akun." }, { status: 400 })
    const result = await issuePasswordResetToken(email)
    let debugUrl: string | undefined
    if (result) {
      const url = `${appBaseUrl(request.nextUrl.origin)}/owner/reset-password?token=${encodeURIComponent(result.token)}`
      if (emailDeliveryConfigured()) await sendPasswordResetEmail(result.user.email, url).catch(() => null)
      else if (process.env.NODE_ENV !== "production") debugUrl = url
    }
    return NextResponse.json({
      ok: true,
      message: "Jika email terdaftar, tautan reset akan dikirim.",
      ...(debugUrl ? { debugUrl } : {}),
    })
  } catch (error) {
    const limited = rateLimitResponse(error)
    if (limited) return NextResponse.json(limited.body, { status: limited.status, headers: limited.headers })
    return NextResponse.json({ error: "Permintaan reset belum dapat diproses." }, { status: 500 })
  }
}
