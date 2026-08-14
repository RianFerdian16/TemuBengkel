import Link from "next/link"
import { ArrowLeft, KeyRound } from "lucide-react"
import { Brand } from "@/components/brand"
import { ForgotPasswordForm } from "@/components/password-recovery-form"

export default function ForgotPasswordPage() {
  return <main className="owner-auth-page"><div className="owner-auth-shell owner-auth-shell-compact">
    <section className="owner-auth-intro"><div className="owner-auth-brand-row"><Brand /><Link className="owner-auth-back" href="/owner/login"><ArrowLeft size={13}/><span>Kembali login</span></Link></div><div className="owner-auth-heading"><p className="eyebrow">Keamanan akun</p><h1>Pulihkan akses akun.</h1><p>Masukkan email akun. Jika terdaftar, kami kirim tautan reset yang hanya berlaku sementara.</p></div><div className="owner-auth-points"><span><KeyRound size={17}/> Tautan sekali pakai</span></div></section>
    <section className="owner-auth-card"><div className="owner-auth-card-heading"><span>PASSWORD RECOVERY</span><h2>Lupa kata sandi</h2><p>Kami tidak akan mengungkap apakah sebuah email terdaftar.</p></div><ForgotPasswordForm /></section>
  </div></main>
}
