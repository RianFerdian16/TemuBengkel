import Link from "next/link"
import { notFound } from "next/navigation"
import { Building2, Clock3, MapPin, Phone, UserRound, Wrench } from "lucide-react"
import { AdminConsoleShell } from "@/components/admin-console-shell"
import { AdminModerationActions } from "@/components/admin-moderation-actions"
import { AdminWorkshopMap } from "@/components/admin-workshop-map"
import { getAdminWorkshopById } from "@/lib/admin-repository"
import { requireAdminSession } from "@/lib/console-access"

function cleanId(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ? id : null
}

export default async function AdminWorkshopReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession()
  const { id } = await params
  const safeId = cleanId(id)
  if (!safeId) notFound()
  const workshop = await getAdminWorkshopById(safeId)
  if (!workshop) notFound()

  return (
    <AdminConsoleShell userName={session.user.fullName}>
      <div className="console-content admin-review-content">
        <Link href={workshop.status === "pending" ? "/admin/reviews" : "/admin/workshops"} className="back-link">← Kembali ke daftar</Link>
        <div className="console-page-head admin-review-head"><div><p className="eyebrow">Review bengkel</p><h1>{workshop.name}</h1><p>{workshop.address || "Alamat belum tersedia"}</p></div><span className={`status-pill owner-${workshop.status}`}>{workshop.status}</span></div>

        <div className="admin-review-grid">
          <div className="admin-review-main">
            <section className="surface admin-review-section">
              <div className="admin-section-headline"><Building2 size={18} /><div><span>INFORMASI BENGKEL</span><h2>Data utama</h2></div></div>
              <dl className="admin-detail-list">
                <div><dt>Nama</dt><dd>{workshop.name}</dd></div>
                <div><dt>Alamat</dt><dd>{workshop.address || "—"}</dd></div>
                <div><dt>Telepon</dt><dd>{workshop.phone || "—"}</dd></div>
                <div><dt>WhatsApp</dt><dd>{workshop.whatsapp || "—"}</dd></div>
                <div><dt>Panggil mekanik</dt><dd>{workshop.mechanicCallAvailable ? "Tersedia" : "Tidak tersedia"}</dd></div>
                <div><dt>Google Place ID</dt><dd className="break-text">{workshop.googlePlaceId || "—"}</dd></div>
              </dl>
            </section>

            <section className="surface admin-review-section">
              <div className="admin-section-headline"><Wrench size={18} /><div><span>LAYANAN</span><h2>Layanan & deskripsi</h2></div></div>
              {workshop.services.length ? <div className="admin-service-chips">{workshop.services.map((service: string) => <span key={service}>{service}</span>)}</div> : <p className="admin-empty-copy">Belum ada layanan yang dipilih.</p>}
              <p className="admin-description-copy">{workshop.description || "Tidak ada deskripsi tambahan."}</p>
            </section>

            <section className="surface admin-review-section">
              <div className="admin-section-headline"><Clock3 size={18} /><div><span>JAM OPERASIONAL</span><h2>Jadwal mingguan</h2></div></div>
              <div className="admin-hours-list">{workshop.openingHours.length ? workshop.openingHours.map((line: string) => <div key={line}>{line}</div>) : <span>Belum ada jadwal.</span>}</div>
            </section>

            <section className="surface admin-review-section admin-map-section">
              <div className="admin-section-headline"><MapPin size={18} /><div><span>LOKASI</span><h2>Titik yang dipilih owner</h2></div></div>
              <AdminWorkshopMap workshop={workshop} />
              {typeof workshop.latitude === "number" && typeof workshop.longitude === "number" && <div className="admin-coordinate-line">{workshop.latitude.toFixed(6)}, {workshop.longitude.toFixed(6)}</div>}
            </section>
          </div>

          <aside className="admin-review-side">
            <section className="surface admin-owner-summary">
              <div className="admin-section-headline"><UserRound size={18} /><div><span>PEMILIK</span><h2>Pengirim listing</h2></div></div>
              <strong>{workshop.owner?.deletedAt ? "Akun dihapus" : workshop.owner?.fullName || "—"}</strong>
              <span>{workshop.owner?.deletedAt ? "—" : workshop.owner?.email || "—"}</span>
              <div className="admin-owner-contact"><Phone size={14} />Kontak bengkel: {workshop.phone || workshop.whatsapp || "belum tersedia"}</div>
            </section>
            <AdminModerationActions workshopId={workshop.id} status={workshop.status} rejectionReason={workshop.rejectionReason} />
          </aside>
        </div>
      </div>
    </AdminConsoleShell>
  )
}
