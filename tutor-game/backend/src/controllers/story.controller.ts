import { Request as ExpressRequest, Response } from 'express';
import { AppError } from '../utils/errors';
import prisma from '../db';
import { generateStorySnippet } from '../services/openai.service';
import { startImageGeneration, getGenerationResult } from '../services/leonardo.service';
import { WebSocketService } from '../services/websocket.service';
import fs from 'fs';

// Расширяем Request, чтобы он мог содержать файл
interface Request extends ExpressRequest {
    file?: Express.Multer.File;
    user?: { userId: string; role: string };
}

export const generateStorySnippetHandler = async (req: Request, res: Response) => {
    const { lessonId } = req.params;
    const teacherId = req.user?.userId;
    if (!teacherId) throw new AppError('Unauthorized', 401);

    const { previousStory, refinementPrompt } = req.body;

    const lesson = await prisma.lesson.findFirst({
        where: { id: lessonId, section: { learningGoal: { teacherId } } },
        include: { section: { include: { learningGoal: true } } },
    });

    if (!lesson) {
        throw new AppError('Lesson not found or you do not have permission', 404);
    }

    const { learningGoal } = lesson.section;
    const { setting, studentAge, language, characterPrompt } = learningGoal;

    try {
        // Генерируем текст истории и промпт для картинки параллельно
        const [storySnippetText, imagePromptForLeonardo] = await Promise.all([
            generateStorySnippet(
                lesson.title,
                setting,
                studentAge,
                characterPrompt || 'a brave hero',
                language || 'Russian',
                refinementPrompt,
                previousStory
            ),
            // В будущем можно добавить генерацию промпта через ИИ
            Promise.resolve(`Generate an illustration for a story about ${lesson.title} in a ${setting} setting`)
        ]);

        // Запускаем генерацию картинки, но не ждем ее завершения
        const { generationId } = await startImageGeneration({ 
            prompt: imagePromptForLeonardo
            // modelId можно добавить, когда будет в модели
        });

        res.json({ 
            success: true, 
            data: {
                text: storySnippetText,
                imageUrl: null, // Показываем, что картинка еще не готова
                imagePrompt: imagePromptForLeonardo,
                generationId // Отправляем ID генерации для последующего опроса
            }
        });
    } catch (error) {
        console.error('Error in generateStorySnippetHandler:', error);
        throw new AppError('Failed to generate story snippet', 500);
    }
};

export const checkStoryImageStatusHandler = async (req: Request, res: Response) => {
    const { generationId } = req.params;
    
    if (!generationId) {
        throw new AppError('Generation ID is required', 400);
    }

    try {
        const result = await getGenerationResult(generationId);
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error checking image status:', error);
        throw new AppError('Failed to check image generation status', 500);
    }
};

export const approveStorySnippetHandler = async (req: Request, res: Response) => {
    const { lessonId } = req.params;
    const { text, imageUrl, imagePrompt } = req.body;
    const teacherId = req.user?.userId;

    if (!text) throw new AppError('Story text is required', 400);

    const lesson = await prisma.lesson.findFirst({
        where: { id: lessonId, section: { learningGoal: { teacherId } } },
        include: { 
            section: { 
                select: { 
                    learningGoalId: true, 
                    learningGoal: { 
                        select: { 
                            studentId: true, 
                            teacherId: true 
                        } 
                    } 
                } 
            } 
        }
    });

    if (!lesson) throw new AppError('Lesson not found or access denied', 404);
    
    const result = await prisma.$transaction(async (tx) => {
        const storyChapter = await tx.storyChapter.upsert({
            where: { lessonId },
            create: {
                lessonId,
                learningGoalId: lesson.section.learningGoalId,
                teacherSnippetText: text,
                teacherSnippetImageUrl: imageUrl,
                teacherSnippetImagePrompt: imagePrompt,
                teacherSnippetStatus: 'APPROVED',
            },
            update: {
                teacherSnippetText: text,
                teacherSnippetImageUrl: imageUrl,
                teacherSnippetImagePrompt: imagePrompt,
                teacherSnippetStatus: 'APPROVED',
            }
        });
        
        await tx.lesson.update({
            where: { id: lessonId },
            data: { status: 'APPROVED' },
        });

        return storyChapter;
    });

    // Отправка WebSocket уведомления
    const teacherUser = await prisma.user.findUnique({ 
        where: { id: lesson.section.learningGoal.teacherId } 
    });
    
    const wsService = req.app.get('wsService') as WebSocketService;
    wsService.emitToUser(lesson.section.learningGoal.studentId, 'teacher_reviewed_lesson', {
        message: `Учитель ${teacherUser?.firstName} проверил ваш урок.`,
        lessonId: lesson.id,
        goalId: lesson.section.learningGoalId,
        teacherName: teacherUser?.firstName || 'Учитель',
        timestamp: new Date().toISOString(),
        hasImage: !!imageUrl
    });

    res.json({ success: true, data: result });
};

export const approveStorySnippetWithUploadHandler = async (req: Request, res: Response) => {
    const { lessonId } = req.params;
    const { text, prompt } = req.body;
    const file = req.file as Express.Multer.File;
    const teacherId = req.user?.userId;

    if (!text || !prompt || !file) {
        if (file) fs.unlinkSync(file.path); // Удаляем файл, если он был загружен, но данных не хватает
        throw new AppError('Text, prompt, and image file are required', 400);
    }

    const lesson = await prisma.lesson.findFirst({
        where: { id: lessonId, section: { learningGoal: { teacherId } } },
        include: { section: { select: { learningGoalId: true } } }
    });

    if (!lesson) {
        if (file) fs.unlinkSync(file.path);
        throw new AppError('Lesson not found or you do not have permission', 404);
    }

    const imageUrl = `/uploads/${file.filename}`;

    const storyChapter = await prisma.$transaction(async (tx) => {
        return await tx.storyChapter.upsert({
            where: { lessonId },
            update: {
                teacherSnippetText: text,
                teacherSnippetImageUrl: imageUrl,
                teacherSnippetImagePrompt: prompt,
                teacherSnippetStatus: 'APPROVED',
                updatedAt: new Date()
            },
            create: {
                lessonId,
                learningGoalId: lesson.section.learningGoalId,
                teacherSnippetText: text,
                teacherSnippetImageUrl: imageUrl,
                teacherSnippetImagePrompt: prompt,
                teacherSnippetStatus: 'APPROVED'
            }
        });
    });

    res.json({ success: true, data: storyChapter });
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
        // Start the image generation process
        const generationResult = await startImageGeneration({
            prompt,
            characterImageId: lesson.section.learningGoal.characterImageId
        });

        if (!generationResult.generationId) {
            throw new AppError('Failed to start image regeneration', 500);
        }
        
        // Return the generation ID to the client for polling
        res.json({ 
            success: true, 
            data: { 
                generationId: generationResult.generationId,
                prompt: prompt 
            } 
        });
    } catch (error) {
        console.error('Error in regenerateStoryImageHandler:', error);
        throw new AppError('Failed to regenerate image.', 500);
    }
};
