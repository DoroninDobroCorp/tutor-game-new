import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middlewares/error.middleware';
import { generateMathProblem } from '../services/openai.service';

const prisma = new PrismaClient();

export const getStudentProfile = async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const student = await prisma.student.findUnique({
    where: { id: req.user.userId },
    include: {
      goal: true,
      roadmaps: {
        orderBy: { order: 'asc' },
      },
      badges: true,
      stories: {
        orderBy: { chapter: 'asc' },
      },
      images: true,
    },
  });

  if (!student) {
    throw new AppError('Student not found', 404);
  }

  res.json({
    success: true,
    data: student,
  });
};

export const setStudentGoal = async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const { title } = req.body;

  if (!title) {
    throw new AppError('Please provide a goal title', 400);
  }

  const goal = await prisma.goal.upsert({
    where: { studentId: req.user.userId },
    update: { title },
    create: {
      title,
      student: {
        connect: { id: req.user.userId },
      },
    },
  });

  res.json({
    success: true,
    data: goal,
  });
};

export const getRoadmap = async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const roadmaps = await prisma.roadmapEntry.findMany({
    where: { studentId: req.user.userId },
    orderBy: { order: 'asc' },
  });

  res.json({
    success: true,
    data: roadmaps,
  });
};

export const generateMathProblemHandler = async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const { topic, difficulty } = req.query;

  if (!topic || !difficulty) {
    throw new AppError('Please provide topic and difficulty', 400);
  }

  const problem = await generateMathProblem(
    topic as string,
    parseInt(difficulty as string, 10)
  );

  res.json({
    success: true,
    data: problem,
  });
};

export const submitAnswer = async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const { problemId, answer } = req.body;

  if (!problemId || answer === undefined) {
    throw new AppError('Please provide problemId and answer', 400);
  }

  // In a real app, we would validate the answer and update progress
  // For now, we'll just return success
  
  res.json({
    success: true,
    data: {
      correct: true, // This would be determined by your logic
      pointsEarned: 10,
      nextTopic: 'Next math topic',
    },
  });
};
