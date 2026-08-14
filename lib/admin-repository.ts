import { getPrisma } from "@/lib/db"

export type AdminWorkshopStatus = "pending" | "approved" | "rejected"

function statusToApi(status: unknown): AdminWorkshopStatus {
  const value = String(status || "").toLowerCase()
  if (value === "approved") return "approved"
  if (value === "rejected") return "rejected"
  return "pending"
}

function mapWorkshop(row: any) {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    phone: row.phone,
    whatsapp: row.whatsapp,
    latitude: row.latitude,
    longitude: row.longitude,
    services: Array.isArray(row.services) ? row.services : [],
    openingHours: Array.isArray(row.openingHours) ? row.openingHours : [],
    description: row.description,
    mechanicCallAvailable: Boolean(row.mechanicCallAvailable),
    googlePlaceId: row.googlePlaceId,
    status: statusToApi(row.status),
    rejectionReason: row.rejectionReason || null,
    reviewedAt: row.reviewedAt instanceof Date ? row.reviewedAt.toISOString() : row.reviewedAt || null,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
    owner: row.owner ? {
      id: row.owner.id,
      fullName: row.owner.fullName,
      email: row.owner.email,
      deletedAt: row.owner.deletedAt instanceof Date ? row.owner.deletedAt.toISOString() : row.owner.deletedAt || null,
    } : null,
  }
}

export async function getAdminStats() {
  const prisma = getPrisma() as any
  const [total, pending, approved, rejected, owners] = await Promise.all([
    prisma.workshop.count(),
    prisma.workshop.count({ where: { status: "PENDING" } }),
    prisma.workshop.count({ where: { status: "APPROVED" } }),
    prisma.workshop.count({ where: { status: "REJECTED" } }),
    prisma.user.count({ where: { role: "OWNER", deletedAt: null } }),
  ])
  return { total, pending, approved, rejected, owners }
}

export async function listAdminWorkshops({
  status,
  query,
  take = 100,
}: {
  status?: AdminWorkshopStatus
  query?: string
  take?: number
} = {}) {
  const prisma = getPrisma() as any
  const statusValue = status ? status.toUpperCase() as "PENDING" | "APPROVED" | "REJECTED" : undefined
  const search = String(query || "").trim()

  const rows = await prisma.workshop.findMany({
    where: {
      ...(statusValue ? { status: statusValue } : {}),
      ...(search ? {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { address: { contains: search, mode: "insensitive" } },
          { owner: { fullName: { contains: search, mode: "insensitive" } } },
          { owner: { email: { contains: search, mode: "insensitive" } } },
        ],
      } : {}),
    },
    include: { owner: true },
    orderBy: [{ createdAt: "desc" }],
    take,
  })
  return rows.map(mapWorkshop)
}

export async function getAdminWorkshopById(id: string) {
  const prisma = getPrisma() as any
  const row = await prisma.workshop.findUnique({ where: { id }, include: { owner: true } })
  return row ? mapWorkshop(row) : null
}

export async function moderateWorkshop({
  id,
  adminId,
  action,
  reason,
}: {
  id: string
  adminId: string
  action: "approve" | "reject"
  reason?: string
}) {
  const prisma = getPrisma() as any
  const existing = await prisma.workshop.findUnique({ where: { id }, select: { id: true } })
  if (!existing) return null

  const reasonText = String(reason || "").trim().slice(0, 1000)
  if (action === "reject" && reasonText.length < 4) {
    throw new Error("Alasan penolakan wajib diisi minimal 4 karakter.")
  }

  const row = await prisma.workshop.update({
    where: { id },
    data: {
      status: action === "approve" ? "APPROVED" : "REJECTED",
      rejectionReason: action === "reject" ? reasonText : null,
      reviewedAt: new Date(),
      reviewedById: adminId,
    },
    include: { owner: true },
  })
  return mapWorkshop(row)
}

export async function listOwners(query?: string) {
  const prisma = getPrisma() as any
  const search = String(query || "").trim()
  const rows = await prisma.user.findMany({
    where: {
      role: "OWNER",
      ...(search ? {
        OR: [
          { fullName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      } : {}),
    },
    include: {
      _count: { select: { workshops: true } },
      workshops: { select: { status: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  return rows.map((row: any) => ({
    id: row.id,
    fullName: row.deletedAt ? "Akun dihapus" : row.fullName,
    email: row.deletedAt ? "—" : row.email,
    deletedAt: row.deletedAt?.toISOString() || null,
    createdAt: row.createdAt.toISOString(),
    totalWorkshops: row._count.workshops,
    pending: row.workshops.filter((item: any) => item.status === "PENDING").length,
    approved: row.workshops.filter((item: any) => item.status === "APPROVED").length,
    rejected: row.workshops.filter((item: any) => item.status === "REJECTED").length,
  }))
}
