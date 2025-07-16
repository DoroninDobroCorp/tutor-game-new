import { Request, Response } from 'express';
import { Role } from '@prisma/client';
import { AppError } from '../utils/errors';
import prisma from '../db';

// Extend the Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: string;
      };
    }
  }
}

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
    // Find student by email, case-insensitively
    const studentUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
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
