import { Request, Response } from 'express';
import { AppError } from '../utils/errors';
import prisma from '../db';
import { generateImage } from '../services/imagen.service';
import fs from 'fs';
import path from 'path';

export const generateCharacterHandler = async (req: Request, res: Response) => {
    const { goalId } = req.params;
    const { prompt } = req.body;
    const teacherId = req.user?.userId;

    if (!prompt) {
        throw new AppError('Character prompt is required', 400);
    }

    const goal = await prisma.learningGoal.findFirst({
        where: { id: goalId, teacherId },
        select: { 
            id: true,
            subject: true, 
            studentAge: true, 
            setting: true, 
            language: true
        }
    });

    if (!goal) {
        throw new AppError('Learning Goal not found or access denied', 404);
    }
    // 1. Генерация персонажа напрямую через Imagen по промпту пользователя (без Gemini)
    const imagePrompt = typeof prompt === 'string' && prompt.trim().length > 0
        ? prompt.trim()
        : 'Character image';
    const characterPromptForDb = imagePrompt;
    console.log('[IMAGEN] Generating character (direct) with user prompt:', imagePrompt);
    const imageBuffer = await generateImage(imagePrompt);

    // 3. Save the generated image to a file
    const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
    await fs.promises.mkdir(uploadsDir, { recursive: true });
    const filename = `character-${goal.id}-${Date.now()}.png`;
    const filepath = path.join(uploadsDir, filename);
    await fs.promises.writeFile(filepath, imageBuffer);
    const publicImageUrl = `/uploads/${filename}`;
    
    // 4. Save character details to the database
    const updatedGoal = await prisma.learningGoal.update({
        where: { id: goalId },
        data: {
            characterPrompt: characterPromptForDb,
            characterImageUrl: publicImageUrl,
        },
        include: {
            student: true,
            teacher: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true
                }
            }
        }
    });

    res.json({ 
        success: true, 
        data: updatedGoal 
    });
};

export const uploadCharacterImageHandler = async (req: Request, res: Response) => {
    const { goalId } = req.params;
    const teacherId = req.user?.userId;
    const file = req.file;

    if (!file) {
        throw new AppError('Image file is required', 400);
    }

    try {
        const goal = await prisma.learningGoal.findFirst({
            where: { id: goalId, teacherId },
        });

        if (!goal) {
            throw new AppError('Learning Goal not found or access denied', 404);
        }

        // Form the web-accessible path for display
        const displayImageUrl = `/uploads/${file.filename}`;

        // Update the database record with only the local file path
        const updatedGoal = await prisma.learningGoal.update({
            where: { id: goalId },
            data: {
                characterImageUrl: displayImageUrl,
                characterPrompt: req.body.prompt || 'Uploaded character image',
            }
        });

        res.json({
            success: true,
            data: updatedGoal
        });
    } catch (error) {
        if (file && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }
        throw error;
    }
};

export const updateCharacterPromptHandler = async (req: Request, res: Response) => {
    const { goalId } = req.params;
    const { prompt } = req.body;
    const teacherId = req.user?.userId;

    if (!prompt) {
        throw new AppError('Character prompt is required', 400);
    }

    const goal = await prisma.learningGoal.findFirst({
        where: { id: goalId, teacherId },
        select: { id: true }
    });

    if (!goal) {
        throw new AppError('Learning Goal not found or access denied', 404);
    }

    const updatedGoal = await prisma.learningGoal.update({
        where: { id: goalId },
        data: {
            characterPrompt: prompt,
        },
        include: {
            student: true,
            teacher: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true
                }
            }
        }
    });

    res.json({
        success: true,
        data: updatedGoal
    });
};