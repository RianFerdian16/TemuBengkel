"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"

export function OwnerLoginForm() {
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
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="surface owner-form" onSubmit={submit}>
      <label htmlFor="owner-email">Email</label>
      <input id="owner-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <label htmlFor="owner-password">Kata sandi</label>
      <input id="owner-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      {error && <p className="form-note error-note" role="alert">{error}</p>}
      <button className="primary-btn" type="submit" disabled={busy}>{busy ? "Memproses…" : "Masuk"}</button>
    </form>
  )
}
