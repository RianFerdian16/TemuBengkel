import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft, BadgeCheck, MapPinned, Wrench } from "lucide-react"
import { Brand } from "@/components/brand"
import { OwnerLoginForm } from "@/components/owner-login-form"
import { getAuthSession } from "@/lib/auth"

export default async function OwnerLoginPage() {
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
            <h1>Kelola listing tanpa mengganggu data publik.</h1>
            <p>Perbarui informasi bengkel TEMUBENGKEL, hubungkan listing Google Maps, dan pantau status moderasi dari satu tempat.</p>
          </div>
          <div className="owner-auth-points" aria-label="Fitur portal pemilik">
            <span><MapPinned size={17} /> Kelola lokasi & kontak</span>
            <span><BadgeCheck size={17} /> Status moderasi jelas</span>
            <span><Wrench size={17} /> Atur layanan bengkel</span>
          </div>
        </section>
        <section className="owner-auth-card">
          <div className="owner-auth-card-heading"><span>OWNER ACCESS</span><h2>Masuk ke dashboard</h2><p>Pengguna yang hanya mencari bengkel tidak perlu login.</p></div>
          <OwnerLoginForm />
          <p className="owner-auth-switch">Belum punya akun? <Link href="/owner/register">Daftar sebagai pemilik</Link></p>
        </section>
      </div>
    </main>
  )
}
