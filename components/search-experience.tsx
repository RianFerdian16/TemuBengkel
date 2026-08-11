"use client"

import Link from "next/link"
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react"
import { List, LocateFixed, Map, MapPin, Search, Star } from "lucide-react"
import { GoogleMap } from "@/components/google-map"
import { formatDistance, type Workshop } from "@/lib/workshops"

type Props = {
  initialQuery?: string
  initialLocation?: string
  initialLatitude?: number
  initialLongitude?: number
}

export function SearchExperience({ initialQuery = "", initialLocation = "", initialLatitude, initialLongitude }: Props) {
  const [query, setQuery] = useState(initialQuery)
  const [locationText, setLocationText] = useState(initialLocation)
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | undefined>(
    typeof initialLatitude === "number" && typeof initialLongitude === "number"
      ? { latitude: initialLatitude, longitude: initialLongitude }
      : undefined,
  )
  const [workshops, setWorkshops] = useState<Workshop[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<"list" | "map">("list")
  const [selectedId, setSelectedId] = useState<string | undefined>()
  const [openOnly, setOpenOnly] = useState(false)
  const [minRating, setMinRating] = useState(0)
  const [sort, setSort] = useState<"distance" | "rating">("distance")

  const runSearch = useCallback(async (override?: { location?: { latitude: number; longitude: number }; forceText?: boolean }) => {
    const activeLocation = override?.forceText ? undefined : (override?.location || userLocation)
    if (!activeLocation && !locationText.trim() && !query.trim()) {
      setError("Pilih lokasi Anda atau masukkan area untuk mulai mencari bengkel.")
      return
    }

    const params = new URLSearchParams()
    if (query.trim()) params.set("q", query.trim())
    if (activeLocation) {
      params.set("lat", String(activeLocation.latitude))
      params.set("lng", String(activeLocation.longitude))
    } else if (locationText.trim()) {
      params.set("location", locationText.trim())
    }

    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/places/search?${params.toString()}`, { cache: "no-store" })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || "Pencarian gagal")
      const next = Array.isArray(payload.workshops) ? payload.workshops : []
      setWorkshops(next)
      setSelectedId(next[0]?.id)
    } catch (err) {
      setWorkshops([])
      setError(err instanceof Error ? err.message : "Pencarian bengkel gagal")
    } finally {
      setLoading(false)
    }
  }, [locationText, query, userLocation])

  useEffect(() => {
    if (initialQuery || initialLocation || (typeof initialLatitude === "number" && typeof initialLongitude === "number")) {
      void runSearch()
    }
    // initial search only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (locationText.trim()) setUserLocation(undefined)
    void runSearch({ location: locationText.trim() ? undefined : userLocation, forceText: Boolean(locationText.trim()) })
  }

  const locate = () => {
    setError(null)
    if (!navigator.geolocation) {
      setError("Browser ini tidak mendukung geolocation. Gunakan pencarian lokasi manual.")
      return
    }
    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const nextLocation = { latitude: coords.latitude, longitude: coords.longitude }
        setUserLocation(nextLocation)
        setLocationText("")
        void runSearch({ location: nextLocation })
      },
      () => {
        setLoading(false)
        setError("Akses lokasi ditolak. Anda tetap bisa mencari dengan mengetik area secara manual.")
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    )
  }

  const visible = useMemo(() => {
    let next = workshops.filter((item) => (!openOnly || item.isOpenNow === true) && (item.rating || 0) >= minRating)
    next = [...next].sort((a, b) => {
      if (sort === "rating") return (b.rating || 0) - (a.rating || 0)
      return (a.distanceMeters ?? Number.MAX_VALUE) - (b.distanceMeters ?? Number.MAX_VALUE)
    })
    return next
  }, [workshops, openOnly, minRating, sort])

  const selected = visible.find((item) => item.id === selectedId) || visible[0]

  return (
    <div className="search-layout">
      <section className="search-sidebar">
        <form className="surface search-panel search-page-panel" onSubmit={submit}>
          <label className="search-label" htmlFor="search-location">Lokasi</label>
          <div className="input-with-icon">
            <MapPin size={17} aria-hidden="true" />
            <input
              className="search-input clean-input"
              id="search-location"
              value={locationText}
              onChange={(event) => setLocationText(event.target.value)}
              placeholder={userLocation ? "Lokasi perangkat digunakan" : "Contoh: Cikarang Selatan"}
            />
          </div>
          <label className="search-label optional-label" htmlFor="search-query">Kebutuhan <span>opsional</span></label>
          <input
            className="search-input"
            id="search-query"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Contoh: ganti oli"
          />
          <div className="search-buttons">
            <button className="primary-btn" type="submit" disabled={loading}><Search size={16} />{loading ? "Mencari…" : "Cari"}</button>
            <button className="secondary-btn" type="button" onClick={locate} disabled={loading}><LocateFixed size={16} />Lokasi saya</button>
          </div>
        </form>

        <div className="filter-row" aria-label="Filter hasil">
          <button className={`filter-chip ${openOnly ? "active" : ""}`} type="button" onClick={() => setOpenOnly((value) => !value)}>Buka sekarang</button>
          <select className="filter-select" aria-label="Rating minimum" value={minRating} onChange={(event) => setMinRating(Number(event.target.value))}>
            <option value={0}>Semua rating</option>
            <option value={4}>Rating 4.0+</option>
            <option value={4.5}>Rating 4.5+</option>
          </select>
          <select className="filter-select" aria-label="Urutan hasil" value={sort} onChange={(event) => setSort(event.target.value as "distance" | "rating")}>
            <option value="distance">Terdekat</option>
            <option value="rating">Rating tertinggi</option>
          </select>
        </div>

        <div className="result-toolbar">
          <span>{loading ? "Mencari bengkel…" : `${visible.length} bengkel ditemukan`} · Data publik Google Maps</span>
          <div className="view-toggle" aria-label="Mode tampilan">
            <button className={view === "list" ? "active" : ""} type="button" onClick={() => setView("list")}><List size={16} />Daftar</button>
            <button className={view === "map" ? "active" : ""} type="button" onClick={() => setView("map")}><Map size={16} />Peta</button>
          </div>
        </div>

        {error && <div className="inline-alert" role="alert">{error}<button type="button" onClick={() => void runSearch()}>Coba lagi</button></div>}

        {view === "list" && (
          <div className="workshop-list" aria-live="polite">
            {loading && Array.from({ length: 4 }).map((_, index) => <div className="workshop-card skeleton-card" key={index} />)}
            {!loading && !error && visible.length === 0 && (
              <div className="surface empty-state compact-empty">
                <div><h3>Belum ada bengkel yang cocok</h3><p>Coba ubah lokasi, perluas kebutuhan, atau reset filter.</p></div>
              </div>
            )}
            {!loading && visible.map((workshop) => (
              <Link
                href={`/bengkel/${encodeURIComponent(workshop.id)}`}
                className={`workshop-card ${selected?.id === workshop.id ? "selected" : ""}`}
                key={workshop.id}
                onMouseEnter={() => setSelectedId(workshop.id)}
              >
                {workshop.photoNames?.[0] ? (
                  <img className="workshop-thumb" src={`/api/places/photo?name=${encodeURIComponent(workshop.photoNames[0])}&w=480`} alt={`Foto ${workshop.name}`} />
                ) : <div className="workshop-thumb workshop-thumb-placeholder">TB</div>}
                <div className="workshop-card-body">
                  <div className="workshop-card-top"><h2>{workshop.name}</h2>{workshop.isOpenNow !== undefined && <span className={`status-pill ${workshop.isOpenNow ? "open" : "closed"}`}>{workshop.isOpenNow ? "Buka" : "Tutup"}</span>}</div>
                  <div className="workshop-meta">
                    {typeof workshop.rating === "number" && <span><Star size={15} fill="currentColor" />{workshop.rating.toFixed(1)} {workshop.reviewCount ? `(${workshop.reviewCount.toLocaleString("id-ID")})` : ""}</span>}
                    {formatDistance(workshop.distanceMeters) && <span>{formatDistance(workshop.distanceMeters)}</span>}
                  </div>
                  {workshop.address && <p>{workshop.address}</p>}
                  {workshop.mechanicCallAvailable && <span className="service-badge">Montir panggilan tersedia</span>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className={`search-map-panel ${view === "map" ? "mobile-map-visible" : ""}`}>
        <GoogleMap workshops={visible} userLocation={userLocation} selectedId={selected?.id} onSelect={setSelectedId} className="search-map" />
        {selected && (
          <Link className="map-result-card" href={`/bengkel/${encodeURIComponent(selected.id)}`}>
            <strong>{selected.name}</strong>
            <span>{selected.rating ? `★ ${selected.rating.toFixed(1)}` : "Rating belum tersedia"}{formatDistance(selected.distanceMeters) ? ` · ${formatDistance(selected.distanceMeters)}` : ""}</span>
            <small>{selected.address}</small>
          </Link>
        )}
      </section>
    </div>
  )
}
