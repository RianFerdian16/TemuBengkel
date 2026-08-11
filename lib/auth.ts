import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto"
import { promisify } from "node:util"
import { cookies } from "next/headers"
import { getPrisma } from "@/lib/db"

const SESSION_COOKIE = "tb_session"
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30
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

async function createSession(userId: string) {
  const prisma = getPrisma()
  const token = randomBytes(32).toString("base64url")
  const tokenHash = hashSessionToken(token)
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000)

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
  store.set(SESSION_COOKIE, token, sessionCookieOptions(SESSION_TTL_SECONDS))
}

export async function registerOwner(email: string, password: string, fullName: string) {
  const prisma = getPrisma()
  const passwordHash = await hashPassword(password)

  const user = await prisma.user.create({
    data: {
      email,
      fullName,
      passwordHash,
      role: "OWNER",
    },
  })

  await createSession(user.id)
  return toSafeUser(user)
}

export async function signInWithPassword(email: string, password: string) {
  const prisma = getPrisma()
  const user = await prisma.user.findUnique({ where: { email } })

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new Error("Email atau kata sandi salah.")
  }

  await createSession(user.id)
  return toSafeUser(user)
}

export async function getAuthSession() {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null

  const prisma = getPrisma()
  const tokenHash = hashSessionToken(token)
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  })

  if (!session) {
    store.set(SESSION_COOKIE, "", sessionCookieOptions(0))
    return null
  }

  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => null)
    store.set(SESSION_COOKIE, "", sessionCookieOptions(0))
    return null
  }

  return {
    user: toSafeUser(session.user),
    sessionId: session.id,
  }
}

export async function signOut() {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value

  if (token) {
    const prisma = getPrisma()
    await prisma.session.deleteMany({
      where: { tokenHash: hashSessionToken(token) },
    }).catch(() => null)
  }

  store.set(SESSION_COOKIE, "", sessionCookieOptions(0))
}
