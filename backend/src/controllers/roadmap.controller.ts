import { Request, Response } from 'express';
import { AppError } from '../utils/errors';
import prisma from '../db';
import { generateRoadmap } from '../services/gemini.service';

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
    
    const goal = await prisma.learningGoal.findFirst({
        where: { id: goalId, teacherId },
        select: { id: true }
    });

    if (!goal) {
        throw new AppError('Learning Goal not found or access denied', 404);
    }

    await prisma.$transaction(async (tx) => {
        // 1. Collect IDs from the frontend payload. We only care about normal lessons,
        // as control works are managed by the backend.
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
        
        // 2. Find all existing sections and their lessons for this goal
        const existingSectionsAndLessons = await tx.contentSection.findMany({ 
            where: { learningGoalId: goalId },
            include: { 
                lessons: { 
                    select: { id: true, type: true } 
                } 
            }
        });

        const existingSectionIds = new Set(existingSectionsAndLessons.map(s => s.id));
        
        // 3. Find IDs of NORMAL lessons (non-control-work) that exist in the DB
        const existingNormalLessonIds = new Set<string>();
        existingSectionsAndLessons.flatMap(s => s.lessons).forEach(l => {
            if (l.type !== 'CONTROL_WORK') {
                existingNormalLessonIds.add(l.id);
            }
        });

        // 4. Determine which IDs to delete. Only delete sections and NORMAL lessons.
        const sectionIdsToDelete = [...existingSectionIds].filter(id => !receivedSectionIds.has(id));
        const lessonIdsToDelete = [...existingNormalLessonIds].filter(id => !receivedLessonIds.has(id));

        // 5. Delete lessons and sections no longer in the plan
        if (lessonIdsToDelete.length > 0) {
            await tx.lesson.deleteMany({ where: { id: { in: lessonIdsToDelete } } });
        }
        if (sectionIdsToDelete.length > 0) {
            await tx.contentSection.deleteMany({ where: { id: { in: sectionIdsToDelete } } });
        }

        // 6. Upsert sections, normal lessons, and manage control work lessons
        for (const [sectionIndex, sectionData] of roadmapSections.entries()) {
            const isNewSection = !sectionData.id || sectionData.id.startsWith('new-');
            
            const section = await tx.contentSection.upsert({
                where: { id: sectionData.id || `new-section-placeholder-${Date.now()}` },
                update: { title: sectionData.title, order: sectionIndex },
                create: {
                    title: sectionData.title,
                    order: sectionIndex,
                    learningGoalId: goalId,
                },
            });

            // Handle normal lessons from payload
            for (const [lessonIndex, lessonData] of sectionData.lessons.entries()) {
                await tx.lesson.upsert({
                    where: { id: lessonData.id || `new-lesson-placeholder-${Date.now()}` },
                    update: { 
                        title: lessonData.title, 
                        order: lessonIndex, 
                        sectionId: section.id,
                    },
                    create: {
                        title: lessonData.title,
                        order: lessonIndex,
                        sectionId: section.id,
                        status: 'DRAFT',
                        type: 'PRACTICE', // Default type for new lessons from roadmap
                    },
                });
            }

            const controlWorkTitle = `Контрольная работа по разделу: "${section.title}"`;
            const controlWorkOrder = sectionData.lessons.length;

            if (isNewSection) {
                // If the section is brand new, create a control work for it.
                await tx.lesson.create({
                    data: {
                        title: controlWorkTitle,
                        order: controlWorkOrder,
                        sectionId: section.id,
                        status: 'DRAFT',
                        type: 'CONTROL_WORK',
                    }
                });
            } else {
                // If section already exists, update its control work title/order, but don't re-create it if deleted.
                const existingControlWork = await tx.lesson.findFirst({
                    where: { sectionId: section.id, type: 'CONTROL_WORK' }
                });

                if (existingControlWork) {
                    await tx.lesson.update({
                        where: { id: existingControlWork.id },
                        data: {
                            title: controlWorkTitle,
                            order: controlWorkOrder,
                        }
                    });
                }
            }
        }
    });

    // Return the fully updated roadmap
    const updatedGoal = await prisma.learningGoal.findUnique({
        where: { id: goalId },
        include: {
            sections: {
                orderBy: { order: 'asc' },
                include: { 
                    lessons: {
                        orderBy: { order: 'asc' },
                        include: {
                            storyChapter: true
                        }
                    } 
                },
            }
        }
    });

    res.json({ success: true, data: updatedGoal });
};
