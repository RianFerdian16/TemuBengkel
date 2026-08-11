import Link from "next/link"

export function SiteHeader({ compact = false }: { compact?: boolean }) {
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link className="wordmark" href="/" aria-label="TEMUBENGKEL beranda">
          <span className="wordmark-mark" aria-hidden="true">TB</span>
          <span>TEMUBENGKEL</span>
        </Link>
        {!compact && <Link className="header-link" href="/owner/login">Untuk pemilik bengkel</Link>}
      </div>
    </header>
  )
}
