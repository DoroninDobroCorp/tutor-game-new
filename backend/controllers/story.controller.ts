import { Request as ExpressRequest, Response } from 'express';
import { AppError } from '../utils/errors';
import prisma from '../db';
import { generateStorySnippet } from '../services/gemini.service';
import { generateImage } from '../services/imagen.service';
import { WebSocketService } from '../services/websocket.service';
import { createAndSendMessage } from '../services/chat.service';
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

    const { setting, studentAge, language, characterPrompt } = lesson.section.learningGoal;
    
    const allGoalSections = await prisma.contentSection.findMany({
        where: { learningGoalId: lesson.section.learningGoal.id },
        orderBy: { order: 'asc' },
        include: { lessons: { orderBy: { order: 'asc' }, include: { storyChapter: true } } }
    });
    
    const allLessons = allGoalSections.flatMap(section => section.lessons);
    const currentLessonIndex = allLessons.findIndex(l => l.id === lessonId);
    
    const previousLessons = allLessons.slice(0, currentLessonIndex);
    const storyContextParts: string[] = [];

    for (const prevLesson of previousLessons) {
        if (prevLesson.storyChapter) {
            const { teacherSnippetText, studentSnippetText } = prevLesson.storyChapter;
            let chapterContext = '';
            if (teacherSnippetText) {
                chapterContext += `Рассказчик: "${teacherSnippetText}"\n`;
            }
            if (studentSnippetText) {
                chapterContext += `Ученик ответил: "${studentSnippetText}"\n`;
            }
            if (chapterContext) {
                storyContextParts.push(chapterContext);
            }
        }
    }

    const storyContext: string | undefined = storyContextParts.length > 0
        ? `КОНТЕКСТ ВСЕЙ ПРЕДЫДУЩЕЙ ИСТОРИИ:\n---\n${storyContextParts.join('---\n')}\n---`
        : undefined;

    try {
        const totalLessons = allLessons.length;
        const currentLessonNumber = currentLessonIndex >= 0 ? currentLessonIndex + 1 : 1;

        const { storyText, imagePrompt, useCharacterReference } = await generateStorySnippet(
            lesson.title,
            setting,
            studentAge,
            characterPrompt || 'a brave hero',
            language || 'Russian',
            currentLessonNumber,
            totalLessons,
            lesson.type,
            refinementPrompt,
            storyContext
        );

        console.log('[PROMPT SUGGESTION] Generated for story snippet:', imagePrompt);
        console.log('[PROMPT SUGGESTION] Use character reference:', useCharacterReference);
        
        res.json({ 
            success: true, 
            data: {
                text: storyText,
                imagePrompt: imagePrompt,
                useCharacterReference: useCharacterReference, // Pass this to the frontend
            }
        });
    } catch (error) {
        console.error('Error in generateStorySnippetHandler:', error);
        if (error instanceof AppError) {
            throw error;
        }
        throw new AppError('Failed to generate story snippet', 500);
    }
};

