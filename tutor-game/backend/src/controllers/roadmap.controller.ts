import { Request, Response } from 'express';
import { AppError } from '../utils/errors';
import prisma from '../db';
import { generateRoadmap } from '../services/openai.service';

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
        existingPlan,
        feedback
    );
    
    res.json({ success: true, data: roadmapProposal });
};

export const updateRoadmapHandler = async (req: Request, res: Response) => {
    const { goalId } = req.params;
    const { roadmap } = req.body;
    const teacherId = req.user?.userId;

    if (!roadmap || !Array.isArray(roadmap)) {
        throw new AppError('Invalid roadmap data', 400);
    }

    // Verify the goal exists and belongs to the teacher
    const goal = await prisma.learningGoal.findFirst({
        where: { id: goalId, teacherId },
        include: { sections: { include: { lessons: true } } }
    });

    if (!goal) {
        throw new AppError('Learning goal not found or access denied', 404);
    }

    // Start a transaction to update the roadmap
    await prisma.$transaction(async (tx) => {
        // Delete existing sections and lessons
        const sectionIds = goal.sections.map(section => section.id);
        
        if (sectionIds.length > 0) {
            await tx.lesson.deleteMany({
                where: { sectionId: { in: sectionIds } }
            });
            
            await tx.contentSection.deleteMany({
                where: { id: { in: sectionIds } }
            });
        }

        // Create new sections and lessons
        for (const sectionData of roadmap) {
            const section = await tx.contentSection.create({
                data: {
                    title: sectionData.title,
                    order: sectionData.order,
                    learningGoalId: goalId,
                    lessons: {
                        create: sectionData.lessons.map((lesson: any) => ({
                            title: lesson.title,
                            order: lesson.order,
                            status: 'PENDING',
                            content: ''
                        }))
                    }
                },
                include: { lessons: true }
            });
        }
    });

    // Return the updated goal with its sections and lessons
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
