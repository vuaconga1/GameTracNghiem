-- CreateTable
CREATE TABLE "GradeAccessVisit" (
    "id" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "visitorKey" TEXT NOT NULL,
    "grade" INTEGER NOT NULL,
    "weekStart" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GradeAccessVisit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GradeAccessVisit_weekStart_audience_grade_idx" ON "GradeAccessVisit"("weekStart", "audience", "grade");

-- CreateIndex
CREATE UNIQUE INDEX "GradeAccessVisit_audience_visitorKey_grade_weekStart_key" ON "GradeAccessVisit"("audience", "visitorKey", "grade", "weekStart");

-- Keep guest visits recorded before this migration
INSERT INTO "GradeAccessVisit" ("id", "audience", "visitorKey", "grade", "weekStart", "createdAt")
SELECT "id", 'guest', "visitorKey", "grade", "weekStart", "createdAt" FROM "GuestGradeVisit";

-- DropTable
DROP TABLE "GuestGradeVisit";
