import { Request, Response } from 'express';
import { AppError } from '../utils/errors';
import prisma from '../db';
import { generateRoadmap } from '../services/openai.service';

export const generateRoadmapHandler = async (req: Request, res: Response) => {
    const { goalId } = req.params;
    const { chatHistory } = req.body as { chatHistory?: any[] };

    const goal = await prisma.learningGoal.findUnique({ 
        where: { id: goalId },
        select: {
            subject: true,
            studentAge: true,
            language: true,
        }
    });
    
    if (!goal) {
        throw new AppError('Learning goal not found', 404);
    }
    
    const language = goal.language || 'Russian';
    
    // Pass chat history to the service
    const roadmapProposal = await generateRoadmap(
        goal.subject,
        goal.studentAge,
        language,
        chatHistory
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
        }[];
    }[];
    
    const teacherId = req.user?.userId;

    if (!roadmapSections || !Array.isArray(roadmapSections)) {
        throw new AppError('Roadmap data must be an array of sections', 400);
    }
    
    // Проверяем, что цель существует и принадлежит этому учителю
    const goal = await prisma.learningGoal.findFirst({
        where: { id: goalId, teacherId },
        select: { id: true }
    });

    if (!goal) {
        throw new AppError('Learning Goal not found or access denied', 404);
    }

    // Выполняем все операции в одной транзакции для целостности данных
    await prisma.$transaction(async (tx) => {
        // 1. Собираем ID всех секций и уроков, которые пришли с фронтенда
        const receivedSectionIds = new Set<string>();
        const receivedLessonIds = new Set<string>();

        for (const sectionData of roadmapSections) {
            if (sectionData.id && !sectionData.id.startsWith('new-')) {
                receivedSectionIds.add(sectionData.id);
            }
            for (const lessonData of sectionData.lessons) {
                 if (lessonData.id && !lessonData.id.startsWith('new-')) {
                    receivedLessonIds.add(lessonData.id);
                }
            }
        }
        
        // 2. Находим все существующие ID в базе для этой цели
        const existingSections = await tx.contentSection.findMany({ 
            where: { learningGoalId: goalId },
            select: { id: true, lessons: { select: { id: true } } }
        });
        const existingSectionIds = new Set(existingSections.map(s => s.id));
        const existingLessonIds = new Set(existingSections.flatMap(s => s.lessons.map(l => l.id)));

        // 3. Определяем, какие ID нужно удалить
        const sectionIdsToDelete = [...existingSectionIds].filter(id => !receivedSectionIds.has(id));
        const lessonIdsToDelete = [...existingLessonIds].filter(id => !receivedLessonIds.has(id));

        // 4. Удаляем уроки и секции, которых больше нет в плане
        if (lessonIdsToDelete.length > 0) {
            await tx.lesson.deleteMany({ where: { id: { in: lessonIdsToDelete } } });
        }
        if (sectionIdsToDelete.length > 0) {
            await tx.contentSection.deleteMany({ where: { id: { in: sectionIdsToDelete } } });
        }

        // 5. Обновляем существующие и создаем новые секции и уроки (Upsert)
        for (const [sectionIndex, sectionData] of roadmapSections.entries()) {
            const section = await tx.contentSection.upsert({
                where: { id: sectionData.id || `new-section-${sectionIndex}` }, // Уникальный временный ID для новых
                update: { title: sectionData.title, order: sectionIndex },
                create: {
                    title: sectionData.title,
                    order: sectionIndex,
                    learningGoalId: goalId,
                },
            });

            for (const [lessonIndex, lessonData] of sectionData.lessons.entries()) {
                await tx.lesson.upsert({
                    where: { id: lessonData.id || `new-lesson-${lessonIndex}` }, // Уникальный временный ID
                    update: { 
                        title: lessonData.title, 
                        order: lessonIndex, 
                        sectionId: section.id, // Связываем с правильной секцией
                    },
                    create: {
                        title: lessonData.title,
                        order: lessonIndex,
                        sectionId: section.id,
                        status: 'DRAFT', // Новые уроки всегда черновики
                    },
                });
            }
        }
    });

    // Возвращаем обновленный роадмап
    const updatedGoal = await prisma.learningGoal.findUnique({
        where: { id: goalId },
        include: {
            sections: {
                include: { lessons: true },
                orderBy: { order: 'asc' }
            }
        }
    });

    res.json({ success: true, data: updatedGoal });
};
