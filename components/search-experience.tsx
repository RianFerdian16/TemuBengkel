"use client"

import Link from "next/link"
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react"
import {
  CircleAlert,
  ExternalLink,
  List,
  LocateFixed,
  Map,
  MapPin,
  Navigation,
  PhoneCall,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Star,
  WifiOff,
  Wrench,
  X,
} from "lucide-react"
import { GoogleMap } from "@/components/google-map"
import { formatDistance, mapsUrl, type Workshop } from "@/lib/workshops"

type Props = {
  initialQuery?: string
  initialLocation?: string
  initialLatitude?: number
  initialLongitude?: number
}

type SearchErrorKind = "location" | "system" | null
type SearchOrigin = { latitude: number; longitude: number; label?: string; source: "device" | "query" }

const serviceOptions = ["Servis Ringan", "Ganti Oli", "Body Repair & Cat"]
const SEARCH_SESSION_KEY = "temubengkel:search-session:v2"
const SEARCH_RESULTS_TTL_MS = 3 * 60 * 1000

type SearchSession = {
  version: 2
  savedAt: number
  resultsFetchedAt: number
  searchText: string
  userLocation?: { latitude: number; longitude: number }
  searchOrigin?: SearchOrigin
  workshops: Workshop[]
  hasSearched: boolean
  capped: boolean
  view: "list" | "map"
  selectedId?: string
  filters: {
    openOnly: boolean
    distanceKm: number
    services: string[]
    mechanicCallOnly: boolean
  }
}

function readSearchSession(): SearchSession | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(SEARCH_SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<SearchSession>
    if (parsed.version !== 2 || typeof parsed.savedAt !== "number") return null
    const searchOrigin = parsed.searchOrigin
    return {
      version: 2,
      savedAt: parsed.savedAt,
      resultsFetchedAt: typeof parsed.resultsFetchedAt === "number" ? parsed.resultsFetchedAt : 0,
      searchText: typeof parsed.searchText === "string" ? parsed.searchText : "",
      userLocation:
        typeof parsed.userLocation?.latitude === "number" && typeof parsed.userLocation?.longitude === "number"
          ? { latitude: parsed.userLocation.latitude, longitude: parsed.userLocation.longitude }
          : undefined,
      searchOrigin:
        typeof searchOrigin?.latitude === "number" && typeof searchOrigin?.longitude === "number"
          ? {
              latitude: searchOrigin.latitude,
              longitude: searchOrigin.longitude,
              label: typeof searchOrigin.label === "string" ? searchOrigin.label : undefined,
              source: searchOrigin.source === "device" ? "device" : "query",
            }
          : undefined,
      workshops: Array.isArray(parsed.workshops) ? parsed.workshops : [],
      hasSearched: Boolean(parsed.hasSearched),
      capped: Boolean(parsed.capped),
      view: parsed.view === "list" ? "list" : "map",
      selectedId: typeof parsed.selectedId === "string" ? parsed.selectedId : undefined,
      filters: {
        openOnly: Boolean(parsed.filters?.openOnly),
        distanceKm: typeof parsed.filters?.distanceKm === "number" ? parsed.filters.distanceKm : 15,
        services: Array.isArray(parsed.filters?.services)
          ? parsed.filters.services.filter((item): item is string => typeof item === "string")
          : [],
        mechanicCallOnly: Boolean(parsed.filters?.mechanicCallOnly),
      },
    }
  } catch {
    return null
  }
}

