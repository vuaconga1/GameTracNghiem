-- CreateTable
CREATE TABLE "CourseGameLesson" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "gameKey" TEXT NOT NULL,
    "pageStart" INTEGER NOT NULL,
    "pageEnd" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseGameLesson_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CourseGameLesson_courseId_gameKey_key" ON "CourseGameLesson"("courseId", "gameKey");

-- CreateIndex
CREATE INDEX "CourseGameLesson_courseId_idx" ON "CourseGameLesson"("courseId");

-- AddForeignKey
ALTER TABLE "CourseGameLesson" ADD CONSTRAINT "CourseGameLesson_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
