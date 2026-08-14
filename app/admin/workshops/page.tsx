import Link from "next/link"
import { Search } from "lucide-react"
import { AdminConsoleShell } from "@/components/admin-console-shell"
import { AdminWorkshopList } from "@/components/admin-workshop-list"
import { listAdminWorkshops, type AdminWorkshopStatus } from "@/lib/admin-repository"
import { requireAdminSession } from "@/lib/console-access"

export default async function AdminWorkshopsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const session = await requireAdminSession()
  const params = await searchParams
  const status: AdminWorkshopStatus | undefined = ["pending", "approved", "rejected"].includes(params.status || "") ? params.status as AdminWorkshopStatus : undefined
  const query = String(params.q || "").trim()
  const items = await listAdminWorkshops({ status, query })
  const filters = [{ label: "Semua", value: "" }, { label: "Pending", value: "pending" }, { label: "Approved", value: "approved" }, { label: "Rejected", value: "rejected" }]

  return (
    <AdminConsoleShell userName={session.user.fullName}>
      <div className="console-content">
        <div className="console-page-head"><div><p className="eyebrow">Semua bengkel</p><h1>Direktori listing.</h1><p>Cari berdasarkan nama bengkel, lokasi, nama pemilik, atau email pemilik.</p></div></div>
        <div className="admin-toolbar">
          <div className="admin-filter-tabs">{filters.map((item) => <Link key={item.label} className={(status || "") === item.value ? "active" : ""} href={`/admin/workshops${item.value ? `?status=${item.value}` : ""}`}>{item.label}</Link>)}</div>
          <form className="admin-search-form" action="/admin/workshops"><Search size={15} /><input type="search" name="q" defaultValue={query} placeholder="Cari bengkel / owner / lokasi" />{status && <input type="hidden" name="status" value={status} />}<button type="submit">Cari</button></form>
        </div>
        <AdminWorkshopList items={items} emptyText="Tidak ada listing yang cocok dengan filter atau pencarian ini." />
      </div>
    </AdminConsoleShell>
  )
}
