import { getPrisma } from "@/lib/db"
import type { Workshop, WorkshopStatus } from "@/lib/workshops"

export type WorkshopWriteInput = {
  googlePlaceId: string | null
  name: string
  address: string | null
  phone: string | null
  whatsapp: string | null
  latitude: number | null
  longitude: number | null
  services: string[]
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
    description: row.description,
    mechanic_call_available: Boolean(row.mechanicCallAvailable),
    status: statusToApi(row.status),
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
    description: data.description,
    mechanicCallAvailable: data.mechanicCallAvailable,
  }
}

export async function getPublicOwnerWorkshops() {
  const prisma = getPrisma()
  const rows = await prisma.workshop.findMany({
    where: { status: "APPROVED" },
    orderBy: { createdAt: "desc" },
    take: 100,
  })
  return rows.map(mapPublicWorkshop)
}

export async function getPublicOwnerWorkshopByPlaceId(placeId: string) {
  const prisma = getPrisma()
  const row = await prisma.workshop.findFirst({
    where: { googlePlaceId: placeId, status: "APPROVED" },
  })
  return row ? mapPublicWorkshop(row) : null
}

export async function getPublicOwnerWorkshopById(id: string) {
  const prisma = getPrisma()
  const row = await prisma.workshop.findFirst({
    where: { id, status: "APPROVED" },
  })
  return row ? mapPublicWorkshop(row) : null
}

export async function getOwnerWorkshops(ownerId: string) {
  const prisma = getPrisma()
  const rows = await prisma.workshop.findMany({
    where: { ownerId },
    orderBy: { createdAt: "desc" },
  })
  return rows.map(mapOwnerWorkshopForApi)
}

export async function getOwnerWorkshopById(ownerId: string, id: string) {
  const prisma = getPrisma()
  const row = await prisma.workshop.findFirst({ where: { id, ownerId } })
  return row ? mapOwnerWorkshopForApi(row) : null
}

export async function createOwnerWorkshop(ownerId: string, data: WorkshopWriteInput) {
  const prisma = getPrisma()
  const row = await prisma.workshop.create({
    data: {
      ...toPrismaData(data),
      ownerId,
      status: "PENDING",
    },
  })
  return mapOwnerWorkshopForApi(row)
}

export async function updateOwnerWorkshop(ownerId: string, id: string, data: WorkshopWriteInput) {
  const prisma = getPrisma()
  const existing = await prisma.workshop.findFirst({ where: { id, ownerId }, select: { id: true } })
  if (!existing) return null

  const row = await prisma.workshop.update({
    where: { id },
    data: {
      ...toPrismaData(data),
      // Any owner edit is re-moderated before it returns to the public result set.
      status: "PENDING",
    },
  })
  return mapOwnerWorkshopForApi(row)
}

export async function deleteOwnerWorkshop(ownerId: string, id: string) {
  const prisma = getPrisma()
  const result = await prisma.workshop.deleteMany({ where: { id, ownerId } })
  return result.count > 0
}
