import { getPrisma } from "@/lib/db"
import { isWorkshopOpenNow, type Workshop, type WorkshopStatus } from "@/lib/workshops"

export type WorkshopWriteInput = {
  googlePlaceId: string | null
  name: string
  address: string | null
  phone: string | null
  whatsapp: string | null
  latitude: number | null
  longitude: number | null
  services: string[]
  openingHours: string[]
  timeZone: string
  description: string | null
  mechanicCallAvailable: boolean
}

function statusToApi(status: unknown): WorkshopStatus {
  const value = String(status || "").toLowerCase()
  if (value === "approved") return "approved"
  if (value === "rejected") return "rejected"
  return "pending"
}

function mapPublicWorkshop(row: any): Workshop {
  return {
    id: row.id,
    ownerId: row.ownerId,
    googlePlaceId: row.googlePlaceId || undefined,
    name: row.name,
    address: row.address || undefined,
    phone: row.phone || undefined,
    whatsapp: row.whatsapp || undefined,
    latitude: typeof row.latitude === "number" ? row.latitude : undefined,
    longitude: typeof row.longitude === "number" ? row.longitude : undefined,
    services: Array.isArray(row.services) ? row.services : [],
    openingHours: Array.isArray(row.openingHours) ? row.openingHours : [],
    timeZone: row.timeZone || "Asia/Jakarta",
    isOpenNow: isWorkshopOpenNow(Array.isArray(row.openingHours) ? row.openingHours : [], row.timeZone || "Asia/Jakarta"),
    description: row.description || undefined,
    mechanicCallAvailable: Boolean(row.mechanicCallAvailable),
    status: statusToApi(row.status),
    source: "owner",
  }
}

export function mapOwnerWorkshopForApi(row: any) {
  return {
    id: row.id,
    owner_id: row.ownerId,
    google_place_id: row.googlePlaceId,
    name: row.name,
    address: row.address,
    phone: row.phone,
    whatsapp: row.whatsapp,
    latitude: row.latitude,
    longitude: row.longitude,
    services: Array.isArray(row.services) ? row.services : [],
    opening_hours: Array.isArray(row.openingHours) ? row.openingHours : [],
    time_zone: row.timeZone || "Asia/Jakarta",
    description: row.description,
    mechanic_call_available: Boolean(row.mechanicCallAvailable),
    status: statusToApi(row.status),
    rejection_reason: row.rejectionReason || null,
    reviewed_at: row.reviewedAt instanceof Date ? row.reviewedAt.toISOString() : row.reviewedAt || null,
    created_at: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    updated_at: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
  }
}

function toPrismaData(data: WorkshopWriteInput) {
  return {
    googlePlaceId: data.googlePlaceId,
    name: data.name,
    address: data.address,
    phone: data.phone,
    whatsapp: data.whatsapp,
    latitude: data.latitude,
    longitude: data.longitude,
    services: data.services,
    openingHours: data.openingHours,
    timeZone: data.timeZone,
    description: data.description,
    mechanicCallAvailable: data.mechanicCallAvailable,
  }
}

export async function getPublicOwnerWorkshops(options: {
  searchText?: string
  origin?: { latitude: number; longitude: number }
  radiusMeters?: number
  googlePlaceIds?: string[]
} = {}) {
  const prisma = getPrisma() as any
  const searchText = (options.searchText || "").trim()
  const tokens = searchText
    .toLocaleLowerCase("id-ID")
    .split(/[^a-z0-9]+/i)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2)
    .slice(0, 8)
  const googlePlaceIds = (options.googlePlaceIds || []).filter(Boolean).slice(0, 50)
  const or: any[] = []

  if (googlePlaceIds.length) or.push({ googlePlaceId: { in: googlePlaceIds } })
  if (searchText) {
    or.push({ name: { contains: searchText, mode: "insensitive" } })
    or.push({ address: { contains: searchText, mode: "insensitive" } })
    or.push({ description: { contains: searchText, mode: "insensitive" } })
    if (tokens.length) {
      or.push(...tokens.flatMap((token) => [
        { name: { contains: token, mode: "insensitive" } },
        { address: { contains: token, mode: "insensitive" } },
        { description: { contains: token, mode: "insensitive" } },
      ]))
      or.push({ services: { hasSome: tokens } })
    }
  }

  if (options.origin) {
    const radius = Math.min(Math.max(options.radiusMeters || 15_000, 1_000), 50_000)
    const latDelta = radius / 111_320
    const lngScale = Math.max(0.2, Math.cos((options.origin.latitude * Math.PI) / 180))
    const lngDelta = radius / (111_320 * lngScale)
    or.push({
      latitude: { gte: options.origin.latitude - latDelta, lte: options.origin.latitude + latDelta },
      longitude: { gte: options.origin.longitude - lngDelta, lte: options.origin.longitude + lngDelta },
    })
  }

  // Important: pre-filter in Postgres before applying a safety cap. This avoids
  // the old behavior where only the 100 newest approved listings were searchable.
  if (!or.length) return []
  const rows = await prisma.workshop.findMany({
    where: { status: "APPROVED", OR: or },
    orderBy: { updatedAt: "desc" },
    take: 250,
  })
  return rows.map(mapPublicWorkshop)
}

export async function getPublicOwnerWorkshopByPlaceId(placeId: string) {
  const prisma = getPrisma() as any
  const row = await prisma.workshop.findFirst({
    where: { googlePlaceId: placeId, status: "APPROVED" },
  })
  return row ? mapPublicWorkshop(row) : null
}

export async function getPublicOwnerWorkshopById(id: string) {
  const prisma = getPrisma() as any
  const row = await prisma.workshop.findFirst({
    where: { id, status: "APPROVED" },
  })
  return row ? mapPublicWorkshop(row) : null
}

export async function getOwnerWorkshops(ownerId: string) {
  const prisma = getPrisma() as any
  const rows = await prisma.workshop.findMany({
    where: { ownerId },
    orderBy: { createdAt: "desc" },
  })
  return rows.map(mapOwnerWorkshopForApi)
}

export async function getOwnerWorkshopById(ownerId: string, id: string) {
  const prisma = getPrisma() as any
  const row = await prisma.workshop.findFirst({ where: { id, ownerId } })
  return row ? mapOwnerWorkshopForApi(row) : null
}

export async function createOwnerWorkshop(ownerId: string, data: WorkshopWriteInput) {
  const prisma = getPrisma() as any
  const row = await prisma.workshop.create({
    data: {
      ...toPrismaData(data),
      ownerId,
      status: "PENDING",
      rejectionReason: null,
      reviewedAt: null,
      reviewedById: null,
    },
  })
  return mapOwnerWorkshopForApi(row)
}

export async function updateOwnerWorkshop(ownerId: string, id: string, data: WorkshopWriteInput) {
  const prisma = getPrisma() as any
  const existing = await prisma.workshop.findFirst({ where: { id, ownerId }, select: { id: true } })
  if (!existing) return null

  const row = await prisma.workshop.update({
    where: { id },
    data: {
      ...toPrismaData(data),
      // Any owner edit is re-moderated before it returns to the public result set.
      status: "PENDING",
      rejectionReason: null,
      reviewedAt: null,
      reviewedById: null,
    },
  })
  return mapOwnerWorkshopForApi(row)
}

export async function deleteOwnerWorkshop(ownerId: string, id: string) {
  const prisma = getPrisma() as any
  const result = await prisma.workshop.deleteMany({ where: { id, ownerId } })
  return result.count > 0
}
