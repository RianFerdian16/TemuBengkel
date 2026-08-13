import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Brand } from "@/components/brand"

export function OwnerTopbar() {
  return (
    <div className="owner-topbar">
      <Brand />
      <div className="owner-topbar-actions">
        <span className="owner-console-label">OWNER CONSOLE</span>
        <Link className="owner-user-return" href="/">
          <ArrowLeft size={13} strokeWidth={2.2} />
          <span>Kembali ke pengguna</span>
        </Link>
      </div>
    </div>
  )
}
