"use client"

import { FormEvent, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import type { Workshop } from "@/lib/workshops"

type FormState = {
  name: string
  address: string
  phone: string
  whatsapp: string
  latitude: string
  longitude: string
  googlePlaceId: string
  services: string
  description: string
  mechanicCallAvailable: boolean
}

const empty: FormState = {
  name: "",
  address: "",
  phone: "",
  whatsapp: "",
  latitude: "",
  longitude: "",
  googlePlaceId: "",
  services: "",
  description: "",
  mechanicCallAvailable: false,
}

export function OwnerWorkshopForm({ workshopId }: { workshopId?: string }) {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(empty)
  const [busy, setBusy] = useState(Boolean(workshopId))
  const [error, setError] = useState<string | null>(null)
  const [matches, setMatches] = useState<Workshop[]>([])
  const [searchingGoogle, setSearchingGoogle] = useState(false)

  useEffect(() => {
    if (!workshopId) return
    void (async () => {
      const response = await fetch(`/api/owner/workshops/${workshopId}`, { cache: "no-store" })
      if (response.status === 401) return router.replace("/owner/login")
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) { setError(payload?.error || "Gagal memuat bengkel"); setBusy(false); return }
      const item = payload.workshop
      setForm({
        name: item.name || "",
        address: item.address || "",
        phone: item.phone || "",
        whatsapp: item.whatsapp || "",
        latitude: item.latitude == null ? "" : String(item.latitude),
        longitude: item.longitude == null ? "" : String(item.longitude),
        googlePlaceId: item.google_place_id || "",
        services: Array.isArray(item.services) ? item.services.join(", ") : "",
        description: item.description || "",
        mechanicCallAvailable: Boolean(item.mechanic_call_available),
      })
      setBusy(false)
    })()
  }, [router, workshopId])

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }))

  const findOnGoogle = async () => {
    if (!form.name.trim() && !form.address.trim()) {
      setError("Isi nama bengkel atau alamat sebelum mencari di Google Maps.")
      return
    }
    setSearchingGoogle(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (form.name.trim()) params.set("q", form.name.trim())
      if (form.address.trim()) params.set("location", form.address.trim())
      const response = await fetch(`/api/places/search?${params.toString()}`, { cache: "no-store" })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || "Pencarian Google gagal")
      setMatches((payload.workshops || []).slice(0, 5))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pencarian Google gagal")
    } finally {
      setSearchingGoogle(false)
    }
  }

  const chooseMatch = (item: Workshop) => {
    setForm((current) => ({
      ...current,
      name: item.name || current.name,
      address: item.address || current.address,
      phone: item.phone || current.phone,
      latitude: item.latitude == null ? current.latitude : String(item.latitude),
      longitude: item.longitude == null ? current.longitude : String(item.longitude),
      googlePlaceId: item.googlePlaceId || item.id,
    }))
    setMatches([])
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const payload = {
        ...form,
        latitude: form.latitude,
        longitude: form.longitude,
        services: form.services.split(",").map((value) => value.trim()).filter(Boolean),
      }
      const response = await fetch(workshopId ? `/api/owner/workshops/${workshopId}` : "/api/owner/workshops", {
        method: workshopId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (response.status === 401) return router.replace("/owner/login")
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result?.error || "Gagal menyimpan bengkel")
      router.push("/owner/dashboard")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan bengkel")
      setBusy(false)
    }
  }

  return (
    <form className="surface owner-form owner-workshop-form" onSubmit={submit}>
      <div className="form-grid">
        <div className="full-field"><label htmlFor="workshop-name">Nama bengkel</label><input id="workshop-name" value={form.name} onChange={(e) => update("name", e.target.value)} required minLength={2} /></div>
        <div className="full-field"><label htmlFor="workshop-address">Alamat</label><textarea id="workshop-address" value={form.address} onChange={(e) => update("address", e.target.value)} rows={3} /></div>
      </div>

      <div className="google-link-box">
        <div><strong>Hubungkan ke listing Google Maps</strong><p>Opsional, tapi direkomendasikan agar rating, foto, jam buka, dan review tetap berasal dari Google secara langsung.</p></div>
        <button className="secondary-btn" type="button" onClick={findOnGoogle} disabled={searchingGoogle}>{searchingGoogle ? "Mencari…" : "Cari di Google Maps"}</button>
      </div>
      {matches.length > 0 && <div className="place-match-list">{matches.map((item) => <button type="button" key={item.id} onClick={() => chooseMatch(item)}><strong>{item.name}</strong><span>{item.address}</span>{item.rating && <small>★ {item.rating.toFixed(1)}</small>}</button>)}</div>}
      {form.googlePlaceId && <p className="form-note success-note">Google Place ID terhubung: {form.googlePlaceId}</p>}

      <div className="form-grid two-col">
        <div><label htmlFor="workshop-phone">Telepon</label><input id="workshop-phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="021... / 08..." /></div>
        <div><label htmlFor="workshop-wa">WhatsApp</label><input id="workshop-wa" value={form.whatsapp} onChange={(e) => update("whatsapp", e.target.value)} placeholder="08..." /></div>
        <div><label htmlFor="workshop-lat">Latitude</label><input id="workshop-lat" inputMode="decimal" value={form.latitude} onChange={(e) => update("latitude", e.target.value)} placeholder="-6.20" /></div>
        <div><label htmlFor="workshop-lng">Longitude</label><input id="workshop-lng" inputMode="decimal" value={form.longitude} onChange={(e) => update("longitude", e.target.value)} placeholder="106.84" /></div>
      </div>

      <label htmlFor="workshop-services">Layanan</label>
      <input id="workshop-services" value={form.services} onChange={(e) => update("services", e.target.value)} placeholder="Ganti oli, tambal ban, servis rem" />
      <p className="form-note">Pisahkan layanan dengan koma.</p>

      <label htmlFor="workshop-description">Informasi tambahan</label>
      <textarea id="workshop-description" value={form.description} onChange={(e) => update("description", e.target.value)} rows={4} maxLength={1000} placeholder="Informasi yang memang benar tentang bengkel Anda." />

      <label className="check-row"><input type="checkbox" checked={form.mechanicCallAvailable} onChange={(e) => update("mechanicCallAvailable", e.target.checked)} /><span>Bengkel benar-benar menyediakan montir panggilan</span></label>
      <p className="form-note">Centang hanya jika layanan ini memang tersedia. Informasi palsu dapat ditolak saat moderasi.</p>

      {error && <p className="form-note error-note" role="alert">{error}</p>}
      <div className="owner-form-actions"><button className="primary-btn" type="submit" disabled={busy}>{busy ? "Menyimpan…" : workshopId ? "Simpan perubahan" : "Kirim bengkel"}</button><button className="secondary-btn" type="button" onClick={() => router.push("/owner/dashboard")}>Batal</button></div>
    </form>
  )
}
