-- AlterTable
ALTER TABLE "learning_goals" ADD COLUMN     "characterGenId" TEXT,
ADD COLUMN     "characterImageId" TEXT,
ADD COLUMN     "characterImageUrl" TEXT,
ADD COLUMN     "characterPrompt" TEXT;

-- CreateTable
CREATE TABLE "story_chapters" (
    "id" TEXT NOT NULL,
    "learningGoalId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "teacherSnippetText" TEXT NOT NULL,
    "teacherSnippetImageUrl" TEXT,
    "teacherSnippetStatus" "LessonStatus" NOT NULL DEFAULT 'DRAFT',
    "studentResponseText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "story_chapters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "story_chapters_lessonId_key" ON "story_chapters"("lessonId");

-- AddForeignKey
ALTER TABLE "story_chapters" ADD CONSTRAINT "story_chapters_learningGoalId_fkey" FOREIGN KEY ("learningGoalId") REFERENCES "learning_goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_chapters" ADD CONSTRAINT "story_chapters_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
