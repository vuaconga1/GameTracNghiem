ALTER TABLE "Course"
  ADD COLUMN IF NOT EXISTS "backgroundImageUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "backgroundImageKey" TEXT;
