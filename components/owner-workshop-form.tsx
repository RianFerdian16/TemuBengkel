"use client"

import { FormEvent, useEffect, useRef, useState } from "react"
import { CalendarDays, Clock3, LocateFixed, MapPinned, Navigation, Search } from "lucide-react"
import { useRouter } from "next/navigation"
import { OwnerLocationPicker } from "@/components/owner-location-picker"

type DaySchedule = {
  day: string
  open: boolean
  opens: string
  closes: string
}

type FormState = {
  name: string
  address: string
  phone: string
  whatsapp: string
  latitude: string
  longitude: string
  googlePlaceId: string
  openingHours: DaySchedule[]
  services: string
  description: string
  mechanicCallAvailable: boolean
}

const defaultSchedule = (): DaySchedule[] => [
  { day: "Senin", open: true, opens: "08:00", closes: "20:00" },
  { day: "Selasa", open: true, opens: "08:00", closes: "20:00" },
  { day: "Rabu", open: true, opens: "08:00", closes: "20:00" },
  { day: "Kamis", open: true, opens: "08:00", closes: "20:00" },
  { day: "Jumat", open: true, opens: "08:00", closes: "20:00" },
  { day: "Sabtu", open: true, opens: "08:00", closes: "20:00" },
  { day: "Minggu", open: false, opens: "08:00", closes: "20:00" },
]

const empty: FormState = {
  name: "",
  address: "",
  phone: "",
  whatsapp: "",
  latitude: "",
  longitude: "",
  googlePlaceId: "",
  openingHours: defaultSchedule(),
  services: "",
  description: "",
  mechanicCallAvailable: false,
}

function parseOpeningHours(value: unknown): DaySchedule[] {
  const schedule = defaultSchedule()
  if (!Array.isArray(value)) return schedule

  for (const raw of value) {
    const line = String(raw || "").trim()
    const match = line.match(/^([^:]+):\s*(.+)$/)
    if (!match) continue
    const item = schedule.find((day) => day.day.toLocaleLowerCase("id-ID") === match[1].trim().toLocaleLowerCase("id-ID"))
    if (!item) continue

    const valuePart = match[2].trim()
    if (/^tutup$/i.test(valuePart)) {
      item.open = false
      continue
    }

    const timeMatch = valuePart.match(/^(\d{2}:\d{2})\s*[–-]\s*(\d{2}:\d{2})$/)
    if (!timeMatch) continue
    item.open = true
    item.opens = timeMatch[1]
    item.closes = timeMatch[2]
  }

  return schedule
}

function serializeOpeningHours(schedule: DaySchedule[]) {
  return schedule.map((item) => `${item.day}: ${item.open ? `${item.opens}–${item.closes}` : "Tutup"}`)
}

