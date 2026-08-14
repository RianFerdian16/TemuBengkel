import { Search, UserRound } from "lucide-react"
import { AdminConsoleShell } from "@/components/admin-console-shell"
import { listOwners } from "@/lib/admin-repository"
import { requireAdminSession } from "@/lib/console-access"

function formatDate(value: string) { return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)) }

export default async function AdminOwnersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await requireAdminSession()
  const params = await searchParams
  const query = String(params.q || "").trim()
  const owners = await listOwners(query)
  return (
    <AdminConsoleShell userName={session.user.fullName}>
      <div className="console-content">
        <div className="console-page-head"><div><p className="eyebrow">Pemilik</p><h1>Akun pemilik bengkel.</h1><p>Lihat siapa yang mengelola listing dan status moderasi bengkel mereka tanpa mengubah data akun.</p></div><div className="admin-count-badge">{owners.length} AKUN</div></div>
        <form className="admin-search-form owner-search" action="/admin/owners"><Search size={15} /><input type="search" name="q" defaultValue={query} placeholder="Cari nama atau email pemilik" /><button type="submit">Cari</button></form>
        <div className="admin-owner-list">
          {owners.length === 0 ? <div className="surface admin-empty-state"><strong>Tidak ada pemilik.</strong><span>Pencarian tidak menemukan akun yang cocok.</span></div> : owners.map((owner: any) => (
            <article key={owner.id} className="admin-owner-row">
              <div className="admin-owner-avatar"><UserRound size={17} /></div>
              <div className="admin-owner-primary"><strong>{owner.fullName}</strong><span>{owner.email}</span></div>
              <div className="admin-owner-metric"><span>BENGKEL</span><strong>{owner.totalWorkshops}</strong></div>
              <div className="admin-owner-statuses"><span className="status-pill owner-pending">{owner.pending} pending</span><span className="status-pill owner-approved">{owner.approved} approved</span><span className="status-pill owner-rejected">{owner.rejected} rejected</span></div>
              <div className="admin-date-cell">{owner.deletedAt ? "Akun dihapus" : `Sejak ${formatDate(owner.createdAt)}`}</div>
            </article>
          ))}
        </div>
      </div>
    </AdminConsoleShell>
  )
}
