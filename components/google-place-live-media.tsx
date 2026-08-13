"use client"

import { useEffect, useMemo, useState } from "react"
import { ExternalLink, Flag, Star } from "lucide-react"
import { GooglePlacePhoto } from "@/components/google-place-photo"
import type { GoogleReview, WorkshopPhoto } from "@/lib/workshops"

type LivePhoto = {
  src: string
  googleMapsUri?: string
  authorAttributions?: { displayName?: string; uri?: string; photoUri?: string }[]
}

type LivePayload = {
  rating?: number
  reviewCount?: number
  googleMapsUri?: string
  photos?: WorkshopPhoto[]
  reviews?: GoogleReview[]
  counts?: { photos?: number; reviews?: number }
  source?: string
  error?: string
  detail?: string
}

type Props = {
  placeId: string
  workshopName: string
  googleMapsUri?: string | null
  initialPhotos?: WorkshopPhoto[]
  initialReviews?: GoogleReview[]
  rating?: number
  reviewCount?: number
}

function photoList(photos: WorkshopPhoto[] = []): LivePhoto[] {
  return photos.slice(0, 3).map((photo, index) => ({
    src: `/api/places/photo?name=${encodeURIComponent(photo.name)}&w=${index === 0 ? 1600 : 900}`,
    googleMapsUri: photo.googleMapsUri,
    authorAttributions: photo.authorAttributions,
  }))
}

