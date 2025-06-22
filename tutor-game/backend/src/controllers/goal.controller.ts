// Полное содержимое файла: tutor-game/backend/src/controllers/goal.controller.ts

import { Request, Response } from 'express';
import { AppError } from '../utils/errors';
import prisma from '../db';
import { generateRoadmap, generateLessonContent } from '../services/openai.service';
import { Prisma } from '@prisma/client';

interface CreateGoalBody {
    studentId: string;
    subject: string;
    setting: string;
    studentAge: number | string;
    language?: string;
}

interface GenerateRoadmapBody {
    existingPlan?: any[];
    feedback?: string;
}

export const createGoalHandler = async (req: Request, res: Response) => {
    const teacherId = req.user?.userId;
    if (!teacherId) {
        throw new AppError('User not authenticated', 401);
    }

    const { studentId, subject, setting, studentAge, language } = req.body as CreateGoalBody;
    if (!studentId || !subject || !setting || studentAge === undefined) {
        throw new AppError('All fields (studentId, subject, setting, studentAge) are required', 400);
    }

    const age = typeof studentAge === 'string' ? parseInt(studentAge, 10) : studentAge;

    const goal = await prisma.learningGoal.create({
        data: {
            teacherId,
            studentId,
            subject,
            setting,
            studentAge: age,
            language: language || 'Russian'
        }
    });

    res.status(201).json({ success: true, data: goal });
};

interface GenerateRoadmapBody {
    existingPlan?: any[];
    feedback?: string;
}

export const generateRoadmapHandler = async (req: Request, res: Response) => {
    const { goalId } = req.params;
    const { existingPlan, feedback } = (req.body || {}) as GenerateRoadmapBody;

    // Define the type for the goal data we're selecting
    type GoalForRoadmap = {
        subject: string;
        studentAge: number;
        language: string;
        setting: string;
    };

    const goal = await prisma.learningGoal.findUnique({ 
        where: { id: goalId },
        select: {
            subject: true,
            studentAge: true,
            language: true,
            setting: true
        }
    }) as GoalForRoadmap | null;
    
    if (!goal) {
        throw new AppError('Learning goal not found', 404);
    }
    
    // Ensure we have a default language
    const language = goal.language || 'Russian';
    
    const roadmapProposal = await generateRoadmap(
        goal.subject, 
        goal.studentAge,
        language,
        existingPlan || [], 
        feedback
    );
    
    res.json({ success: true, data: roadmapProposal });
};

export const getGoalsHandler = async (req: Request, res: Response) => {
    const teacherId = req.user?.userId;
    if (!teacherId) throw new AppError('User not authenticated', 401);

    const goals = await prisma.learningGoal.findMany({
        where: { teacherId },
        include: {
            student: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true
                }
            },
            sections: {
                include: {
                    lessons: {
                        orderBy: {
                            order: 'asc'
                        },
                        select: {
                            id: true,
                            title: true,
                            status: true,
                            order: true,
                        }
                    }
                },
                orderBy: {
                    order: 'asc'
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    });

    res.json({ success: true, data: goals });
};

export const updateRoadmapHandler = async (req: Request, res: Response) => {
    const { goalId } = req.params;
    const { roadmap } = req.body;

    if (!roadmap || !Array.isArray(roadmap)) {
        throw new AppError('Roadmap data must be an array', 400);
    }

    await prisma.$transaction(async (tx) => {
        const prismaTx = tx as Prisma.TransactionClient;
        await prismaTx.contentSection.deleteMany({ where: { learningGoalId: goalId } });

        for (const [sectionIndex, sectionData] of (roadmap as any[]).entries()) {
            const section = await prismaTx.contentSection.create({
                data: {
                    title: sectionData.sectionTitle,
                    order: sectionIndex,
                    learningGoalId: goalId,
                }
            });

            if (sectionData.lessons && Array.isArray(sectionData.lessons)) {
                for (const [lessonIndex, lessonTitle] of sectionData.lessons.entries()) {
                    await prismaTx.lesson.create({
                        data: { 
                            title: lessonTitle, 
                            order: lessonIndex, 
                            sectionId: section.id 
                        }
                    });
                }
            }
        }
    });

    res.json({ success: true, message: 'Roadmap updated successfully' });
};

export const deleteGoalHandler = async (req: Request, res: Response) => {
    const { goalId } = req.params;
    const teacherId = req.user?.userId;

    const goal = await prisma.learningGoal.findUnique({
        where: { id: goalId },
        select: { teacherId: true }
    });

    if (!goal) {
        throw new AppError('Goal not found', 404);
    }

    if (goal.teacherId !== teacherId) {
        throw new AppError('Unauthorized', 403);
    }

    await prisma.learningGoal.delete({
        where: { id: goalId }
    });

    res.json({ success: true, message: 'Goal deleted successfully' });
};

export const generateLessonContentHandler = async (req: Request, res: Response) => {
    const { lessonId } = req.params;
    const teacherId = req.user?.userId;

    // 1. Find the lesson and verify teacher access
    const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: {
            section: {
                include: {
                    learningGoal: true
                }
            }
        }
    });

    if (!lesson || lesson.section.learningGoal.teacherId !== teacherId) {
        throw new AppError('Lesson not found or you do not have permission', 404);
    }
    
    // 2. Call the service to generate content
    const goal = await prisma.learningGoal.findUnique({
        where: { id: lesson.section.learningGoalId },
        select: {
            subject: true,
            studentAge: true,
            setting: true
        }
    });
    
    if (!goal) {
        throw new AppError('Learning goal not found', 404);
    }
    
    // Use default language if not specified
    const language = 'Russian';
    const { subject, studentAge, setting } = goal;
    const generatedContent = await generateLessonContent(
        lesson.title, subject, studentAge, setting, language
    );
    
    // 3. Update the lesson in the database
    const updatedLesson = await prisma.lesson.update({
        where: { id: lessonId },
        data: {
            content: generatedContent, // Save JSON
            status: 'PENDING_APPROVAL'  // Update status
        }
    });
    
    res.json({ success: true, data: updatedLesson });
};

export const updateLessonContentHandler = async (req: Request, res: Response) => {
    const { lessonId } = req.params;
    const { content } = req.body;
    const teacherId = req.user?.userId;

    if (!content) {
        throw new AppError('Content is required', 400);
    }

    // Verify access rights
    const lesson = await prisma.lesson.findFirst({
        where: { 
            id: lessonId,
            section: {
                learningGoal: {
                    teacherId: teacherId
                }
            }
        }
    });

    if (!lesson) {
        throw new AppError('Lesson not found or you do not have permission', 404);
    }
    
    // Update the lesson
    await prisma.lesson.update({
        where: { id: lessonId },
        data: {
            content,
            status: 'APPROVED'
        }
    });
    
    res.json({ success: true, message: 'Lesson content updated and approved.' });
};