ALTER TABLE "users"
  ADD COLUMN "deleted_at" TIMESTAMPTZ(3);

ALTER TABLE "workshops"
  ADD COLUMN "rejection_reason" TEXT,
  ADD COLUMN "reviewed_at" TIMESTAMPTZ(3),
  ADD COLUMN "reviewed_by_id" UUID;

CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");
CREATE INDEX "workshops_reviewed_by_id_idx" ON "workshops"("reviewed_by_id");
