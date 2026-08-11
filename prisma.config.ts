import { config as loadEnv } from "dotenv"
import { defineConfig } from "prisma/config"

// Next.js uses .env.local in development. Load it for Prisma CLI as well.
loadEnv({ path: ".env.local" })
loadEnv()

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // Neon recommends a direct (non-pooler) connection for schema operations.
  datasource: {
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || "",
  },
})
