import { Request as ExpressRequest, Response } from 'express';
import { AppError } from '../utils/errors';
import prisma from '../db';
import { WebSocketService } from '../services/websocket.service';
import { getAIAssessment } from '../services/openai.service';

// Расширяем Request, чтобы он мог содержать файл
interface Request extends ExpressRequest {
    file?: Express.Multer.File;
    user?: { userId: string; role: string; };
}

export const getStudentProfile = async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }
  const studentUserId = req.user.userId;

  // Fetch user with all related student data in a single query
  const userWithProfile = await prisma.user.findUnique({
    where: { id: studentUserId },
    include: {
      student: true,
      learningGoals: { // Include all learning goals for this student
        include: {
          sections: {
            include: {
              lessons: true,
            },
            orderBy: { order: 'asc' },
          },
          storyChapters: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!userWithProfile || !userWithProfile.student) {
    throw new AppError('Student profile not found', 404);
  }

  // Prepare response data
  const responseData = {
    ...userWithProfile, // Include id, email, firstName, lastName, role
    password: '', // Clear password for security
    learningGoals: userWithProfile.learningGoals,
  };
  delete responseData.password; // Ensure password is not sent to client

  res.json({
    success: true,
    data: responseData,
  });
};

export const getCurrentLessonHandler = async (req: Request, res: Response) => {
  const studentId = req.user?.userId;
  if (!studentId) {
    throw new AppError('Not authenticated', 401);
  }

  // Find the first lesson that:
  // 1. Belongs to the current student (through LearningGoal)
  // 2. Has story chapter status 'APPROVED'
  // 3. Does NOT have status 'COMPLETED'
  const currentLesson = await prisma.lesson.findFirst({
    where: {
      section: {
        learningGoal: {
          studentId: studentId,
        },
      },
      storyChapter: {
        teacherSnippetStatus: 'APPROVED',
      },
      // Exclude completed lessons
      NOT: {
        status: 'COMPLETED'
      }
    },
    orderBy: [
      { section: { order: 'asc' } },
      { order: 'asc' },
    ],
    include: {
      storyChapter: true,
      section: {
        include: {
          learningGoal: true
        }
      }
    },
  });

  if (!currentLesson) {
    return res.status(200).json({
      success: true,
      data: null,
      message: 'No available lessons found. You might have completed everything!' 
    });
  }

  res.json({ success: true, data: currentLesson });
};

export const lessonPracticeChatHandler = async (req: Request, res: Response) => {
    const { lessonId } = req.params;
    const studentId = req.user?.userId;
    const { initialAnswers, chatHistory } = req.body;

    if (!studentId) {
        throw new AppError('Not authenticated', 401);
    }
    if (!initialAnswers && !chatHistory) {
         throw new AppError('Initial answers or chat history is required', 400);
    }

    const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: { section: { include: { learningGoal: true } } }
    });
    
    if (!lesson || lesson.section.learningGoal.studentId !== studentId) {
        throw new AppError('Lesson not found or access denied', 404);
    }

    const aiResponse = await getAIAssessment(
        { title: lesson.title, content: lesson.content },
        initialAnswers || [], // Pass initial answers only on the first call
        lesson.section.learningGoal.studentAge,
        lesson.section.learningGoal.language || 'Russian',
        chatHistory || []
    );

    res.json({ success: true, data: aiResponse });
};

export const endLessonForReviewHandler = async (req: Request, res: Response) => {
    const { lessonId } = req.params;
    const studentId = req.user?.userId;

    if (!studentId) {
        throw new AppError('Not authenticated', 401);
    }

    const transactionResult = await prisma.$transaction(async (tx) => {
        const originalLesson = await tx.lesson.findUnique({
            where: { id: lessonId },
            include: { section: { include: { learningGoal: true }}}
        });

        if (!originalLesson || originalLesson.section.learningGoal.studentId !== studentId) {
            throw new AppError('Lesson not found or access denied', 404);
        }
        
        await tx.lesson.update({
            where: { id: lessonId },
            data: { status: 'COMPLETED' }
        });

        await tx.lesson.updateMany({
            where: {
                sectionId: originalLesson.sectionId,
                order: { gt: originalLesson.order }
            },
            data: { order: { increment: 1 } }
        });

        await tx.lesson.create({
            data: {
                title: `Повторение: ${originalLesson.title}`,
                order: originalLesson.order + 1,
                type: 'PRACTICE',
                status: 'DRAFT',
                sectionId: originalLesson.sectionId,
                content: {
                    blocks: [{
                        type: 'theory',
                        duration: 5,
                        content: `Этот урок создан для повторения темы "${originalLesson.title}". Здесь учитель добавит материалы, чтобы помочь тебе лучше разобраться в сложных моментах.`
                    }]
                }
            }
        });

        return {
            teacherId: originalLesson.section.learningGoal.teacherId,
            goalId: originalLesson.section.learningGoal.id,
            subject: originalLesson.section.learningGoal.subject,
        };
    });

    const studentUser = await prisma.user.findUnique({ where: { id: studentId }});
    const wsService = req.app.get('wsService') as WebSocketService;
    
    wsService.emitToUser(transactionResult.teacherId, 'student_requested_review', {
        goalId: transactionResult.goalId,
        message: `Ученик ${studentUser?.firstName || 'Student'} создал урок для повторения в плане "${transactionResult.subject}"`
    });

    res.json({ success: true, message: 'Lesson ended. A review lesson has been added.' });
}

export const submitLessonHandler = async (req: Request, res: Response) => {
    const { lessonId } = req.params;
    const studentId = req.user?.userId;
    const { studentResponseText } = req.body;
    
    if (!studentId) throw new AppError('Not authenticated', 401);
    if (!studentResponseText) throw new AppError('Story continuation is required', 400);

    const result = await prisma.$transaction(async (tx) => {
        const lesson = await tx.lesson.findUnique({
            where: { id: lessonId },
            include: { 
                section: { 
                    include: { 
                        learningGoal: { 
                            include: {
                                student: { 
                                    select: { 
                                        firstName: true, 
                                        lastName: true 
                                    } 
                                },
                                teacher: { 
                                    select: { 
                                        id: true 
                                    } 
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!lesson || lesson.section.learningGoal.studentId !== studentId) {
            throw new AppError('Lesson not found or access denied', 404);
        }

        const { learningGoal } = lesson.section;

        // Note: Practice answers from the main lesson content are no longer logged here.
        // They are now handled during the AI chat phase.

        const storyUpdateData: {
            studentSnippetText: string;
            studentSnippetStatus: string;
            studentSnippetImageUrl?: string;
        } = {
            studentSnippetText: studentResponseText,
            studentSnippetStatus: 'SUBMITTED',
        };

        if (req.file) {
            storyUpdateData.studentSnippetImageUrl = `/uploads/${req.file.filename}`;
        }

        const [_, updatedLesson] = await Promise.all([
            tx.storyChapter.update({
                where: { lessonId },
                data: storyUpdateData,
            }),
            tx.lesson.update({
                where: { id: lessonId },
                data: { status: 'COMPLETED' },
            })
        ]);

        return {
            lesson: updatedLesson,
            teacherId: learningGoal.teacher.id,
            studentName: `${learningGoal.student.firstName || ''} ${learningGoal.student.lastName || ''}`.trim(),
            goalId: learningGoal.id
        };
    });

    try {
        const wsService = req.app.get('wsService') as WebSocketService;
        if (wsService && result.teacherId) {
            wsService.emitToUser(result.teacherId, 'student_submitted_lesson', {
                message: `Ученик ${result.studentName} отправил ответ на урок`,
                lessonId: result.lesson.id,
                goalId: result.goalId,
                studentName: result.studentName,
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('Failed to send WebSocket notification:', error);
    }

    res.status(200).json({
        success: true,
        data: result.lesson,
    });
};

export const getStoryHistoryHandler = async (req: Request, res: Response) => {
    const studentId = req.user?.userId;
    const { goalId } = req.params;

    if (!studentId) throw new AppError('Not authenticated', 401);
    if (!goalId) throw new AppError('Goal ID is required', 400);

    const goal = await prisma.learningGoal.findFirst({
        where: { id: goalId, studentId },
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
                    order: true
                }
            }
        },
        orderBy: [
            { lesson: { order: 'asc' } }
        ],
    });

    res.json({ success: true, data: storyChapters });
};
