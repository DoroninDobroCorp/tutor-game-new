import { Request, Response } from 'express';
import { AppError } from '../utils/errors';
import prisma from '../db';
import { Lesson } from '@prisma/client';
import { WebSocketService } from '../services/websocket.service';

export const getStudentProfile = async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  // First get the student with basic info
  const student = await prisma.student.findUnique({
    where: { userId: req.user.userId }
  });

  if (!student) {
    throw new AppError('Student not found', 404);
  }

  // Then get related data in separate queries for better type safety
  const [badges, learningGoals] = await Promise.all([
    prisma.badge.findMany({
      where: { studentId: student.userId }
    }),
    prisma.learningGoal.findMany({
      where: { studentId: student.userId },
      include: {
        sections: {
          include: {
            lessons: true
          },
          orderBy: { order: 'asc' }
        },
        storyChapters: true
      }
    })
  ]);

  if (!student) {
    throw new AppError('Student not found', 404);
  }

  // Combine the data
  const studentWithRelations = {
    ...student,
    badges,
    learningGoals
  };

  res.json({
    success: true,
    data: studentWithRelations,
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


