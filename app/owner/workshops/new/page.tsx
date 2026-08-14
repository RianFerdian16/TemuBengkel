import Link from "next/link"
import { OwnerConsoleShell } from "@/components/owner-console-shell"
import { OwnerWorkshopForm } from "@/components/owner-workshop-form"
import { requireOwnerSession } from "@/lib/console-access"

export default async function NewWorkshopPage() {
  const session = await requireOwnerSession()
  return (
    <OwnerConsoleShell userName={session.user.fullName}>
      <div className="console-content owner-editor-content">
        <Link className="back-link" href="/owner/workshops">← Kembali ke bengkel</Link>
        <div className="console-page-head compact-head"><div><p className="eyebrow">Data bengkel</p><h1>Tambah bengkel.</h1><p>Isi informasi yang mudah dipahami pelanggan lalu tentukan titik lokasi seakurat mungkin.</p></div></div>
        <OwnerWorkshopForm />
      </div>
    </OwnerConsoleShell>
  )
}
