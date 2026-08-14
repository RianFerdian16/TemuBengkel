import { OwnerConsoleShell } from "@/components/owner-console-shell"
import { OwnerDashboard } from "@/components/owner-dashboard"
import { requireOwnerSession } from "@/lib/console-access"

export default async function OwnerWorkshopsPage() {
  const session = await requireOwnerSession()
  return <OwnerConsoleShell userName={session.user.fullName}><OwnerDashboard view="workshops" /></OwnerConsoleShell>
}