export function GooglePlaceLiveMedia({
  placeId,
  workshopName,
  googleMapsUri,
  initialPhotos = [],
  initialReviews = [],
  rating,
  reviewCount,
}: Props) {
  const serverPhotos = useMemo(() => photoList(initialPhotos), [initialPhotos])
  const [photos, setPhotos] = useState<LivePhoto[]>(serverPhotos)
  const [reviews, setReviews] = useState<GoogleReview[]>(initialReviews)
  const [liveRating, setLiveRating] = useState<number | undefined>(rating)
  const [liveReviewCount, setLiveReviewCount] = useState<number | undefined>(reviewCount)
  const [loadingFallback, setLoadingFallback] = useState(serverPhotos.length === 0 || initialReviews.length === 0)
  const [fallbackFailed, setFallbackFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    const needsPhotos = serverPhotos.length === 0
    const needsReviews = initialReviews.length === 0

    if (!needsPhotos && !needsReviews) {
      setLoadingFallback(false)
      setFallbackFailed(false)
      return
    }

    async function hydrateLiveMedia() {
      let missingPhotos = needsPhotos
      let missingReviews = needsReviews

      try {
        const response = await fetch(`/api/places/live?placeId=${encodeURIComponent(placeId)}`, {
          cache: "no-store",
        })
        const payload = (await response.json().catch(() => ({}))) as LivePayload
        if (!response.ok) {
          throw new Error([payload.error, payload.detail].filter(Boolean).join(": ") || `HTTP ${response.status}`)
        }
        if (cancelled) return

        if (needsPhotos && Array.isArray(payload.photos) && payload.photos.length > 0) {
          setPhotos(photoList(payload.photos))
          missingPhotos = false
        }
        if (needsReviews && Array.isArray(payload.reviews) && payload.reviews.length > 0) {
          setReviews(payload.reviews.slice(0, 5))
          missingReviews = false
        }
        if (typeof payload.rating === "number") setLiveRating(payload.rating)
        if (typeof payload.reviewCount === "number") setLiveReviewCount(payload.reviewCount)

        console.info("TEMUBENGKEL: Places server media", {
          placeId,
          source: payload.source,
          photos: payload.counts?.photos ?? payload.photos?.length ?? 0,
          reviews: payload.counts?.reviews ?? payload.reviews?.length ?? 0,
        })
      } catch (error) {
        console.warn("TEMUBENGKEL: Places server media gagal", error)
      }

      if (!cancelled) {
        setFallbackFailed(missingPhotos || missingReviews)
        setLoadingFallback(false)
      }
    }

    void hydrateLiveMedia()
    return () => {
      cancelled = true
    }
  }, [placeId, googleMapsUri, initialReviews.length, serverPhotos])

  return (
    <>
      <div className={`detail-gallery ${photos.length <= 1 ? "single" : ""}`}>
        {photos.length > 0 ? photos.map((photo, index) => (
          <div className="gallery-photo" key={`${photo.src}-${index}`}>
            <GooglePlacePhoto
              src={photo.src}
              alt={`Foto ${workshopName} ${index + 1}`}
              fallbackLabel="Foto Google Maps tidak tersedia"
              loading={index === 0 ? "eager" : "lazy"}
            />
            {(photo.authorAttributions?.length || photo.googleMapsUri) ? (
              <div className="photo-attribution">
                {photo.authorAttributions?.map((author, authorIndex) => (
                  author.uri
                    ? <a key={`${author.displayName || "author"}-${authorIndex}`} href={author.uri} target="_blank" rel="noreferrer">Foto: {author.displayName || "Kontributor Google Maps"}</a>
                    : <span key={authorIndex}>Foto: {author.displayName || "Kontributor Google Maps"}</span>
                ))}
                {photo.googleMapsUri && (
                  <a href={photo.googleMapsUri} target="_blank" rel="noreferrer">
                    Lihat foto di <span translate="no">Google Maps</span>
                  </a>
                )}
              </div>
            ) : null}
          </div>
        )) : (
          <div className="gallery-placeholder">
            <span>{loadingFallback ? "Mengambil foto terbaru dari Google Maps…" : "Foto Google Maps belum tersedia untuk bengkel ini"}</span>
            {fallbackFailed && <small>Google Places belum mengembalikan foto publik untuk listing ini.</small>}
          </div>
        )}
      </div>

      <section className="detail-section google-reviews-section">
        <div className="section-heading review-heading">
          <div>
            <span className="source-kicker" translate="no">Google Maps</span>
            <h2>Rating & ulasan</h2>
            <p className="muted">Google Maps menampilkan maksimal 5 ulasan yang dipilih dan diurutkan berdasarkan relevansi.</p>
          </div>
          {googleMapsUri && (
            <a className="header-link" href={googleMapsUri} target="_blank" rel="noreferrer">
              Lihat semua <ExternalLink size={13} />
            </a>
          )}
        </div>

        {typeof liveRating === "number" && (
          <div className="google-rating-summary">
            <strong>{liveRating.toFixed(1)}</strong>
            <span className="google-rating-stars" aria-label={`Rating ${liveRating.toFixed(1)} dari 5`}>
              <Star size={18} fill="currentColor" />
              <span>{liveReviewCount ? `${liveReviewCount.toLocaleString("id-ID")} ulasan di Google Maps` : "Rating Google Maps"}</span>
            </span>
          </div>
        )}

        {reviews.length ? (
          <div className="review-list">
            {reviews.map((review, index) => {
              const translated = Boolean(
                review.text &&
                review.originalText &&
                review.textLanguageCode &&
                review.originalTextLanguageCode &&
                review.textLanguageCode !== review.originalTextLanguageCode,
              )

              return (
                <article className="review-item" key={`${review.authorName || "review"}-${review.publishTime || index}`}>
                  <div className="review-author-row">
                    {review.authorPhotoUri
                      ? <img src={review.authorPhotoUri} alt={`Foto profil ${review.authorName || "pengguna Google Maps"}`} className="review-avatar" loading="lazy" />
                      : <div className="review-avatar review-avatar-fallback" aria-hidden="true">G</div>}

                    <div className="review-author-copy">
                      <div className="review-top">
                        <div>
                          {review.authorUri
                            ? <a href={review.authorUri} target="_blank" rel="noreferrer"><strong>{review.authorName || "Pengguna Google Maps"}</strong></a>
                            : <strong>{review.authorName || "Pengguna Google Maps"}</strong>}
                          <span className="review-google-label" translate="no">Google Maps</span>
                        </div>
                        <span>{review.rating ? `★ ${review.rating}` : ""}{review.relativePublishTimeDescription ? ` · ${review.relativePublishTimeDescription}` : ""}</span>
                      </div>

                      {review.text && <p>{review.text}</p>}
                      {translated && <small className="review-translation-note">Teks ditampilkan dalam versi terlokalisasi Google Maps.</small>}

                      {(review.googleMapsUri || review.flagContentUri) && (
                        <div className="review-links">
                          {review.googleMapsUri && (
                            <a className="review-source" href={review.googleMapsUri} target="_blank" rel="noreferrer">
                              Lihat ulasan di <span translate="no">Google Maps</span>
                            </a>
                          )}
                          {review.flagContentUri && (
                            <a className="review-report" href={review.flagContentUri} target="_blank" rel="noreferrer">
                              <Flag size={12} /> Laporkan
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="review-empty-state">
            <strong>{loadingFallback ? "Mengambil ulasan Google Maps…" : "Belum ada ulasan yang dapat ditampilkan"}</strong>
            <span>{loadingFallback ? "TEMUBENGKEL sedang mengambil data Places terbaru." : "Google Places belum mengembalikan teks ulasan publik untuk listing ini."}</span>
            {googleMapsUri && <a href={googleMapsUri} target="_blank" rel="noreferrer">Buka di Google Maps</a>}
          </div>
        )}
      </section>
    </>
  )
}
