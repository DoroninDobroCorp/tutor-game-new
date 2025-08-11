/*
  Warnings:

  - You are about to drop the column `characterGenId` on the `learning_goals` table. All the data in the column will be lost.
  - You are about to drop the column `characterImageId` on the `learning_goals` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "learning_goals" DROP COLUMN "characterGenId",
DROP COLUMN "characterImageId",
ADD COLUMN     "characterSubjectDescription" TEXT;