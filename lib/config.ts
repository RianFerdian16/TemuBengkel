export function getGoogleMapsBrowserKey() {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""
}

export function getGoogleMapsServerKey() {
  return process.env.GOOGLE_MAPS_SERVER_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""
}

export function getDatabaseUrl() {
  return process.env.DATABASE_URL || ""
}

export const integrationStatus = {
  get googleMaps() {
    return Boolean(getGoogleMapsBrowserKey() && getGoogleMapsServerKey())
  },
  get database() {
    return Boolean(getDatabaseUrl())
  },
}
