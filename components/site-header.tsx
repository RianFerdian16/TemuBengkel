"use client"

import Link from "next/link"
import { MapPin, UserRound } from "lucide-react"
import { usePathname } from "next/navigation"
import { Brand } from "@/components/brand"
import { MobileNav } from "@/components/mobile-nav"

export function SiteHeader({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname()
  const isSearchContext = pathname.startsWith("/search") || pathname.startsWith("/bengkel/")
  const mobileLabel = isSearchContext ? "Cari Bengkel" : "TemuBengkel"
  const mobileHref = isSearchContext ? "/search" : "/"

  return (
    <>
      <header className="site-header">
        <div className="shell header-inner desktop-header-inner">
          <Brand />
          {!compact && (
            <nav className="header-nav" aria-label="Navigasi desktop">
              <Link className="header-link" href="/">Beranda</Link>
              <Link className="header-link" href="/search">Cari bengkel</Link>
              <Link className="owner-link" href="/owner/login">Portal pemilik <span aria-hidden="true">↗</span></Link>
            </nav>
          )}
        </div>
        <div className="mobile-app-header">
          <Link className="mobile-header-brand" href={mobileHref}>
            <span className="mobile-header-brand-icon"><MapPin size={13} /></span>
            <span>{mobileLabel}</span>
          </Link>
          <Link className="mobile-profile-link" href="/owner/login" aria-label="Portal pemilik bengkel">
            <UserRound size={14} />
          </Link>
        </div>
      </header>
      {!compact && <MobileNav />}
    </>
  )
}
