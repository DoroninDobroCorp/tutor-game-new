import { Request, Response } from 'express';
import { AppError } from '../utils/errors';
import prisma from '../db';
import { generateRoadmap, generateLessonContent, generateStorySnippet, translateForImagePrompt } from '../services/openai.service';
import { generateImage } from '../services/leonardo.service';
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
                        include: {
                            storyChapter: true // Include story chapter data with all fields
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
    
    // ИСПРАВЛЕНИЕ 1: Определяем полный тип данных, который приходит с фронтенда
    const roadmapSections = req.body.roadmap as { 
        id?: string; 
        title: string; 
        lessons: { 
            id?: string; 
            title: string;
            status?: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'COMPLETED'; // Добавляем статус
            content?: any; // Добавляем контент
        }[] 
    }[];

    if (!roadmapSections || !Array.isArray(roadmapSections)) {
        throw new AppError('Roadmap data must be an array of sections', 400);
    }

    const teacherId = req.user?.userId;
    const goal = await prisma.learningGoal.findFirst({
        where: { id: goalId, teacherId },
        select: { id: true }
    });

    if (!goal) {
        throw new AppError('Learning Goal not found or access denied', 404);
    }

    // Use transaction for atomic operation
    await prisma.$transaction(async (tx) => {
        const receivedSectionIds = new Set<string>();
        const receivedLessonIds = new Set<string>();

        for (const [sectionIndex, sectionData] of roadmapSections.entries()) {
            // --- SECTION MANAGEMENT (UPSERT) ---
            const section = await tx.contentSection.upsert({
                where: { id: sectionData.id || `new-section-${sectionIndex}` }, // Use ID or temp ID for creation
                update: { title: sectionData.title, order: sectionIndex },
                create: {
                    title: sectionData.title,
                    order: sectionIndex,
                    learningGoalId: goalId,
                },
            });
            receivedSectionIds.add(section.id);

            for (const [lessonIndex, lessonData] of sectionData.lessons.entries()) {
                // --- LESSON MANAGEMENT (UPSERT) ---
                const lesson = await tx.lesson.upsert({
                    where: { id: lessonData.id || `new-lesson-${lessonIndex}` },
                    update: { 
                        title: lessonData.title, 
                        order: lessonIndex, 
                        sectionId: section.id,
                        status: lessonData.status || 'DRAFT', // Обновляем статус
                        content: lessonData.content || null, // Обновляем контент
                    },
                    create: {
                        title: lessonData.title,
                        order: lessonIndex,
                        sectionId: section.id,
                        status: lessonData.status || 'DRAFT', // Создаем со статусом
                        content: lessonData.content || null, // Создаем с контентом
                    },
                });
                receivedLessonIds.add(lesson.id);
            }
        }

        // --- CLEAN UP DELETED ITEMS ---
        // Find all section and lesson IDs in the DB that weren't in the received data
        const allDbSections = await tx.contentSection.findMany({ where: { learningGoalId: goalId }, select: { id: true } });
        const sectionIdsToDelete = allDbSections.filter(s => !receivedSectionIds.has(s.id)).map(s => s.id);
        
        const allDbLessons = await tx.lesson.findMany({ where: { section: { learningGoalId: goalId } }, select: { id: true } });
        const lessonIdsToDelete = allDbLessons.filter(l => !receivedLessonIds.has(l.id)).map(l => l.id);

        if (lessonIdsToDelete.length > 0) {
            // Cascade delete will handle related StoryChapter
            await tx.lesson.deleteMany({ where: { id: { in: lessonIdsToDelete } } });
        }
        if (sectionIdsToDelete.length > 0) {
            await tx.contentSection.deleteMany({ where: { id: { in: sectionIdsToDelete } } });
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
    const userId = req.user?.userId;

    if (!content) {
        throw new AppError('Content is required', 400);
    }

    // Find the lesson and verify ownership through the learning goal
    const lesson = await prisma.lesson.findFirst({
        where: { id: lessonId },
        include: {
            section: {
                include: {
                    learningGoal: true
                }
            }
        }
    });

    if (!lesson) {
        throw new AppError('Lesson not found', 404);
    }

    if (lesson.section.learningGoal.teacherId !== userId) {
        throw new AppError('Not authorized to update this lesson', 403);
    }

    const updatedLesson = await prisma.lesson.update({
        where: { id: lessonId },
        data: { content }
    });

    res.json({ success: true, data: updatedLesson });
};

export const generateCharacterHandler = async (req: Request, res: Response) => {
    const { goalId } = req.params;
    const { prompt } = req.body;
    const teacherId = req.user?.userId;

    if (!prompt) {
        throw new AppError('Character prompt is required', 400);
    }

    const goal = await prisma.learningGoal.findFirst({
        where: { id: goalId, teacherId }
    });

    if (!goal) {
        throw new AppError('Learning Goal not found or you do not have permission', 404);
    }

    const imageResult = await generateImage({
        prompt: `cartoon-style, full-body portrait of ${prompt}, dynamic pose, cinematic wide-angle shot, clean background, for an educational game`,
    });
    
    // Просто возвращаем результат, ничего не сохраняя
    res.json({ success: true, data: imageResult });
};

export const approveCharacterHandler = async (req: Request, res: Response) => {
    const { goalId } = req.params;
    const { prompt, imageId, genId, imageUrl } = req.body;
    const teacherId = req.user?.userId;

    if (!prompt || !imageId || !genId || !imageUrl) {
        throw new AppError('All character data is required for approval', 400);
    }

    const updatedGoal = await prisma.learningGoal.updateMany({
        where: { id: goalId, teacherId }, // updateMany, чтобы убедиться, что учитель владеет целью
        data: {
            characterPrompt: prompt,
            characterImageId: imageId,
            characterGenId: genId,
            characterImageUrl: imageUrl,
        }
    });

    if (updatedGoal.count === 0) {
        throw new AppError('Learning Goal not found or you do not have permission', 404);
    }

    const finalGoal = await prisma.learningGoal.findUnique({ where: { id: goalId } });

    res.json({ success: true, data: finalGoal });
};

export const generateStorySnippetHandler = async (req: Request, res: Response) => {
    const { lessonId } = req.params;
    const { refinementPrompt } = req.body;
    const teacherId = req.user?.userId;

    // Find the lesson with related data
    const lesson = await prisma.lesson.findFirst({
        where: { 
            id: lessonId, 
            section: { 
                learningGoal: { 
                    teacherId 
                } 
            } 
        },
        include: { 
            section: { 
                include: { 
                    learningGoal: true 
                } 
            } 
        }
    });

    if (!lesson) {
        throw new AppError('Lesson not found or you do not have permission', 404);
    }

    const { learningGoal } = lesson.section;
    
    // Check if character is created
    if (!learningGoal.characterPrompt || !learningGoal.characterImageId) {
        throw new AppError('A character must be created for this Learning Goal before generating a story snippet.', 400);
    }

    try {
        // 1. Generate high-quality story text in the target language
        const storyText = await generateStorySnippet(
            lesson.title,
            learningGoal.setting,
            learningGoal.studentAge,
            learningGoal.characterPrompt,
            learningGoal.language || 'Russian',
            refinementPrompt
        );

        // 2. Create the image prompt
        const imagePromptText = refinementPrompt 
            ? `cinematic illustration, vibrant colors, cartoon style, ${refinementPrompt}`
            : `cinematic illustration, vibrant colors, cartoon style, ${await translateForImagePrompt(storyText)}`;

        // 3. Generate image with consistent character using Leonardo AI
        const imageResult = await generateImage({
            prompt: imagePromptText,
            characterImageId: learningGoal.characterImageId
        });

        if (!imageResult.url) {
            throw new AppError('Failed to generate story image', 500);
        }
        
        // Return the generated content for teacher approval
        res.json({ 
            success: true, 
            data: { 
                text: storyText, 
                imageUrl: imageResult.url,
                prompt: imagePromptText // Include the prompt in the response
            } 
        });
    } catch (error) {
        console.error('Error in generateStorySnippetHandler:', error);
        // More specific error handling
        if (error instanceof AppError) {
            throw error;
        }
        throw new AppError('Failed to generate story snippet. Please try again later.', 500);
    }
};

export const regenerateStoryImageHandler = async (req: Request, res: Response) => {
    const { lessonId } = req.params;
    const { prompt } = req.body;
    const teacherId = req.user?.userId;

    if (!prompt) {
        throw new AppError('Image prompt is required for regeneration', 400);
    }

    const lesson = await prisma.lesson.findFirst({
        where: { id: lessonId, section: { learningGoal: { teacherId } } },
        select: { section: { select: { learningGoal: { select: { characterImageId: true } } } } }
    });

    if (!lesson?.section.learningGoal.characterImageId) {
        throw new AppError('Lesson not found or character is not set for this goal', 404);
    }

    try {
        const imageResult = await generateImage({
            prompt,
            characterImageId: lesson.section.learningGoal.characterImageId
        });

        if (!imageResult.url) {
            throw new AppError('Failed to regenerate story image', 500);
        }
        
        res.json({ 
            success: true, 
            data: { 
                imageUrl: imageResult.url,
                prompt: prompt 
            } 
        });
    } catch (error) {
        console.error('Error in regenerateStoryImageHandler:', error);
        throw new AppError('Failed to regenerate image.', 500);
    }
};

export const approveStorySnippetHandler = async (req: Request, res: Response) => {
    const { lessonId } = req.params;
    const { text, imageUrl, prompt } = req.body;
    const teacherId = req.user?.userId;

    // Validate input
    if (!text || !imageUrl || !prompt) {
        throw new AppError('Text, image URL and prompt are required for approval', 400);
    }

    // Find the lesson with permission check
    const lesson = await prisma.lesson.findFirst({
        where: { 
            id: lessonId, 
            section: { 
                learningGoal: { 
                    teacherId 
                } 
            } 
        },
        include: { 
            section: { 
                select: { 
                    learningGoalId: true 
                } 
            } 
        }
    });

    if (!lesson) {
        throw new AppError('Lesson not found or you do not have permission', 404);
    }

    try {
        // Use transaction to ensure data consistency
        const storyChapter = await prisma.$transaction(async (tx) => {
            // Check if we need to update or create
            const existingChapter = await tx.storyChapter.findUnique({
                where: { lessonId }
            });

            if (existingChapter) {
                // Update existing chapter
                return await tx.storyChapter.update({
                    where: { id: existingChapter.id },
                    data: {
                        teacherSnippetText: text,
                        teacherSnippetImageUrl: imageUrl,
                        teacherSnippetImagePrompt: prompt,
                        teacherSnippetStatus: 'APPROVED'
                    }
                });
            } else {
                // Create new chapter
                return await tx.storyChapter.create({
                    data: {
                        lessonId,
                        learningGoalId: lesson.section.learningGoalId,
                        teacherSnippetText: text,
                        teacherSnippetImageUrl: imageUrl,
                        teacherSnippetImagePrompt: prompt,
                        teacherSnippetStatus: 'APPROVED'
                    }
                });
            }
        });

        res.json({ 
            success: true, 
            data: storyChapter 
        });
    } catch (error) {
        console.error('Error in approveStorySnippetHandler:', error);
        throw new AppError('Failed to approve story snippet. Please try again later.', 500);
    }
};