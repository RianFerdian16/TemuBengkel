import Link from "next/link"
import { MapPin, UserRound } from "lucide-react"

type AdminWorkshopRow = {
  id: string
  name: string
  address?: string | null
  status: "pending" | "approved" | "rejected"
  createdAt: string
  owner?: { fullName: string; email: string; deletedAt?: string | null } | null
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value))
}

export function AdminWorkshopList({ items, emptyText = "Belum ada listing pada status ini." }: { items: AdminWorkshopRow[]; emptyText?: string }) {
  if (!items.length) return <div className="surface admin-empty-state"><strong>Tidak ada data.</strong><span>{emptyText}</span></div>

  return (
    <div className="admin-table-list">
      <div className="admin-table-head"><span>LISTING</span><span>PEMILIK</span><span>STATUS</span><span>TANGGAL</span><span /></div>
      {items.map((item, index) => (
        <article className="admin-table-row" key={item.id}>
          <div className="admin-list-main"><small>{String(index + 1).padStart(2, "0")}</small><div><strong>{item.name}</strong><span><MapPin size={12} />{item.address || "Alamat belum tersedia"}</span></div></div>
          <div className="admin-owner-cell"><UserRound size={13} /><div><strong>{item.owner?.deletedAt ? "Akun dihapus" : item.owner?.fullName || "—"}</strong><span>{item.owner?.deletedAt ? "—" : item.owner?.email || "—"}</span></div></div>
          <div><span className={`status-pill owner-${item.status}`}>{item.status}</span></div>
          <div className="admin-date-cell">{formatDate(item.createdAt)}</div>
          <div className="admin-row-action"><Link href={`/admin/workshops/${item.id}`}>{item.status === "pending" ? "Review" : "Lihat"} →</Link></div>
        </article>
      ))}
    </div>
  )
}
