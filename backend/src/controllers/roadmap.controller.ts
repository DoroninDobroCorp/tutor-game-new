import { Request, Response } from "express";
import { AppError } from "../utils/errors";
import prisma from "../db";
import { generateRoadmap } from "../services/gemini.service";
import { LessonType } from "@prisma/client";

export const generateRoadmapHandler = async (req: Request, res: Response) => {
  const { goalId } = req.params;
  const { chatHistory } = req.body as { chatHistory?: any[] };

  const goal = await prisma.learningGoal.findUnique({
    where: { id: goalId },
    select: {
      subject: true,
      studentAge: true,
      language: true,
    },
  });

  if (!goal) {
    throw new AppError("Learning goal not found", 404);
  }

  const language = goal.language || "Russian";

  // Pass chat history to the service
  const roadmapProposal = await generateRoadmap(
    goal.subject,
    goal.studentAge,
    language,
    chatHistory,
  );

  // The 'roadmapProposal' now contains both a 'chatResponse' and 'roadmap'
  res.json({ success: true, data: roadmapProposal });
};

export const updateRoadmapHandler = async (req: Request, res: Response) => {
  const { goalId } = req.params;
  const roadmapSections = req.body.roadmap as {
    id?: string;
    title: string;
    order: number;
    lessons: {
      id?: string;
      title: string;
      order: number;
      type?: LessonType;
    }[];
  }[];

  const teacherId = req.user?.userId;

  if (!roadmapSections || !Array.isArray(roadmapSections)) {
    throw new AppError("Roadmap data must be an array of sections", 400);
  }

  const goal = await prisma.learningGoal.findFirst({
    where: { id: goalId, teacherId },
    select: { id: true },
  });

  if (!goal) {
    throw new AppError("Learning Goal not found or access denied", 404);
  }

  await prisma.$transaction(async (tx) => {
    // 1. Collect all IDs from the frontend payload.
    const receivedSectionIds = new Set<string>(
      roadmapSections
        .map((s) => s.id)
        .filter((id): id is string => !!id && !id.startsWith("new-")),
    );
    const receivedLessonIds = new Set<string>(
      roadmapSections
        .flatMap((s) => s.lessons)
        .map((l) => l.id)
        .filter((id): id is string => !!id && !id.startsWith("new-")),
    );

    // 2. Find all existing sections and lessons for this goal from the DB.
    const existingSections = await tx.contentSection.findMany({
      where: { learningGoalId: goalId },
      include: { lessons: { select: { id: true } } },
    });
    const existingSectionIds = new Set(existingSections.map((s) => s.id));
    const existingLessonIds = new Set(
      existingSections.flatMap((s) => s.lessons.map((l) => l.id)),
    );

    // 3. Determine which items to delete.
    const sectionIdsToDelete = [...existingSectionIds].filter(
      (id) => !receivedSectionIds.has(id),
    );
    const lessonIdsToDelete = [...existingLessonIds].filter(
      (id) => !receivedLessonIds.has(id),
    );

    // 4. Perform deletions.
    if (lessonIdsToDelete.length > 0) {
      await tx.lesson.deleteMany({ where: { id: { in: lessonIdsToDelete } } });
    }
    if (sectionIdsToDelete.length > 0) {
      await tx.contentSection.deleteMany({
        where: { id: { in: sectionIdsToDelete } },
      });
    }

    // 5. Upsert all sections and lessons from the payload.
    for (const [sectionIndex, sectionData] of roadmapSections.entries()) {
      const isNewSection = !sectionData.id || sectionData.id.startsWith("new-");

      const section = await tx.contentSection.upsert({
        where: {
          id: sectionData.id || `new-section-placeholder-${Date.now()}`,
        },
        update: { title: sectionData.title, order: sectionIndex },
        create: {
          title: sectionData.title,
          order: sectionIndex,
          learningGoalId: goalId,
        },
      });

      // Upsert all lessons provided for this section.
      for (const [lessonIndex, lessonData] of sectionData.lessons.entries()) {
        await tx.lesson.upsert({
          where: {
            id: lessonData.id || `new-lesson-placeholder-${Date.now()}`,
          },
          update: {
            title: lessonData.title,
            order: lessonIndex,
            sectionId: section.id,
          },
          create: {
            title: lessonData.title,
            order: lessonIndex,
            sectionId: section.id,
            status: "DRAFT",
            type: lessonData.type || "PRACTICE",
          },
        });
      }

      // 6. If the section is brand new, create a control work for it.
      if (isNewSection) {
        const controlWorkTitle = `Контрольная работа по разделу: "${section.title}"`;
        // New lessons are not yet in the DB, so order is based on payload
        const controlWorkOrder = sectionData.lessons.length;

        await tx.lesson.create({
          data: {
            title: controlWorkTitle,
            order: controlWorkOrder,
            sectionId: section.id,
            status: "DRAFT",
            type: "CONTROL_WORK",
          },
        });
      }
    }
  });

  // Return the fully updated roadmap
  const updatedGoal = await prisma.learningGoal.findUnique({
    where: { id: goalId },
    include: {
      sections: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            include: {
              storyChapter: true,
            },
          },
        },
      },
    },
  });

  res.json({ success: true, data: updatedGoal });
};
