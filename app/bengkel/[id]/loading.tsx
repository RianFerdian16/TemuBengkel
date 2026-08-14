import { SiteHeader } from "@/components/site-header"

export default function WorkshopDetailLoading() {
  return (
    <>
      <SiteHeader />
      <main className="detail-main detail-main-v15">
        <div className="shell">
          <div className="detail-loading-back skeleton-line" />
          <section className="surface detail-overview-v15 detail-loading-overview" aria-busy="true" aria-label="Memuat detail bengkel">
            <div className="detail-overview-copy-v15">
              <div className="skeleton-line skeleton-kicker" />
              <div className="skeleton-line skeleton-title" />
              <div className="skeleton-line skeleton-address" />
            </div>
            <div className="detail-rating-card-v15 detail-loading-rating">
              <div className="skeleton-line skeleton-kicker" />
              <div className="skeleton-line skeleton-rating" />
              <div className="skeleton-line skeleton-short" />
            </div>
            <div className="detail-contact-actions-v15 detail-loading-actions">
              <div className="skeleton-button" /><div className="skeleton-button" /><div className="skeleton-button" />
            </div>
          </section>
          <section className="detail-map-section-v15">
            <div className="skeleton-line skeleton-section-title" />
            <div className="surface detail-map-wrap detail-map-wrap-v15 detail-loading-map" />
          </section>
        </div>
      </main>
    </>
  )
}
