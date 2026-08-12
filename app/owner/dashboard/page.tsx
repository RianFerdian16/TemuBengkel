import { Brand } from "@/components/brand"
import { OwnerDashboard } from "@/components/owner-dashboard"

export default function OwnerDashboardPage() {
  return <main className="page-main owner-page"><div className="shell"><div className="owner-topbar"><Brand /><span>OWNER CONSOLE</span></div><div className="owner-dashboard-wrap"><OwnerDashboard /></div></div></main>
}
