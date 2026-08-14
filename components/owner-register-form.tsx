"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"

export function OwnerRegisterForm() {
  const router = useRouter()
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true); setError(null); setMessage(null)
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, password }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || "Pendaftaran gagal")
      if (payload.signedIn) {
        router.push("/owner/dashboard")
        router.refresh()
      } else {
        setMessage(payload.message || "Akun dibuat. Periksa email untuk verifikasi.")
      }
    } catch (err) { setError(err instanceof Error ? err.message : "Pendaftaran gagal") }
    finally { setBusy(false) }
  }

  return (
    <form className="surface owner-form" onSubmit={submit}>
      <label htmlFor="owner-name">Nama pemilik</label>
      <input id="owner-name" value={fullName} onChange={(e) => setFullName(e.target.value)} minLength={2} maxLength={120} required />
      <label htmlFor="owner-register-email">Email</label>
      <input id="owner-register-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <label htmlFor="owner-register-password">Kata sandi</label>
      <input id="owner-register-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} maxLength={128} required />
      <p className="form-note">Minimal 8 karakter. Gunakan email aktif agar pemulihan akun tetap tersedia.</p>
      {error && <p className="form-note error-note" role="alert">{error}</p>}
      {message && <p className="form-note success-note" role="status">{message}</p>}
      <button className="primary-btn" type="submit" disabled={busy}>{busy ? "Membuat akun…" : "Daftar sebagai pemilik"}</button>
    </form>
  )
}
