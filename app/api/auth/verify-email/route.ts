import { NextRequest, NextResponse } from "next/server"
import { verifyEmailToken } from "@/lib/auth"

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") || ""
  const target = new URL("/owner/login", request.url)
  if (!token) {
    target.searchParams.set("verification", "invalid")
    return NextResponse.redirect(target)
  }
  try {
    await verifyEmailToken(token)
    target.searchParams.set("verification", "success")
  } catch {
    target.searchParams.set("verification", "invalid")
  }
  return NextResponse.redirect(target)
}
