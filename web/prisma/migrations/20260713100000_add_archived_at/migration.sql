-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ClassLevel" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Course_archivedAt_idx" ON "Course"("archivedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Question_archivedAt_idx" ON "Question"("archivedAt");
