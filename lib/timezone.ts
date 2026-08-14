const WIB_MARKERS = [
  "aceh", "sumatera utara", "sumatra utara", "sumatera barat", "sumatra barat", "riau",
  "kepulauan riau", "jambi", "bengkulu", "sumatera selatan", "sumatra selatan",
  "bangka belitung", "lampung", "banten", "jakarta", "jawa barat", "west java",
  "jawa tengah", "central java", "yogyakarta", "jawa timur", "east java",
  "kalimantan barat", "west kalimantan", "kalimantan tengah", "central kalimantan",
]

const WITA_MARKERS = [
  "bali", "nusa tenggara barat", "west nusa tenggara", "nusa tenggara timur", "east nusa tenggara",
  "kalimantan selatan", "south kalimantan", "kalimantan timur", "east kalimantan",
  "kalimantan utara", "north kalimantan", "sulawesi utara", "north sulawesi",
  "gorontalo", "sulawesi tengah", "central sulawesi", "sulawesi barat", "west sulawesi",
  "sulawesi selatan", "south sulawesi", "sulawesi tenggara", "southeast sulawesi",
]

const WIT_MARKERS = [
  "maluku utara", "north maluku", "maluku", "papua barat daya", "southwest papua",
  "papua barat", "west papua", "papua tengah", "central papua", "papua pegunungan",
  "highland papua", "papua selatan", "south papua", "papua",
]

function normalized(value?: string | null) {
  return (value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("id-ID")
}

/**
 * Indonesia has three official civil time zones. Prefer province/address markers
 * because longitude alone is ambiguous around Java/Bali and Kalimantan borders.
 * Longitude is only a fallback for incomplete owner addresses.
 */
export function resolveIndonesiaTimeZone(latitude?: number | null, longitude?: number | null, address?: string | null) {
  const text = normalized(address)
  if (WIT_MARKERS.some((marker) => text.includes(marker))) return "Asia/Jayapura"
  if (WITA_MARKERS.some((marker) => text.includes(marker))) return "Asia/Makassar"
  if (WIB_MARKERS.some((marker) => text.includes(marker))) return "Asia/Jakarta"

  if (typeof longitude === "number" && Number.isFinite(longitude)) {
    if (longitude >= 126.5) return "Asia/Jayapura"
    if (longitude >= 114.55) return "Asia/Makassar"
  }
  return "Asia/Jakarta"
}

export const SUPPORTED_INDONESIA_TIME_ZONES = ["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura"] as const
