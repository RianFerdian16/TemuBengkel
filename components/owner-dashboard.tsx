"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Building2, CheckCircle2, Clock3, Plus, XCircle } from "lucide-react"

type OwnerWorkshop = {
  id: string
  name: string
  address?: string | null
  status: "pending" | "approved" | "rejected"
  google_place_id?: string | null
  rejection_reason?: string | null
}

export function OwnerDashboard({ view = "overview" }: { view?: "overview" | "workshops" }) {
  const router = useRouter()
  const [items, setItems] = useState<OwnerWorkshop[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true); setError(null)
    const response = await fetch("/api/owner/workshops", { cache: "no-store" })
    if (response.status === 401) { router.replace("/owner/login"); return }
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) setError(payload?.error || "Gagal memuat data")
    else setItems(Array.isArray(payload.workshops) ? payload.workshops : [])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  const stats = useMemo(() => ({
    total: items.length,
    pending: items.filter((item) => item.status === "pending").length,
    approved: items.filter((item) => item.status === "approved").length,
    rejected: items.filter((item) => item.status === "rejected").length,
  }), [items])

  const remove = async (id: string) => {
    if (!window.confirm("Hapus listing bengkel ini?")) return
    const response = await fetch(`/api/owner/workshops/${id}`, { method: "DELETE" })
    if (response.ok) setItems((current) => current.filter((item) => item.id !== id))
    else setError("Gagal menghapus bengkel.")
  }

  const visibleItems = view === "overview" ? items.slice(0, 3) : items

  return (
    <div className="console-content owner-console-content">
      <div className="console-page-head">
        <div>
          <p className="eyebrow">{view === "overview" ? "Dashboard pemilik" : "Listing bengkel"}</p>
          <h1>{view === "overview" ? "Kelola bengkel Anda." : "Bengkel saya."}</h1>
          <p>{view === "overview" ? "Pantau status moderasi dan perubahan listing dari satu tempat." : "Edit informasi bengkel, cek status review, atau tambahkan listing baru."}</p>
        </div>
        <Link className="primary-btn inline-btn" href="/owner/workshops/new"><Plus size={17} />Tambah bengkel</Link>
      </div>

      {view === "overview" && (
        <div className="owner-stats" aria-label="Ringkasan listing">
          <article className="owner-stat"><span><Building2 size={18} /> Total listing</span><strong>{loading ? "—" : stats.total}</strong></article>
          <article className="owner-stat"><span><Clock3 size={18} /> Pending</span><strong>{loading ? "—" : stats.pending}</strong></article>
          <article className="owner-stat"><span><CheckCircle2 size={18} /> Approved</span><strong>{loading ? "—" : stats.approved}</strong></article>
          <article className="owner-stat"><span><XCircle size={18} /> Rejected</span><strong>{loading ? "—" : stats.rejected}</strong></article>
        </div>
      )}

      {error && <div className="inline-alert">{error}<button type="button" onClick={() => void load()}>Coba lagi</button></div>}
      {loading ? <div className="workshop-card skeleton-card" /> : items.length === 0 ? (
        <div className="surface empty-state compact-empty"><div><Building2 className="empty-icon" size={30} /><h3>Belum ada bengkel</h3><p>Tambahkan bengkel pertama Anda dan kirim untuk direview admin.</p><Link className="primary-btn inline-btn" href="/owner/workshops/new"><Plus size={17} />Tambah bengkel</Link></div></div>
      ) : (
        <div className="owner-list">
          <div className="owner-list-heading"><span>{view === "overview" ? "LISTING TERBARU" : "SEMUA LISTING"}</span><span>{items.length} TOTAL</span></div>
          {visibleItems.map((item, index) => (
            <article className="surface owner-list-item" key={item.id}>
              <div className="owner-list-index">{String(index + 1).padStart(2, "0")}</div>
              <div className="owner-list-copy">
                <span className={`status-pill owner-${item.status}`}>{item.status}</span>
                <h2>{item.name}</h2><p>{item.address || "Alamat belum diisi"}</p>
                {item.status === "rejected" && item.rejection_reason && <div className="owner-reject-note"><strong>Alasan admin:</strong> {item.rejection_reason}</div>}
                {item.google_place_id && <small>● Terhubung ke Google Place ID</small>}
              </div>
              <div className="owner-list-actions"><Link className="secondary-btn inline-btn" href={`/owner/workshops/${item.id}/edit`}>Edit <span aria-hidden="true">↗</span></Link><button className="danger-link" type="button" onClick={() => void remove(item.id)}>Hapus</button></div>
            </article>
          ))}
          {view === "overview" && items.length > 3 && <Link href="/owner/workshops" className="console-more-link">Lihat semua bengkel →</Link>}
        </div>
      )}
    </div>
  )
}
