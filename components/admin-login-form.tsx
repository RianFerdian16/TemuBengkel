"use client"

import Link from "next/link"
import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"

export function AdminLoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const response = await fetch("/api/auth/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || "Login admin gagal")
      router.replace("/admin")
      router.refresh()
    } catch (error) {
      setError(error instanceof Error ? error.message : "Login admin gagal")
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="surface owner-form admin-login-form" onSubmit={submit}>
      <label htmlFor="admin-email">Email admin</label>
      <input id="admin-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required />
      <div className="auth-label-row"><label htmlFor="admin-password">Kata sandi</label><Link href="/owner/forgot-password">Lupa kata sandi?</Link></div>
      <input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
      {error && <p className="form-note error-note" role="alert">{error}</p>}
      <button className="primary-btn" type="submit" disabled={busy}>{busy ? "Memverifikasi…" : "Masuk sebagai Admin"}</button>
    </form>
  )
}
