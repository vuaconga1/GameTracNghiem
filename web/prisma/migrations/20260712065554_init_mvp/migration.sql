-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassLevel" (
    "id" TEXT NOT NULL,
    "className" TEXT NOT NULL,
    "levelName" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ClassLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "className" TEXT NOT NULL,
    "levelName" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "ebookFileId" TEXT,
    "ebookPageStart" INTEGER,
    "ebookPageEnd" INTEGER,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "game" TEXT NOT NULL,
    "level" TEXT,
    "payload" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "externalId" TEXT,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseKey" TEXT NOT NULL,
    "game" TEXT NOT NULL,
    "statuses" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "course" TEXT NOT NULL,
    "game" TEXT NOT NULL,
    "questionIndex" INTEGER NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "elapsedMs" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoreLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "ClassLevel_className_idx" ON "ClassLevel"("className");

-- CreateIndex
CREATE UNIQUE INDEX "ClassLevel_className_levelName_key" ON "ClassLevel"("className", "levelName");

-- CreateIndex
CREATE INDEX "Course_className_levelName_idx" ON "Course"("className", "levelName");

-- CreateIndex
CREATE INDEX "Course_name_idx" ON "Course"("name");

-- CreateIndex
CREATE INDEX "Question_courseId_game_active_idx" ON "Question"("courseId", "game", "active");

-- CreateIndex
CREATE UNIQUE INDEX "GameProgress_userId_courseKey_game_key" ON "GameProgress"("userId", "courseKey", "game");

-- CreateIndex
CREATE INDEX "ScoreLog_userId_course_idx" ON "ScoreLog"("userId", "course");

-- CreateIndex
CREATE INDEX "ScoreLog_answeredAt_idx" ON "ScoreLog"("answeredAt");

-- CreateIndex
CREATE INDEX "ScoreLog_game_idx" ON "ScoreLog"("game");

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameProgress" ADD CONSTRAINT "GameProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreLog" ADD CONSTRAINT "ScoreLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
