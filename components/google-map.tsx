"use client"

import { useEffect, useRef, useState } from "react"
import type { Workshop } from "@/lib/workshops"

type MapsWindow = Window & {
  google?: any
  __temubengkelMapsPromise?: Promise<any>
}

export function loadGoogleMaps() {
  const win = window as MapsWindow
  if (win.google?.maps) return Promise.resolve(win.google)
  if (win.__temubengkelMapsPromise) return win.__temubengkelMapsPromise

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!key) return Promise.reject(new Error("Google Maps API key belum dikonfigurasi"))

  win.__temubengkelMapsPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-temubengkel-google-maps]")
    if (existing) {
      existing.addEventListener("load", () => resolve((window as MapsWindow).google))
      existing.addEventListener("error", () => reject(new Error("Google Maps gagal dimuat")))
      return
    }
    const script = document.createElement("script")
    script.dataset.temubengkelGoogleMaps = "true"
    script.async = true
    script.defer = true
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&libraries=marker`
    script.onload = () => resolve((window as MapsWindow).google)
    script.onerror = () => reject(new Error("Google Maps gagal dimuat"))
    document.head.appendChild(script)
  })

  return win.__temubengkelMapsPromise
}

export function GoogleMap({
  workshops,
  userLocation,
  fitUserLocation = true,
  selectedId,
  onSelect,
  recenterKey = 0,
  className = "map-canvas",
}: {
  workshops: Workshop[]
  userLocation?: { latitude: number; longitude: number }
  fitUserLocation?: boolean
  selectedId?: string
  onSelect?: (id: string) => void
  recenterKey?: number
  className?: string
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const lastFitSignatureRef = useRef("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    loadGoogleMaps()
      .then(async (google) => {
        if (cancelled || !containerRef.current) return
        const { Map } = await google.maps.importLibrary("maps")
        if (cancelled || !containerRef.current) return
        mapRef.current = new Map(containerRef.current, {
          center: userLocation
            ? { lat: userLocation.latitude, lng: userLocation.longitude }
            : { lat: -6.2088, lng: 106.8456 },
          zoom: userLocation ? 14 : 11,
          mapId: process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || "DEMO_MAP_ID",
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
          gestureHandling: "greedy",
        })
        const observer = new ResizeObserver(() => {
          if (mapRef.current) google.maps.event.trigger(mapRef.current, "resize")
        })
        observer.observe(containerRef.current)
        ;(mapRef.current as any).__tbResizeObserver = observer
        setError(null)
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Peta tidak dapat dimuat"))

    return () => {
      cancelled = true
      const observer = (mapRef.current as any)?.__tbResizeObserver as ResizeObserver | undefined
      observer?.disconnect()
    }
  }, [])

  useEffect(() => {
    if (!recenterKey || !userLocation || !mapRef.current) return
    mapRef.current.panTo({ lat: userLocation.latitude, lng: userLocation.longitude })
    mapRef.current.setZoom(15)
  }, [recenterKey, userLocation?.latitude, userLocation?.longitude])

  useEffect(() => {
    let cancelled = false
    const renderMarkers = async () => {
      const google = (window as MapsWindow).google
      const map = mapRef.current
      if (!google?.maps || !map) return

      markersRef.current.forEach((marker) => {
        marker.map = null
      })
      markersRef.current = []

      const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary("marker")
      if (cancelled) return
      const bounds = new google.maps.LatLngBounds()

      if (userLocation) {
        const content = document.createElement("div")
        content.className = "tb-user-location-marker"
        content.setAttribute("aria-label", "Posisi Anda sekarang")
        content.innerHTML = `
          <span class="tb-user-location-pin">
            <svg viewBox="0 0 40 48" focusable="false" aria-hidden="true">
              <path d="M20 46C17.7 42.9 6 29.2 6 19.2C6 11.4 12.3 5 20 5s14 6.4 14 14.2C34 29.2 22.3 42.9 20 46Z" fill="currentColor" stroke="white" stroke-width="3" stroke-linejoin="round"/>
              <circle cx="20" cy="19" r="5.5" fill="white"/>
            </svg>
          </span>
        `

        const marker = new AdvancedMarkerElement({
          map,
          position: { lat: userLocation.latitude, lng: userLocation.longitude },
          title: "Posisi Anda sekarang",
          content,
          zIndex: 1000,
        })
        markersRef.current.push(marker)
        if (fitUserLocation) bounds.extend({ lat: userLocation.latitude, lng: userLocation.longitude })
      }

      workshops.forEach((workshop) => {
        if (typeof workshop.latitude !== "number" || typeof workshop.longitude !== "number") return
        const pin = new PinElement({
          glyphText: workshop.id === selectedId ? "✓" : undefined,
          scale: workshop.id === selectedId ? 1.15 : 1,
        })
        const marker = new AdvancedMarkerElement({
          map,
          position: { lat: workshop.latitude, lng: workshop.longitude },
          title: workshop.name,
          content: pin,
          gmpClickable: true,
        })
        marker.addEventListener("gmp-click", () => onSelect?.(workshop.id))
        markersRef.current.push(marker)
        bounds.extend({ lat: workshop.latitude, lng: workshop.longitude })
      })

      // Only refit when the result set/location context changes. Selecting a marker
      // should not yank the user's viewport back to the full result bounds.
      const fitSignature = [
        fitUserLocation && userLocation ? `${userLocation.latitude.toFixed(5)},${userLocation.longitude.toFixed(5)}` : "",
        ...workshops.map((item) => `${item.id}:${item.latitude ?? ""}:${item.longitude ?? ""}`),
      ].join("|")

      if (!bounds.isEmpty() && fitSignature !== lastFitSignatureRef.current) {
        lastFitSignatureRef.current = fitSignature
        map.fitBounds(bounds, 64)
        google.maps.event.addListenerOnce(map, "idle", () => {
          if (map.getZoom() > 16) map.setZoom(16)
        })
      }
    }

    const timer = window.setInterval(() => {
      if (mapRef.current && (window as MapsWindow).google?.maps) {
        window.clearInterval(timer)
        void renderMarkers()
      }
    }, 80)

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [workshops, userLocation?.latitude, userLocation?.longitude, fitUserLocation, selectedId, onSelect])

  if (error) {
    return (
      <div className={`${className} map-fallback`} role="status">
        <strong>Peta belum aktif.</strong>
        <span>{error}</span>
      </div>
    )
  }

  return <div ref={containerRef} className={className} aria-label="Peta bengkel TEMUBENGKEL" />
}
