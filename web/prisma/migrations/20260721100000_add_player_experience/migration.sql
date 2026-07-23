-- CreateTable
CREATE TABLE "PlayerExperience" (
    "userId" TEXT NOT NULL,
    "totalExp" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerExperience_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "ExperienceGrant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "playSessionId" TEXT NOT NULL,
    "course" TEXT NOT NULL,
    "game" TEXT NOT NULL,
    "exp" INTEGER NOT NULL,
    "answeredCount" INTEGER NOT NULL,
    "correctCount" INTEGER NOT NULL,
    "averageCorrectSpeed" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExperienceGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExperienceGrant_userId_playSessionId_key" ON "ExperienceGrant"("userId", "playSessionId");

-- CreateIndex
CREATE INDEX "ExperienceGrant_userId_createdAt_idx" ON "ExperienceGrant"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ExperienceGrant_playSessionId_idx" ON "ExperienceGrant"("playSessionId");

-- AddForeignKey
ALTER TABLE "PlayerExperience" ADD CONSTRAINT "PlayerExperience_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperienceGrant" ADD CONSTRAINT "ExperienceGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddCheckConstraint
ALTER TABLE "PlayerExperience"
  ADD CONSTRAINT "PlayerExperience_totalExp_check" CHECK ("totalExp" >= 0);

-- AddCheckConstraint
ALTER TABLE "ExperienceGrant"
  ADD CONSTRAINT "ExperienceGrant_exp_check" CHECK ("exp" >= 0),
  ADD CONSTRAINT "ExperienceGrant_counts_check"
    CHECK ("answeredCount" > 0 AND "correctCount" >= 0 AND "correctCount" <= "answeredCount"),
  ADD CONSTRAINT "ExperienceGrant_speed_check"
    CHECK ("averageCorrectSpeed" >= 0 AND "averageCorrectSpeed" <= 1);
