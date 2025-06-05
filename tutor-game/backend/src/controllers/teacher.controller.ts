import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middlewares/error.middleware';

const prisma = new PrismaClient();

export const getTeacherDashboard = async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const teacher = await prisma.teacher.findUnique({
    where: { id: req.user.userId },
    include: {
      students: {
        include: {
          goal: true,
          roadmaps: true,
          badges: true,
          stories: true,
          images: true,
        },
      },
    },
  });

  if (!teacher) {
    throw new AppError('Teacher not found', 404);
  }

  res.json({
    success: true,
    data: teacher,
  });
};

export const getStudentProgress = async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const { studentId } = req.params;

  // Verify the teacher has access to this student
  const teacher = await prisma.teacher.findUnique({
    where: { id: req.user.userId },
    include: {
      students: {
        where: { id: studentId },
      },
    },
  });

  if (!teacher || teacher.students.length === 0) {
    throw new AppError('Student not found or access denied', 404);
  }

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      goal: true,
      roadmaps: {
        orderBy: { order: 'asc' },
      },
      badges: true,
      stories: {
        orderBy: { chapter: 'asc' },
        include: {
          images: true,
        },
      },
    },
  });

  res.json({
    success: true,
    data: student,
  });
};

export const updateStudentRoadmap = async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const { studentId } = req.params;
  const { topics } = req.body;

  if (!Array.isArray(topics)) {
    throw new AppError('Topics must be an array', 400);
  }

  // Verify the teacher has access to this student
  const teacher = await prisma.teacher.findUnique({
    where: { id: req.user.userId },
    include: {
      students: {
        where: { id: studentId },
      },
    },
  });

  if (!teacher || teacher.students.length === 0) {
    throw new AppError('Student not found or access denied', 404);
  }

  // Delete existing roadmap entries
  await prisma.roadmapEntry.deleteMany({
    where: { studentId },
  });

  // Create new roadmap entries
  const roadmapEntries = await Promise.all(
    topics.map((topic, index) =>
      prisma.roadmapEntry.create({
        data: {
          topic,
          order: index,
          student: {
            connect: { id: studentId },
          },
        },
      })
    )
  );

  res.json({
    success: true,
    data: roadmapEntries,
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

  // Verify the teacher has access to this student
  const teacher = await prisma.teacher.findUnique({
    where: { id: req.user.userId },
    include: {
      students: {
        where: { id: studentId },
      },
    },
  });

  if (!teacher || teacher.students.length === 0) {
    throw new AppError('Student not found or access denied', 404);
  }

  const badge = await prisma.badge.create({
    data: {
      title,
      status: 'EARNED',
      student: {
        connect: { id: studentId },
      },
    },
  });

  res.json({
    success: true,
    data: badge,
  });
};
