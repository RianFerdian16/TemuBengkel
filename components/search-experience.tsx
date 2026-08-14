"use client"

import Link from "next/link"
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react"
import {
  Bike,
  CircleAlert,
  Clock3,
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

const serviceOptions = ["Servis Ringan", "Ganti Oli", "Body Repair & Cat"]

const SEARCH_SESSION_KEY = "temubengkel:search-session:v1"
const SEARCH_SESSION_TTL_MS = 30 * 60 * 1000

type SearchSession = {
  version: 1
  savedAt: number
  locationText: string
  userLocation?: { latitude: number; longitude: number }
  workshops: Workshop[]
  hasSearched: boolean
  view: "list" | "map"
  selectedId?: string
  filters: {
    openOnly: boolean
    distanceKm: number
    shopType: "all" | "official"
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
    if (parsed.version !== 1 || typeof parsed.savedAt !== "number") return null
    return {
      version: 1,
      savedAt: parsed.savedAt,
      locationText: typeof parsed.locationText === "string" ? parsed.locationText : "",
      userLocation:
        typeof parsed.userLocation?.latitude === "number" && typeof parsed.userLocation?.longitude === "number"
          ? { latitude: parsed.userLocation.latitude, longitude: parsed.userLocation.longitude }
          : undefined,
      workshops: Array.isArray(parsed.workshops) ? parsed.workshops : [],
      hasSearched: Boolean(parsed.hasSearched),
      view: parsed.view === "list" ? "list" : "map",
      selectedId: typeof parsed.selectedId === "string" ? parsed.selectedId : undefined,
      filters: {
        openOnly: Boolean(parsed.filters?.openOnly),
        distanceKm: typeof parsed.filters?.distanceKm === "number" ? parsed.filters.distanceKm : 15,
        shopType: parsed.filters?.shopType === "official" ? "official" : "all",
        services: Array.isArray(parsed.filters?.services) ? parsed.filters.services.filter((item): item is string => typeof item === "string") : [],
        mechanicCallOnly: Boolean(parsed.filters?.mechanicCallOnly),
      },
    }
  } catch {
    return null
  }
}

export function SearchExperience({ initialQuery = "", initialLocation = "", initialLatitude, initialLongitude }: Props) {
  const [query] = useState(initialQuery)
  const [locationText, setLocationText] = useState(initialLocation)
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | undefined>(
    typeof initialLatitude === "number" && typeof initialLongitude === "number"
      ? { latitude: initialLatitude, longitude: initialLongitude }
      : undefined,
  )
  const [workshops, setWorkshops] = useState<Workshop[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorKind, setErrorKind] = useState<SearchErrorKind>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [view, setView] = useState<"list" | "map">("map")
  const [selectedId, setSelectedId] = useState<string | undefined>()
  const [filterOpen, setFilterOpen] = useState(false)
  const [sessionHydrated, setSessionHydrated] = useState(false)

  const [openOnly, setOpenOnly] = useState(false)
  const [distanceKm, setDistanceKm] = useState(15)
  const [shopType, setShopType] = useState<"all" | "official">("all")
  const [services, setServices] = useState<string[]>([])
  const [mechanicCallOnly, setMechanicCallOnly] = useState(false)

  const runSearch = useCallback(async (override?: {
    location?: { latitude: number; longitude: number }
    forceText?: boolean
    locationText?: string
  }) => {
    const activeLocation = override?.forceText ? undefined : (override?.location || userLocation)
    const activeLocationText = override?.locationText ?? locationText
    if (!activeLocation && !activeLocationText.trim() && !query.trim()) {
      setError("Lokasi diperlukan untuk menemukan bengkel terdekat.")
      setErrorKind("location")
      return
    }

    const params = new URLSearchParams()
    if (query.trim()) params.set("q", query.trim())
    if (activeLocation) {
      params.set("lat", String(activeLocation.latitude))
      params.set("lng", String(activeLocation.longitude))
    } else if (activeLocationText.trim()) {
      params.set("location", activeLocationText.trim())
    }

    setLoading(true)
    setError(null)
    setErrorKind(null)
    try {
      const response = await fetch(`/api/places/search?${params.toString()}`, { cache: "no-store" })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || "Pencarian gagal")
      const next = Array.isArray(payload.workshops) ? payload.workshops : []
      setWorkshops(next)
      setSelectedId(next[0]?.id)
      setHasSearched(true)
    } catch (err) {
      setWorkshops([])
      setHasSearched(true)
      setError(err instanceof Error ? err.message : "Pencarian bengkel gagal")
      setErrorKind("system")
    } finally {
      setLoading(false)
    }
  }, [locationText, query, userLocation])

  useEffect(() => {
    const hasExplicitSearch = Boolean(
      initialQuery || initialLocation || (typeof initialLatitude === "number" && typeof initialLongitude === "number"),
    )

    if (hasExplicitSearch) {
      setSessionHydrated(true)
      void runSearch()
      return
    }

    const cached = readSearchSession()
    if (!cached) {
      setSessionHydrated(true)
      return
    }

    setLocationText(cached.locationText)
    setUserLocation(cached.userLocation)
    setWorkshops(cached.workshops)
    setHasSearched(cached.hasSearched)
    setView(cached.view)
    setSelectedId(cached.selectedId || cached.workshops[0]?.id)
    setOpenOnly(cached.filters.openOnly)
    setDistanceKm(cached.filters.distanceKm)
    setShopType(cached.filters.shopType)
    setServices(cached.filters.services)
    setMechanicCallOnly(cached.filters.mechanicCallOnly)
    setSessionHydrated(true)

    // Hasil yang masih fresh ditampilkan langsung tanpa request ulang.
    // Setelah 30 menit, posisi terakhir tetap dipakai agar user tidak perlu
    // menekan tombol lokasi lagi, tetapi daftar bengkel di-refresh.
    if (Date.now() - cached.savedAt > SEARCH_SESSION_TTL_MS && cached.hasSearched) {
      if (cached.userLocation) {
        void runSearch({ location: cached.userLocation })
      } else if (cached.locationText.trim()) {
        void runSearch({ forceText: true, locationText: cached.locationText })
      }
    }
    // Hydrate sekali saat halaman Cari pertama kali mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!sessionHydrated || typeof window === "undefined") return
    const meaningfulSession = Boolean(hasSearched || userLocation || locationText.trim())
    if (!meaningfulSession) return

    const session: SearchSession = {
      version: 1,
      savedAt: Date.now(),
      locationText,
      userLocation,
      workshops,
      hasSearched,
      view,
      selectedId,
      filters: { openOnly, distanceKm, shopType, services, mechanicCallOnly },
    }

    try {
      window.localStorage.setItem(SEARCH_SESSION_KEY, JSON.stringify(session))
    } catch {
      // localStorage bisa unavailable pada private/locked-down browser.
    }
  }, [
    sessionHydrated,
    locationText,
    userLocation,
    workshops,
    hasSearched,
    view,
    selectedId,
    openOnly,
    distanceKm,
    shopType,
    services,
    mechanicCallOnly,
  ])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    // Keep the device location even when the user searches another area.
    // It remains available as a persistent "Posisi Anda" marker on the map.
    void runSearch({ location: locationText.trim() ? undefined : userLocation, forceText: Boolean(locationText.trim()) })
  }

  const locate = () => {
    setError(null)
    setErrorKind(null)
    if (!navigator.geolocation) {
      setError("Browser ini tidak mendukung geolocation. Gunakan pencarian lokasi manual.")
      setErrorKind("location")
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
        setError("Akses lokasi ditolak. Aktifkan izin lokasi atau masukkan area secara manual.")
        setErrorKind("location")
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    )
  }

  const visible = useMemo(() => {
    let next = workshops.filter((item) => {
      if (openOnly && item.isOpenNow !== true) return false
      if (shopType === "official" && item.source !== "owner") return false
      if (typeof item.distanceMeters === "number" && item.distanceMeters > distanceKm * 1000) return false
      if (mechanicCallOnly && !item.mechanicCallAvailable) return false
      if (services.length) {
        const available = (item.services || []).map((service) => service.toLocaleLowerCase("id-ID"))
        const matches = services.some((service) => available.some((entry) => entry.includes(service.toLocaleLowerCase("id-ID"))))
        if (!matches) return false
      }
      return true
    })

    next = [...next].sort((a, b) => (a.distanceMeters ?? Number.MAX_VALUE) - (b.distanceMeters ?? Number.MAX_VALUE))
    return next
  }, [workshops, openOnly, distanceKm, shopType, services, mechanicCallOnly])

  const selected = visible.find((item) => item.id === selectedId) || visible[0]
  const hasActiveFilters = openOnly || distanceKm < 15 || shopType !== "all" || services.length > 0 || mechanicCallOnly

  const resetFilters = () => {
    setOpenOnly(false)
    setDistanceKm(15)
    setShopType("all")
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
              <div><strong>Buka Sekarang</strong><span>Hanya tampilkan bengkel yang sedang beroperasi</span></div>
              <span className="toggle-control" aria-hidden="true"><i /></span>
            </button>
          </section>

          <section className="filter-group">
            <div className="filter-group-title-row"><h2>Jarak Maksimum</h2><strong>{distanceKm} km</strong></div>
            <input className="distance-range" type="range" min="1" max="15" step="1" value={distanceKm} onChange={(event) => setDistanceKm(Number(event.target.value))} />
            <div className="range-labels"><span>1 km</span><span>15 km</span></div>
          </section>

          <section className="filter-group">
            <h2>Jenis Bengkel</h2>
            <div className="segmented-filter">
              <button className={shopType === "all" ? "active" : ""} type="button" onClick={() => setShopType("all")}><Bike size={17} /><span>Semua</span></button>
              <button className={shopType === "official" ? "active" : ""} type="button" onClick={() => setShopType("official")}><Wrench size={17} /><span>Resmi</span></button>
            </div>
          </section>

          <section className="filter-group">
            <h2>Layanan Tersedia</h2>
            <div className="service-filter-grid">
              {serviceOptions.map((service) => {
                const active = services.includes(service)
                return <button key={service} className={active ? "active" : ""} type="button" onClick={() => toggleService(service)}><Wrench size={14} /><span>{service}</span><i /></button>
              })}
            </div>
          </section>

          <section className="filter-group">
            <button className={`mechanic-call-filter ${mechanicCallOnly ? "active" : ""}`} type="button" onClick={() => setMechanicCallOnly((value) => !value)}>
              <span className="mechanic-call-icon"><PhoneCall size={16} /></span>
              <span><strong>Montir Panggilan</strong><small>Layanan montir ke lokasi Anda</small></span>
              <span className="toggle-control" aria-hidden="true"><i /></span>
            </button>
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
        title="Lokasi Tidak Ditemukan"
        description="Untuk menemukan bengkel terdekat, kami membutuhkan akses lokasi. Aktifkan di pengaturan perangkat, atau cari manual di bawah."
        primaryLabel="Coba Lagi"
        onPrimary={locate}
      >
        <div className="state-divider"><span>ATAU</span></div>
        <form className="state-manual-search" onSubmit={submit}>
          <Search size={15} />
          <input value={locationText} onChange={(event) => setLocationText(event.target.value)} placeholder="Masukkan alamat atau kota..." />
          <button type="submit" aria-label="Cari lokasi manual">›</button>
        </form>
      </StateScreen>
    )
  }

  if (errorKind === "system") {
    return (
      <StateScreen
        icon={<WifiOff size={32} />}
        variant="system"
        title="Koneksi Terputus"
        description="Kami tidak dapat memuat daftar bengkel saat ini. Silakan periksa koneksi internet Anda."
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
        description="Maaf, kami tidak dapat menemukan bengkel yang sesuai dengan pencarian Anda di area ini."
        primaryLabel="Cari Lokasi Lain"
        onPrimary={() => {
          setHasSearched(false)
          setLocationText("")
          setView("map")
        }}
      >
        <div className="state-suggestion-box">
          <strong>Saran pencarian:</strong>
          <span>• Coba hapus beberapa filter layanan untuk melihat lebih banyak hasil.</span>
          <span>• Perluas radius pencarian Anda pada pengaturan jarak.</span>
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
          {hasSearched && <span className="search-result-count">{visible.length} hasil</span>}
        </div>

        <form className="mobile-search-toolbar" onSubmit={submit}>
          <div className="map-search-field">
            <Search size={16} aria-hidden="true" />
            <input
              value={locationText}
              onChange={(event) => setLocationText(event.target.value)}
              placeholder={userLocation ? "Lokasi perangkat aktif" : "Cari kota, kecamatan, atau jalan..."}
              aria-label="Lokasi pencarian"
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
              <strong>Tentukan area pencarian</strong>
              <p>Ketik lokasi pada kolom di atas atau gunakan lokasi perangkat. Hasil akan langsung muncul di peta.</p>
            </div>
          </div>
        )}

        {loading && (
          <div className="search-loading-row" role="status">
            <RotateCcw size={15} className="spin-icon" />
            <span>Mencari bengkel di sekitar lokasi...</span>
          </div>
        )}

        {hasSearched && visible.length > 0 && (
          <section className="mobile-result-list" aria-live="polite">
            <div className="mobile-result-summary">
              <div>
                <strong>{visible.length} bengkel ditemukan</strong>
                <span>Data publik dari <b translate="no">Google Maps</b> + listing terverifikasi TemuBengkel</span>
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
          fitUserLocation={!locationText.trim()}
          selectedId={selected?.id}
          onSelect={setSelectedId}
          className="mobile-search-map"
        />

        {!hasSearched && !loading && (
          <div className="map-idle-overlay">
            <span><MapPin size={22} /></span>
            <strong>Peta siap digunakan</strong>
            <p>Cari area atau gunakan lokasi perangkat untuk menampilkan bengkel di sekitar Anda.</p>
          </div>
        )}

        {loading && <div className="map-loading-pill"><RotateCcw size={14} className="spin-icon" /> Memuat hasil...</div>}
        {selected && <MapWorkshopCard workshop={selected} />}
      </section>
    </div>
  )
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
          <span><Star size={13} fill="currentColor" /> {typeof workshop.rating === "number" ? workshop.rating.toFixed(1) : "—"}</span>
          {workshop.isOpenNow !== undefined && <span className={workshop.isOpenNow ? "open" : "closed"}>{workshop.isOpenNow ? "Buka" : "Tutup"}</span>}
          {workshop.mechanicCallAvailable && <span>Montir panggilan</span>}
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
        <span className="mobile-list-meta"><b><Star size={12} fill="currentColor" />{typeof workshop.rating === "number" ? workshop.rating.toFixed(1) : "—"}</b>{formatDistance(workshop.distanceMeters) && <b>{formatDistance(workshop.distanceMeters)}</b>}</span>
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
