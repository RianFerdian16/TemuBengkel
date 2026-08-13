import Link from "next/link"
import { OwnerTopbar } from "@/components/owner-topbar"
import { OwnerWorkshopForm } from "@/components/owner-workshop-form"

export default async function EditWorkshopPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <main className="page-main owner-page">
      <div className="shell owner-editor-shell">
        <OwnerTopbar />
        <Link className="back-link" href="/owner/dashboard">← Kembali ke dashboard</Link>
        <div className="owner-editor-heading">
          <p className="eyebrow">Data bengkel</p>
          <h1>Edit informasi bengkel</h1>
          <p>Setiap perubahan dikembalikan ke status pending agar data publik tetap terjaga.</p>
        </div>
        <OwnerWorkshopForm workshopId={id} />
      </div>
    </main>
  )
}
