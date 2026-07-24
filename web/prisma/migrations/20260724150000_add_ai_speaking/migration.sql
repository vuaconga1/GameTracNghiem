-- CreateTable
CREATE TABLE "SpeakingTopic" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "durationSeconds" INTEGER NOT NULL DEFAULT 300,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpeakingTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpeakingSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'STUDENT_PRACTICE',
    "status" TEXT NOT NULL DEFAULT 'RESERVED',
    "openaiCallId" TEXT,
    "transcript" JSONB,
    "recordingUrl" TEXT,
    "recordingKey" TEXT,
    "recordingMimeType" TEXT,
    "recordingBytes" INTEGER,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpeakingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailySpeakingUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "usageDate" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "sessionId" TEXT,
    "reservedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailySpeakingUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailySpeakingUsageRelease" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "usageDate" DATE NOT NULL,
    "adminId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailySpeakingUsageRelease_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SpeakingTopic_courseId_active_idx" ON "SpeakingTopic"("courseId", "active");

-- CreateIndex
CREATE INDEX "SpeakingTopic_archivedAt_idx" ON "SpeakingTopic"("archivedAt");

-- CreateIndex
CREATE INDEX "SpeakingSession_userId_createdAt_idx" ON "SpeakingSession"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SpeakingSession_topicId_idx" ON "SpeakingSession"("topicId");

-- CreateIndex
CREATE INDEX "SpeakingSession_status_idx" ON "SpeakingSession"("status");

-- CreateIndex
CREATE UNIQUE INDEX "DailySpeakingUsage_sessionId_key" ON "DailySpeakingUsage"("sessionId");

-- CreateIndex
CREATE INDEX "DailySpeakingUsage_usageDate_status_idx" ON "DailySpeakingUsage"("usageDate", "status");

-- CreateIndex
CREATE UNIQUE INDEX "DailySpeakingUsage_userId_usageDate_key" ON "DailySpeakingUsage"("userId", "usageDate");

-- CreateIndex
CREATE INDEX "DailySpeakingUsageRelease_studentId_usageDate_idx" ON "DailySpeakingUsageRelease"("studentId", "usageDate");

-- CreateIndex
CREATE INDEX "DailySpeakingUsageRelease_adminId_createdAt_idx" ON "DailySpeakingUsageRelease"("adminId", "createdAt");

-- AddForeignKey
ALTER TABLE "SpeakingTopic" ADD CONSTRAINT "SpeakingTopic_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeakingSession" ADD CONSTRAINT "SpeakingSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeakingSession" ADD CONSTRAINT "SpeakingSession_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "SpeakingTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailySpeakingUsage" ADD CONSTRAINT "DailySpeakingUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailySpeakingUsage" ADD CONSTRAINT "DailySpeakingUsage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SpeakingSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailySpeakingUsageRelease" ADD CONSTRAINT "DailySpeakingUsageRelease_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailySpeakingUsageRelease" ADD CONSTRAINT "DailySpeakingUsageRelease_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SpeakingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailySpeakingUsageRelease" ADD CONSTRAINT "DailySpeakingUsageRelease_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
