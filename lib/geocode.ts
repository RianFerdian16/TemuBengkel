import type { WorkshopWriteInput } from "@/lib/workshop-repository"

type NominatimResult = {
  lat?: string
  lon?: string
  display_name?: string
  importance?: number
}

const DEFAULT_NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org"

function normalizeAddress(input: string) {
  return input
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/,+/g, ",")
    .trim()
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
    normalized,
    `${normalized}, Indonesia`,
    cleaned,
    `${cleaned}, Indonesia`,
    withoutRoadPrefix,
    `${withoutRoadPrefix}, Indonesia`,
    ...regionCandidates,
    ...regionCandidates.map((value) => `${value}, Indonesia`),
    localityWords.join(", "),
    localityWords.length ? `${localityWords.join(", ")}, Indonesia` : "",
  ])

  return queries.flatMap((q) => [
    { q, countrycodes: "id" },
    { q },
  ])
}

async function searchNominatim(query: { q: string; countrycodes?: string }) {
  const baseUrl = (process.env.NOMINATIM_BASE_URL || DEFAULT_NOMINATIM_BASE_URL).replace(/\/$/, "")
  const params = new URLSearchParams({
    q: query.q,
    format: "jsonv2",
    limit: "5",
    addressdetails: "1",
    dedupe: "1",
  })

  if (query.countrycodes) params.set("countrycodes", query.countrycodes)

  const response = await fetch(`${baseUrl}/search?${params.toString()}`, {
    headers: {
      "User-Agent": "TemuBengkel/0.2 owner-address-geocoder",
      "Accept-Language": "id,en;q=0.8",
    },
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error("Layanan pencarian lokasi sedang tidak tersedia. Peta tetap bisa digeser manual.")
  }

  const payload = await response.json().catch(() => []) as NominatimResult[]
  return Array.isArray(payload) ? payload : []
}

export async function geocodeWorkshopAddress(address: string) {
  const candidates = buildCandidateQueries(address)

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index]
    const results = await searchNominatim(candidate)
    const match = results
      .filter((item) => Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lon)))
      .sort((a, b) => Number(b.importance || 0) - Number(a.importance || 0))[0]

    if (!match) continue

    return {
      latitude: Number(match.lat),
      longitude: Number(match.lon),
      matchedAddress: match.display_name || candidate.q,
      matchedQuery: candidate.q,
      approximate: index > 1,
    }
  }

  throw new Error("Alamat belum ketemu otomatis. Nggak masalah — peta tetap aktif, jadi geser titik manual ke lokasi bengkel Anda.")
}

export async function ensureWorkshopCoordinates(data: WorkshopWriteInput): Promise<WorkshopWriteInput> {
  if (typeof data.latitude === "number" && typeof data.longitude === "number") return data
  if (!data.address) throw new Error("Alamat bengkel diperlukan untuk menentukan lokasi peta.")

  const coordinates = await geocodeWorkshopAddress(data.address)
  return { ...data, latitude: coordinates.latitude, longitude: coordinates.longitude }
}
