/*
  Warnings:

  - You are about to drop the column `blockIndex` on the `student_performance_logs` table. All the data in the column will be lost.
  - You are about to drop the column `blockType` on the `student_performance_logs` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `student_performance_logs` table. All the data in the column will be lost.
  - You are about to drop the column `lessonId` on the `student_performance_logs` table. All the data in the column will be lost.
  - You are about to drop the column `studentId` on the `student_performance_logs` table. All the data in the column will be lost.
  - Added the required column `lesson_id` to the `student_performance_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `student_id` to the `student_performance_logs` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "student_performance_logs" DROP CONSTRAINT "student_performance_logs_lessonId_fkey";

-- DropForeignKey
ALTER TABLE "student_performance_logs" DROP CONSTRAINT "student_performance_logs_studentId_fkey";

-- AlterTable
ALTER TABLE "student_performance_logs" DROP COLUMN "blockIndex",
DROP COLUMN "blockType",
DROP COLUMN "createdAt",
DROP COLUMN "lessonId",
DROP COLUMN "studentId",
ADD COLUMN     "block_index" INTEGER,
ADD COLUMN     "block_type" TEXT,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "lesson_id" TEXT NOT NULL,
ADD COLUMN     "student_id" TEXT NOT NULL,
ALTER COLUMN "isCorrect" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "student_performance_logs" ADD CONSTRAINT "student_performance_logs_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_performance_logs" ADD CONSTRAINT "student_performance_logs_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
