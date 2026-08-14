-- V30: accurate owner time zones + auth hardening + persistent rate limits.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verified_at" TIMESTAMPTZ(3);
-- Existing accounts predate email verification. Keep them usable after deployment.
UPDATE "users" SET "email_verified_at" = NOW() WHERE "email_verified_at" IS NULL;

ALTER TABLE "workshops" ADD COLUMN IF NOT EXISTS "time_zone" VARCHAR(64) NOT NULL DEFAULT 'Asia/Jakarta';
UPDATE "workshops"
SET "time_zone" = CASE
  -- Prefer province/address text when existing data has it. Longitude is only a fallback.
  WHEN LOWER(COALESCE("address", '')) ~ '(papua|maluku)' THEN 'Asia/Jayapura'
  WHEN LOWER(COALESCE("address", '')) ~ '(bali|nusa tenggara|sulawesi|gorontalo|kalimantan (selatan|timur|utara))' THEN 'Asia/Makassar'
  WHEN LOWER(COALESCE("address", '')) ~ '(aceh|sumatera|sumatra|riau|jambi|bengkulu|lampung|bangka|belitung|banten|jakarta|jawa|yogyakarta|kalimantan (barat|tengah))' THEN 'Asia/Jakarta'
  WHEN "longitude" >= 126.5 THEN 'Asia/Jayapura'
  WHEN "longitude" >= 114.55 THEN 'Asia/Makassar'
  ELSE 'Asia/Jakarta'
END;

DO $$ BEGIN
  CREATE TYPE "AuthTokenType" AS ENUM ('email_verify', 'password_reset');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "auth_tokens" (
  "id" UUID NOT NULL,
  "token_hash" CHAR(64) NOT NULL,
  "user_id" UUID NOT NULL,
  "type" "AuthTokenType" NOT NULL,
  "expires_at" TIMESTAMPTZ(3) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "auth_tokens_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "auth_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "auth_tokens_token_hash_key" ON "auth_tokens"("token_hash");
CREATE INDEX IF NOT EXISTS "auth_tokens_user_id_type_idx" ON "auth_tokens"("user_id", "type");
CREATE INDEX IF NOT EXISTS "auth_tokens_expires_at_idx" ON "auth_tokens"("expires_at");

CREATE TABLE IF NOT EXISTS "rate_limit_buckets" (
  "key" CHAR(64) NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "window_start" TIMESTAMPTZ(3) NOT NULL,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "rate_limit_buckets_pkey" PRIMARY KEY ("key")
);
CREATE INDEX IF NOT EXISTS "rate_limit_buckets_updated_at_idx" ON "rate_limit_buckets"("updated_at");
