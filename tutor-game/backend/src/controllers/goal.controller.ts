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
        },
        include: {
            student: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true
                }
            }
        }
    });

    res.status(201).json({ success: true, data: goal });
};

export const generateRoadmapHandler = async (req: Request, res: Response) => {
    const { goalId } = req.params;
    const { existingPlan, feedback } = (req.body || {}) as { existingPlan?: any[], feedback?: string };

    const goal = await prisma.learningGoal.findUnique({ 
        where: { id: goalId },
        select: {
            subject: true,
            studentAge: true,
            language: true,
            setting: true,
            student: {
                select: {
                    firstName: true,
                    lastName: true
                }
            }
        }
    });
    
    if (!goal) {
        throw new AppError('Learning goal not found', 404);
    }
    
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
                        orderBy: { order: 'asc' },
                        select: {
                            id: true,
                            title: true,
                            status: true,
                            order: true,
                            content: true,
                        }
                    }
                },
                orderBy: { order: 'asc' }
            }
        },
        orderBy: { createdAt: 'desc' }
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
        await tx.lesson.deleteMany({ where: { section: { learningGoalId: goalId } } });
        await tx.contentSection.deleteMany({ where: { learningGoalId: goalId } });

        for (const [sectionIndex, sectionData] of (roadmap as any[]).entries()) {
            const section = await tx.contentSection.create({
                data: {
                    title: sectionData.sectionTitle,
                    order: sectionIndex,
                    learningGoalId: goalId,
                }
            });

            if (sectionData.lessons && Array.isArray(sectionData.lessons)) {
                for (const [lessonIndex, lessonTitle] of sectionData.lessons.entries()) {
                    await tx.lesson.create({
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

    if (!goal) throw new AppError('Goal not found', 404);
    if (goal.teacherId !== teacherId) throw new AppError('Unauthorized', 403);

    await prisma.learningGoal.delete({ where: { id: goalId } });

    res.json({ success: true, message: 'Goal deleted successfully' });
};

export const generateLessonContentHandler = async (req: Request, res: Response) => {
    const { lessonId } = req.params;
    const teacherId = req.user?.userId;

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
    
    const goal = await prisma.learningGoal.findUnique({
        where: { id: lesson.section.learningGoalId },
        select: {
            subject: true,
            studentAge: true,
            setting: true,
            language: true,
        }
    });
    
    if (!goal) {
        throw new AppError('Learning goal not found', 404);
    }
    
    const language = goal.language || 'Russian';
    const { subject, studentAge, setting } = goal;
    const generatedContent = await generateLessonContent(
        lesson.title, subject, studentAge, setting, language
    );
    
    const updatedLesson = await prisma.lesson.update({
        where: { id: lessonId },
        data: {
            content: generatedContent,
            status: 'PENDING_APPROVAL'
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
    
    await prisma.lesson.update({
        where: { id: lessonId },
        data: {
            content,
            status: 'APPROVED'
        }
    });
    
    res.json({ success: true, message: 'Lesson content updated and approved.' });
};