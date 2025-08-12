-- Drop strict unique indexes if they exist
DROP INDEX IF EXISTS "uniq_session_per_goal_student_status";
DROP INDEX IF EXISTS "uniq_active_session_per_goal";

-- Create a partial unique index: only one ACTIVE session per (goalId, studentId)
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_active_session_per_goal_student"
  ON "public"."diagnostic_sessions" ("goalId", "studentId")
  WHERE "status" = 'ACTIVE';
