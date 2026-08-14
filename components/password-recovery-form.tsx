"use client"

import Link from "next/link"
import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [debugUrl, setDebugUrl] = useState<string | null>(null)
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError(null); setMessage(null); setDebugUrl(null)
    try {
      const response = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || "Permintaan gagal")
      setMessage(payload.message || "Jika email terdaftar, tautan reset akan dikirim.")
      if (typeof payload.debugUrl === "string") setDebugUrl(payload.debugUrl)
    } catch (err) { setError(err instanceof Error ? err.message : "Permintaan gagal") }
    finally { setBusy(false) }
  }
  return <form className="surface owner-form" onSubmit={submit}>
    <label htmlFor="recovery-email">Email akun</label>
    <input id="recovery-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
    {message && <p className="form-note success-note" role="status">{message}</p>}
    {error && <p className="form-note error-note" role="alert">{error}</p>}
    {debugUrl && <p className="form-note">Mode development: <a href={debugUrl}>buka tautan reset</a>.</p>}
    <button className="primary-btn" type="submit" disabled={busy}>{busy ? "Mengirim…" : "Kirim tautan reset"}</button>
    <Link className="auth-inline-link" href="/owner/login">Kembali ke login</Link>
  </form>
}

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(null)
    if (password !== confirm) { setError("Konfirmasi kata sandi tidak sama."); return }
    setBusy(true)
    try {
      const response = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || "Reset gagal")
      router.replace(payload?.role === "admin" ? "/admin/login?reset=success" : "/owner/login?reset=success")
      router.refresh()
    } catch (err) { setError(err instanceof Error ? err.message : "Reset gagal"); setBusy(false) }
  }
  return <form className="surface owner-form" onSubmit={submit}>
    <label htmlFor="new-password">Kata sandi baru</label>
    <input id="new-password" type="password" autoComplete="new-password" minLength={8} maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} required />
    <label htmlFor="confirm-password">Ulangi kata sandi baru</label>
    <input id="confirm-password" type="password" autoComplete="new-password" minLength={8} maxLength={128} value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
    {error && <p className="form-note error-note" role="alert">{error}</p>}
    <button className="primary-btn" type="submit" disabled={busy || !token}>{busy ? "Menyimpan…" : "Simpan kata sandi baru"}</button>
  </form>
}
