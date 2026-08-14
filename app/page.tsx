import Link from "next/link"
import { HomeExperience } from "@/components/home-experience"
import { SiteHeader } from "@/components/site-header"
import { getAdminAuthSession } from "@/lib/auth"

export default async function Page() {
  const adminSession = await getAdminAuthSession().catch(() => null)
  return (
    <div className="user-app-page home-app-page">
      <SiteHeader />
      <main className="user-app-main">
        <HomeExperience showAdminLink={Boolean(adminSession)} />
      </main>
      <footer className="landing-footer">
        <div className="landing-shell landing-footer-inner">
          <span>© 2026 TEMUBENGKEL</span>
          <div><Link href="/privacy">Privasi</Link><Link href="/terms">Ketentuan</Link><a href="/admin" target="_blank" rel="noopener noreferrer">Admin Console ↗</a></div>
        </div>
      </footer>
    </div>
  )
}
