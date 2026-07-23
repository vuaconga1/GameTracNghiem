-- CreateTable
CREATE TABLE "CourseSkillLesson" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "pageStart" INTEGER NOT NULL,
    "pageEnd" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseSkillLesson_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CourseSkillLesson_courseId_skillId_key" ON "CourseSkillLesson"("courseId", "skillId");

-- CreateIndex
CREATE INDEX "CourseSkillLesson_courseId_idx" ON "CourseSkillLesson"("courseId");

-- AddForeignKey
ALTER TABLE "CourseSkillLesson" ADD CONSTRAINT "CourseSkillLesson_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
