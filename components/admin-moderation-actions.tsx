"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, X } from "lucide-react"

export function AdminModerationActions({ workshopId, status, rejectionReason }: { workshopId: string; status: string; rejectionReason?: string | null }) {
  const router = useRouter()
  const [reason, setReason] = useState(rejectionReason || "")
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null)
  const [error, setError] = useState<string | null>(null)

  const act = async (action: "approve" | "reject") => {
    if (action === "reject" && reason.trim().length < 4) {
      setError("Isi alasan penolakan minimal 4 karakter.")
      return
    }
    if (!window.confirm(action === "approve" ? "Setujui bengkel ini untuk tampil publik?" : "Tolak listing bengkel ini?")) return
    setBusy(action)
    setError(null)
    try {
      const response = await fetch(`/api/admin/workshops/${workshopId}/moderation`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || "Moderasi gagal")
      router.refresh()
    } catch (error) {
      setError(error instanceof Error ? error.message : "Moderasi gagal")
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="admin-moderation-panel">
      <div className="admin-section-kicker"><span>MODERATION</span><b className={`status-pill owner-${status}`}>{status}</b></div>
      <h2>Keputusan review</h2>
      <p>Approve membuat listing bisa tampil di pencarian publik. Reject wajib disertai alasan yang akan dilihat pemilik.</p>
      <label htmlFor="admin-reject-reason">Alasan penolakan</label>
      <textarea id="admin-reject-reason" rows={4} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Contoh: Titik lokasi belum sesuai dengan alamat bengkel." />
      {error && <p className="form-note error-note" role="alert">{error}</p>}
      <div className="admin-moderation-buttons">
        <button type="button" className="admin-approve-btn" disabled={Boolean(busy)} onClick={() => void act("approve")}><Check size={16} />{busy === "approve" ? "Memproses…" : "Approve"}</button>
        <button type="button" className="admin-reject-btn" disabled={Boolean(busy)} onClick={() => void act("reject")}><X size={16} />{busy === "reject" ? "Memproses…" : "Reject"}</button>
      </div>
    </section>
  )
}
