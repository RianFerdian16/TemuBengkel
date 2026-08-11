import Link from "next/link"
import { MapPin, Route, Star } from "lucide-react"
import { HomeExperience } from "@/components/home-experience"
import { SiteHeader } from "@/components/site-header"

export default function Page() {
  return (
    <>
      <SiteHeader />
      <main>
        <HomeExperience />
        <section className="section value-section">
          <div className="shell">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Cara kerja</p>
                <h2>Dari lokasi ke bengkel dalam beberapa langkah.</h2>
              </div>
              <Link className="header-link" href="/search">Buka pencarian</Link>
            </div>
            <div className="value-grid">
              <article className="value-item"><MapPin size={21} /><h3>Pilih lokasi</h3><p>Gunakan lokasi perangkat atau ketik area secara manual.</p></article>
              <article className="value-item"><Star size={21} /><h3>Bandingkan bengkel</h3><p>Lihat jarak, jam buka, rating, dan ulasan Google yang tersedia.</p></article>
              <article className="value-item"><Route size={21} /><h3>Buka rute</h3><p>Pilih bengkel lalu lanjutkan navigasi di Google Maps resmi.</p></article>
            </div>
          </div>
        </section>
      </main>
      <footer className="footer">
        <div className="shell footer-row"><span>© 2026 TEMUBENGKEL</span><div className="footer-links"><Link href="/privacy">Privasi</Link><Link href="/terms">Ketentuan</Link></div></div>
      </footer>
    </>
  )
}
