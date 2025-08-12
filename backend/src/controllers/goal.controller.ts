import { Request, Response } from 'express';
import { AppError } from '../utils/errors';
import prisma from '../db';
import { LessonType } from '@prisma/client';

interface CreateGoalBody {
    studentId: string;
    subject: string;
    setting: string;
    studentAge: number | string;
    language?: string;
    createDiagnosticFirst?: boolean | string;
}

export const createGoalHandler = async (req: Request, res: Response) => {
    const teacherId = req.user?.userId;
    if (!teacherId) {
        throw new AppError('User not authenticated', 401);
    }

    const { studentId, subject, setting, studentAge, language, createDiagnosticFirst } = req.body as CreateGoalBody;
    if (!studentId || !subject || !setting || studentAge === undefined) {
        throw new AppError('All fields (studentId, subject, setting, studentAge) are required', 400);
    }

    const age = typeof studentAge === 'string' ? parseInt(studentAge, 10) : studentAge;

    const shouldCreateDiagnostic =
        createDiagnosticFirst === true ||
        createDiagnosticFirst === 'true' ||
        createDiagnosticFirst === 'on';

    const createData: any = {
        teacherId,
        studentId,
        subject,
        setting,
        studentAge: age,
        language: language || 'Russian'
    };

    if (shouldCreateDiagnostic) {
        createData.sections = {
            create: [
                {
                    title: 'Диагностика',
                    order: 1,
                    lessons: {
                        create: [
                            {
                                title: 'Диагностика',
                                order: 1,
                                type: LessonType.DIAGNOSTIC,
                                // status left default to DRAFT
                                content: {
                                    topics: []
                                }
                            }
                        ]
                    }
                }
            ]
        };
    }

    const goal = await prisma.learningGoal.create({
        data: createData,
        include: {
            student: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true
                }
            },
            sections: shouldCreateDiagnostic
                ? {
                    include: {
                        lessons: true
                    },
                    orderBy: { order: 'asc' }
                }
                : false
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

export const getGoalByIdHandler = async (req: Request, res: Response) => {
    const { goalId } = req.params;
    const teacherId = req.user?.userId;

    if (!teacherId) {
        throw new AppError('User not authenticated', 401);
    }

    const goal = await prisma.learningGoal.findFirst({
        where: { 
            id: goalId,
            teacherId
        },
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
        }
    });

    if (!goal) {
        throw new AppError('Goal not found or access denied', 404);
    }

    res.json({ success: true, data: goal });
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

export const getGoalStoryHistoryHandler = async (req: Request, res: Response) => {
    const { goalId } = req.params;
    const teacherId = req.user?.userId;

    if (!teacherId) {
        throw new AppError('User not authenticated', 401);
    }

    const goal = await prisma.learningGoal.findFirst({
        where: { 
            id: goalId,
            teacherId
        },
        select: { id: true }
    });

    if (!goal) {
        throw new AppError('Goal not found or access denied', 404);
    }

    const storyChapters = await prisma.storyChapter.findMany({
        where: {
            learningGoalId: goalId,
            teacherSnippetStatus: 'APPROVED',
        },
        select: {
            id: true,
            teacherSnippetText: true,
            teacherSnippetImageUrl: true,
            studentSnippetText: true,
            studentSnippetImageUrl: true,
            lesson: {
                select: {
                    title: true,
                    order: true,
                    section: {
                        select: {
                            order: true
                        }
                    }
                }
            }
        },
        orderBy: [
            { lesson: { section: { order: 'asc' } } },
            { lesson: { order: 'asc' } }
        ],
    });

    res.json({ success: true, data: storyChapters });
};

// -------------------------
// Topics (Teacher)

export const getGoalTopicsHandler = async (req: Request, res: Response) => {
    const { goalId } = req.params;
    const teacherId = req.user?.userId;

    if (!teacherId) throw new AppError('User not authenticated', 401);

    const goal = await prisma.learningGoal.findFirst({ where: { id: goalId, teacherId }, select: { id: true } });
    if (!goal) throw new AppError('Goal not found or access denied', 404);

    const topics = await prisma.topic.findMany({ where: { learningGoalId: goalId }, orderBy: { createdAt: 'asc' } });
    res.json({ success: true, data: topics });
};

// Upsert list of topics (simple bulk replace behavior: create new, update existing by id, delete removed)
export const upsertGoalTopicsHandler = async (req: Request, res: Response) => {
    const { goalId } = req.params;
    const teacherId = req.user?.userId;
    const { topics } = req.body as { topics: Array<{ id?: string; title: string; description?: string; firstQuestion?: string; firstQuestionExample?: string }>; };

    if (!teacherId) throw new AppError('User not authenticated', 401);
    if (!Array.isArray(topics)) throw new AppError('Invalid payload: topics array is required', 400);

    const goal = await prisma.learningGoal.findFirst({ where: { id: goalId, teacherId }, select: { id: true } });
    if (!goal) throw new AppError('Goal not found or access denied', 404);

    // Fetch existing
    const existing = await prisma.topic.findMany({ where: { learningGoalId: goalId } });
    const existingIds = new Set(existing.map(t => t.id));
    const incomingIds = new Set(topics.filter((t) => !!t.id).map((t) => t.id as string));

    // Transaction: upserts and deletes
    const result = await prisma.$transaction(async (tx) => {
        // Delete removed
        const toDelete = [...existingIds].filter(id => !incomingIds.has(id));
        if (toDelete.length) {
            await tx.topic.deleteMany({ where: { id: { in: toDelete } } });
        }

        // Upsert/create
        const saved: any[] = [];
        for (const t of topics as Array<{ id?: string; title: string; description?: string; firstQuestion?: string; firstQuestionExample?: string }>) {
            if (t.id && existingIds.has(t.id)) {
                const updated = await tx.topic.update({
                    where: { id: t.id as string },
                    data: {
                        title: t.title,
                        description: t.description ?? null,
                        firstQuestion: t.firstQuestion ?? null,
                        firstQuestionExample: t.firstQuestionExample ?? null,
                    }
                });
                saved.push(updated);
            } else {
                const created = await tx.topic.create({
                    data: {
                        title: t.title,
                        description: t.description ?? null,
                        firstQuestion: t.firstQuestion ?? null,
                        firstQuestionExample: t.firstQuestionExample ?? null,
                        learningGoalId: goalId,
                    }
                });
                saved.push(created);
            }
        }
        return saved;
    });

    res.json({ success: true, data: result });
};

export const deleteGoalTopicHandler = async (req: Request, res: Response) => {
    const { goalId, topicId } = req.params as { goalId: string; topicId: string };
    const teacherId = req.user?.userId;

    if (!teacherId) throw new AppError('User not authenticated', 401);

    // Ensure access to goal
    const goal = await prisma.learningGoal.findFirst({ where: { id: goalId, teacherId }, select: { id: true } });
    if (!goal) throw new AppError('Goal not found or access denied', 404);

    // Ensure topic belongs to goal
    const topic = await prisma.topic.findFirst({ where: { id: topicId, learningGoalId: goalId }, select: { id: true } });
    if (!topic) throw new AppError('Topic not found', 404);

    await prisma.topic.delete({ where: { id: topicId } });
    res.json({ success: true, message: 'Topic deleted' });
};
