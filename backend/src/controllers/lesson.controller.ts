import { Request, Response } from "express";
import { AppError } from "../utils/errors";
import prisma from "../db";
import {
  generateLessonContent,
  generateControlWorkExercises,
} from "../services/gemini.service";

export const generateLessonContentHandler = async (
  req: Request,
  res: Response,
) => {
  const { lessonId } = req.params;
  const { chatHistory } = req.body;
  const teacherId = req.user?.userId;

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { section: { include: { learningGoal: true } } },
  });

  if (!lesson || lesson.section.learningGoal.teacherId !== teacherId) {
    throw new AppError("Lesson not found or you do not have permission", 404);
  }

  const { learningGoal } = lesson.section;
  const { studentId, subject, studentAge, setting, language } = learningGoal;

  // 1. Find the last 3 completed lessons for this student in this goal, excluding the current one.
  const recentCompletedLessons = await prisma.lesson.findMany({
    where: {
      section: {
        learningGoalId: learningGoal.id,
      },
      status: "COMPLETED",
      id: {
        not: lessonId, // Exclude the current lesson
      },
    },
    orderBy: [
      // Get latest lessons
      { section: { order: "desc" } },
      { order: "desc" },
    ],
    take: 3,
    select: {
      id: true,
    },
  });

  const recentLessonIds = recentCompletedLessons.map((l) => l.id);

  // 2. Fetch performance logs for these specific lessons.
  let performanceLogs: (import("@prisma/client").StudentPerformanceLog & {
    lesson: { title: string };
  })[] = [];
  if (recentLessonIds.length > 0) {
    performanceLogs = await prisma.studentPerformanceLog.findMany({
      where: {
        studentId: studentId,
        lessonId: {
          in: recentLessonIds,
        },
      },
      orderBy: {
        createdAt: "asc", // Chronological order
      },
      include: {
        lesson: {
          select: {
            title: true,
          },
        },
      },
    });
  }

  // 3. Build the context string
  const performanceContext =
    performanceLogs.length > 0
      ? "Context on student's answers from recent lessons: " +
        performanceLogs
          .map((log) => {
            let context = `In lesson "${log.lesson.title}"`;
            if (log.question) {
              context += `, for question: "${log.question}",`;
            }
            context += ` the student answered: "${log.answer}"`;

            if (log.isCorrect !== null && log.isCorrect !== undefined) {
              context += ` (this was marked as ${log.isCorrect ? "correct" : "incorrect"})`;
            }
            if (log.aiNote) {
              context += `. AI note: "${log.aiNote}"`;
            }
            return context;
          })
          .join("; ")
      : undefined;

  const generatedData = await generateLessonContent(
    lesson.title,
    subject,
    studentAge,
    setting,
    language || "Russian",
    performanceContext,
    chatHistory,
  );

  // The 'generatedData' object now contains both 'chatResponse' and 'blocks'
  // We don't save to db, just return the AI's proposal
  res.json({ success: true, data: generatedData });
};

export const updateLessonContentHandler = async (
  req: Request,
  res: Response,
) => {
  const { lessonId } = req.params;
  const { content } = req.body;
  const userId = req.user?.userId;

  if (!content) {
    throw new AppError("Content is required", 400);
  }

  const lessonWithSection = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      section: { select: { learningGoal: { select: { teacherId: true } } } },
    },
  });

  if (
    !lessonWithSection ||
    lessonWithSection.section.learningGoal.teacherId !== userId
  ) {
    throw new AppError("Not authorized to update this lesson", 403);
  }

  const updatedLesson = await prisma.lesson.update({
    where: { id: lessonId },
    data: { content, status: "PENDING_APPROVAL" },
  });

  res.json({ success: true, data: updatedLesson });
};

export const generateControlWorkContentHandler = async (
  req: Request,
  res: Response,
) => {
  const { lessonId } = req.params;
  const { chatHistory } = req.body; // <-- get chat history
  const teacherId = req.user?.userId;

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { section: { include: { learningGoal: true, lessons: true } } },
  });

  if (!lesson || lesson.section.learningGoal.teacherId !== teacherId) {
    throw new AppError("Lesson not found or you do not have permission", 404);
  }

  if (lesson.type !== "CONTROL_WORK") {
    throw new AppError("This function is only for control work lessons", 400);
  }

  // Get all other lesson titles from the same section
  const sectionTopics = lesson.section.lessons
    .filter((l) => l.id !== lessonId && l.type !== "CONTROL_WORK") // Exclude self and other control works
    .map((l) => l.title);

  if (
    sectionTopics.length === 0 &&
    (!chatHistory || chatHistory.length === 0)
  ) {
    // allow generation if chat has context
    throw new AppError(
      "Cannot generate a control work for a section with no other lessons.",
      400,
    );
  }

  const { learningGoal } = lesson.section;
  const { subject, studentAge, language } = learningGoal;

  const generatedData = await generateControlWorkExercises(
    sectionTopics,
    subject,
    studentAge,
    language || "Russian",
    chatHistory, // <-- pass chat history
  );

  // Return the AI's proposal, do not save to DB yet.
  res.json({ success: true, data: generatedData });
};
