"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import { ArrowLeft, Building2, Home, LogOut, Menu, Settings, X } from "lucide-react"
import { Brand } from "@/components/brand"

const items = [
  { href: "/owner/dashboard", label: "Home", icon: Home },
  { href: "/owner/workshops", label: "Bengkel", icon: Building2 },
  { href: "/owner/settings", label: "Pengaturan", icon: Settings },
]

export function OwnerConsoleShell({ children, userName }: { children: React.ReactNode; userName?: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null)
    router.replace("/")
    router.refresh()
  }

  return (
    <main className="console-page owner-console-page">
      <div className="console-mobile-head">
        <Brand compact />
        <button type="button" className="console-menu-btn" onClick={() => setOpen((value) => !value)} aria-label="Buka menu owner">
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      <aside className={`console-sidebar owner-console-sidebar ${open ? "is-open" : ""}`}>
        <div className="console-sidebar-brand">
          <Brand compact />
          <span>OWNER CONSOLE</span>
        </div>
        <nav className="console-nav" aria-label="Navigasi portal pemilik">
          {items.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href || (item.href === "/owner/workshops" && pathname.startsWith("/owner/workshops/"))
            return <Link key={item.href} href={item.href} className={active ? "active" : ""} onClick={() => setOpen(false)}><Icon size={16} /><span>{item.label}</span></Link>
          })}
        </nav>
        <div className="console-sidebar-foot">
          {userName && <div className="console-account-chip"><small>MASUK SEBAGAI</small><strong>{userName}</strong></div>}
          <Link href="/" className="console-foot-link" onClick={() => setOpen(false)}><ArrowLeft size={15} />Kembali ke pengguna</Link>
          <button type="button" className="console-foot-link danger" onClick={() => void logout()}><LogOut size={15} />Keluar portal</button>
        </div>
      </aside>
      {open && <button className="console-backdrop" type="button" aria-label="Tutup menu" onClick={() => setOpen(false)} />}
      <section className="console-main">{children}</section>
    </main>
  )
}
