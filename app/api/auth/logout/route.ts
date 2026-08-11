import { NextResponse } from "next/server"
import { signOut } from "@/lib/auth"

export async function POST() {
  await signOut().catch(() => null)
  return NextResponse.json({ ok: true })
}
