import { Request, Response } from 'express';
import { Prisma, Student, Teacher, RoadmapEntry, Badge, Story, Role } from '@prisma/client';
import { AppError } from '../middlewares/error.middleware';
import prisma from '../db';

// Extend the Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: string;
      };
      student?: Student & {
        goals?: any[];
        roadmaps?: RoadmapEntry[];
        badges?: Badge[];
        stories?: (Story & { images: any[] })[];
      };
    }
  }
}

type StudentWithRelations = Prisma.StudentGetPayload<{
  include: {
    goals: true;
    roadmaps: true;
    badges: true;
    stories: {
      include: {
        images: true,
      };
    };
  };
}>;

type TeacherWithStudents = Prisma.TeacherGetPayload<{
  include: {
    students: {
      include: {
        goals: true,
        roadmaps: true,
        badges: true,
        stories: {
          include: {
            images: true;
          };
        };
      };
    };
  };
}>;

export const getTeacherDashboard = async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const teacher = await prisma.teacher.findUnique({
    where: { userId: req.user.userId },
    include: {
      students: {
        include: {
          goals: true,
          roadmaps: true,
          badges: true,
          stories: {
            include: {
              images: true,
            } as any,
          },
        },
      },
    },
  }) as any as TeacherWithStudents | null;

  if (!teacher) {
    throw new AppError('Teacher not found', 404);
  }

  res.json({
    success: true,
    data: teacher,
  });
};

export const getStudentProgress = async (req: Request, res: Response) => {
  const { studentId } = req.params;

  try {
    // Student access is already verified by the middleware
    const student = await prisma.student.findUnique({
      where: { userId: studentId },
      include: {
        goals: true,
        roadmaps: {
          orderBy: { order: 'asc' }
        },
        badges: true,
        stories: {
          orderBy: { chapter: 'asc' },
          include: {
            images: true
          }
        }
      }
    });

    if (!student) {
      throw new AppError('Student not found', 404);
    }

    res.json({
      success: true,
      data: student,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new AppError('Database error occurred', 500);
    }
    throw error;
  }
};

export const updateStudentRoadmap = async (req: Request, res: Response) => {
  const { studentId } = req.params;
  const { topics } = req.body;

  if (!Array.isArray(topics)) {
    throw new AppError('Topics must be an array', 400);
  }

  try {
    // Student access is already verified by the middleware
    // Use a transaction for atomic operations
    const result = await prisma.$transaction(async (tx) => {
      // Delete existing roadmap entries
      await tx.roadmapEntry.deleteMany({
        where: { studentId },
      });

      // Create new roadmap entries
      const roadmapEntries = await Promise.all(
        topics.map((topic: string, index: number) =>
          tx.roadmapEntry.create({
            data: {
              topic,
              order: index,
              student: {
                connect: { userId: studentId },
              },
            },
          })
        )
      );

      return roadmapEntries;
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new AppError('Database error occurred', 500);
    }
    throw error;
  }
};

export const connectStudentHandler = async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== 'TEACHER') {
    throw new AppError('Not authorized', 403);
  }

  const { email } = req.body;
  const teacherId = req.user.userId;

  if (!email) {
    throw new AppError('Student email is required', 400);
  }

  try {
    // Find student by email
    const studentUser = await prisma.user.findUnique({
      where: { email: email },
      include: { student: true },
    });

    if (!studentUser || !studentUser.student) {
      throw new AppError('Student with this email not found', 404);
    }

    // Check if the connection already exists
    const existingConnection = await prisma.teacher.findFirst({
      where: {
        userId: teacherId,
        students: {
          some: {
            userId: studentUser.student.userId
          }
        }
      }
    });

    if (existingConnection) {
      throw new AppError('This student is already connected to you', 400);
    }

    // Add student to teacher's students
    await prisma.teacher.update({
      where: { userId: teacherId },
      data: {
        students: {
          connect: {
            userId: studentUser.student.userId,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      message: 'Student connected successfully',
      data: {
        id: studentUser.id,
        firstName: studentUser.firstName,
        lastName: studentUser.lastName
      }
    });
  } catch (error) {
    console.error('Error connecting student:', error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to connect student', 500);
  }
};

export const getMyStudents = async (req: Request, res: Response) => {
    if (!req.user || req.user.role !== Role.TEACHER) {
        throw new AppError('Not authorized', 403);
    }
    const teacherId = req.user.userId;

    const teacherWithStudents = await prisma.teacher.findUnique({
        where: { userId: teacherId },
        select: {
            students: {
                select: {
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        }
                    }
                }
            }
        }
    });

    if (!teacherWithStudents) {
        throw new AppError('Teacher profile not found', 404);
    }

    // "Unwrap" the data for easier consumption
    const students = teacherWithStudents.students.map(s => s.user);

    res.json({
        success: true,
        data: students,
    });
};

export const assignBadge = async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const { studentId } = req.params;
  const { title } = req.body;

  if (!title) {
    throw new AppError('Please provide a badge title', 400);
  }

  try {
    // Verify the teacher has access to this student
    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.user.userId },
      include: {
        students: {
          where: { userId: studentId } as any,
          include: {
            goals: true,
            roadmaps: true,
            badges: true,
            stories: {
              include: {
                images: true
              } as any
            }
          }
        },
      },
    }) as any;

    if (!teacher || !teacher.students || teacher.students.length === 0) {
      throw new AppError('Student not found or access denied', 404);
    }

    const badge = await prisma.badge.create({
      data: {
        title,
        status: 'EARNED',
        student: {
          connect: { userId: studentId },
        },
      },
    });

    res.json({
      success: true,
      data: badge,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new AppError('Badge with this title already exists for this student', 400);
      }
      throw new AppError('Database error occurred', 500);
    }
    throw error;
  }
};
