"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { LocateFixed, Search } from "lucide-react"

export function HomeSearchEntry() {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const value = query.trim()
    if (!value) {
      setError("Tulis nama bengkel, area, atau alamat.")
      return
    }
    setError(null)
    router.push(`/search?q=${encodeURIComponent(value)}`)
  }

  const useLocation = () => {
    setError(null)
    if (!navigator.geolocation) {
      setError("Browser ini tidak mendukung akses lokasi.")
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const params = new URLSearchParams({
          lat: String(position.coords.latitude),
          lng: String(position.coords.longitude),
        })
        router.push(`/search?${params.toString()}`)
      },
      () => {
        setError("Lokasi tidak dapat diambil. Anda tetap bisa mencari area secara manual.")
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 300_000 },
    )
  }

  return (
    <div className="landing-quick-search">
      <form className="landing-search-form" onSubmit={submit}>
        <Search size={17} aria-hidden="true" />
        <input
          aria-label="Cari bengkel, area, atau alamat"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cari bengkel, area, atau alamat…"
          maxLength={160}
        />
        <button type="submit">Cari</button>
      </form>
      <button className="landing-location-action" type="button" onClick={useLocation} disabled={locating}>
        <LocateFixed size={15} aria-hidden="true" />
        {locating ? "Mencari lokasi…" : "Gunakan lokasi saya"}
      </button>
      {error && <p className="landing-search-error" role="alert">{error}</p>}
    </div>
  )
}
