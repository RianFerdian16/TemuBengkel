import { NextResponse } from "next/server"
import { getAuthSession, revokeAllUserSessions } from "@/lib/auth"

export async function POST() {
  const session = await getAuthSession().catch(() => null)
  if (!session) return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 })
  await revokeAllUserSessions(session.user.id, "owner")
  return NextResponse.json({ ok: true })
}
