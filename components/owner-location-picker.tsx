"use client"

import { useEffect, useRef, useState } from "react"
import { CheckCircle2, LocateFixed } from "lucide-react"
import { loadGoogleMaps } from "@/components/google-map"

const DEFAULT_CENTER = { latitude: -6.305, longitude: 107.155 }
const DEFAULT_ZOOM = 13
const PICKED_ZOOM = 18

function validCoordinate(value: string, min: number, max: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null
}

export function OwnerLocationPicker({
  latitude,
  longitude,
  onChange,
}: {
  latitude: string
  longitude: string
  onChange: (latitude: number, longitude: number) => void
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<any>(null)
  const onChangeRef = useRef(onChange)
  const internalMoveRef = useRef(false)
  const [mapError, setMapError] = useState<string | null>(null)

  const lat = validCoordinate(latitude, -90, 90)
  const lng = validCoordinate(longitude, -180, 180)
  const hasPickedLocation = lat !== null && lng !== null

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    let cancelled = false

    void loadGoogleMaps()
      .then(async (google) => {
        if (cancelled || !containerRef.current) return

        const { Map } = await google.maps.importLibrary("maps")
        if (cancelled || !containerRef.current) return

        const map = new Map(containerRef.current, {
          center: hasPickedLocation
            ? { lat: lat, lng }
            : { lat: DEFAULT_CENTER.latitude, lng: DEFAULT_CENTER.longitude },
          zoom: hasPickedLocation ? PICKED_ZOOM : DEFAULT_ZOOM,
          mapId: process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || "DEMO_MAP_ID",
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: true,
          gestureHandling: "greedy",
          zoomControl: true,
        })

        mapRef.current = map

        map.addListener("dragstart", () => {
          internalMoveRef.current = true
        })

        map.addListener("dragend", () => {
          const center = map.getCenter()
          if (!center) return
          onChangeRef.current(Number(center.lat().toFixed(7)), Number(center.lng().toFixed(7)))
          internalMoveRef.current = false
        })

        map.addListener("click", (event: any) => {
          if (!event?.latLng) return
          const next = { lat: event.latLng.lat(), lng: event.latLng.lng() }
          internalMoveRef.current = true
          map.panTo(next)
          onChangeRef.current(Number(next.lat.toFixed(7)), Number(next.lng.toFixed(7)))
          window.setTimeout(() => { internalMoveRef.current = false }, 250)
        })

        const observer = new ResizeObserver(() => {
          google.maps.event.trigger(map, "resize")
        })
        observer.observe(containerRef.current)
        ;(map as any).__tbResizeObserver = observer

        setMapError(null)
      })
      .catch((error) => {
        setMapError(error instanceof Error ? error.message : "Peta tidak dapat dimuat.")
      })

    return () => {
      cancelled = true
      const observer = (mapRef.current as any)?.__tbResizeObserver as ResizeObserver | undefined
      observer?.disconnect()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !hasPickedLocation || internalMoveRef.current) return

    const center = map.getCenter()
    const currentLat = center?.lat?.()
    const currentLng = center?.lng?.()
    const needsMove = typeof currentLat !== "number"
      || typeof currentLng !== "number"
      || Math.abs(currentLat - lat) > 0.000001
      || Math.abs(currentLng - lng) > 0.000001

    if (needsMove) {
      map.setCenter({ lat, lng })
      map.setZoom(PICKED_ZOOM)
    }
  }, [hasPickedLocation, lat, lng])

  return (
    <div className="owner-location-picker owner-location-picker-google">
      <div className="owner-location-map-shell owner-location-map-shell-google">
        <div ref={containerRef} className="owner-location-map owner-location-map-google" aria-label="Pilih titik lokasi bengkel pada peta" />
        <div className="owner-location-center-pin owner-location-center-pin-v21" aria-hidden="true">
          <span className="owner-pin-v21">
            <i className="owner-pin-v21-ring" />
            <i className="owner-pin-v21-dot" />
          </span>
        </div>
      </div>

      {mapError ? (
        <p className="owner-location-error" role="alert">{mapError}</p>
      ) : hasPickedLocation ? (
        <div className="owner-location-status">
          <CheckCircle2 size={16} aria-hidden="true" />
          <div><strong>Titik lokasi sudah dipilih</strong><span>Geser peta atau ketuk titik lain sampai pin tepat di depan bengkel.</span></div>
        </div>
      ) : (
        <div className="owner-location-status owner-location-status-neutral">
          <LocateFixed size={16} aria-hidden="true" />
          <div><strong>Peta siap dipakai</strong><span>Cari alamat, gunakan lokasi perangkat, atau langsung geser peta sampai titiknya pas.</span></div>
        </div>
      )}
    </div>
  )
}
