import { redirect } from "next/navigation"
import { getAdminAuthSession, getAuthSession } from "@/lib/auth"

export async function requireOwnerSession() {
  const session = await getAuthSession().catch(() => null)
  if (!session) redirect("/owner/login")
  return session
}

export async function requireAdminSession() {
  const session = await getAdminAuthSession().catch(() => null)
  if (!session) redirect("/admin/login")
  return session
}
