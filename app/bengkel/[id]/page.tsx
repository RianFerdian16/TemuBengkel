import Link from "next/link"
import { Clock3, MapPin, MessageCircle, Navigation, Phone, ShieldCheck, Star, Wrench } from "lucide-react"
import { GoogleMap } from "@/components/google-map"
import { SiteHeader } from "@/components/site-header"
import { getWorkshopDetail } from "@/lib/workshop-data"
import { mapsUrl, telUrl, whatsappUrl } from "@/lib/workshops"

export default async function WorkshopPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const workshop = await getWorkshopDetail(decodeURIComponent(id))

  if (!workshop) {
    return (
      <>
        <SiteHeader />
        <main className="page-main">
          <div className="shell narrow-shell">
            <Link className="back-link" href="/search">← Kembali ke pencarian</Link>
            <div className="surface empty-state detail-empty">
              <div>
                <h1>Bengkel tidak dapat dimuat</h1>
                <p>Data bengkel tidak tersedia, listing belum disetujui, atau integrasi belum dikonfigurasi.</p>
                <Link className="primary-btn inline-btn" href="/search">Cari bengkel lain</Link>
              </div>
            </div>
          </div>
        </main>
      </>
    )
  }

  const googleMaps = mapsUrl(workshop)
  const wa = whatsappUrl(workshop.whatsapp || workshop.phone)
  const phone = telUrl(workshop.phone)
  const hasRating = typeof workshop.rating === "number"
  const hasGoogleSource = workshop.source === "google" || Boolean(workshop.googlePlaceId)
  const hasOwnerSource = workshop.source === "owner" || Boolean(workshop.ownerListingId)
  const hasInfo = Boolean(workshop.description || workshop.services?.length)
  const hasHours = Boolean(workshop.openingHours?.length)

  return (
    <>
      <SiteHeader />
      <main className="detail-main detail-main-v15">
        <div className="shell">
          <Link className="back-link detail-back-link" href="/search">← Kembali ke pencarian</Link>

          <section className="surface detail-overview-v15">
            <div className="detail-overview-copy-v15">
              <div className="detail-status-row">
                {workshop.isOpenNow !== undefined && (
                  <span className={`status-pill ${workshop.isOpenNow ? "open" : "closed"}`}>
                    {workshop.isOpenNow ? "Buka sekarang" : "Tutup"}
                  </span>
                )}
                {workshop.mechanicCallAvailable && (
                  <span className="service-badge"><Wrench size={14} />Montir panggilan tersedia</span>
                )}
              </div>

              <p className="detail-kicker-v15">Bengkel motor</p>
              <h1>{workshop.name}</h1>

              {workshop.address && (
                <div className="detail-address-v15">
                  <MapPin size={18} />
                  <span>{workshop.address}</span>
                </div>
              )}
            </div>

            {hasGoogleSource ? (
              <div className="detail-rating-card-v15" aria-label="Rating Google Maps">
                <span className="detail-rating-label-v15">Rating Google Maps</span>
                <div className="detail-rating-number-v15">
                  <Star size={22} fill="currentColor" />
                  <strong>{hasRating ? workshop.rating!.toFixed(1) : "—"}</strong>
                </div>
                <span className="detail-review-count-v15">
                  {workshop.reviewCount
                    ? `${workshop.reviewCount.toLocaleString("id-ID")} ulasan`
                    : "Rating belum tersedia"}
                </span>
              </div>
            ) : (
              <div className="detail-rating-card-v15 detail-owner-source-card" aria-label="Listing TemuBengkel terverifikasi">
                <span className="detail-rating-label-v15">Listing TemuBengkel</span>
                <div className="detail-owner-source-mark"><ShieldCheck size={28} /><strong>Terverifikasi</strong></div>
                <span className="detail-review-count-v15">Data bengkel telah melalui review admin sebelum tampil publik.</span>
              </div>
            )}

            <div className="action-row detail-contact-actions detail-contact-actions-v15" aria-label="Hubungi bengkel">
              {wa && (
                <a className="primary-btn action-btn whatsapp-action" href={wa} target="_blank" rel="noreferrer">
                  <MessageCircle size={17} />
                  <span>WhatsApp</span>
                </a>
              )}
              {phone && (
                <a className="secondary-btn action-btn compact-contact-action" href={phone} aria-label="Telepon bengkel" title="Telepon">
                  <Phone size={17} />
                  <span className="compact-contact-label">Telepon</span>
                </a>
              )}
              {googleMaps && (
                <a className="secondary-btn action-btn compact-contact-action" href={googleMaps} target="_blank" rel="noreferrer" aria-label="Buka bengkel di Google Maps" title="Google Maps">
                  <Navigation size={17} />
                  <span className="compact-contact-label">Google Maps</span>
                </a>
              )}
            </div>
          </section>

          <section className="detail-map-section-v15">
            <div className="detail-section-heading-v15">
              <div>
                <p className="detail-section-kicker-v15">Lokasi</p>
                <h2>Temukan bengkel di peta</h2>
              </div>
              <span className="detail-map-note-v15">Peta interaktif</span>
            </div>
            <div className="surface detail-map-wrap detail-map-wrap-v15">
              <GoogleMap workshops={[workshop]} selectedId={workshop.id} className="detail-map detail-map-v15" />
            </div>
          </section>

          {(hasHours || hasInfo) && (
            <div className={`detail-info-grid-v15 ${hasHours && hasInfo ? "two" : "one"}`}>
              {hasHours && (
                <section className="surface detail-info-card-v15">
                  <div className="detail-info-card-title-v15">
                    <Clock3 size={19} />
                    <div>
                      <span>Operasional</span>
                      <h2>Jam buka</h2>
                    </div>
                  </div>
                  <div className="hours-list detail-hours-list-v15">
                    {workshop.openingHours!.map((line) => <div key={line}>{line}</div>)}
                  </div>
                </section>
              )}

              {hasInfo && (
                <section className="surface detail-info-card-v15">
                  <div className="detail-info-card-title-v15">
                    <Wrench size={19} />
                    <div>
                      <span>Layanan</span>
                      <h2>Informasi bengkel</h2>
                    </div>
                  </div>
                  {workshop.description && <p className="body-copy detail-body-copy-v15">{workshop.description}</p>}
                  {workshop.services?.length ? (
                    <div className="service-list detail-service-list-v15">
                      {workshop.services.map((service) => <span key={service}>{service}</span>)}
                    </div>
                  ) : null}
                </section>
              )}
            </div>
          )}

          <div className="places-attribution-block detail-source-v15">
            <span>
              Sumber data: <strong>{hasGoogleSource && hasOwnerSource ? "Google Maps + data pemilik terverifikasi" : hasGoogleSource ? "Google Maps" : "TemuBengkel"}</strong>
            </span>
            {hasGoogleSource && workshop.attributions?.map((attribution, index) => (
              attribution.providerUri
                ? <a key={`${attribution.provider || "provider"}-${index}`} href={attribution.providerUri} target="_blank" rel="noreferrer">{attribution.provider || "Penyedia data"}</a>
                : <span key={index}>{attribution.provider}</span>
            ))}
          </div>
        </div>
      </main>
    </>
  )
}
