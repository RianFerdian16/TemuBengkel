"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

type OwnerWorkshop = {
  id: string
  name: string
  address?: string | null
  status: "pending" | "approved" | "rejected"
  google_place_id?: string | null
}

export function OwnerDashboard() {
  const router = useRouter()
  const [items, setItems] = useState<OwnerWorkshop[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    const response = await fetch("/api/owner/workshops", { cache: "no-store" })
    if (response.status === 401) {
      router.replace("/owner/login")
      return
    }
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) setError(payload?.error || "Gagal memuat data")
    else setItems(Array.isArray(payload.workshops) ? payload.workshops : [])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    router.replace("/owner/login")
    router.refresh()
  }

  const remove = async (id: string) => {
    if (!window.confirm("Hapus listing bengkel ini?")) return
    const response = await fetch(`/api/owner/workshops/${id}`, { method: "DELETE" })
    if (response.ok) setItems((current) => current.filter((item) => item.id !== id))
    else setError("Gagal menghapus bengkel.")
  }

  return (
    <>
      <div className="owner-dashboard-top">
        <div><p className="eyebrow">Dashboard pemilik</p><h1>Kelola bengkel Anda</h1></div>
        <div className="owner-dashboard-actions"><Link className="primary-btn inline-btn" href="/owner/workshops/new">Tambah bengkel</Link><button className="secondary-btn" type="button" onClick={logout}>Keluar</button></div>
      </div>
      <p className="hero-copy owner-dashboard-copy">Data yang Anda ubah masuk status <strong>pending</strong> sebelum ditampilkan publik. Data Google Maps tetap berasal dari Google; di sini Anda mengelola data tambahan TEMUBENGKEL.</p>
      {error && <div className="inline-alert">{error}<button type="button" onClick={() => void load()}>Coba lagi</button></div>}
      {loading ? <div className="workshop-card skeleton-card" /> : items.length === 0 ? (
        <div className="surface empty-state compact-empty"><div><h3>Belum ada bengkel</h3><p>Tambahkan bengkel pertama Anda. Anda dapat menghubungkannya ke Google Place ID atau memasukkan data lokasi sendiri.</p><Link className="primary-btn inline-btn" href="/owner/workshops/new">Tambah bengkel</Link></div></div>
      ) : (
        <div className="owner-list">
          {items.map((item) => (
            <article className="surface owner-list-item" key={item.id}>
              <div><span className={`status-pill owner-${item.status}`}>{item.status}</span><h2>{item.name}</h2><p>{item.address || "Alamat belum diisi"}</p>{item.google_place_id && <small>Terhubung ke Google Place ID</small>}</div>
              <div className="owner-list-actions"><Link className="secondary-btn inline-btn" href={`/owner/workshops/${item.id}/edit`}>Edit</Link><button className="danger-link" type="button" onClick={() => void remove(item.id)}>Hapus</button></div>
            </article>
          ))}
        </div>
      )}
    </>
  )
}
