"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import { ArrowLeft, Building2, ExternalLink, Home, LogOut, Menu, Settings, ShieldCheck, UserRound, X } from "lucide-react"
import { Brand } from "@/components/brand"

const items = [
  { href: "/admin", label: "Ringkasan", icon: Home, exact: true },
  { href: "/admin/reviews", label: "Pending Review", icon: ShieldCheck },
  { href: "/admin/workshops", label: "Semua Bengkel", icon: Building2 },
  { href: "/admin/owners", label: "Pemilik", icon: UserRound },
  { href: "/admin/settings", label: "Pengaturan", icon: Settings },
]

export function AdminConsoleShell({ children, userName }: { children: React.ReactNode; userName?: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const logout = async () => {
    await fetch("/api/auth/admin/logout", { method: "POST" }).catch(() => null)
    router.replace("/admin/login")
    router.refresh()
  }

  return (
    <main className="console-page admin-console-page">
      <div className="console-mobile-head admin-mobile-head">
        <Brand compact />
        <button type="button" className="console-menu-btn" onClick={() => setOpen((value) => !value)} aria-label="Buka menu admin">
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>
      <aside className={`console-sidebar admin-console-sidebar ${open ? "is-open" : ""}`}>
        <div className="console-sidebar-brand">
          <Brand compact />
          <span>ADMIN CONSOLE</span>
        </div>
        <nav className="console-nav" aria-label="Navigasi admin">
          {items.map((item) => {
            const Icon = item.icon
            const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`)
            return <Link key={item.href} href={item.href} className={active ? "active" : ""} onClick={() => setOpen(false)}><Icon size={16} /><span>{item.label}</span></Link>
          })}
        </nav>
        <div className="console-sidebar-foot">
          {userName && <div className="console-account-chip admin-chip"><small>ADMIN AKTIF</small><strong>{userName}</strong></div>}
          <a href="/" target="_blank" rel="noopener noreferrer" className="console-foot-link"><ExternalLink size={15} />Buka halaman pengguna</a>
          <Link href="/" className="console-foot-link" onClick={() => setOpen(false)}><ArrowLeft size={15} />Kembali ke pengguna</Link>
          <button type="button" className="console-foot-link danger" onClick={() => void logout()}><LogOut size={15} />Keluar admin</button>
        </div>
      </aside>
      {open && <button className="console-backdrop" type="button" aria-label="Tutup menu" onClick={() => setOpen(false)} />}
      <section className="console-main">{children}</section>
    </main>
  )
}
