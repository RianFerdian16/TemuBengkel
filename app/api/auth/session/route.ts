import { NextResponse } from "next/server"
import { getAuthSession } from "@/lib/auth"
import { integrationStatus } from "@/lib/config"

export async function GET() {
  if (!integrationStatus.database) {
    return NextResponse.json({ user: null }, { status: 503 })
  }

  try {
    const session = await getAuthSession()
    if (!session) return NextResponse.json({ user: null }, { status: 401 })
    return NextResponse.json({ user: session.user })
  } catch {
    return NextResponse.json({ user: null }, { status: 401 })
  }
}
