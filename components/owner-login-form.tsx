"use client"

import Link from "next/link"
import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"

export function OwnerLoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true); setError(null); setMessage(null)
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || "Login gagal")
      router.push("/owner/dashboard")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login gagal")
    } finally { setBusy(false) }
  }

  const resendVerification = async () => {
    if (!email.trim()) { setError("Isi email akun terlebih dahulu."); return }
    setBusy(true); setError(null); setMessage(null)
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || "Email verifikasi gagal dikirim")
      setMessage(payload?.message || "Email verifikasi dikirim.")
    } catch (err) { setError(err instanceof Error ? err.message : "Email verifikasi gagal dikirim") }
    finally { setBusy(false) }
  }

  return (
    <form className="surface owner-form" onSubmit={submit}>
      <label htmlFor="owner-email">Email</label>
      <input id="owner-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <div className="auth-label-row"><label htmlFor="owner-password">Kata sandi</label><Link href="/owner/forgot-password">Lupa kata sandi?</Link></div>
      <input id="owner-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      {error && <p className="form-note error-note" role="alert">{error}</p>}
      {message && <p className="form-note success-note" role="status">{message}</p>}
      <button className="primary-btn" type="submit" disabled={busy}>{busy ? "Memproses…" : "Masuk"}</button>
      <button className="auth-text-button" type="button" disabled={busy} onClick={() => void resendVerification()}>Kirim ulang email verifikasi</button>
    </form>
  )
}
