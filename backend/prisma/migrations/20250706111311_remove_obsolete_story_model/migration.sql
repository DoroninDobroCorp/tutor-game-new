/*
  Warnings:

  - You are about to drop the `stories` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "stories" DROP CONSTRAINT "stories_learningGoalId_fkey";

-- DropForeignKey
ALTER TABLE "stories" DROP CONSTRAINT "stories_studentId_fkey";

-- DropTable
DROP TABLE "stories";
