import Link from "next/link"
import { HomeExperience } from "@/components/home-experience"
import { SiteHeader } from "@/components/site-header"

export default function Page() {
  return (
    <div className="user-app-page home-app-page">
      <SiteHeader />
      <main className="user-app-main">
        <HomeExperience />
      </main>
      <footer className="landing-footer">
        <div className="landing-shell landing-footer-inner">
          <span>© 2026 TEMUBENGKEL</span>
          <div><Link href="/privacy">Privasi</Link><Link href="/terms">Ketentuan</Link></div>
        </div>
      </footer>
    </div>
  )
}
