import { Request as ExpressRequest, Response } from 'express';
import { AppError } from '../utils/errors';
import prisma from '../db';
import { generateStorySnippet, translateForImagePrompt } from '../services/openai.service';
import { startImageGeneration, getGenerationResult, uploadImageToLeonardo } from '../services/leonardo.service';
import { WebSocketService } from '../services/websocket.service';
import fs from 'fs';
import path from 'path';

// Расширяем Request, чтобы он мог содержать файл
interface Request extends ExpressRequest {
    file?: Express.Multer.File;
    user?: { userId: string; role: string };
}

export const generateStorySnippetHandler = async (req: Request, res: Response) => {
    const { lessonId } = req.params;
    const teacherId = req.user?.userId;
    if (!teacherId) throw new AppError('Unauthorized', 401);

    const { refinementPrompt } = req.body;

    const lesson = await prisma.lesson.findFirst({
        where: { id: lessonId, section: { learningGoal: { teacherId } } },
        include: { section: { include: { learningGoal: true } } },
    });

    if (!lesson) {
        throw new AppError('Lesson not found or you do not have permission', 404);
    }

    // Get all needed fields from the learning goal
    const { setting, studentAge, language, characterPrompt, characterImageUrl } = lesson.section.learningGoal;

    // Get all lessons for this goal in order
    const allGoalSections = await prisma.contentSection.findMany({
        where: { learningGoalId: lesson.section.learningGoal.id },
        orderBy: { order: 'asc' },
        include: { lessons: { orderBy: { order: 'asc' }, include: { storyChapter: true } } }
    });
    
    const allLessons = allGoalSections.flatMap(section => section.lessons);
    const currentLessonIndex = allLessons.findIndex(l => l.id === lessonId);
    
    let storyContext: string | undefined = undefined;

    // If this is not the first lesson, find the previous one and its context
    if (currentLessonIndex > 0) {
        const previousLesson = allLessons[currentLessonIndex - 1];
        if (previousLesson?.storyChapter) {
            const { teacherSnippetText, studentSnippetText } = previousLesson.storyChapter;
            storyContext = `КОНТЕКСТ ПРЕДЫДУЩЕГО ШАГА:\n`;
            if (teacherSnippetText) storyContext += `Учитель написал: "${teacherSnippetText}"\n`;
            if (studentSnippetText) storyContext += `Ученик ответил: "${studentSnippetText}"\n`;
            storyContext += `---`;
        }
    }

    try {
        // 1. Генерируем текст истории (как и раньше)
        const storySnippetText = await generateStorySnippet(
            lesson.title,
            setting,
            studentAge,
            characterPrompt || 'a brave hero',
            language || 'Russian',
            refinementPrompt,
            storyContext
        );

        // 2. Generate image prompt from the story text
        const scenePrompt = await translateForImagePrompt(storySnippetText);

        // 3. Upload character image to Leonardo if we have a local file
        let referenceImageId: string | null = null;
        
        // Check if we have a local character image URL
        if (characterImageUrl) {
            // Build the absolute path to the file on the server
            const imagePath = path.join(__dirname, '..', '..', characterImageUrl);
            
            // Check if the file exists
            if (fs.existsSync(imagePath)) {
                try {
                    console.log(`[LEONARDO.AI] Uploading character reference from: ${imagePath}`);
                    // Upload the image and get a fresh ID
                    const { imageId } = await uploadImageToLeonardo(imagePath);
                    referenceImageId = imageId;
                    console.log(`[LEONARDO.AI] Got fresh reference imageId: ${referenceImageId}`);
                } catch (uploadError) {
                    console.error("Failed to upload character image to Leonardo, proceeding without it.", uploadError);
                    // Continue without the reference image if upload fails
                }
            } else {
                console.warn(`Character image file not found at path: ${imagePath}`);
            }
        }

        // 4. Generate the final image prompt by combining character and scene descriptions
        const characterDescriptionForPrompt = characterPrompt ? 
            await translateForImagePrompt(characterPrompt) : 
            'a character';
            
        const finalImagePrompt = `${characterDescriptionForPrompt}, ${scenePrompt}`;
        
        console.log('[PROMPT] Character Description:', characterDescriptionForPrompt);
        console.log('[PROMPT] Scene Description:', scenePrompt);
        console.log('[PROMPT] Final Combined Prompt:', finalImagePrompt);
        
        // 5. Start the image generation with the fresh reference image ID
        const { generationId } = await startImageGeneration({ 
            prompt: finalImagePrompt,
            characterImageId: referenceImageId, // Use the fresh ID we just got
            characterWeight: 1.15
        });

        res.json({ 
            success: true, 
            data: {
                text: storySnippetText,
                imageUrl: null, // Показываем, что картинка еще не готова
                imagePrompt: finalImagePrompt, // Возвращаем полный промпт
                generationId // Отправляем ID генерации для последующего опроса
            }
        });
    } catch (error) {
        // ИЗМЕНЕНИЕ 3: Улучшаем логгирование в этом контроллере
        console.error('Error in generateStorySnippetHandler:', error);
        // Передаем ошибку дальше, чтобы сработал глобальный обработчик
        if (error instanceof AppError) {
            throw error;
        }
        // Если это не AppError, оборачиваем его
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
        // Start the image generation process with character weight
        const generationResult = await startImageGeneration({
            prompt,
            characterImageId: lesson.section.learningGoal.characterImageId,
            characterWeight: 1.15 // Consistent weight for regeneration
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
