/*
  Warnings:

  - You are about to drop the column `teacherId` on the `Student` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Student" DROP CONSTRAINT "Student_teacherId_fkey";

-- AlterTable
ALTER TABLE "Student" DROP COLUMN "teacherId";

-- CreateTable
CREATE TABLE "_TeachersAndStudents" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_TeachersAndStudents_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_TeachersAndStudents_B_index" ON "_TeachersAndStudents"("B");

-- AddForeignKey
ALTER TABLE "_TeachersAndStudents" ADD CONSTRAINT "_TeachersAndStudents_A_fkey" FOREIGN KEY ("A") REFERENCES "Student"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TeachersAndStudents" ADD CONSTRAINT "_TeachersAndStudents_B_fkey" FOREIGN KEY ("B") REFERENCES "Teacher"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
