"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { LocateFixed, Search } from "lucide-react"
import { GoogleMap } from "@/components/google-map"

export function HomeExperience() {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [location, setLocation] = useState("")
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const params = new URLSearchParams()
    if (query.trim()) params.set("q", query.trim())
    if (location.trim()) params.set("location", location.trim())
    router.push(`/search${params.toString() ? `?${params.toString()}` : ""}`)
  }

  const useLocation = () => {
    setLocationError(null)
    if (!navigator.geolocation) {
      setLocationError("Browser ini tidak mendukung lokasi. Masukkan area secara manual.")
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const params = new URLSearchParams({ lat: String(coords.latitude), lng: String(coords.longitude) })
        if (query.trim()) params.set("q", query.trim())
        router.push(`/search?${params.toString()}`)
      },
      () => {
        setLocating(false)
        setLocationError("Akses lokasi ditolak. Masukkan kota, kecamatan, atau area secara manual.")
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    )
  }

  return (
    <section className="hero">
      <div className="shell hero-grid">
        <div>
          <p className="eyebrow">Bengkel motor di sekitar Anda</p>
          <h1>Temukan bengkel terdekat tanpa ribet.</h1>
          <p className="hero-copy">
            Cari bengkel motor berdasarkan lokasi, bandingkan rating Google, lalu buka rute langsung di Google Maps.
          </p>

          <form className="surface search-panel" onSubmit={submit}>
            <label className="search-label" htmlFor="home-location">Lokasi</label>
            <div className="input-with-icon">
              <Search size={18} aria-hidden="true" />
              <input
                className="search-input clean-input"
                id="home-location"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Kota, kecamatan, atau area"
              />
            </div>
            <label className="search-label optional-label" htmlFor="home-query">Kebutuhan servis <span>opsional</span></label>
            <input
              className="search-input"
              id="home-query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Contoh: tambal ban, ganti oli"
            />
            <div className="home-search-actions">
              <button className="primary-btn" type="submit">Cari bengkel</button>
              <button className="secondary-btn location-btn" type="button" onClick={useLocation} disabled={locating}>
                <LocateFixed size={17} aria-hidden="true" />
                {locating ? "Mencari lokasi…" : "Gunakan lokasi saya"}
              </button>
            </div>
            {locationError && <p className="form-note error-note" role="status">{locationError}</p>}
          </form>
        </div>

        <div className="surface home-map-wrap">
          <GoogleMap workshops={[]} className="home-map" />
          <div className="map-caption">
            <strong>Peta langsung dari Google Maps</strong>
            <span>Marker bengkel akan muncul setelah Anda memilih lokasi.</span>
          </div>
        </div>
      </div>
    </section>
  )
}
