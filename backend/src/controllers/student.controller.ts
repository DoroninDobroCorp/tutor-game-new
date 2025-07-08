import { Request, Response } from 'express';
import { AppError } from '../utils/errors';
import prisma from '../db';
import { Lesson } from '@prisma/client';
import { WebSocketService } from '../services/websocket.service';

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
  // 2. Has content status 'APPROVED'
  // 3. Has story chapter status 'APPROVED'
  // 4. Does NOT have status 'COMPLETED'
  const currentLesson = await prisma.lesson.findFirst({
    where: {
      section: {
        learningGoal: {
          studentId: studentId,
        },
      },
      status: 'APPROVED', // The lesson itself must be 'APPROVED'
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
// ... (rest of the code remains the same)

export const submitLessonHandler = async (req: Request, res: Response) => {
    const { lessonId } = req.params;
    const studentId = req.user?.userId;
    const { answers = [], studentResponseText } = req.body;
    
    if (!studentId) throw new AppError('Not authenticated', 401);
    if (!studentResponseText) throw new AppError('Story continuation is required', 400);

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
        // First, get the basic lesson info
        const lesson = await tx.lesson.findUnique({
            where: { id: lessonId },
            select: {
                id: true,
                title: true,
                content: true,
                status: true,
                order: true,
                type: true,
                sectionId: true
            }
        });

        if (!lesson) {
            throw new AppError('Lesson not found', 404);
        }

        // Get the section and learning goal info
        const section = await tx.contentSection.findUnique({
            where: { id: lesson.sectionId },
            select: {
                learningGoal: {
                    select: {
                        id: true,
                        teacherId: true,
                        studentId: true
                    }
                }
            }
        });

        if (!section?.learningGoal) {
            throw new AppError('Learning goal not found', 404);
        }

        const { learningGoal } = section;
        const goalId = learningGoal.id;

        // Get teacher info
        const teacher = await tx.teacher.findUnique({
            where: { userId: learningGoal.teacherId },
            select: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true
                    }
                }
            }
        });

        // Get student info
        const student = await tx.student.findUnique({
            where: { userId: learningGoal.studentId },
            select: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true
                    }
                }
            }
        });

        if (!teacher?.user || !student?.user) {
            throw new AppError('Teacher or student not found', 404);
        }
        
        if (!teacher || !student || !goalId) {
            throw new AppError('Invalid lesson configuration', 400);
        }

        // Save practice answers to log
        if (Array.isArray(answers)) {
            const practiceBlocks = ((lesson.content as any)?.blocks || [])
                .map((block: any, index: number) => ({ ...block, originalIndex: index }))
                .filter((block: any) => block.type === 'practice');

            for (let i = 0; i < answers.length; i++) {
                if (practiceBlocks[i]) {
                    // Using raw SQL to avoid Prisma type issues with mapped fields
                    await tx.$executeRaw`
                        INSERT INTO student_performance_logs (
                            id, 
                            student_id, 
                            lesson_id, 
                            block_index, 
                            block_type, 
                            question, 
                            answer
                        ) VALUES (
                            gen_random_uuid(),
                            ${studentId}::uuid,
                            ${lessonId}::uuid,
                            ${practiceBlocks[i].originalIndex},
                            'practice',
                            ${practiceBlocks[i].content},
                            ${answers[i]}
                        )
                    `;
                }
            }
        }

        // Save student response and update lesson status in a single transaction
        const [_, updatedLesson] = await Promise.all([
            tx.storyChapter.update({
                where: { lessonId },
                data: {
                    studentSnippetText: studentResponseText,
                    studentSnippetStatus: 'SUBMITTED',
                },
            }),
            tx.lesson.update({
                where: { id: lessonId },
                data: { status: 'COMPLETED' },
                select: {
                    id: true,
                    title: true,
                    content: true,
                    status: true,
                    order: true,
                    type: true,
                    sectionId: true
                }
            })
        ]);

        return {
            lesson: updatedLesson,
            teacherId: teacher.user.id,
            studentName: `${student.user.firstName} ${student.user.lastName}`,
            goalId
        };
    });

    // Send WebSocket notification to teacher after successful transaction
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
        // Don't fail the request if WebSocket notification fails
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

    // Verify the goal belongs to this student
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
            // Only select approved teacher snippets
            teacherSnippetStatus: 'APPROVED',
        },
        select: {
            id: true,
            teacherSnippetText: true,
            teacherSnippetImageUrl: true,
            studentSnippetText: true,
            // studentSnippetImageUrl: true, // Uncomment if you generate images for student responses
            lesson: { // Include lesson to get its title
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
