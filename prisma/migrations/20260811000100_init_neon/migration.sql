-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('customer', 'owner', 'admin');

-- CreateEnum
CREATE TYPE "WorkshopStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "full_name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'owner',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "user_id" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workshops" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "google_place_id" VARCHAR(255),
    "name" VARCHAR(120) NOT NULL,
    "address" TEXT,
    "phone" VARCHAR(40),
    "whatsapp" VARCHAR(40),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "services" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "description" TEXT,
    "mechanic_call_available" BOOLEAN NOT NULL DEFAULT false,
    "status" "WorkshopStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workshops_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "workshops_google_place_id_key" ON "workshops"("google_place_id");

-- CreateIndex
CREATE INDEX "workshops_owner_id_idx" ON "workshops"("owner_id");

-- CreateIndex
CREATE INDEX "workshops_status_idx" ON "workshops"("status");

-- CreateIndex
CREATE INDEX "workshops_latitude_longitude_idx" ON "workshops"("latitude", "longitude");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workshops" ADD CONSTRAINT "workshops_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
