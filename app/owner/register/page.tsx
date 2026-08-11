import Link from "next/link"
import { OwnerRegisterForm } from "@/components/owner-register-form"

export default function OwnerRegisterPage() {
  return <main className="owner-auth-page"><div className="owner-auth-shell"><Link className="wordmark" href="/"><span className="wordmark-mark" aria-hidden="true">TB</span>TEMUBENGKEL</Link><div className="owner-auth-heading"><p className="eyebrow">Portal pemilik bengkel</p><h1>Buat akun pemilik.</h1><p>Akun ini hanya untuk mendaftarkan dan mengelola informasi bengkel di TEMUBENGKEL.</p></div><OwnerRegisterForm /><p className="owner-auth-switch">Sudah punya akun? <Link href="/owner/login">Masuk</Link></p></div></main>
}
