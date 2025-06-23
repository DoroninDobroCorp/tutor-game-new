/*
  Warnings:

  - You are about to drop the column `studentResponseText` on the `story_chapters` table. All the data in the column will be lost.
  - The `teacherSnippetStatus` column on the `story_chapters` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `updatedAt` to the `story_chapters` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "story_chapters" DROP COLUMN "studentResponseText",
ADD COLUMN     "studentSnippetImageUrl" TEXT,
ADD COLUMN     "studentSnippetStatus" TEXT NOT NULL DEFAULT 'LOCKED',
ADD COLUMN     "studentSnippetText" TEXT,
ADD COLUMN     "teacherSnippetImagePrompt" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "teacherSnippetText" DROP NOT NULL,
DROP COLUMN "teacherSnippetStatus",
ADD COLUMN     "teacherSnippetStatus" TEXT NOT NULL DEFAULT 'DRAFT';
