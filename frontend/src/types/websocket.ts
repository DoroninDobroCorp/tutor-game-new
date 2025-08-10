// Types for WebSocket events
export interface StudentSubmittedLessonEvent {
  message: string;
  lessonId: string;
  goalId: string;
  studentName: string;
  timestamp: string;
}

export interface TeacherReviewedLessonEvent {
  message: string;
  lessonId: string;
  goalId: string;
  teacherName: string;
  timestamp: string;
  hasImage: boolean;
}

export interface StudentRequestedReviewEvent {
  message: string;
  goalId: string;
}

// Union type for all WebSocket events
export type WebSocketEvent =
  | { type: "student_submitted_lesson"; data: StudentSubmittedLessonEvent }
  | { type: "teacher_reviewed_lesson"; data: TeacherReviewedLessonEvent }
  | { type: "student_requested_review"; data: StudentRequestedReviewEvent };
