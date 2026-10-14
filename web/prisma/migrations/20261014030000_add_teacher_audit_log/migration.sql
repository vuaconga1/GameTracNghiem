-- CreateTable
CREATE TABLE "TeacherAuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "actorUsername" TEXT NOT NULL,
    "actorDisplayName" TEXT NOT NULL,
    "classId" TEXT,
    "className" TEXT,
    "assignmentId" TEXT,
    "levelName" TEXT,
    "courseName" TEXT,
    "skillLabel" TEXT,
    "gameLabel" TEXT,
    "deadlineAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeacherAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeacherAuditLog_createdAt_idx" ON "TeacherAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "TeacherAuditLog_action_createdAt_idx" ON "TeacherAuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "TeacherAuditLog_actorUserId_createdAt_idx" ON "TeacherAuditLog"("actorUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "TeacherAuditLog" ADD CONSTRAINT "TeacherAuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
