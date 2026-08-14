import Link from "next/link"
import { ArrowLeft, ShieldCheck } from "lucide-react"
import { Brand } from "@/components/brand"
import { ResetPasswordForm } from "@/components/password-recovery-form"

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams
  return <main className="owner-auth-page"><div className="owner-auth-shell owner-auth-shell-compact">
    <section className="owner-auth-intro"><div className="owner-auth-brand-row"><Brand /><Link className="owner-auth-back" href="/owner/login"><ArrowLeft size={13}/><span>Kembali login</span></Link></div><div className="owner-auth-heading"><p className="eyebrow">Keamanan akun</p><h1>Buat kata sandi baru.</h1><p>Setelah berhasil, seluruh sesi lama akun akan dicabut supaya akses lama tidak tetap aktif.</p></div><div className="owner-auth-points"><span><ShieldCheck size={17}/> Semua sesi lama dicabut</span></div></section>
    <section className="owner-auth-card"><div className="owner-auth-card-heading"><span>RESET PASSWORD</span><h2>Atur ulang kata sandi</h2><p>Gunakan minimal 8 karakter dan hindari kata sandi yang dipakai di layanan lain.</p></div>{token ? <ResetPasswordForm token={token} /> : <p className="form-note error-note">Tautan reset tidak lengkap atau tidak valid.</p>}</section>
  </div></main>
}
