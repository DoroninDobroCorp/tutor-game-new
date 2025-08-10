import { Request, Response, NextFunction } from "express";
import { Student } from "@prisma/client";
import prisma from "../db";
import { AppError } from "../utils/errors";

declare global {
  namespace Express {
    interface Request {
      student?: Student;
    }
  }
}

export const checkStudentAccess = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { studentId } = req.params;
  const teacherId = req.user?.userId;

  if (!studentId || !teacherId) {
    return next(new AppError("Missing student or teacher ID", 400));
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
    return next(new AppError("Student not found or access denied", 404));
  }

  // Attach student to request for later use in controllers
  req.student = student;
  next();
};
