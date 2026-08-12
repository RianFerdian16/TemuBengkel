import Link from "next/link"
import { Wrench } from "lucide-react"

export function Brand({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link className={`wordmark ${compact ? "wordmark-compact" : ""}`} href={href} aria-label="TEMUBENGKEL beranda">
      <span className="wordmark-mark" aria-hidden="true">
        <span className="wordmark-core"><Wrench size={14} strokeWidth={2.4} /></span>
      </span>
      {!compact && <span className="wordmark-text">TEMU<span>BENGKEL</span></span>}
    </Link>
  )
}
