import { NextResponse } from "next/server"
import { getAdminAuthSession, revokeAllUserSessions } from "@/lib/auth"

export async function POST() {
  const session = await getAdminAuthSession().catch(() => null)
  if (!session) return NextResponse.json({ error: "Akses admin diperlukan." }, { status: 401 })
  await revokeAllUserSessions(session.user.id, "admin")
  return NextResponse.json({ ok: true })
}
