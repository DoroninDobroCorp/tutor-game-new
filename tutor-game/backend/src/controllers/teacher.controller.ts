import { Request, Response } from 'express';
import { Prisma, Student, Teacher, RoadmapEntry, Badge, Story } from '@prisma/client';
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
