import { OwnerDashboard } from "@/components/owner-dashboard"
import { OwnerTopbar } from "@/components/owner-topbar"

export default function OwnerDashboardPage() {
  return (
    <main className="page-main owner-page">
      <div className="shell">
        <OwnerTopbar />
        <div className="owner-dashboard-wrap"><OwnerDashboard /></div>
      </div>
    </main>
  )
}
