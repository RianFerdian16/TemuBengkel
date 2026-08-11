import Link from "next/link"
import { Clock3, MapPin, MessageCircle, Navigation, Phone, Star, Wrench } from "lucide-react"
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
        <main className="page-main"><div className="shell narrow-shell">
          <Link className="back-link" href="/search">← Kembali ke pencarian</Link>
          <div className="surface empty-state detail-empty"><div><h1>Bengkel tidak dapat dimuat</h1><p>Data Google Maps tidak tersedia, listing belum disetujui, atau integrasi belum dikonfigurasi.</p><Link className="primary-btn inline-btn" href="/search">Cari bengkel lain</Link></div></div>
        </div></main>
      </>
    )
  }

  const googleMaps = mapsUrl(workshop)
  const wa = whatsappUrl(workshop.whatsapp)
  const phone = telUrl(workshop.phone)
  const photos = workshop.photos?.slice(0, 3) || []

  return (
    <>
      <SiteHeader />
      <main className="detail-main">
        <div className="shell">
          <Link className="back-link" href="/search">← Kembali ke pencarian</Link>

          <div className={`detail-gallery ${photos.length <= 1 ? "single" : ""}`}>
            {photos.length > 0 ? photos.map((photo, index) => (
              <div className="gallery-photo" key={photo.name}>
                <img src={`/api/places/photo?name=${encodeURIComponent(photo.name)}&w=${index === 0 ? 1200 : 720}`} alt={`Foto ${workshop.name} ${index + 1}`} />
                {(photo.authorAttributions?.length || photo.googleMapsUri) ? (
                  <div className="photo-attribution">
                    {photo.authorAttributions?.map((author, authorIndex) => (
                      author.uri ? <a key={`${author.displayName || "author"}-${authorIndex}`} href={author.uri} target="_blank" rel="noreferrer">Foto: {author.displayName || "Kontributor Google"}</a> : <span key={authorIndex}>Foto: {author.displayName || "Kontributor Google"}</span>
                    ))}
                    {photo.googleMapsUri && <a href={photo.googleMapsUri} target="_blank" rel="noreferrer">Lihat sumber</a>}
                  </div>
                ) : null}
              </div>
            )) : <div className="gallery-placeholder">Foto belum tersedia</div>}
          </div>

          <div className="detail-grid">
            <section className="detail-content">
              <div className="detail-title-row">
                <div>
                  <div className="detail-status-row">
                    {workshop.isOpenNow !== undefined && <span className={`status-pill ${workshop.isOpenNow ? "open" : "closed"}`}>{workshop.isOpenNow ? "Buka sekarang" : "Tutup"}</span>}
                    {workshop.mechanicCallAvailable && <span className="service-badge"><Wrench size={14} />Montir panggilan tersedia</span>}
                  </div>
                  <h1>{workshop.name}</h1>
                  <div className="detail-rating">
                    {typeof workshop.rating === "number" && <span><Star size={17} fill="currentColor" />{workshop.rating.toFixed(1)} {workshop.reviewCount ? `(${workshop.reviewCount.toLocaleString("id-ID")} ulasan)` : ""}</span>}
                    {workshop.address && <span><MapPin size={17} />{workshop.address}</span>}
                  </div>
                </div>
              </div>

              <div className="action-row">
                {googleMaps && <a className="primary-btn action-btn" href={googleMaps} target="_blank" rel="noreferrer"><Navigation size={17} />Buka di Google Maps</a>}
                {wa && <a className="secondary-btn action-btn" href={wa} target="_blank" rel="noreferrer"><MessageCircle size={17} />WhatsApp</a>}
                {phone && <a className="secondary-btn action-btn" href={phone}><Phone size={17} />Telepon</a>}
              </div>

              <section className="detail-section">
                <h2>Lokasi</h2>
                <div className="surface detail-map-wrap">
                  <GoogleMap workshops={[workshop]} selectedId={workshop.id} className="detail-map" />
                </div>
              </section>

              {workshop.openingHours?.length ? (
                <section className="detail-section">
                  <h2><Clock3 size={19} />Jam operasional</h2>
                  <div className="hours-list">{workshop.openingHours.map((line) => <div key={line}>{line}</div>)}</div>
                </section>
              ) : null}

              {(workshop.description || workshop.services?.length) ? (
                <section className="detail-section">
                  <h2>Informasi bengkel</h2>
                  {workshop.description && <p className="body-copy">{workshop.description}</p>}
                  {workshop.services?.length ? <div className="service-list">{workshop.services.map((service) => <span key={service}>{service}</span>)}</div> : null}
                </section>
              ) : null}

              {workshop.reviews?.length ? (
                <section className="detail-section">
                  <div className="section-heading review-heading"><div><h2>Ulasan Google</h2><p className="muted">Ulasan ditampilkan dari data Google Maps yang tersedia.</p></div>{googleMaps && <a className="header-link" href={googleMaps} target="_blank" rel="noreferrer">Lihat di Google Maps</a>}</div>
                  <div className="review-list">
                    {workshop.reviews.map((review, index) => (
                      <article className="review-item" key={`${review.authorName || "review"}-${index}`}>
                        <div className="review-author-row">
                          {review.authorPhotoUri ? <img src={review.authorPhotoUri} alt="" className="review-avatar" /> : <div className="review-avatar review-avatar-fallback" aria-hidden="true">G</div>}
                          <div className="review-author-copy">
                            <div className="review-top">
                              {review.authorUri ? <a href={review.authorUri} target="_blank" rel="noreferrer"><strong>{review.authorName || "Pengguna Google"}</strong></a> : <strong>{review.authorName || "Pengguna Google"}</strong>}
                              <span>{review.rating ? `★ ${review.rating}` : ""}{review.relativePublishTimeDescription ? ` · ${review.relativePublishTimeDescription}` : ""}</span>
                            </div>
                            {review.text && <p>{review.text}</p>}
                            {review.googleMapsUri && <a className="review-source" href={review.googleMapsUri} target="_blank" rel="noreferrer">Lihat ulasan sumber di Google Maps</a>}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ) : null}

              <p className="google-attribution">Informasi publik seperti rating, jam buka, foto, dan ulasan berasal dari Google Maps/Places bila tersedia. Data tambahan TEMUBENGKEL hanya ditampilkan jika telah disediakan pemilik dan disetujui.</p>
            </section>

            <aside className="detail-aside surface">
              <h2>Siap menuju bengkel?</h2>
              <p>Pilih rute resmi Google Maps untuk melihat perjalanan dari lokasi Anda.</p>
              {googleMaps && <a className="primary-btn action-btn full-btn" href={googleMaps} target="_blank" rel="noreferrer"><Navigation size={17} />Buka rute</a>}
              {wa && <a className="secondary-btn action-btn full-btn" href={wa} target="_blank" rel="noreferrer"><MessageCircle size={17} />Hubungi via WhatsApp</a>}
            </aside>
          </div>
        </div>
      </main>
      {googleMaps && <div className="mobile-sticky-cta"><a className="primary-btn action-btn" href={googleMaps} target="_blank" rel="noreferrer"><Navigation size={17} />Buka di Google Maps</a></div>}
    </>
  )
}