export function SearchExperience({ initialQuery = "", initialLocation = "", initialLatitude, initialLongitude }: Props) {
  const initialSearchText = initialQuery || initialLocation
  const [searchText, setSearchText] = useState(initialSearchText)
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | undefined>(
    typeof initialLatitude === "number" && typeof initialLongitude === "number"
      ? { latitude: initialLatitude, longitude: initialLongitude }
      : undefined,
  )
  const [searchOrigin, setSearchOrigin] = useState<SearchOrigin | undefined>(
    typeof initialLatitude === "number" && typeof initialLongitude === "number"
      ? { latitude: initialLatitude, longitude: initialLongitude, source: "device" }
      : undefined,
  )
  const [workshops, setWorkshops] = useState<Workshop[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorKind, setErrorKind] = useState<SearchErrorKind>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [capped, setCapped] = useState(false)
  const [resultsFetchedAt, setResultsFetchedAt] = useState(0)
  const [view, setView] = useState<"list" | "map">("map")
  const [selectedId, setSelectedId] = useState<string | undefined>()
  const [filterOpen, setFilterOpen] = useState(false)
  const [sessionHydrated, setSessionHydrated] = useState(false)
  const [recenterKey, setRecenterKey] = useState(0)

  const [openOnly, setOpenOnly] = useState(false)
  const [distanceKm, setDistanceKm] = useState(15)
  const [services, setServices] = useState<string[]>([])
  const [mechanicCallOnly, setMechanicCallOnly] = useState(false)

  const runSearch = useCallback(async (override?: {
    location?: { latitude: number; longitude: number }
    forceText?: boolean
    searchText?: string
  }) => {
    const activeText = (override?.searchText ?? searchText).trim()
    const activeLocation = override?.forceText
      ? undefined
      : override?.location || (!activeText ? userLocation : undefined)

    if (!activeLocation && !activeText) {
      setError("Masukkan nama bengkel, area, alamat, atau gunakan lokasi perangkat.")
      setErrorKind("location")
      return
    }

    const params = new URLSearchParams()
    if (activeText) params.set("q", activeText)
    if (activeLocation) {
      params.set("lat", String(activeLocation.latitude))
      params.set("lng", String(activeLocation.longitude))
      params.set("radius", "15000")
    }

    setLoading(true)
    setError(null)
    setErrorKind(null)
    setWarning(null)
    try {
      const response = await fetch(`/api/places/search?${params.toString()}`, { cache: "no-store" })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || "Pencarian gagal")
      const next = Array.isArray(payload.workshops) ? payload.workshops : []
      setWorkshops(next)
      setSelectedId(next[0]?.id)
      setHasSearched(true)
      setCapped(Boolean(payload.capped))
      setWarning(typeof payload.warning === "string" ? payload.warning : null)
      setSearchOrigin(
        payload?.origin && Number.isFinite(Number(payload.origin.latitude)) && Number.isFinite(Number(payload.origin.longitude))
          ? {
              latitude: Number(payload.origin.latitude),
              longitude: Number(payload.origin.longitude),
              label: typeof payload.origin.label === "string" ? payload.origin.label : undefined,
              source: payload.origin.source === "device" ? "device" : "query",
            }
          : activeLocation
            ? { ...activeLocation, source: "device" }
            : undefined,
      )
      setResultsFetchedAt(Date.now())
    } catch (err) {
      setWorkshops([])
      setHasSearched(true)
      setCapped(false)
      setSearchOrigin(activeLocation ? { ...activeLocation, source: "device" } : undefined)
      setError(err instanceof Error ? err.message : "Pencarian bengkel gagal")
      setErrorKind("system")
    } finally {
      setLoading(false)
    }
  }, [searchText, userLocation])

  useEffect(() => {
    const hasExplicitSearch = Boolean(
      initialSearchText || (typeof initialLatitude === "number" && typeof initialLongitude === "number"),
    )

    if (hasExplicitSearch) {
      setSessionHydrated(true)
      void runSearch({
        searchText: initialSearchText,
        location:
          typeof initialLatitude === "number" && typeof initialLongitude === "number"
            ? { latitude: initialLatitude, longitude: initialLongitude }
            : undefined,
        forceText: Boolean(initialSearchText),
      })
      return
    }

    const cached = readSearchSession()
    if (!cached) {
      setSessionHydrated(true)
      return
    }

    setSearchText(cached.searchText)
    setUserLocation(cached.userLocation)
    setSearchOrigin(cached.searchOrigin)
    setWorkshops(cached.workshops)
    setHasSearched(cached.hasSearched)
    setCapped(cached.capped)
    setView(cached.view)
    setSelectedId(cached.selectedId || cached.workshops[0]?.id)
    setOpenOnly(cached.filters.openOnly)
    setDistanceKm(cached.filters.distanceKm)
    setServices(cached.filters.services)
    setMechanicCallOnly(cached.filters.mechanicCallOnly)
    setResultsFetchedAt(cached.resultsFetchedAt)
    setSessionHydrated(true)

    // Keep location/filter state for convenience, but refresh operational/rating data
    // after a short TTL so "Buka sekarang" does not stay stale for 30 minutes.
    if (cached.hasSearched && Date.now() - cached.resultsFetchedAt > SEARCH_RESULTS_TTL_MS) {
      if (cached.searchText.trim()) {
        void runSearch({ forceText: true, searchText: cached.searchText })
      } else if (cached.userLocation) {
        void runSearch({ location: cached.userLocation, searchText: "" })
      }
    }
    // Hydrate once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!sessionHydrated || typeof window === "undefined") return
    const meaningfulSession = Boolean(hasSearched || userLocation || searchText.trim())
    if (!meaningfulSession) return

    const session: SearchSession = {
      version: 2,
      savedAt: Date.now(),
      resultsFetchedAt,
      searchText,
      userLocation,
      searchOrigin,
      workshops,
      hasSearched,
      capped,
      view,
      selectedId,
      filters: { openOnly, distanceKm, services, mechanicCallOnly },
    }

    try {
      window.localStorage.setItem(SEARCH_SESSION_KEY, JSON.stringify(session))
    } catch {
      // localStorage can be unavailable on private/locked-down browsers.
    }
  }, [
    sessionHydrated,
    resultsFetchedAt,
    searchText,
    userLocation,
    searchOrigin,
    workshops,
    hasSearched,
    capped,
    view,
    selectedId,
    openOnly,
    distanceKm,
    services,
    mechanicCallOnly,
  ])

  const hasServiceCoverage = useMemo(() => workshops.some((item) => Boolean(item.services?.length)), [workshops])
  const hasMechanicCoverage = useMemo(() => workshops.some((item) => item.mechanicCallAvailable === true), [workshops])
  const hasGoogleResults = useMemo(() => workshops.some((item) => item.source === "google"), [workshops])
  const hasOwnerResults = useMemo(() => workshops.some((item) => item.source === "owner" || Boolean(item.ownerListingId)), [workshops])
  const sourceSummary = hasGoogleResults && hasOwnerResults
    ? <>Data dari <b translate="no">Google Maps</b> + listing yang telah diverifikasi TemuBengkel</>
    : hasGoogleResults
      ? <>Data publik dari <b translate="no">Google Maps</b></>
      : <>Listing telah diverifikasi TemuBengkel</>
  const canUseDistanceFilter = Boolean(searchOrigin)

  useEffect(() => {
    if (!hasServiceCoverage && services.length) setServices([])
    if (!hasMechanicCoverage && mechanicCallOnly) setMechanicCallOnly(false)
  }, [hasServiceCoverage, hasMechanicCoverage, services.length, mechanicCallOnly])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const manual = Boolean(searchText.trim())
    void runSearch({
      location: manual ? undefined : userLocation,
      forceText: manual,
      searchText,
    })
  }

  const locate = () => {
    setError(null)
    setErrorKind(null)
    if (!navigator.geolocation) {
      setError("Browser ini tidak mendukung geolocation. Gunakan pencarian manual.")
      setErrorKind("location")
      return
    }

    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const nextLocation = { latitude: coords.latitude, longitude: coords.longitude }
        setUserLocation(nextLocation)
        setSearchText("")
        void runSearch({ location: nextLocation, searchText: "" })
      },
      () => {
        setLoading(false)
        setError("Akses lokasi ditolak. Aktifkan izin lokasi atau cari bengkel/area secara manual.")
        setErrorKind("location")
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    )
  }

  const visible = useMemo(() => {
    let next = workshops.filter((item) => {
      if (openOnly && item.isOpenNow !== true) return false
      if (canUseDistanceFilter && distanceKm < 15) {
        if (typeof item.distanceMeters !== "number" || item.distanceMeters > distanceKm * 1000) return false
      }
      if (mechanicCallOnly && item.mechanicCallAvailable !== true) return false
      if (services.length) {
        const available = (item.services || []).map((service) => service.toLocaleLowerCase("id-ID"))
        const matches = services.some((service) => available.some((entry) => entry.includes(service.toLocaleLowerCase("id-ID"))))
        if (!matches) return false
      }
      return true
    })

    next = [...next].sort((a, b) => (a.distanceMeters ?? Number.MAX_VALUE) - (b.distanceMeters ?? Number.MAX_VALUE))
    return next
  }, [workshops, openOnly, canUseDistanceFilter, distanceKm, services, mechanicCallOnly])

  const selected = visible.find((item) => item.id === selectedId) || visible[0]
  const hasActiveFilters = openOnly || (canUseDistanceFilter && distanceKm < 15) || services.length > 0 || mechanicCallOnly

  const resetFilters = () => {
    setOpenOnly(false)
    setDistanceKm(15)
    setServices([])
    setMechanicCallOnly(false)
  }

  const toggleService = (service: string) => {
    setServices((current) => current.includes(service) ? current.filter((item) => item !== service) : [...current, service])
  }

  if (filterOpen) {
    return (
      <div className="mobile-filter-screen">
        <div className="filter-screen-heading">
          <div>
            <span className="filter-eyebrow">Pencarian</span>
            <h1>Filter Pencarian</h1>
          </div>
          <button className="icon-close-btn" type="button" onClick={() => setFilterOpen(false)} aria-label="Tutup filter"><X size={18} /></button>
        </div>

        <div className="filter-stack">
          <section className="filter-group">
            <h2>Status Operasional</h2>
            <button className={`filter-toggle-card ${openOnly ? "active" : ""}`} type="button" onClick={() => setOpenOnly((value) => !value)}>
              <div><strong>Buka Sekarang</strong><span>Hanya tampilkan bengkel yang terkonfirmasi sedang beroperasi</span></div>
              <span className="toggle-control" aria-hidden="true"><i /></span>
            </button>
          </section>

          <section className={`filter-group ${canUseDistanceFilter ? "" : "filter-group-disabled"}`}>
            <div className="filter-group-title-row"><h2>Jarak Maksimum</h2><strong>{canUseDistanceFilter ? `${distanceKm} km` : "Butuh titik lokasi"}</strong></div>
            <input
              className="distance-range"
              type="range"
              min="1"
              max="15"
              step="1"
              value={distanceKm}
              disabled={!canUseDistanceFilter}
              onChange={(event) => setDistanceKm(Number(event.target.value))}
            />
            <div className="range-labels"><span>1 km</span><span>15 km</span></div>
            {!canUseDistanceFilter && <p className="filter-data-note">Jarak aktif setelah lokasi perangkat dipakai atau query area/alamat berhasil dikenali.</p>}
          </section>

          <section className="filter-group">
            <h2>Layanan Terverifikasi</h2>
            {hasServiceCoverage ? (
              <div className="service-filter-grid">
                {serviceOptions.map((service) => {
                  const active = services.includes(service)
                  return <button key={service} className={active ? "active" : ""} type="button" onClick={() => toggleService(service)}><Wrench size={14} /><span>{service}</span><i /></button>
                })}
              </div>
            ) : (
              <p className="filter-data-note">Data layanan belum tersedia secara konsisten untuk hasil ini, jadi filter tidak ditampilkan agar tidak menyesatkan.</p>
            )}
          </section>

          <section className="filter-group">
            {hasMechanicCoverage ? (
              <button className={`mechanic-call-filter ${mechanicCallOnly ? "active" : ""}`} type="button" onClick={() => setMechanicCallOnly((value) => !value)}>
                <span className="mechanic-call-icon"><PhoneCall size={16} /></span>
                <span><strong>Montir Panggilan</strong><small>Hanya listing yang menyatakan layanan ini tersedia</small></span>
                <span className="toggle-control" aria-hidden="true"><i /></span>
              </button>
            ) : (
              <p className="filter-data-note">Belum ada listing pada hasil ini yang mengonfirmasi layanan montir panggilan.</p>
            )}
          </section>
        </div>

        <div className="filter-screen-actions">
          <button className="filter-reset-btn" type="button" onClick={resetFilters}>Reset</button>
          <button className="filter-apply-btn" type="button" onClick={() => setFilterOpen(false)}>Tampilkan Hasil <span>{visible.length || ""}</span></button>
        </div>
      </div>
    )
  }

  if (errorKind === "location") {
    return (
      <StateScreen
        icon={<MapPin size={34} />}
        variant="location"
        title="Tentukan pencarian"
        description="Gunakan lokasi perangkat atau cari nama bengkel, area, jalan, maupun alamat secara manual."
        primaryLabel="Gunakan Lokasi Saya"
        onPrimary={locate}
      >
        <div className="state-divider"><span>ATAU</span></div>
        <form className="state-manual-search" onSubmit={submit}>
          <Search size={15} />
          <input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Cari bengkel, area, atau alamat..." />
          <button type="submit" aria-label="Cari manual">›</button>
        </form>
      </StateScreen>
    )
  }

  if (errorKind === "system") {
    return (
      <StateScreen
        icon={<WifiOff size={32} />}
        variant="system"
        title="Pencarian belum dapat dimuat"
        description={error || "Kami tidak dapat memuat daftar bengkel saat ini. Silakan coba kembali."}
        primaryLabel="Coba Lagi"
        onPrimary={() => void runSearch()}
      />
    )
  }

  if (!loading && hasSearched && visible.length === 0) {
    return (
      <StateScreen
        icon={<MapPin size={33} />}
        variant="empty"
        title="Bengkel tidak ditemukan"
        description="Tidak ada bengkel yang cocok dengan pencarian dan filter saat ini."
        primaryLabel="Cari Lagi"
        onPrimary={() => {
          setHasSearched(false)
          setSearchText("")
          setView("map")
        }}
      >
        <div className="state-suggestion-box">
          <strong>Saran pencarian:</strong>
          <span>• Coba nama area yang lebih luas atau alamat yang lebih singkat.</span>
          <span>• Hapus filter layanan/jarak jika hasil terlalu sempit.</span>
        </div>
        {hasActiveFilters && <button className="state-secondary-action" type="button" onClick={resetFilters}>Hapus Filter</button>}
      </StateScreen>
    )
  }

  return (
    <div className={`mobile-search-experience search-view-${view} ${hasSearched ? "search-has-results" : "search-is-idle"}`}>
      <aside className="search-control-pane">
        <div className="search-pane-heading">
          <div>
            <span className="search-pane-index">TB / SEARCH</span>
            <h1>Cari bengkel</h1>
          </div>
          {hasSearched && <span className="search-result-count">{visible.length} {capped ? "hasil teratas" : "hasil"}</span>}
        </div>

        <form className="mobile-search-toolbar" onSubmit={submit}>
          <div className="map-search-field">
            <Search size={16} aria-hidden="true" />
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Cari bengkel, area, atau alamat..."
              aria-label="Cari bengkel, area, atau alamat"
            />
            <button
              className={`inline-filter-btn ${hasActiveFilters ? "active" : ""}`}
              type="button"
              onClick={() => setFilterOpen(true)}
              aria-label="Buka filter"
            >
              <SlidersHorizontal size={16} />
              {hasActiveFilters && <i aria-hidden="true" />}
            </button>
          </div>

          <div className={`search-toolbar-actions ${hasSearched ? "has-view-toggle" : ""}`}>
            <button className="search-submit-btn" type="submit" disabled={loading}>
              <span>{loading ? "Mencari..." : "Cari Bengkel"}</span>
            </button>
            <button className="search-use-location-btn" type="button" onClick={locate} disabled={loading}>
              <LocateFixed size={16} aria-hidden="true" />
              <span>{loading ? "Mencari lokasi..." : userLocation ? "Perbarui Lokasi" : "Gunakan Lokasi Saya"}</span>
            </button>
            {hasSearched && (
              <button className="view-mode-btn" type="button" onClick={() => setView((current) => current === "map" ? "list" : "map")}>
                {view === "map" ? <List size={16} /> : <Map size={16} />}
                <span>{view === "map" ? "Daftar" : "Peta"}</span>
              </button>
            )}
          </div>
        </form>

        {!hasSearched && !loading && (
          <div className="search-guide-card">
            <span className="search-guide-number">01</span>
            <div>
              <strong>Cari dengan cara yang paling mudah</strong>
              <p>Ketik nama bengkel, area, atau alamat. Anda juga bisa memakai lokasi perangkat untuk mencari yang terdekat.</p>
            </div>
          </div>
        )}

        {loading && (
          <div className="search-loading-row" role="status">
            <RotateCcw size={15} className="spin-icon" />
            <span>Mencari bengkel...</span>
          </div>
        )}

        {warning && <div className="search-partial-warning" role="status"><CircleAlert size={14} />{warning}</div>}

        {hasSearched && visible.length > 0 && (
          <section className="mobile-result-list" aria-live="polite">
            <div className="mobile-result-summary">
              <div>
                <strong>{visible.length} bengkel {capped ? "teratas " : ""}ditemukan</strong>
                <span>{sourceSummary}</span>
                {searchOrigin?.source === "query" && searchOrigin.label && (
                  <small className="search-origin-note">Jarak dihitung dari area yang dikenali: {searchOrigin.label}</small>
                )}
              </div>
              {hasActiveFilters && <button type="button" onClick={resetFilters}>Reset filter</button>}
            </div>
            {visible.map((workshop) => <ListWorkshopCard workshop={workshop} key={workshop.id} />)}
          </section>
        )}
      </aside>

      <section className="mobile-map-stage" aria-label="Hasil pencarian dalam peta">
        <GoogleMap
          workshops={visible}
          userLocation={userLocation}
          fitUserLocation={!searchText.trim()}
          selectedId={selected?.id}
          onSelect={setSelectedId}
          recenterKey={recenterKey}
          className="mobile-search-map"
        />

        {userLocation && (
          <button className="map-recenter-user" type="button" onClick={() => setRecenterKey((value) => value + 1)} aria-label="Kembali ke posisi saya">
            <LocateFixed size={17} />
            <span>Posisi saya</span>
          </button>
        )}

        {!hasSearched && !loading && (
          <div className="map-idle-overlay">
            <span><MapPin size={22} /></span>
            <strong>Peta siap digunakan</strong>
            <p>Cari bengkel/area atau gunakan lokasi perangkat untuk menampilkan hasil.</p>
          </div>
        )}

        {loading && <div className="map-loading-pill"><RotateCcw size={14} className="spin-icon" /> Memuat hasil...</div>}
        {selected && <MapWorkshopCard workshop={selected} />}
      </section>
    </div>
  )
}

