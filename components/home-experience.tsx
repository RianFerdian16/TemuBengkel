import Link from "next/link"
import {
  ArrowRight,
  Clock3,
  ExternalLink,
  MapPin,
  Navigation,
  Search,
  ShieldCheck,
  Star,
  Wrench,
} from "lucide-react"

const steps = [
  {
    index: "01",
    title: "Cari",
    copy: "Pilih area atau gunakan lokasi perangkat dari menu Cari.",
    icon: Search,
  },
  {
    index: "02",
    title: "Bandingkan",
    copy: "Lihat jarak, status buka, rating, layanan, dan detail penting.",
    icon: Star,
  },
  {
    index: "03",
    title: "Berangkat",
    copy: "Pilih bengkel yang cocok lalu lanjutkan arah melalui Google Maps.",
    icon: Navigation,
  },
]

export function HomeExperience({ showAdminLink = false }: { showAdminLink?: boolean }) {
  return (
    <div className="landing-home">
      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-shell landing-hero-grid">
          <div className="landing-hero-copy">
            <div className="landing-kicker"><span>TB / 01</span><b>Bengkel motor di sekitar Anda</b></div>
            <h1 id="landing-title">Temukan bengkel.<br /><span>Tanpa muter-muter.</span></h1>
            <p className="landing-lead">
              TemuBengkel membantu Anda menemukan bengkel motor terdekat, membandingkan informasi penting,
              lalu membuka arah perjalanan tanpa alur yang ribet.
            </p>

            <div className="landing-actions">
              <Link className="landing-primary" href="/search">
                Cari bengkel sekarang <ArrowRight size={17} />
              </Link>
              <Link className="landing-secondary" href="/owner/login">
                <Wrench size={16} /> Portal pemilik bengkel
              </Link>
              {showAdminLink && (
                <a className="landing-admin-link" href="/admin" target="_blank" rel="noopener noreferrer">
                  <ExternalLink size={16} /> Admin Console
                </a>
              )}
            </div>

            <div className="landing-proof" aria-label="Informasi yang tersedia di TemuBengkel">
              <span><MapPin size={14} /> Jarak & lokasi</span>
              <span><Clock3 size={14} /> Status buka</span>
              <span><Star size={14} /> Rating</span>
            </div>
          </div>

          <div className="landing-signal" aria-label="Ringkasan alur TemuBengkel">
            <div className="landing-signal-head">
              <span>FIND / COMPARE / GO</span>
              <b>LIVE UTILITY</b>
            </div>
            <div className="landing-signal-main">
              <div className="landing-pin-visual" aria-hidden="true">
                <svg className="landing-pin-mark" viewBox="0 0 56 72" role="presentation">
                  <path d="M28 1.5C13.64 1.5 2 13.14 2 27.5c0 19.7 23.28 41.28 24.27 42.19a2.55 2.55 0 0 0 3.46 0C30.72 68.78 54 47.2 54 27.5 54 13.14 42.36 1.5 28 1.5Z" />
                  <circle className="landing-pin-ring" cx="28" cy="27.5" r="10.5" />
                  <circle className="landing-pin-dot" cx="28" cy="27.5" r="4.25" />
                </svg>
              </div>
              <div>
                <small>ALUR UTAMA</small>
                <strong>Lokasi → Bengkel → Arah</strong>
                <p>Satu tempat untuk mengambil keputusan sebelum berangkat.</p>
              </div>
            </div>
            <div className="landing-signal-grid">
              <div><span>01</span><b>DEKAT</b><small>Urutkan dari jarak</small></div>
              <div><span>02</span><b>JELAS</b><small>Cek info penting</small></div>
              <div><span>03</span><b>LANGSUNG</b><small>Buka navigasi</small></div>
            </div>
            <div className="landing-signal-foot"><span>TemuBengkel / Utility for riders</span><Navigation size={16} /></div>
          </div>
        </div>
      </section>

      <section className="landing-process" aria-labelledby="landing-process-title">
        <div className="landing-shell">
          <div className="landing-section-head">
            <div>
              <span className="landing-section-index">TB / 02</span>
              <h2 id="landing-process-title">Satu tujuan. Tiga langkah.</h2>
            </div>
            <p>Beranda menjelaskan produknya. Semua fungsi pencarian tetap berada di menu Cari.</p>
          </div>

          <div className="landing-step-grid">
            {steps.map((step) => {
              const Icon = step.icon
              return (
                <article className="landing-step" key={step.index}>
                  <div className="landing-step-top"><span>{step.index}</span><Icon size={21} /></div>
                  <h3>{step.title}</h3>
                  <p>{step.copy}</p>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="landing-trust" aria-labelledby="landing-trust-title">
        <div className="landing-shell landing-trust-grid">
          <div className="landing-trust-copy">
            <span className="landing-section-index">TB / 03</span>
            <h2 id="landing-trust-title">Informasi yang membantu, bukan dekorasi.</h2>
            <p>
              Fokus TemuBengkel tetap pada hal yang dibutuhkan pengendara: lokasi, jarak, status operasional,
              rating, layanan, dan akses arah.
            </p>
            <Link href="/search" className="landing-text-link">Buka pencarian <ArrowRight size={15} /></Link>
          </div>
          <div className="landing-trust-list">
            <div><span><MapPin size={17} /></span><strong>Berbasis lokasi</strong><p>Cari area manual atau gunakan lokasi perangkat saat dibutuhkan.</p></div>
            <div><span><ShieldCheck size={17} /></span><strong>Mudah dibandingkan</strong><p>Informasi penting dibuat cepat dipindai sebelum memilih bengkel.</p></div>
            <div><span><Navigation size={17} /></span><strong>Langsung ke tujuan</strong><p>Dari hasil pencarian, lanjutkan ke detail dan navigasi.</p></div>
          </div>
        </div>
      </section>

      <section className="landing-owner-band">
        <div className="landing-shell landing-owner-inner">
          <div>
            <span className="landing-section-index inverse">UNTUK PEMILIK BENGKEL</span>
            <h2>Punya bengkel? Kelola listing dari portal pemilik.</h2>
          </div>
          <Link href="/owner/login">Masuk portal <ArrowRight size={16} /></Link>
        </div>
      </section>
    </div>
  )
}
