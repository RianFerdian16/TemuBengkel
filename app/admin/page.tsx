import Link from "next/link"
import { Building2, CheckCircle2, Clock3, UserRound, XCircle } from "lucide-react"
import { AdminConsoleShell } from "@/components/admin-console-shell"
import { AdminWorkshopList } from "@/components/admin-workshop-list"
import { getAdminStats, listAdminWorkshops } from "@/lib/admin-repository"
import { requireAdminSession } from "@/lib/console-access"

export default async function AdminDashboardPage() {
  const session = await requireAdminSession()
  const [stats, pending] = await Promise.all([getAdminStats(), listAdminWorkshops({ status: "pending", take: 6 })])

  return (
    <AdminConsoleShell userName={session.user.fullName}>
      <div className="console-content admin-console-content">
        <div className="console-page-head"><div><p className="eyebrow">Ringkasan admin</p><h1>Moderasi yang perlu perhatian.</h1><p>Prioritaskan listing pending, lalu pantau kesehatan data bengkel dan pemilik.</p></div><Link className="primary-btn inline-btn" href="/admin/reviews">Buka pending review</Link></div>
        <div className="admin-stat-grid">
          <article><span><Building2 size={17} />Total bengkel</span><strong>{stats.total}</strong></article>
          <article><span><Clock3 size={17} />Pending</span><strong>{stats.pending}</strong></article>
          <article><span><CheckCircle2 size={17} />Approved</span><strong>{stats.approved}</strong></article>
          <article><span><XCircle size={17} />Rejected</span><strong>{stats.rejected}</strong></article>
          <article><span><UserRound size={17} />Pemilik aktif</span><strong>{stats.owners}</strong></article>
        </div>
        <section className="admin-section-block">
          <div className="admin-section-head"><div><span>PENDING REVIEW</span><h2>Menunggu keputusan</h2></div><Link href="/admin/reviews">Lihat semua →</Link></div>
          <AdminWorkshopList items={pending} emptyText="Semua listing sudah direview. Tidak ada antrean pending." />
        </section>
      </div>
    </AdminConsoleShell>
  )
}
