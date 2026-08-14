import { NextResponse } from "next/server"
import { getAdminAuthSession } from "@/lib/auth"

export async function GET() {
  try {
    const session = await getAdminAuthSession()
    if (!session) return NextResponse.json({ user: null }, { status: 401 })
    return NextResponse.json({ user: session.user })
  } catch {
    return NextResponse.json({ user: null }, { status: 401 })
  }
}
