import Link from "next/link"
import { OwnerConsoleShell } from "@/components/owner-console-shell"
import { OwnerWorkshopForm } from "@/components/owner-workshop-form"
import { requireOwnerSession } from "@/lib/console-access"

export default async function EditWorkshopPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireOwnerSession()
  const { id } = await params
  return (
    <OwnerConsoleShell userName={session.user.fullName}>
      <div className="console-content owner-editor-content">
        <Link className="back-link" href="/owner/workshops">← Kembali ke bengkel</Link>
        <div className="console-page-head compact-head"><div><p className="eyebrow">Data bengkel</p><h1>Edit informasi.</h1><p>Setiap perubahan dikembalikan ke status pending agar data publik tetap terjaga.</p></div></div>
        <OwnerWorkshopForm workshopId={id} />
      </div>
    </OwnerConsoleShell>
  )
}
