-- Drop old unique index if exists
DROP INDEX IF EXISTS "uniq_active_session_per_goal";

-- Create new unique index: one session per (goalId, studentId, status)
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_session_per_goal_student_status"
  ON "public"."diagnostic_sessions" ("goalId", "studentId", "status");
