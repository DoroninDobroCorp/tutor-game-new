-- DropForeignKey
ALTER TABLE "badges" DROP CONSTRAINT "badges_studentId_fkey";

-- DropTable
DROP TABLE "badges";

-- DropEnum
DROP TYPE "BadgeStatus";
