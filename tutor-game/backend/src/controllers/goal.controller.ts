import { Request, Response } from 'express';
import { AppError } from '../utils/errors';
import prisma from '../db';
import { generateRoadmap, generateLessonContent, generateStorySnippet, translateForImagePrompt } from '../services/openai.service';
import { generateImage } from '../services/leonardo.service';
import { WebSocketService } from '../services/websocket.service';
import fs from 'fs';
import path from 'path';

// Import WebSocket event types from frontend
type TeacherReviewedLessonEvent = {
  message: string;
  lessonId: string;
  goalId: string;
  teacherName: string;
  timestamp: string;
  hasImage: boolean;
};

declare global {
  namespace Express {
    interface Request {
      file?: Express.Multer.File;
    }
  }
}
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
    // Add explicit check for authentication
    if (!teacherId) {
        throw new AppError('User not authenticated', 401);
    }

    try {
        const goals = await prisma.learningGoal.findMany({
            where: { teacherId },
            include: {
                // Include student data with necessary fields
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
    } catch (error) {
        console.error('Error fetching learning goals:', error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            throw new AppError('Database error while fetching goals', 500);
        }
        throw error;
    }
};

export const updateRoadmapHandler = async (req: Request, res: Response) => {
    const { goalId } = req.params;
    
    const roadmapSections = req.body.roadmap as { 
        id?: string; 
        title: string; 
        lessons: { 
            id?: string; 
            title: string;
            status?: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'COMPLETED';
            content?: any;
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

    await prisma.$transaction(async (tx) => {
        const receivedSectionIds = new Set<string>();
        const receivedLessonIds = new Set<string>();

        for (const [sectionIndex, sectionData] of roadmapSections.entries()) {
            const section = await tx.contentSection.upsert({
                where: { id: sectionData.id || `new-section-${sectionIndex}` },
                update: { title: sectionData.title, order: sectionIndex },
                create: {
                    title: sectionData.title,
                    order: sectionIndex,
                    learningGoalId: goalId,
                },
            });
            receivedSectionIds.add(section.id);

            for (const [lessonIndex, lessonData] of sectionData.lessons.entries()) {
                const lesson = await tx.lesson.upsert({
                    where: { id: lessonData.id || `new-lesson-${lessonIndex}` },
                    update: { 
                        title: lessonData.title, 
                        order: lessonIndex, 
                        sectionId: section.id,
                        status: lessonData.status || 'DRAFT',
                        content: lessonData.content || null,
                    },
                    create: {
                        title: lessonData.title,
                        order: lessonIndex,
                        sectionId: section.id,
                        status: lessonData.status || 'DRAFT',
                        content: lessonData.content || null,
                    },
                });
                receivedLessonIds.add(lesson.id);
            }
        }

        const allDbSections = await tx.contentSection.findMany({ where: { learningGoalId: goalId }, select: { id: true } });
        const sectionIdsToDelete = allDbSections.filter(s => !receivedSectionIds.has(s.id)).map(s => s.id);
        
        const allDbLessons = await tx.lesson.findMany({ where: { section: { learningGoalId: goalId } }, select: { id: true } });
        const lessonIdsToDelete = allDbLessons.filter(l => !receivedLessonIds.has(l.id)).map(l => l.id);

        if (lessonIdsToDelete.length > 0) {
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
    
    // --- НАЧАЛО ИЗМЕНЕНИЙ ---
    const { learningGoal } = lesson.section;
    const { studentId, subject, studentAge, setting, language } = learningGoal;

    // 1. Получаем из базы данных логи успеваемости для этого студента по этому плану.
    const performanceLogs = await prisma.studentPerformanceLog.findMany({
        where: {
            studentId: studentId,
            lesson: {
                section: {
                    learningGoalId: learningGoal.id
                }
            }
        },
        orderBy: { createdAt: 'desc' },
        take: 20 // Ограничиваем количество для экономии токенов и контекста
    });

    // 2. Формируем из логов простой текстовый контекст для ИИ.
    const performanceContext = performanceLogs.length > 0
        ? "Context on student's previous answers: " + performanceLogs.map(log => 
            `Student's answer: "${log.answer}"${log.aiNote ? `. AI note: "${log.aiNote}"` : ''}`
          ).join('; ')
        : undefined;
        
    // --- КОНЕЦ ИЗМЕНЕНИЙ ---
    
    // 3. Передаем этот контекст в сервис.
    const generatedContent = await generateLessonContent(
        lesson.title, 
        subject, 
        studentAge, 
        setting, 
        language || 'Russian',
        performanceContext 
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

    // First get the lesson with section and learning goal
    const lessonWithSection = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: {
            section: {
                select: {
                    id: true,
                    learningGoal: {
                        select: {
                            id: true,
                            teacherId: true
                        }
                    }
                }
            }
        }
    });

    if (!lessonWithSection) {
        throw new AppError('Lesson not found', 404);
    }

    if (lessonWithSection.section.learningGoal.teacherId !== userId) {
        throw new AppError('Not authorized to update this lesson', 403);
    }

    // Update the lesson content and set status to PENDING_APPROVAL (waiting for story)
    const updatedLesson = await prisma.lesson.update({
        where: { id: lessonId },
        data: { 
            content,
            status: 'PENDING_APPROVAL' // Waiting for story to be approved
        },
        select: {
            id: true,
            title: true,
            content: true,
            status: true,
            sectionId: true
        }
    });

    // Get the learning goal with basic info
    const learningGoal = await prisma.learningGoal.findUnique({
        where: { id: lessonWithSection.section.learningGoal.id },
        select: { id: true, studentId: true, teacherId: true }
    });

    if (!learningGoal) {
        throw new AppError('Learning goal not found', 404);
    }

    // Get student and teacher users separately
    const studentUser = await prisma.user.findUnique({
        where: { id: learningGoal.studentId },
        select: {
            id: true,
            firstName: true,
            lastName: true
        }
    });

    const teacherUser = await prisma.user.findUnique({
        where: { id: learningGoal.teacherId },
        select: {
            id: true,
            firstName: true,
            lastName: true
        }
    });

    if (!studentUser || !teacherUser) {
        throw new AppError('Student or teacher user info not found', 404);
    }

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
        where: { id: goalId, teacherId },
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
    
    if (!learningGoal.characterPrompt || !learningGoal.characterImageId) {
        throw new AppError('A character must be created for this Learning Goal before generating a story snippet.', 400);
    }

    try {
        const previousChapters = await prisma.storyChapter.findMany({
            where: {
                learningGoalId: learningGoal.id,
                studentSnippetText: { not: null }
            },
            orderBy: { createdAt: 'asc' },
            take: 3
        });

        const storyContext = previousChapters.length > 0
            ? previousChapters.map(chapter => 
                `Teacher: ${chapter.teacherSnippetText}\nStudent: ${chapter.studentSnippetText}`
              ).join('\n\n---\n\n')
            : undefined;

        const storyText = await generateStorySnippet(
            lesson.title,
            learningGoal.setting,
            learningGoal.studentAge,
            learningGoal.characterPrompt,
            learningGoal.language || 'Russian',
            refinementPrompt,
            storyContext
        );

        const imagePromptText = refinementPrompt 
            ? `cinematic illustration, vibrant colors, cartoon style, ${refinementPrompt}`
            : `cinematic illustration, vibrant colors, cartoon style, ${await translateForImagePrompt(storyText)}`;

        const imageResult = await generateImage({
            prompt: imagePromptText,
            characterImageId: learningGoal.characterImageId
        });

        if (!imageResult.url) {
            throw new AppError('Failed to generate story image', 500);
        }
        
        res.json({ 
            success: true, 
            data: { 
                text: storyText, 
                imageUrl: imageResult.url,
                prompt: imagePromptText
            } 
        });
    } catch (error) {
        console.error('Error in generateStorySnippetHandler:', error);
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

    if (!text || !imageUrl || !prompt) {
        throw new AppError('Text, image URL and prompt are required for approval', 400);
    }

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
        const result = await prisma.$transaction(async (tx) => {
            // First, get the lesson with basic info
            const lesson = await tx.lesson.findUnique({
                where: { id: lessonId },
                select: {
                    id: true,
                    sectionId: true,
                    section: {
                        select: {
                            learningGoalId: true
                        }
                    }
                }
            });

            if (!lesson?.section) {
                throw new AppError('Lesson section not found', 404);
            }

            // Get learning goal with basic info
            const learningGoal = await tx.learningGoal.findUnique({
                where: { id: lesson.section.learningGoalId },
                select: {
                    id: true,
                    studentId: true,
                    teacherId: true
                }
            });

            if (!learningGoal) {
                throw new AppError('Learning goal not found', 404);
            }

            // Get student and teacher user info directly
            const studentUser = await tx.user.findUnique({
                where: { id: learningGoal.studentId },
                select: { id: true, firstName: true, lastName: true }
            });

            const teacherUser = await tx.user.findUnique({
                where: { id: learningGoal.teacherId },
                select: { id: true, firstName: true, lastName: true }
            });

            if (!studentUser || !teacherUser) {
                throw new AppError('Student or teacher user info not found', 404);
            }

            // Update the lesson status to APPROVED - this is the final step when story is approved
            const updatedLesson = await tx.lesson.update({
                where: { id: lessonId },
                data: { status: 'APPROVED' },
                select: { id: true, title: true }
            });

            if (!updatedLesson) {
                throw new AppError('Lesson not found during transaction', 404);
            }

            let storyChapter;
            const existingChapter = await tx.storyChapter.findUnique({
                where: { lessonId }
            });

            if (existingChapter) {
                storyChapter = await tx.storyChapter.update({
                    where: { id: existingChapter.id },
                    data: {
                        teacherSnippetText: text,
                        teacherSnippetImageUrl: imageUrl,
                        teacherSnippetImagePrompt: prompt,
                        teacherSnippetStatus: 'APPROVED'
                    }
                });
            } else {
                storyChapter = await tx.storyChapter.create({
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


            // Send WebSocket notification to student
            try {
                const wsService = req.app.get('wsService');
                // Emit WebSocket event to student with TeacherReviewedLessonEvent type
                const notificationPayload: TeacherReviewedLessonEvent = {
                    message: `Учитель ${teacherUser.firstName || ''} проверил ваш урок.`,
                    lessonId: updatedLesson.id,
                    goalId: learningGoal.id,
                    teacherName: `${teacherUser.firstName || ''} ${teacherUser.lastName || ''}`.trim(),
                    timestamp: new Date().toISOString(),
                    hasImage: !!imageUrl
                };
                
                wsService.emitToUser(studentUser.id, 'teacher_reviewed_lesson', notificationPayload);
            } catch (wsError) {
                console.error('Failed to send WebSocket notification:', wsError);
                // Don't fail the request if WebSocket notification fails
            }

            return { lesson: updatedLesson, storyChapter };
        });

        res.json({ 
            success: true, 
            data: result.storyChapter,
            lessonId: result.lesson.id
        });
    } catch (error) {
        console.error('Error in approveStorySnippetHandler:', error);
        throw new AppError('Failed to approve story snippet. Please try again later.', 500);
    }
};

export const approveStorySnippetWithUploadHandler = async (req: Request, res: Response) => {
    try {
        const { lessonId } = req.params;
        const { text, prompt } = req.body;
        const file = req.file as Express.Multer.File;
        const teacherId = req.user?.userId;

        if (!text || !prompt || !file) {
            if (file) {
                fs.unlink(file.path, (err) => {
                    if (err) console.error('Error deleting uploaded file:', err);
                });
            }
            throw new AppError('Text, prompt, and image file are required', 400);
        }

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
            fs.unlink(file.path, (err) => {
                if (err) console.error('Error deleting uploaded file:', err);
            });
            throw new AppError('Lesson not found or you do not have permission', 404);
        }

        const fileExt = path.extname(file.originalname);
        const newFilename = `story-${Date.now()}${fileExt}`;
        const uploadPath = path.join('uploads', newFilename);
        
        if (!fs.existsSync('uploads')) {
            fs.mkdirSync('uploads', { recursive: true });
        }
        
        fs.renameSync(file.path, uploadPath);
        
        const imageUrl = `/uploads/${newFilename}`;

        const storyChapter = await prisma.$transaction(async (tx) => {
            const existingChapter = await tx.storyChapter.findFirst({
                where: { lessonId }
            });

            if (existingChapter) {
                return await tx.storyChapter.update({
                    where: { id: existingChapter.id },
                    data: {
                        teacherSnippetText: text,
                        teacherSnippetImageUrl: imageUrl,
                        teacherSnippetImagePrompt: prompt,
                        teacherSnippetStatus: 'APPROVED',
                        updatedAt: new Date()
                    }
                });
            } else {
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
        if (req.file) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('Error cleaning up uploaded file:', err);
            });
        }
        console.error('Error in approveStorySnippetWithUploadHandler:', error);
        throw new AppError('Failed to approve story snippet with upload. Please try again later.', 500);
    }
};