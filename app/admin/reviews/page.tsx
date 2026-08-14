import { AdminConsoleShell } from "@/components/admin-console-shell"
import { AdminWorkshopList } from "@/components/admin-workshop-list"
import { listAdminWorkshops } from "@/lib/admin-repository"
import { requireAdminSession } from "@/lib/console-access"

export default async function AdminReviewsPage() {
  const session = await requireAdminSession()
  const items = await listAdminWorkshops({ status: "pending" })
  return (
    <AdminConsoleShell userName={session.user.fullName}>
      <div className="console-content"><div className="console-page-head"><div><p className="eyebrow">Pending review</p><h1>Antrean moderasi.</h1><p>Periksa alamat, kontak, layanan, jam operasional, dan titik lokasi sebelum mengambil keputusan.</p></div><div className="admin-count-badge">{items.length} PENDING</div></div><AdminWorkshopList items={items} emptyText="Tidak ada listing yang menunggu review." /></div>
    </AdminConsoleShell>
  )
}
