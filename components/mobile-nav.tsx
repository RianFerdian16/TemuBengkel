"use client"

import Link from "next/link"
import { Home, Search, Wrench } from "lucide-react"
import { usePathname } from "next/navigation"

export function MobileNav() {
  const pathname = usePathname()
  const items = [
    { href: "/", label: "Beranda", icon: Home, active: pathname === "/" },
    { href: "/search", label: "Cari", icon: Search, active: pathname.startsWith("/search") || pathname.startsWith("/bengkel/") },
    { href: "/owner/login", label: "Bengkel", icon: Wrench, active: pathname.startsWith("/owner") },
  ]

  return (
    <nav className="mobile-nav" aria-label="Navigasi utama">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <Link key={item.href} href={item.href} className={item.active ? "active" : ""}>
            <Icon size={17} strokeWidth={2.1} />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