function SourceBadge({ workshop }: { workshop: Workshop }) {
  if (workshop.source === "owner") return <span className="workshop-source-badge owner">TemuBengkel</span>
  if (workshop.ownerListingId) return <span className="workshop-source-badge linked">Google + pemilik</span>
  return null
}

function MapWorkshopCard({ workshop }: { workshop: Workshop }) {
  const directions = mapsUrl(workshop)

  return (
    <div className="map-workshop-card">
      <div className="map-card-content">
        <div className="map-card-title-row">
          <div><strong>{workshop.name}</strong><span>{workshop.address || "Alamat tersedia di Google Maps"}</span></div>
          {formatDistance(workshop.distanceMeters) && <b>{formatDistance(workshop.distanceMeters)}</b>}
        </div>
        <div className="map-card-meta">
          {typeof workshop.rating === "number" && <span><Star size={13} fill="currentColor" /> {workshop.rating.toFixed(1)}</span>}
          {workshop.isOpenNow !== undefined && <span className={workshop.isOpenNow ? "open" : "closed"}>{workshop.isOpenNow ? "Buka" : "Tutup"}</span>}
          {workshop.mechanicCallAvailable && <span>Montir panggilan</span>}
          <SourceBadge workshop={workshop} />
        </div>
        <div className="map-card-actions">
          <Link href={`/bengkel/${encodeURIComponent(workshop.id)}`}>Buka Detail</Link>
          {directions && <a href={directions} target="_blank" rel="noreferrer">Arahkan <Navigation size={13} /></a>}
        </div>
      </div>
    </div>
  )
}

