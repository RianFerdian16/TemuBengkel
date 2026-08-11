import { PrismaNeon } from "@prisma/adapter-neon"
import { PrismaClient } from "@/generated/prisma/client"
import { getDatabaseUrl } from "@/lib/config"

const globalForPrisma = globalThis as unknown as {
  temubengkelPrisma?: PrismaClient
}

export function getPrisma() {
  const connectionString = getDatabaseUrl()
  if (!connectionString) {
    throw new Error("Database Neon belum dikonfigurasi. Isi DATABASE_URL di .env.local.")
  }

  if (!globalForPrisma.temubengkelPrisma) {
    const adapter = new PrismaNeon({ connectionString })
    globalForPrisma.temubengkelPrisma = new PrismaClient({ adapter })
  }

  return globalForPrisma.temubengkelPrisma
}

export function isPrismaUniqueConstraintError(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "P2002")
}
