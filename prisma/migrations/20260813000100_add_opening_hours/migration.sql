-- Add owner-managed operating hours without removing existing location data.
ALTER TABLE "workshops"
ADD COLUMN "opening_hours" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
