import type { WorkshopWriteInput } from "@/lib/workshop-repository"
import { resolveIndonesiaTimeZone } from "@/lib/timezone"

type NominatimResult = {
  lat?: string
  lon?: string
  display_name?: string
  importance?: number
  address?: Record<string, string | undefined>
}

type NominatimReverseResult = {
  lat?: string
  lon?: string
  display_name?: string
  address?: Record<string, string | undefined>
}

const DEFAULT_NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org"

function nominatimBaseUrl() {
  return (process.env.NOMINATIM_BASE_URL || DEFAULT_NOMINATIM_BASE_URL).replace(/\/$/, "")
}

function normalizeAddress(input: string) {
  return input.replace(/\s+/g, " ").replace(/\s*,\s*/g, ", ").replace(/,+/g, ",").trim()
}

function cleanPart(value: string) {
  return value
    .replace(/\b\d{5}\b/g, "")
    .replace(/\b(?:no|nomor)\.?\s*\d+[a-zA-Z0-9/-]*/gi, "")
    .replace(/\b(?:rt|rw)\.?\s*\d+(?:\s*\/\s*\d+)?/gi, "")
    .replace(/\s+/g, " ")
    .replace(/^[-–—,\s]+|[-–—,\s]+$/g, "")
    .trim()
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => normalizeAddress(value)).filter((value) => value.length >= 3))]
}

function buildCandidateQueries(address: string) {
  const normalized = normalizeAddress(address)
  const rawParts = normalized.split(",").map(cleanPart).filter(Boolean)
  const cleaned = cleanPart(normalized)
  const withoutRoadPrefix = cleaned.replace(/^(?:jl\.?|jalan|jln\.?)\s+/i, "")
  const regionCandidates: string[] = []
  if (rawParts.length >= 2) regionCandidates.push(rawParts.slice(-2).join(", "))
  if (rawParts.length >= 3) regionCandidates.push(rawParts.slice(-3).join(", "))
  if (rawParts.length >= 4) regionCandidates.push(rawParts.slice(-4).join(", "))
  const localityWords = rawParts.filter((part) => /(?:jakarta|bekasi|depok|bogor|tangerang|cikarang|bandung|surabaya|semarang|yogyakarta|medan|makassar|bali|denpasar|malang|solo|surakarta|kabupaten|kota|kecamatan|selatan|utara|barat|timur|tengah)/i.test(part))
  const queries = unique([
    normalized, `${normalized}, Indonesia`, cleaned, `${cleaned}, Indonesia`, withoutRoadPrefix,
    `${withoutRoadPrefix}, Indonesia`, ...regionCandidates, ...regionCandidates.map((value) => `${value}, Indonesia`),
    localityWords.join(", "), localityWords.length ? `${localityWords.join(", ")}, Indonesia` : "",
  ])
  return queries.flatMap((q) => [{ q, countrycodes: "id" }, { q }]).slice(0, 12)
}

async function searchNominatim(
  query: { q: string; countrycodes?: string },
  limit = 5,
  options: { timeoutMs?: number; revalidateSeconds?: number } = {},
) {
  const params = new URLSearchParams({ q: query.q, format: "jsonv2", limit: String(limit), addressdetails: "1", dedupe: "1" })
  if (query.countrycodes) params.set("countrycodes", query.countrycodes)
  try {
    const response = await fetch(`${nominatimBaseUrl()}/search?${params.toString()}`, {
      headers: { "User-Agent": "TemuBengkel/0.4 location-geocoder", "Accept-Language": "id,en;q=0.8" },
      next: { revalidate: options.revalidateSeconds ?? 86_400 },
      signal: AbortSignal.timeout(options.timeoutMs ?? 2_500),
    })
    if (!response.ok) throw new Error("Nominatim unavailable")
    const payload = await response.json().catch(() => []) as NominatimResult[]
    return Array.isArray(payload) ? payload : []
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new Error("Pencarian lokasi membutuhkan waktu terlalu lama. Hasil bengkel lain tetap bisa digunakan.")
    }
    throw new Error("Layanan pencarian lokasi sedang tidak tersedia. Peta tetap bisa digunakan secara manual.")
  }
}

/** Optional enrichment for public universal search. It is deliberately capped at 1.8s. */
export async function geocodeSearchContext(searchText: string) {
  const q = normalizeAddress(searchText)
  if (q.length < 3) return null
  const results = await searchNominatim({ q, countrycodes: "id" }, 1, { timeoutMs: 1_800, revalidateSeconds: 86_400 })
  const match = results.find((item) => Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lon)))
  if (!match) return null
  return { latitude: Number(match.lat), longitude: Number(match.lon), matchedAddress: match.display_name || q }
}

export async function reverseGeocodeCoordinates(latitude: number, longitude: number) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new Error("Koordinat lokasi tidak valid.")
  }
  const params = new URLSearchParams({ format: "jsonv2", lat: String(latitude), lon: String(longitude), zoom: "18", addressdetails: "1" })
  try {
    const response = await fetch(`${nominatimBaseUrl()}/reverse?${params.toString()}`, {
      headers: { "User-Agent": "TemuBengkel/0.4 owner-reverse-geocoder", "Accept-Language": "id,en;q=0.8" },
      next: { revalidate: 604_800 },
      signal: AbortSignal.timeout(2_500),
    })
    if (!response.ok) throw new Error("reverse unavailable")
    const payload = await response.json().catch(() => null) as NominatimReverseResult | null
    if (!payload?.display_name) throw new Error("Alamat dari titik peta belum ditemukan.")
    const province = payload.address?.state || payload.address?.region || payload.address?.province || ""
    return {
      latitude,
      longitude,
      matchedAddress: payload.display_name,
      province,
      timeZone: resolveIndonesiaTimeZone(latitude, longitude, `${province}, ${payload.display_name}`),
    }
  } catch (error) {
    if (error instanceof Error && error.message === "Alamat dari titik peta belum ditemukan.") throw error
    throw new Error("Alamat dari titik peta belum dapat dibaca.")
  }
}

export async function geocodeWorkshopAddress(address: string) {
  const candidates = buildCandidateQueries(address)
  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index]
    const results = await searchNominatim(candidate, 5, { timeoutMs: 2_300, revalidateSeconds: 604_800 })
    const match = results
      .filter((item) => Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lon)))
      .sort((a, b) => Number(b.importance || 0) - Number(a.importance || 0))[0]
    if (!match) continue
    const latitude = Number(match.lat)
    const longitude = Number(match.lon)
    const province = match.address?.state || match.address?.region || match.address?.province || ""
    return {
      latitude,
      longitude,
      matchedAddress: match.display_name || candidate.q,
      matchedQuery: candidate.q,
      approximate: index > 1,
      province,
      timeZone: resolveIndonesiaTimeZone(latitude, longitude, `${province}, ${match.display_name || address}`),
    }
  }
  throw new Error("Alamat belum ketemu otomatis. Nggak masalah — peta tetap aktif, jadi geser titik manual ke lokasi bengkel Anda.")
}

export async function ensureWorkshopCoordinates(data: WorkshopWriteInput): Promise<WorkshopWriteInput> {
  if (typeof data.latitude === "number" && typeof data.longitude === "number") {
    return { ...data, timeZone: resolveIndonesiaTimeZone(data.latitude, data.longitude, data.address) }
  }
  if (!data.address) throw new Error("Alamat bengkel diperlukan untuk menentukan lokasi peta.")
  const coordinates = await geocodeWorkshopAddress(data.address)
  return {
    ...data,
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    timeZone: coordinates.timeZone,
  }
}
