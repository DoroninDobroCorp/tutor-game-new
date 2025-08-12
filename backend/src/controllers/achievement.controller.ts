import { Request, Response } from 'express';
import prisma from '../db';
import { AppError, asyncHandler } from '../utils/errors';
import { generateImage } from '../services/imagen.service';
import fs from 'fs';
import path from 'path';

// Get achievements for current student
export const getMyAchievements = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  if (!userId) throw new AppError('Unauthorized', 401);

  const achievements = await prisma.achievement.findMany({
    where: { studentId: userId },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, data: achievements });
});

// Get achievements for a specific student (teacher only)
export const getStudentAchievementsForTeacher = asyncHandler(async (req: Request, res: Response) => {
  const teacherId = (req as any).user?.userId;
  const { studentId } = req.query as { studentId?: string };
  if (!teacherId) throw new AppError('Unauthorized', 401);
  if (!studentId) throw new AppError('studentId is required', 400);

  // Ensure teacher has access to this student via any learning goal
  const hasAccess = await prisma.learningGoal.findFirst({
    where: { teacherId, studentId },
    select: { id: true },
  });
  if (!hasAccess) throw new AppError('Access denied', 403);

  const achievements = await prisma.achievement.findMany({
    where: { studentId },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, data: achievements });
});

// Generate image for achievement (teacher only), without character reference
export const generateAchievementImage = asyncHandler(async (req: Request, res: Response) => {
  const teacherId = (req as any).user?.userId;
  const { prompt, title, reason } = req.body as { prompt?: string; title?: string; reason?: string };
  if (!teacherId) throw new AppError('Unauthorized', 401);
  const effectivePrompt = (prompt && prompt.trim())
    ? prompt
    : `Create a celebratory achievement badge image for a student.
Title: ${title || 'Great Achievement'}.
Reason: ${reason || 'Outstanding performance and effort'}.
Style: colorful, child-friendly, high-contrast, simple iconography, centered composition, no text on the image.`;

  const imageBuffer = await generateImage(effectivePrompt);

  const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
  await fs.promises.mkdir(uploadsDir, { recursive: true });
  const filename = `achievement-${Date.now()}.png`;
  const filepath = path.join(uploadsDir, filename);
  await fs.promises.writeFile(filepath, imageBuffer);
  const publicImageUrl = `/uploads/${filename}`;

  res.json({ success: true, data: { imageUrl: publicImageUrl, prompt: effectivePrompt } });
});

// Create achievement (teacher only)
export const createAchievement = asyncHandler(async (req: Request, res: Response) => {
  const teacherId = (req as any).user?.userId;
  const { studentId, title, reason, imageUrl } = req.body as {
    studentId?: string;
    title?: string;
    reason?: string;
    imageUrl?: string | null;
  };
  if (!teacherId) throw new AppError('Unauthorized', 401);
  if (!studentId || !title || !reason) throw new AppError('studentId, title and reason are required', 400);

  // Check access
  const hasAccess = await prisma.learningGoal.findFirst({ where: { teacherId, studentId }, select: { id: true } });
  if (!hasAccess) throw new AppError('Access denied', 403);

  const achievement = await prisma.achievement.create({
    data: { studentId, teacherId, title, reason, imageUrl: imageUrl || null },
  });

  // Notify student in chat about new achievement
  try {
    // Create a message record from teacher to student
    const content = `🎉 You earned a new achievement: "${title}" — ${reason}`;
    const newMessage = await prisma.message.create({
      data: { content, senderId: teacherId, recipientId: studentId },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    });

    // Emit via WebSocket if student is online
    const wsService = req.app.get('wsService');
    if (wsService && typeof wsService.emitToUser === 'function') {
      const formattedMessage = {
        id: newMessage.id,
        recipientId: newMessage.recipientId,
        senderId: newMessage.senderId,
        senderName: `${newMessage.sender.firstName || ''} ${newMessage.sender.lastName || ''}`.trim(),
        senderRole: newMessage.sender.role.toLowerCase(),
        content: newMessage.content,
        timestamp: newMessage.createdAt.toISOString(),
        read: newMessage.read,
      };
      wsService.emitToUser(studentId, 'message', formattedMessage);
    }
  } catch (err) {
    console.warn('Failed to send WS chat notification about achievement:', err);
  }

  res.status(201).json({ success: true, data: achievement });
});

// Upload custom image for achievement (teacher only)
export const uploadAchievementImage = asyncHandler(async (req: Request & { file?: Express.Multer.File }, res: Response) => {
  const teacherId = (req as any).user?.userId;
  if (!teacherId) throw new AppError('Unauthorized', 401);

  if (!req.file) throw new AppError('No image uploaded', 400);
  // The file is already stored by multer in /uploads via fileUpload util
  const publicImageUrl = `/uploads/${path.basename(req.file.path)}`;
  res.json({ success: true, data: { imageUrl: publicImageUrl } });
});
