import { createHash } from "node:crypto"
import type { NextRequest } from "next/server"
import { getPrisma } from "@/lib/db"

export class RateLimitError extends Error {
  retryAfterSeconds: number
  constructor(retryAfterSeconds: number) {
    super("Terlalu banyak percobaan. Coba lagi sebentar lagi.")
    this.name = "RateLimitError"
    this.retryAfterSeconds = Math.max(1, retryAfterSeconds)
  }
}

function clientFingerprint(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  const realIp = request.headers.get("x-real-ip")?.trim()
  const ip = forwarded || realIp
  if (ip) return ip
  const agent = request.headers.get("user-agent") || "unknown-agent"
  return `unknown|${agent.slice(0, 180)}`
}

function bucketKey(action: string, request: NextRequest) {
  return createHash("sha256").update(`${action}|${clientFingerprint(request)}`).digest("hex")
}

export async function enforceRateLimit(request: NextRequest, action: string, limit: number, windowMs: number, options: { failOpen?: boolean } = {}) {
  const prisma = getPrisma() as any
  const key = bucketKey(action, request)
  const now = new Date()
  const cutoff = new Date(now.getTime() - windowMs)

  try {
    const rows = await prisma.$queryRawUnsafe(
      `INSERT INTO "rate_limit_buckets" ("key", "count", "window_start", "updated_at")
       VALUES ($1, 1, $2, $2)
       ON CONFLICT ("key") DO UPDATE SET
         "count" = CASE WHEN "rate_limit_buckets"."window_start" < $3 THEN 1 ELSE "rate_limit_buckets"."count" + 1 END,
         "window_start" = CASE WHEN "rate_limit_buckets"."window_start" < $3 THEN $2 ELSE "rate_limit_buckets"."window_start" END,
         "updated_at" = $2
       RETURNING "count", "window_start"`,
      key,
      now,
      cutoff,
    ) as Array<{ count: number; window_start: Date }>

    const row = rows[0]
    if (!row || Number(row.count) <= limit) return
    const windowStart = new Date(row.window_start).getTime()
    const retryAfter = Math.ceil(Math.max(1000, windowMs - (Date.now() - windowStart)) / 1000)
    throw new RateLimitError(retryAfter)
  } catch (error) {
    if (error instanceof RateLimitError) throw error
    if (options.failOpen) return
    throw error
  }
}

export function rateLimitResponse(error: unknown) {
  if (!(error instanceof RateLimitError)) return null
  return {
    status: 429,
    headers: { "Retry-After": String(error.retryAfterSeconds) },
    body: { error: error.message, retryAfter: error.retryAfterSeconds },
  }
}