export const approveStorySnippetHandler = async (req: Request, res: Response) => {
    const { lessonId } = req.params;
    const { text, imageUrl, imagePrompt } = req.body;
    const teacherId = req.user?.userId;

    if (!text) throw new AppError('Story text is required', 400);

    const lesson = await prisma.lesson.findFirst({
        where: { id: lessonId, section: { learningGoal: { teacherId } } },
        select: {
            id: true,
            title: true,
            section: { 
                select: { 
                    learningGoalId: true, 
                    learningGoal: { 
                        select: { studentId: true, teacherId: true } 
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
        
        await tx.lesson.update({ where: { id: lessonId }, data: { status: 'APPROVED' } });
        return storyChapter;
    });

    const teacherUser = await prisma.user.findUnique({ where: { id: lesson.section.learningGoal.teacherId } });
    
    const wsService = req.app.get('wsService') as WebSocketService;
    wsService.emitToUser(lesson.section.learningGoal.studentId, 'teacher_reviewed_lesson', {
        message: `Учитель ${teacherUser?.firstName} проверил ваш урок.`,
        lessonId: lesson.id,
        goalId: lesson.section.learningGoalId,
        teacherName: teacherUser?.firstName || 'Учитель',
        timestamp: new Date().toISOString(),
        hasImage: !!imageUrl
    });

    try {
        const messageContent = `Отлично! Я проверил(а) твой ответ. Тебя ждет продолжение приключения в уроке "${lesson.title}"!`;
        if (teacherId) {
             await createAndSendMessage(wsService, teacherId, lesson.section.learningGoal.studentId, messageContent);
        }
    } catch (error) {
        console.error('Failed to send system message on lesson approval:', error);
    }

    res.json({ success: true, data: result });
};

export const approveStorySnippetWithUploadHandler = async (req: Request, res: Response) => {
    const { lessonId } = req.params;
    const { text, prompt } = req.body;
    const file = req.file as Express.Multer.File;
    const teacherId = req.user?.userId;

    if (!text || !file) {
        if (file && file.path) fs.unlinkSync(file.path);
        throw new AppError('Text and image file are required', 400);
    }

    const lesson = await prisma.lesson.findFirst({
        where: { id: lessonId, section: { learningGoal: { teacherId } } },
        select: {
            id: true,
            title: true,
            section: { 
                select: { 
                    learningGoalId: true, 
                    learningGoal: { 
                        select: { studentId: true, teacherId: true } 
                    } 
                }
            }
        }
    });

    if (!lesson) {
        if (file && file.path) fs.unlinkSync(file.path);
        throw new AppError('Lesson not found or you do not have permission', 404);
    }

    const imageUrl = `/uploads/${file.filename}`;

    const storyChapter = await prisma.$transaction(async (tx) => {
        const chapter = await tx.storyChapter.upsert({
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

        await tx.lesson.update({ where: { id: lessonId }, data: { status: 'APPROVED' } });
        return chapter;
    });

    const teacherUser = await prisma.user.findUnique({ where: { id: lesson.section.learningGoal.teacherId } });
    
    const wsService = req.app.get('wsService') as WebSocketService;
    wsService.emitToUser(lesson.section.learningGoal.studentId, 'teacher_reviewed_lesson', {
        message: `Учитель ${teacherUser?.firstName} проверил ваш урок.`,
        lessonId: lesson.id,
        goalId: lesson.section.learningGoalId,
        teacherName: teacherUser?.firstName || 'Учитель',
        timestamp: new Date().toISOString(),
        hasImage: !!imageUrl
    });

    try {
        const messageContent = `Отлично! Я проверил(а) твой ответ. Тебя ждет продолжение приключения в уроке "${lesson.title}"!`;
        if (teacherId) {
             await createAndSendMessage(wsService, teacherId, lesson.section.learningGoal.studentId, messageContent);
        }
    } catch (error) {
        console.error('Failed to send system message on lesson approval:', error);
    }

    res.json({ success: true, data: storyChapter });
};

export const regenerateStoryImageHandler = async (req: Request, res: Response) => {
    const { lessonId } = req.params;
    const { prompt, useCharacterReference } = req.body;
    const teacherId = req.user?.userId;

    if (!prompt) {
        throw new AppError('Image prompt is required for regeneration', 400);
    }
    if (useCharacterReference === undefined) {
        throw new AppError('useCharacterReference flag is required', 400);
    }

    const lesson = await prisma.lesson.findFirst({
        where: { id: lessonId, section: { learningGoal: { teacherId } } },
        select: { section: { select: { learningGoal: true } } }
    });

    if (!lesson) {
        throw new AppError('Lesson not found or access denied', 404);
    }
    
    const { characterImageUrl, characterPrompt } = lesson.section.learningGoal;
    let characterBuffer: Buffer | undefined;

    if (useCharacterReference && characterImageUrl) {
        const imagePath = path.join(__dirname, '..', '..', characterImageUrl);
        if (fs.existsSync(imagePath)) {
            try {
                characterBuffer = fs.readFileSync(imagePath);
                console.log(`[IMAGEN] Loaded character reference from: ${imagePath}`);
            } catch (readError) {
                console.error("Failed to read character image for regeneration, proceeding without it.", readError);
                characterBuffer = undefined;
            }
        } else {
             console.warn(`[IMAGEN] Character reference image file not found at: ${imagePath}`);
        }
    } else if (useCharacterReference) {
         console.warn(`[IMAGEN] AI requested character reference, but no characterImageUrl is set for goal ${lesson.section.learningGoal.id}.`);
    }

    try {
        console.log(`[IMAGEN] Generating scene with prompt: "${prompt}"`);
        const imageBuffer = await generateImage(
            prompt,
            characterBuffer,
            characterBuffer ? (characterPrompt || undefined) : undefined
        );

        const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
        const filename = `scene-${lessonId}-${Date.now()}.png`;
        const filepath = path.join(uploadsDir, filename);
        await fs.promises.writeFile(filepath, imageBuffer);
        const publicImageUrl = `/uploads/${filename}`;

        res.json({ 
            success: true, 
            data: { 
                imageUrl: publicImageUrl,
                prompt: prompt
            } 
        });
    } catch (error) {
        console.error('Error in regenerateStoryImageHandler:', error);
        if (error instanceof AppError) {
            res.status(error.statusCode).json({ success: false, message: error.message });
        } else {
            res.status(500).json({ success: false, message: 'Failed to regenerate image.' });
        }
    }
};