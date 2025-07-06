import { Request, Response } from 'express';
import { AppError } from '../utils/errors';
import prisma from '../db';

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

export const getGoalsHandler = async (req: Request, res: Response) => {
    const teacherId = req.user?.userId;
    if (!teacherId) {
        throw new AppError('User not authenticated', 401);
    }

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
                        include: {
                            storyChapter: true
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

export const deleteGoalHandler = async (req: Request, res: Response) => {
    const { goalId } = req.params;
    const teacherId = req.user?.userId;

    const goal = await prisma.learningGoal.findFirst({
        where: { id: goalId, teacherId },
        select: { id: true }
    });

    if (!goal) throw new AppError('Goal not found or access denied', 404);

    await prisma.learningGoal.delete({ where: { id: goalId } });

    res.json({ success: true, message: 'Goal deleted successfully' });
};