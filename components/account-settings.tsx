"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut, ShieldAlert, Trash2 } from "lucide-react"

type AccountKind = "owner" | "admin"

export function AccountSettings({ kind, fullName, email }: { kind: AccountKind; fullName: string; email: string }) {
  const router = useRouter()
  const [name, setName] = useState(fullName)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deletePassword, setDeletePassword] = useState("")
  const [confirmation, setConfirmation] = useState("")

  const base = kind === "admin" ? "/api/admin/account" : "/api/owner/account"

  const save = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true); setError(null); setMessage(null)
    try {
      const response = await fetch(base, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: name, currentPassword, newPassword }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || "Gagal menyimpan perubahan")
      setCurrentPassword(""); setNewPassword("")
      setMessage("Perubahan akun berhasil disimpan.")
      router.refresh()
    } catch (error) {
      setError(error instanceof Error ? error.message : "Gagal menyimpan perubahan")
    } finally { setBusy(false) }
  }

  const logoutAll = async () => {
    if (!window.confirm("Keluar dari semua sesi aktif akun ini?")) return
    const response = await fetch(`${base}/logout-all`, { method: "POST" })
    if (response.ok) {
      router.replace(kind === "admin" ? "/admin/login" : "/owner/login")
      router.refresh()
    } else setError("Gagal mengeluarkan semua sesi.")
  }

  const deleteAccount = async () => {
    if (kind !== "owner") return
    if (confirmation !== "HAPUS AKUN") {
      setError("Ketik HAPUS AKUN untuk mengonfirmasi.")
      return
    }
    if (!window.confirm("Akun pemilik dan akses ke semua listing akan dinonaktifkan. Lanjutkan?")) return
    setBusy(true); setError(null)
    try {
      const response = await fetch(base, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation, currentPassword: deletePassword }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || "Gagal menghapus akun")
      router.replace("/")
      router.refresh()
    } catch (error) {
      setError(error instanceof Error ? error.message : "Gagal menghapus akun")
      setBusy(false)
    }
  }

  return (
    <div className="account-settings-grid">
      <form className="surface account-settings-card" onSubmit={save}>
        <div className="admin-section-kicker"><span>PROFIL</span></div>
        <h2>Informasi akun</h2>
        <p>Email tidak dapat diubah dari halaman ini agar identitas akun tetap konsisten.</p>
        <label htmlFor={`${kind}-name`}>Nama</label>
        <input id={`${kind}-name`} value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={120} required />
        <label>Email</label>
        <input value={email} disabled />
        <div className="settings-divider" />
        <h3>Ubah kata sandi</h3>
        <label htmlFor={`${kind}-current-password`}>Kata sandi saat ini</label>
        <input id={`${kind}-current-password`} type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
        <label htmlFor={`${kind}-new-password`}>Kata sandi baru</label>
        <input id={`${kind}-new-password`} type="password" autoComplete="new-password" minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Kosongkan jika tidak ingin mengganti" />
        {message && <p className="form-note success-note">{message}</p>}
        {error && <p className="form-note error-note" role="alert">{error}</p>}
        <button className="primary-btn" type="submit" disabled={busy}>{busy ? "Menyimpan…" : "Simpan perubahan"}</button>
      </form>

      <div className="account-settings-side">
        <section className="surface account-security-card">
          <div className="settings-icon"><ShieldAlert size={18} /></div>
          <h3>Keamanan sesi</h3>
          <p>Gunakan ini jika Anda merasa akun masih terbuka di perangkat lain.</p>
          <button type="button" className="secondary-btn" onClick={() => void logoutAll()}><LogOut size={15} />Keluar dari semua perangkat</button>
        </section>
        {kind === "owner" && (
          <section className="surface account-danger-card">
            <div className="settings-icon danger"><Trash2 size={18} /></div>
            <h3>Hapus akun pemilik</h3>
            <p>Listing milik akun ini akan dikeluarkan dari publik dan akun dianonimkan. Tindakan ini tidak bisa dibatalkan dari portal.</p>
            <label htmlFor="delete-password">Kata sandi saat ini</label>
            <input id="delete-password" type="password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} />
            <label htmlFor="delete-confirmation">Ketik HAPUS AKUN</label>
            <input id="delete-confirmation" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
            <button type="button" className="admin-reject-btn full" disabled={busy} onClick={() => void deleteAccount()}><Trash2 size={15} />Hapus akun</button>
          </section>
        )}
      </div>
    </div>
  )
}
