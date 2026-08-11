import Link from "next/link"
import { OwnerLoginForm } from "@/components/owner-login-form"

export default function OwnerLoginPage() {
  return <main className="owner-auth-page"><div className="owner-auth-shell"><Link className="wordmark" href="/"><span className="wordmark-mark" aria-hidden="true">TB</span>TEMUBENGKEL</Link><div className="owner-auth-heading"><p className="eyebrow">Portal pemilik bengkel</p><h1>Masuk untuk mengelola bengkel.</h1><p>Gunakan akun pemilik. Pengguna yang hanya mencari bengkel tidak perlu login.</p></div><OwnerLoginForm /><p className="owner-auth-switch">Belum punya akun? <Link href="/owner/register">Daftar sebagai pemilik</Link></p></div></main>
}
