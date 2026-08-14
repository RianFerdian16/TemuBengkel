import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto"
import { promisify } from "node:util"
import { cookies } from "next/headers"
import { getPrisma } from "@/lib/db"

const OWNER_SESSION_COOKIE = "tb_session"
const ADMIN_SESSION_COOKIE = "tb_admin_session"
const OWNER_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30
const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7
const SCRYPT_KEY_LENGTH = 64
const scryptAsync = promisify(scrypt)

type SafeUser = {
  id: string
  fullName: string
  email: string
  role: "customer" | "owner" | "admin"
}

function normalizeRole(role: unknown): SafeUser["role"] {
  const value = String(role || "").toLowerCase()
  if (value === "admin") return "admin"
  if (value === "customer") return "customer"
  return "owner"
}

function toSafeUser(user: { id: string; fullName: string; email: string; role: unknown }): SafeUser {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: normalizeRole(user.role),
  }
}

function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  }
}

function adminCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge,
  }
}

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex")
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16)
  const derivedKey = (await scryptAsync(password, salt, SCRYPT_KEY_LENGTH)) as Buffer
  return `scrypt$${salt.toString("base64url")}$${derivedKey.toString("base64url")}`
}

export async function verifyPassword(password: string, encoded: string) {
  const [algorithm, saltText, hashText] = encoded.split("$")
  if (algorithm !== "scrypt" || !saltText || !hashText) return false

  try {
    const salt = Buffer.from(saltText, "base64url")
    const expected = Buffer.from(hashText, "base64url")
    const actual = (await scryptAsync(password, salt, expected.length)) as Buffer
    return expected.length === actual.length && timingSafeEqual(expected, actual)
  } catch {
    return false
  }
}

async function createSession(userId: string, kind: "owner" | "admin") {
  const prisma = getPrisma() as any
  const token = randomBytes(32).toString("base64url")
  const tokenHash = hashSessionToken(token)
  const ttl = kind === "admin" ? ADMIN_SESSION_TTL_SECONDS : OWNER_SESSION_TTL_SECONDS
  const expiresAt = new Date(Date.now() + ttl * 1000)

  await prisma.session.deleteMany({
    where: {
      userId,
      expiresAt: { lt: new Date() },
    },
  })

  await prisma.session.create({
    data: { tokenHash, userId, expiresAt },
  })

  const store = await cookies()
  if (kind === "admin") {
    store.set(ADMIN_SESSION_COOKIE, token, adminCookieOptions(ttl))
  } else {
    store.set(OWNER_SESSION_COOKIE, token, sessionCookieOptions(ttl))
  }
}

async function readSession(cookieName: string, expectedRole: "owner" | "admin") {
  const store = await cookies()
  const token = store.get(cookieName)?.value
  if (!token) return null

  const prisma = getPrisma() as any
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: { user: true },
  })

  if (!session || session.expiresAt.getTime() <= Date.now() || session.user.deletedAt) return null
  const safeUser = toSafeUser(session.user)
  if (safeUser.role !== expectedRole) return null

  return { user: safeUser, sessionId: session.id }
}

export async function registerOwner(email: string, password: string, fullName: string) {
  const prisma = getPrisma() as any
  const passwordHash = await hashPassword(password)

  const user = await prisma.user.create({
    data: {
      email,
      fullName,
      passwordHash,
      role: "OWNER",
    },
  })

  await createSession(user.id, "owner")
  return toSafeUser(user)
}

export async function signInWithPassword(email: string, password: string) {
  const prisma = getPrisma() as any
  const user = await prisma.user.findUnique({ where: { email } })

  if (!user || user.deletedAt || normalizeRole(user.role) !== "owner" || !(await verifyPassword(password, user.passwordHash))) {
    throw new Error("Email atau kata sandi salah.")
  }

  await createSession(user.id, "owner")
  return toSafeUser(user)
}

export async function signInAdminWithPassword(email: string, password: string) {
  const prisma = getPrisma() as any
  const user = await prisma.user.findUnique({ where: { email } })

  if (!user || user.deletedAt || normalizeRole(user.role) !== "admin" || !(await verifyPassword(password, user.passwordHash))) {
    throw new Error("Akun admin atau kata sandi tidak valid.")
  }

  await createSession(user.id, "admin")
  return toSafeUser(user)
}

export async function getAuthSession() {
  return readSession(OWNER_SESSION_COOKIE, "owner")
}

export async function getAdminAuthSession() {
  return readSession(ADMIN_SESSION_COOKIE, "admin")
}

async function signOutCookie(cookieName: string, kind: "owner" | "admin") {
  const store = await cookies()
  const token = store.get(cookieName)?.value

  if (token) {
    const prisma = getPrisma() as any
    await prisma.session.deleteMany({
      where: { tokenHash: hashSessionToken(token) },
    }).catch(() => null)
  }

  const options = kind === "admin" ? adminCookieOptions(0) : sessionCookieOptions(0)
  store.set(cookieName, "", options)
}

export async function signOut() {
  await signOutCookie(OWNER_SESSION_COOKIE, "owner")
}

export async function signOutAdmin() {
  await signOutCookie(ADMIN_SESSION_COOKIE, "admin")
}

export async function revokeAllUserSessions(userId: string, kind: "owner" | "admin") {
  const prisma = getPrisma() as any
  await prisma.session.deleteMany({ where: { userId } })
  const store = await cookies()
  if (kind === "admin") store.set(ADMIN_SESSION_COOKIE, "", adminCookieOptions(0))
  else store.set(OWNER_SESSION_COOKIE, "", sessionCookieOptions(0))
}
