import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft, LockKeyhole, ShieldCheck, Workflow } from "lucide-react"
import { AdminLoginForm } from "@/components/admin-login-form"
import { Brand } from "@/components/brand"
import { getAdminAuthSession } from "@/lib/auth"

export default async function AdminLoginPage() {
  const session = await getAdminAuthSession().catch(() => null)
  if (session) redirect("/admin")

  return (
    <main className="owner-auth-page admin-auth-page">
      <div className="owner-auth-shell admin-auth-shell">
        <section className="owner-auth-intro admin-auth-intro">
          <div className="owner-auth-brand-row"><Brand /><Link className="owner-auth-back" href="/"><ArrowLeft size={13} /><span>Halaman pengguna</span></Link></div>
          <div className="owner-auth-heading">
            <p className="eyebrow">Admin Console</p>
            <h1>Review listing dengan kontrol yang jelas.</h1>
            <p>Area ini khusus administrator TemuBengkel. Akses dan aksi moderasi selalu diverifikasi di server.</p>
          </div>
          <div className="owner-auth-points" aria-label="Fungsi admin"><span><ShieldCheck size={17} /> Review & moderasi</span><span><Workflow size={17} /> Pending → keputusan</span><span><LockKeyhole size={17} /> Session admin terpisah</span></div>
        </section>
        <section className="owner-auth-card admin-auth-card">
          <div className="owner-auth-card-heading"><span>ADMIN ACCESS</span><h2>Masuk ke console</h2><p>Gunakan akun dengan role ADMIN. Akun pemilik biasa tidak dapat masuk.</p></div>
          <AdminLoginForm />
          <p className="owner-auth-switch">Bukan admin? <Link href="/">Kembali ke TemuBengkel</Link></p>
        </section>
      </div>
    </main>
  )
}
