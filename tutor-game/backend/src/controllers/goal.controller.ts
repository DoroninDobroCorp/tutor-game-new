// Полное содержимое файла: tutor-game/backend/src/controllers/goal.controller.ts

import { Request, Response } from 'express';
import { AppError } from '../utils/errors';
import prisma from '../db';
import { generateRoadmap } from '../services/openai.service';
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
                select: {
                    id: true
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

    if (!teacherId) {
        throw new AppError('User not authenticated', 401);
    }
    if (!goalId) {
        throw new AppError('Goal ID is required', 400);
    }

    // Удаляем запись, только если ID цели и ID учителя совпадают.
    // Это гарантирует, что учитель не удалит чужой план.
    const result = await prisma.learningGoal.deleteMany({
        where: {
            id: goalId,
            teacherId: teacherId, // Важнейшая проверка безопасности!
        },
    });

    // Если ничего не было удалено, значит план не найден или не принадлежит этому учителю
    if (result.count === 0) {
        throw new AppError('Learning goal not found or you do not have permission to delete it', 404);
    }

    res.status(200).json({ success: true, message: 'Learning goal deleted successfully' });
};