export function OwnerWorkshopForm({ workshopId }: { workshopId?: string }) {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(empty)
  const [busy, setBusy] = useState(Boolean(workshopId))
  const [error, setError] = useState<string | null>(null)
  const [locationBusy, setLocationBusy] = useState(false)
  const [reverseBusy, setReverseBusy] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [locationHint, setLocationHint] = useState<string | null>(null)
  const reverseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reverseRequestRef = useRef(0)

  useEffect(() => {
    if (!workshopId) return
    void (async () => {
      const response = await fetch(`/api/owner/workshops/${workshopId}`, { cache: "no-store" })
      if (response.status === 401) return router.replace("/owner/login")
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(payload?.error || "Gagal memuat bengkel")
        setBusy(false)
        return
      }

      const item = payload.workshop
      setForm({
        name: item.name || "",
        address: item.address || "",
        phone: item.phone || "",
        whatsapp: item.whatsapp || "",
        latitude: item.latitude == null ? "" : String(item.latitude),
        longitude: item.longitude == null ? "" : String(item.longitude),
        googlePlaceId: item.google_place_id || "",
        openingHours: parseOpeningHours(item.opening_hours),
        services: Array.isArray(item.services) ? item.services.join(", ") : "",
        description: item.description || "",
        mechanicCallAvailable: Boolean(item.mechanic_call_available),
      })
      setBusy(false)
    })()
  }, [router, workshopId])

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const updateAddress = (address: string) => {
    reverseRequestRef.current += 1
    if (reverseTimerRef.current) clearTimeout(reverseTimerRef.current)
    setForm((current) => ({
      ...current,
      address,
      googlePlaceId: "",
    }))
    setLocationError(null)
    setLocationHint(null)
  }

  const setLocation = (latitude: number, longitude: number) => {
    setForm((current) => ({
      ...current,
      latitude: latitude.toFixed(7),
      longitude: longitude.toFixed(7),
      googlePlaceId: "",
    }))
  }

  const setLocationFromMap = (latitude: number, longitude: number) => {
    setLocation(latitude, longitude)
    setLocationError(null)
    if (reverseTimerRef.current) clearTimeout(reverseTimerRef.current)
    const requestId = ++reverseRequestRef.current
    setLocationHint("Membaca alamat dari titik peta…")

    reverseTimerRef.current = setTimeout(() => {
      void (async () => {
        setReverseBusy(true)
        try {
          const response = await fetch(`/api/geocode?lat=${encodeURIComponent(String(latitude))}&lng=${encodeURIComponent(String(longitude))}`, { cache: "no-store" })
          const payload = await response.json().catch(() => ({}))
          if (!response.ok) throw new Error(payload?.error || "Alamat dari titik peta belum dapat dibaca.")
          if (requestId !== reverseRequestRef.current) return
          const matchedAddress = typeof payload?.matchedAddress === "string" ? payload.matchedAddress.trim() : ""
          if (matchedAddress) {
            setForm((current) => ({ ...current, address: matchedAddress, googlePlaceId: "" }))
            setLocationHint("Alamat otomatis disesuaikan dengan titik peta. Anda tetap bisa mengoreksi teks alamat bila perlu.")
          }
        } catch (err) {
          if (requestId !== reverseRequestRef.current) return
          setLocationHint("Titik peta sudah diperbarui. Alamat lama dipertahankan karena alamat otomatis belum ditemukan.")
        } finally {
          if (requestId === reverseRequestRef.current) setReverseBusy(false)
        }
      })()
    }, 550)
  }

  useEffect(() => () => {
    reverseRequestRef.current += 1
    if (reverseTimerRef.current) clearTimeout(reverseTimerRef.current)
  }, [])

  const searchAddress = async () => {
    const address = form.address.trim()
    setLocationError(null)
    setLocationHint(null)

    if (address.length < 3) {
      setLocationError("Tulis alamat, nama jalan, area, atau patokan terlebih dahulu.")
      return
    }

    setLocationBusy(true)
    try {
      const response = await fetch(`/api/geocode?address=${encodeURIComponent(address)}`, { cache: "no-store" })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || "Alamat tidak dapat ditemukan.")
      if (!Number.isFinite(Number(payload.latitude)) || !Number.isFinite(Number(payload.longitude))) {
        throw new Error("Lokasi dari alamat tidak valid.")
      }
      setLocation(Number(payload.latitude), Number(payload.longitude))
      setLocationHint(payload?.matchedAddress
        ? `Peta diarahkan ke area terdekat: ${payload.matchedAddress}`
        : "Peta diarahkan ke area terdekat. Geser lagi jika titik bengkel belum pas.")
    } catch (err) {
      setLocationError(err instanceof Error ? err.message : "Alamat tidak dapat ditemukan.")
    } finally {
      setLocationBusy(false)
    }
  }

  const useCurrentLocation = () => {
    setLocationError(null)
    setLocationHint(null)
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationError("Browser ini tidak mendukung akses lokasi perangkat.")
      return
    }

    setLocationBusy(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude
        const longitude = position.coords.longitude
        setLocationFromMap(latitude, longitude)
        setLocationHint("Lokasi perangkat ditemukan. Alamat sedang disesuaikan otomatis dari titik tersebut.")
        setLocationBusy(false)
      },
      () => {
        setLocationError("Lokasi perangkat tidak dapat diambil. Anda tetap bisa geser peta manual atau cari alamat.")
        setLocationBusy(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    )
  }

  const updateSchedule = (index: number, patch: Partial<DaySchedule>) => {
    setForm((current) => ({
      ...current,
      openingHours: current.openingHours.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
    }))
  }

  const copyMondayHours = () => {
    const monday = form.openingHours[0]
    setForm((current) => ({
      ...current,
      openingHours: current.openingHours.map((item) => item.open
        ? { ...item, opens: monday.opens, closes: monday.closes }
        : item),
    }))
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    if (!form.openingHours.some((item) => item.open)) {
      setError("Pilih minimal satu hari operasional.")
      return
    }

    const latitude = Number(form.latitude)
    const longitude = Number(form.longitude)
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setError("Tentukan dulu titik bengkel di peta sebelum menyimpan.")
      return
    }

    setBusy(true)
    try {
      const payload = {
        ...form,
        openingHours: serializeOpeningHours(form.openingHours),
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
      <section className="owner-form-section">
        <div className="owner-form-section-heading">
          <span>01</span>
          <div><strong>Identitas bengkel</strong><p>Data dasar yang akan dilihat pelanggan.</p></div>
        </div>
        <div className="form-grid">
          <div className="full-field">
            <label htmlFor="workshop-name">Nama bengkel</label>
            <input id="workshop-name" value={form.name} onChange={(e) => update("name", e.target.value)} required minLength={2} placeholder="Contoh: Sinar Motor Cikarang" />
          </div>
          <div className="full-field owner-address-field">
            <label htmlFor="workshop-address">Alamat bengkel</label>
            <textarea id="workshop-address" value={form.address} onChange={(e) => updateAddress(e.target.value)} rows={3} required minLength={3} placeholder="Contoh: Jl. Raya Cikarang Selatan, area Ruko Sentra Niaga, Bekasi" />
            <div className="owner-address-actions owner-address-actions-v20">
              <button className="primary-btn owner-find-address-btn" type="button" onClick={searchAddress} disabled={locationBusy || busy}>
                <Search size={15} aria-hidden="true" /> {locationBusy ? "Mencari…" : "Cari alamat"}
              </button>
              <button className="secondary-btn owner-find-address-btn owner-find-current-btn" type="button" onClick={useCurrentLocation} disabled={locationBusy || busy}>
                <Navigation size={15} aria-hidden="true" /> Gunakan lokasi saya
              </button>
            </div>
            <p className="owner-address-helper">Boleh isi alamat lengkap, nama jalan, area, patokan, atau titik terdekat. Kalau hasil belum pas, atur lagi titiknya langsung di peta.</p>
            {locationHint && <p className="owner-location-inline-hint"><MapPinned size={14} aria-hidden="true" /> {locationHint}</p>}
            {locationError && <p className="owner-location-inline-error owner-location-inline-soft-error" role="alert">{locationError}</p>}
          </div>
        </div>

        <div className="owner-location-heading">
          <div><LocateFixed size={18} aria-hidden="true" /><strong>Lokasi bengkel di peta</strong></div>
          <span>{reverseBusy ? "Menyesuaikan alamat dari titik peta…" : "Geser pin — alamat akan ikut disesuaikan otomatis"}</span>
        </div>
        <OwnerLocationPicker latitude={form.latitude} longitude={form.longitude} onChange={setLocationFromMap} />
      </section>

      <section className="owner-form-section">
        <div className="owner-form-section-heading">
          <span>02</span>
          <div><strong>Kontak</strong><p>Nomor yang bisa digunakan pelanggan untuk menghubungi bengkel.</p></div>
        </div>
        <div className="form-grid two-col owner-contact-grid">
          <div><label htmlFor="workshop-phone">Telepon</label><input id="workshop-phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="021... / 08..." /></div>
          <div><label htmlFor="workshop-wa">WhatsApp</label><input id="workshop-wa" value={form.whatsapp} onChange={(e) => update("whatsapp", e.target.value)} placeholder="08..." /></div>
        </div>
      </section>

      <section className="owner-form-section schedule-section">
        <div className="owner-form-section-heading schedule-heading">
          <span>03</span>
          <div><strong>Hari & jam operasional</strong><p>Aktifkan hari buka lalu tentukan jam layanan.</p></div>
          <button className="schedule-copy-btn" type="button" onClick={copyMondayHours}><Clock3 size={14} /> Samakan jam</button>
        </div>
        <div className="schedule-list">
          {form.openingHours.map((item, index) => (
            <div className={`schedule-row${item.open ? " is-open" : " is-closed"}`} key={item.day}>
              <label className="schedule-day-toggle">
                <input type="checkbox" checked={item.open} onChange={(e) => updateSchedule(index, { open: e.target.checked })} />
                <span>{item.day}</span>
              </label>
              {item.open ? (
                <div className="schedule-times">
                  <label><span>Buka</span><input type="time" value={item.opens} onChange={(e) => updateSchedule(index, { opens: e.target.value })} required /></label>
                  <i>—</i>
                  <label><span>Tutup</span><input type="time" value={item.closes} onChange={(e) => updateSchedule(index, { closes: e.target.value })} required /></label>
                </div>
              ) : <span className="schedule-closed-label">Tutup</span>}
            </div>
          ))}
        </div>
        <p className="form-note schedule-note"><CalendarDays size={14} /> Jam operasional ini akan tampil di detail bengkel dan dipakai untuk status buka/tutup listing owner.</p>
      </section>

      <section className="owner-form-section">
        <div className="owner-form-section-heading">
          <span>04</span>
          <div><strong>Layanan</strong><p>Tambahkan informasi yang membantu pelanggan memilih bengkel.</p></div>
        </div>
        <label htmlFor="workshop-services">Layanan tersedia</label>
        <input id="workshop-services" value={form.services} onChange={(e) => update("services", e.target.value)} placeholder="Ganti oli, tambal ban, servis rem" />
        <p className="form-note">Pisahkan layanan dengan koma.</p>

        <label htmlFor="workshop-description">Informasi tambahan</label>
        <textarea id="workshop-description" value={form.description} onChange={(e) => update("description", e.target.value)} rows={4} maxLength={1000} placeholder="Contoh: menerima motor matic dan bebek, tersedia ruang tunggu." />

        <label className="check-row"><input type="checkbox" checked={form.mechanicCallAvailable} onChange={(e) => update("mechanicCallAvailable", e.target.checked)} /><span>Bengkel menyediakan montir panggilan</span></label>
        <p className="form-note">Centang hanya jika layanan ini memang tersedia.</p>
      </section>

      {error && <p className="form-note error-note owner-save-error" role="alert">{error}</p>}
      <div className="owner-form-actions">
        <button className="primary-btn" type="submit" disabled={busy}>{busy ? "Menyimpan…" : workshopId ? "Simpan perubahan" : "Kirim bengkel"}</button>
        <button className="secondary-btn" type="button" onClick={() => router.push("/owner/dashboard")}>Batal</button>
      </div>
    </form>
  )
}
