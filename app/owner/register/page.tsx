import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft, BadgeCheck, MapPinned, Wrench } from "lucide-react"
import { Brand } from "@/components/brand"
import { OwnerRegisterForm } from "@/components/owner-register-form"
import { getAuthSession } from "@/lib/auth"

export default async function OwnerRegisterPage() {
  const session = await getAuthSession().catch(() => null)
  if (session) redirect("/owner/dashboard")

  return (
    <main className="owner-auth-page">
      <div className="owner-auth-shell">
        <section className="owner-auth-intro">
          <div className="owner-auth-brand-row">
            <Brand />
            <Link className="owner-auth-back" href="/">
              <ArrowLeft size={13} strokeWidth={2.2} />
              <span>Halaman pengguna</span>
            </Link>
          </div>
          <div className="owner-auth-heading">
            <p className="eyebrow">Portal pemilik bengkel</p>
            <h1>Daftarkan bengkel dengan data yang lebih rapi.</h1>
            <p>Akun pemilik digunakan khusus untuk mengelola informasi tambahan TEMUBENGKEL tanpa mengganti sumber data Google Maps.</p>
          </div>
          <div className="owner-auth-points" aria-label="Fitur portal pemilik">
            <span><MapPinned size={17} /> Sinkronkan lokasi</span>
            <span><BadgeCheck size={17} /> Review sebelum tayang</span>
            <span><Wrench size={17} /> Lengkapi layanan</span>
          </div>
        </section>
        <section className="owner-auth-card">
          <div className="owner-auth-card-heading"><span>NEW OWNER</span><h2>Buat akun pemilik</h2><p>Gunakan email aktif untuk mengelola listing bengkel Anda.</p></div>
          <OwnerRegisterForm />
          <p className="owner-auth-switch">Sudah punya akun? <Link href="/owner/login">Masuk</Link></p>
        </section>
      </div>
    </main>
  )
}
