import Link from "next/link"
import { OwnerDashboard } from "@/components/owner-dashboard"

export default function OwnerDashboardPage() {
  return <main className="page-main"><div className="shell"><Link className="wordmark" href="/"><span className="wordmark-mark" aria-hidden="true">TB</span>TEMUBENGKEL</Link><div className="owner-dashboard-wrap"><OwnerDashboard /></div></div></main>
}
