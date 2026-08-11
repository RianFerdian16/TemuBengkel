import Link from "next/link"
import { OwnerWorkshopForm } from "@/components/owner-workshop-form"

export default function NewWorkshopPage() {
  return <main className="page-main"><div className="shell owner-editor-shell"><Link className="back-link" href="/owner/dashboard">← Kembali ke dashboard</Link><div className="owner-editor-heading"><p className="eyebrow">Data bengkel</p><h1>Tambah bengkel</h1><p>Hubungkan ke listing Google Maps jika ada, lalu tambahkan data khusus TEMUBENGKEL seperti WhatsApp, layanan, dan montir panggilan.</p></div><OwnerWorkshopForm /></div></main>
}
