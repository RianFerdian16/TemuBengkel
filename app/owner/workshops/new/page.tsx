import Link from "next/link"
import { Brand } from "@/components/brand"
import { OwnerWorkshopForm } from "@/components/owner-workshop-form"

export default function NewWorkshopPage() {
  return <main className="page-main owner-page"><div className="shell owner-editor-shell"><div className="owner-topbar"><Brand /><span>OWNER CONSOLE</span></div><Link className="back-link" href="/owner/dashboard">← Kembali ke dashboard</Link><div className="owner-editor-heading"><p className="eyebrow">Data bengkel</p><h1>Tambah bengkel</h1><p>Isi informasi bengkel yang mudah dipahami pelanggan. Lokasi peta akan ditentukan otomatis dari alamat, jadi owner tidak perlu mengisi koordinat.</p></div><OwnerWorkshopForm /></div></main>
}
