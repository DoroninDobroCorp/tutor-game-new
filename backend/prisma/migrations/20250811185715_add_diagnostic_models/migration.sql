-- CreateEnum
CREATE TYPE "public"."KnowledgeLevel" AS ENUM ('EXCELLENT', 'REFRESH', 'UNKNOWN');

-- CreateTable
CREATE TABLE "public"."topics" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "learningGoalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."diagnostic_sessions" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "currentIdx" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "diagnostic_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."diagnostic_turns" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "studentAnswer" TEXT NOT NULL,
    "aiLabel" "public"."KnowledgeLevel" NOT NULL,
    "aiComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "diagnostic_turns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "topics_learningGoalId_idx" ON "public"."topics"("learningGoalId");

-- CreateIndex
CREATE INDEX "diagnostic_sessions_goalId_idx" ON "public"."diagnostic_sessions"("goalId");

-- CreateIndex
CREATE INDEX "diagnostic_sessions_studentId_idx" ON "public"."diagnostic_sessions"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_active_session_per_goal" ON "public"."diagnostic_sessions"("goalId", "status");

-- CreateIndex
CREATE INDEX "diagnostic_turns_sessionId_idx" ON "public"."diagnostic_turns"("sessionId");

-- CreateIndex
CREATE INDEX "diagnostic_turns_topicId_idx" ON "public"."diagnostic_turns"("topicId");

-- AddForeignKey
ALTER TABLE "public"."topics" ADD CONSTRAINT "topics_learningGoalId_fkey" FOREIGN KEY ("learningGoalId") REFERENCES "public"."learning_goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."diagnostic_sessions" ADD CONSTRAINT "diagnostic_sessions_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "public"."learning_goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."diagnostic_sessions" ADD CONSTRAINT "diagnostic_sessions_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."diagnostic_turns" ADD CONSTRAINT "diagnostic_turns_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."diagnostic_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."diagnostic_turns" ADD CONSTRAINT "diagnostic_turns_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "public"."topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
