import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto"
import { promisify } from "node:util"
import { cookies } from "next/headers"
import { getPrisma } from "@/lib/db"

const OWNER_SESSION_COOKIE = "tb_session"
const ADMIN_SESSION_COOKIE = "tb_admin_session"
const OWNER_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30
const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7
const EMAIL_VERIFY_TTL_MS = 24 * 60 * 60 * 1000
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000
const SCRYPT_KEY_LENGTH = 64
const scryptAsync = promisify(scrypt)

type SafeUser = {
  id: string
  fullName: string
  email: string
  role: "customer" | "owner" | "admin"
  emailVerified: boolean
}

function normalizeRole(role: unknown): SafeUser["role"] {
  const value = String(role || "").toLowerCase()
  if (value === "admin") return "admin"
  if (value === "customer") return "customer"
  return "owner"
}

function toSafeUser(user: { id: string; fullName: string; email: string; role: unknown; emailVerifiedAt?: Date | null }): SafeUser {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: normalizeRole(user.role),
    emailVerified: Boolean(user.emailVerifiedAt),
  }
}

function sessionCookieOptions(maxAge: number) {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge }
}

function adminCookieOptions(maxAge: number) {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" as const, path: "/", maxAge }
}

function hashToken(token: string) {
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
  const tokenHash = hashToken(token)
  const ttl = kind === "admin" ? ADMIN_SESSION_TTL_SECONDS : OWNER_SESSION_TTL_SECONDS
  const expiresAt = new Date(Date.now() + ttl * 1000)
  await prisma.session.deleteMany({ where: { userId, expiresAt: { lt: new Date() } } })
  await prisma.session.create({ data: { tokenHash, userId, expiresAt } })
  const store = await cookies()
  if (kind === "admin") store.set(ADMIN_SESSION_COOKIE, token, adminCookieOptions(ttl))
  else store.set(OWNER_SESSION_COOKIE, token, sessionCookieOptions(ttl))
}

async function createAuthToken(userId: string, type: "EMAIL_VERIFY" | "PASSWORD_RESET", ttlMs: number) {
  const prisma = getPrisma() as any
  const rawToken = randomBytes(32).toString("base64url")
  await prisma.authToken.deleteMany({ where: { OR: [{ userId, type }, { expiresAt: { lt: new Date() } }] } })
  await prisma.authToken.create({
    data: { tokenHash: hashToken(rawToken), userId, type, expiresAt: new Date(Date.now() + ttlMs) },
  })
  return rawToken
}

async function readSession(cookieName: string, expectedRole: "owner" | "admin") {
  const store = await cookies()
  const token = store.get(cookieName)?.value
  if (!token) return null
  const prisma = getPrisma() as any
  const session = await prisma.session.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } })
  if (!session || session.expiresAt.getTime() <= Date.now() || session.user.deletedAt) return null
  const safeUser = toSafeUser(session.user)
  if (safeUser.role !== expectedRole) return null
  if (expectedRole === "owner" && !safeUser.emailVerified) return null
  return { user: safeUser, sessionId: session.id }
}

export async function registerOwner(email: string, password: string, fullName: string, requireEmailVerification = true) {
  const prisma = getPrisma() as any
  const passwordHash = await hashPassword(password)
  const user = await prisma.user.create({
    data: {
      email,
      fullName,
      passwordHash,
      role: "OWNER",
      emailVerifiedAt: requireEmailVerification ? null : new Date(),
    },
  })
  if (!requireEmailVerification) {
    await createSession(user.id, "owner")
    return { user: toSafeUser(user), verificationToken: null, signedIn: true }
  }
  const verificationToken = await createAuthToken(user.id, "EMAIL_VERIFY", EMAIL_VERIFY_TTL_MS)
  return { user: toSafeUser(user), verificationToken, signedIn: false }
}

export async function issueEmailVerificationToken(email: string) {
  const prisma = getPrisma() as any
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || user.deletedAt || normalizeRole(user.role) !== "owner" || user.emailVerifiedAt) return null
  return { user: toSafeUser(user), token: await createAuthToken(user.id, "EMAIL_VERIFY", EMAIL_VERIFY_TTL_MS) }
}

export async function verifyEmailToken(token: string) {
  const prisma = getPrisma() as any
  const row = await prisma.authToken.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } })
  if (!row || String(row.type) !== "EMAIL_VERIFY" || row.expiresAt.getTime() <= Date.now() || row.user.deletedAt) {
    throw new Error("Tautan verifikasi tidak valid atau sudah kedaluwarsa.")
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id: row.userId }, data: { emailVerifiedAt: new Date() } }),
    prisma.authToken.deleteMany({ where: { userId: row.userId, type: "EMAIL_VERIFY" } }),
  ])
  return true
}

export async function issuePasswordResetToken(email: string) {
  const prisma = getPrisma() as any
  const user = await prisma.user.findUnique({ where: { email } })
  const role = user ? normalizeRole(user.role) : "customer"
  if (!user || user.deletedAt || (role !== "owner" && role !== "admin")) return null
  return { user: toSafeUser(user), token: await createAuthToken(user.id, "PASSWORD_RESET", PASSWORD_RESET_TTL_MS) }
}

export async function resetPasswordWithToken(token: string, password: string) {
  const prisma = getPrisma() as any
  const row = await prisma.authToken.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } })
  if (!row || String(row.type) !== "PASSWORD_RESET" || row.expiresAt.getTime() <= Date.now() || row.user.deletedAt) {
    throw new Error("Tautan reset kata sandi tidak valid atau sudah kedaluwarsa.")
  }
  const passwordHash = await hashPassword(password)
  await prisma.$transaction([
    prisma.user.update({ where: { id: row.userId }, data: { passwordHash } }),
    prisma.session.deleteMany({ where: { userId: row.userId } }),
    prisma.authToken.deleteMany({ where: { userId: row.userId } }),
  ])
  return normalizeRole(row.user.role)
}

export async function signInWithPassword(email: string, password: string) {
  const prisma = getPrisma() as any
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || user.deletedAt || normalizeRole(user.role) !== "owner" || !(await verifyPassword(password, user.passwordHash))) {
    throw new Error("Email atau kata sandi salah.")
  }
  if (!user.emailVerifiedAt) throw new Error("Verifikasi email terlebih dahulu sebelum masuk.")
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

export async function getAuthSession() { return readSession(OWNER_SESSION_COOKIE, "owner") }
export async function getAdminAuthSession() { return readSession(ADMIN_SESSION_COOKIE, "admin") }

async function signOutCookie(cookieName: string, kind: "owner" | "admin") {
  const store = await cookies()
  const token = store.get(cookieName)?.value
  if (token) {
    const prisma = getPrisma() as any
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } }).catch(() => null)
  }
  const options = kind === "admin" ? adminCookieOptions(0) : sessionCookieOptions(0)
  store.set(cookieName, "", options)
}

export async function signOut() { await signOutCookie(OWNER_SESSION_COOKIE, "owner") }
export async function signOutAdmin() { await signOutCookie(ADMIN_SESSION_COOKIE, "admin") }

export async function revokeAllUserSessions(userId: string, kind: "owner" | "admin") {
  const prisma = getPrisma() as any
  await prisma.session.deleteMany({ where: { userId } })
  const store = await cookies()
  if (kind === "admin") store.set(ADMIN_SESSION_COOKIE, "", adminCookieOptions(0))
  else store.set(OWNER_SESSION_COOKIE, "", sessionCookieOptions(0))
}