function ListWorkshopCard({ workshop }: { workshop: Workshop }) {
  return (
    <Link className="mobile-list-workshop" href={`/bengkel/${encodeURIComponent(workshop.id)}`}>
      <span className="mobile-list-copy">
        <span className="mobile-list-title"><strong>{workshop.name}</strong>{workshop.isOpenNow !== undefined && <i className={workshop.isOpenNow ? "open" : "closed"}>{workshop.isOpenNow ? "Buka" : "Tutup"}</i>}</span>
        <small>{workshop.address}</small>
        <span className="mobile-list-meta">
          {typeof workshop.rating === "number" && <b><Star size={12} fill="currentColor" />{workshop.rating.toFixed(1)}</b>}
          {formatDistance(workshop.distanceMeters) && <b>{formatDistance(workshop.distanceMeters)}</b>}
          <SourceBadge workshop={workshop} />
        </span>
      </span>
      <ExternalLink size={15} className="mobile-list-arrow" />
    </Link>
  )
}

function StateScreen({
  icon,
  variant,
  title,
  description,
  primaryLabel,
  onPrimary,
  children,
}: {
  icon: React.ReactNode
  variant: "location" | "empty" | "system"
  title: string
  description: string
  primaryLabel: string
  onPrimary: () => void
  children?: React.ReactNode
}) {
  return (
    <div className={`mobile-state-screen state-${variant}`}>
      <div className="state-screen-content">
        <div className="state-visual">
          <span className="state-visual-core">{icon}</span>
          {variant === "empty" && <span className="state-alert-dot"><CircleAlert size={12} /></span>}
        </div>
        <h1>{title}</h1>
        <p>{description}</p>
        {children}
        <button className="state-primary-action" type="button" onClick={onPrimary}><LocateFixed size={15} />{primaryLabel}</button>
      </div>
    </div>
  )
}
