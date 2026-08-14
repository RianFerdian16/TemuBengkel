"use client"

import { GoogleMap } from "@/components/google-map"
import type { Workshop } from "@/lib/workshops"

export function AdminWorkshopMap({ workshop }: { workshop: { id: string; name: string; address?: string | null; latitude?: number | null; longitude?: number | null } }) {
  if (typeof workshop.latitude !== "number" || typeof workshop.longitude !== "number") {
    return <div className="admin-map-empty"><strong>Koordinat belum tersedia.</strong><span>Admin tetap bisa review data lain sebelum menentukan keputusan.</span></div>
  }
  const item: Workshop = {
    id: workshop.id,
    name: workshop.name,
    address: workshop.address || undefined,
    latitude: workshop.latitude,
    longitude: workshop.longitude,
    source: "owner",
  }
  return <GoogleMap workshops={[item]} selectedId={workshop.id} className="admin-review-map" />
}
