-- CreateTable
CREATE TABLE "GuestGradeVisit" (
    "id" TEXT NOT NULL,
    "visitorKey" TEXT NOT NULL,
    "grade" INTEGER NOT NULL,
    "weekStart" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuestGradeVisit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GuestGradeVisit_weekStart_grade_idx" ON "GuestGradeVisit"("weekStart", "grade");

-- CreateIndex
CREATE UNIQUE INDEX "GuestGradeVisit_visitorKey_grade_weekStart_key" ON "GuestGradeVisit"("visitorKey", "grade", "weekStart");
