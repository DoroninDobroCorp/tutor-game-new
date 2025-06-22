import { Request, Response } from 'express';
import { AppError } from '../utils/errors';
import prisma from '../db';
import { generateRoadmap } from '../services/openai.service';
import { Prisma } from '@prisma/client';

export const createGoalHandler = async (req: Request, res: Response) => {
    // Explicitly use req.user which is added by auth.middleware
    const teacherId = req.user?.userId;
    if (!teacherId) {
        throw new AppError('User not authenticated', 401);
    }

    const { studentId, subject, setting, studentAge } = req.body;
    if (!studentId || !subject || !setting || !studentAge) {
        throw new AppError('All fields (studentId, subject, setting, studentAge) are required', 400);
    }

    const goal = await prisma.learningGoal.create({
        data: {
            teacherId: teacherId,
            studentId,
            subject,
            setting,
            studentAge: parseInt(studentAge, 10),
        }
    });

    res.status(201).json({ success: true, data: goal });
};

export const generateRoadmapHandler = async (req: Request, res: Response) => {
    const { goalId } = req.params;
    const goal = await prisma.learningGoal.findUnique({ where: { id: goalId } });

    if (!goal) {
        throw new AppError('Learning goal not found', 404);
    }
    
    const roadmapProposal = await generateRoadmap(goal.subject, goal.setting, goal.studentAge);
    res.json({ success: true, data: roadmapProposal });
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
                        data: { title: lessonTitle, order: lessonIndex, sectionId: section.id }
                    });
                }
            }
        }
    });

    res.json({ success: true, message: 'Roadmap updated successfully' });
};
