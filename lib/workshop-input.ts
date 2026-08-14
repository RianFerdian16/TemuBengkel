import type { WorkshopWriteInput } from "@/lib/workshop-repository"

function optionalText(value: unknown, maxLength: number) {
  const text = String(value ?? "").trim()
  return text ? text.slice(0, maxLength) : null
}

function coordinate(value: unknown) {
  if (value === "" || value === null || value === undefined) return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) throw new Error("Koordinat tidak valid.")
  return parsed
}

export function parseWorkshopInput(body: any): WorkshopWriteInput {
  const name = String(body?.name || "").trim()
  if (name.length < 2 || name.length > 120) {
    throw new Error("Nama bengkel harus 2–120 karakter.")
  }

  const latitude = coordinate(body?.latitude)
  const longitude = coordinate(body?.longitude)

  if ((latitude === null) !== (longitude === null)) {
    throw new Error("Latitude dan longitude harus diisi bersama.")
  }
  if (latitude !== null && (latitude < -90 || latitude > 90)) {
    throw new Error("Latitude tidak valid.")
  }
  if (longitude !== null && (longitude < -180 || longitude > 180)) {
    throw new Error("Longitude tidak valid.")
  }

  const address = optionalText(body?.address, 1000)
  if (!address || address.length < 5) {
    throw new Error("Alamat bengkel harus diisi dengan lengkap.")
  }

  const openingHours = Array.isArray(body?.openingHours)
    ? body.openingHours
        .map((item: unknown): string => String(item).trim().slice(0, 80))
        .filter((item: string) => Boolean(item))
        .slice(0, 7)
    : []

  if (!openingHours.some((item: string) => !/:\s*Tutup$/i.test(item))) {
    throw new Error("Pilih minimal satu hari operasional.")
  }

  const serviceValues: string[] = Array.isArray(body?.services)
    ? body.services
        .map((item: unknown): string => String(item).trim().slice(0, 80))
        .filter((item: string) => Boolean(item))
    : []
  const services = Array.from(new Set<string>(serviceValues)).slice(0, 20)

  return {
    googlePlaceId: optionalText(body?.googlePlaceId, 255),
    name,
    address,
    phone: optionalText(body?.phone, 40),
    whatsapp: optionalText(body?.whatsapp, 40),
    latitude,
    longitude,
    services,
    openingHours,
    timeZone: "Asia/Jakarta",
    description: optionalText(body?.description, 1000),
    mechanicCallAvailable: Boolean(body?.mechanicCallAvailable),
  }
}
