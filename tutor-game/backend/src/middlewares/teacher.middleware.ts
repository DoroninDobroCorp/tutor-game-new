import { Request, Response, NextFunction } from 'express';
import { Student, RoadmapEntry, Badge, Story } from '@prisma/client';
import prisma from '../db';
import { AppError } from '../utils/errors';

type StudentWithRelations = Student & {
  goals?: any[];
  roadmaps?: RoadmapEntry[];
  badges?: Badge[];
  stories?: (Story & { images: any[] })[];
};

declare global {
  namespace Express {
    interface Request {
      student?: StudentWithRelations;
    }
  }
}

export const checkStudentAccess = async (req: Request, res: Response, next: NextFunction) => {
  const { studentId } = req.params;
  const teacherId = req.user?.userId;

  if (!studentId || !teacherId) {
    return next(new AppError('Missing student or teacher ID', 400));
  }

  const student = await prisma.student.findFirst({
    where: {
      userId: studentId,
      teachers: {
        some: {
          userId: teacherId,
        },
      },
    },
  });

  if (!student) {
    return next(new AppError('Student not found or access denied', 404));
  }
  
  // Attach student to request for later use in controllers
  req.student = student as StudentWithRelations;
  next();
};
