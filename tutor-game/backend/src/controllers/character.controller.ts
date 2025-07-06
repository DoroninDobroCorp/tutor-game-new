import { Request, Response } from 'express';
import { AppError } from '../utils/errors';
import prisma from '../db';
import { generateCharacter } from '../services/openai.service';
import { generateImage } from '../services/leonardo.service';
import fs from 'fs';

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
    
    // Generate character description and name using OpenAI
    const characterDetails = await generateCharacter(
        goal.subject,
        goal.studentAge,
        goal.setting,
        prompt, // Pass the user's prompt as the basePrompt
        goal.language || 'Russian'
    );
    
    // Use the generated image prompt directly from the AI response
    const imagePrompt = characterDetails.imagePrompt;

    // Generate character image using Leonardo
    const imageResult = await generateImage({
        prompt: imagePrompt,
    });
    
    // Log the generated image URL for debugging
    console.log('[LEONARDO.AI] Generated Image URL:', imageResult.url);
    
    if (!imageResult.url) {
        throw new AppError("Failed to generate character image from Leonardo.", 500);
    }

    // Save the character data immediately
    const updatedGoal = await prisma.learningGoal.update({
        where: { id: goalId },
        data: {
            characterPrompt: characterDetails.name + " - " + characterDetails.description,
            characterImageId: imageResult.imageId,
            characterGenId: imageResult.generationId,
            characterImageUrl: imageResult.url,
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

export const approveCharacterHandler = async (req: Request, res: Response) => {
    // This handler is kept for backward compatibility but is no longer used in the flow
    // as characters are now saved immediately during generation
    res.status(200).json({ 
        success: true, 
        message: "Character approval is no longer needed - characters are saved immediately on generation" 
    });
};

export const uploadCharacterImageHandler = async (req: Request, res: Response) => {
    const { goalId } = req.params;
    const teacherId = req.user?.userId;
    const file = req.file;

    if (!file) {
        throw new AppError('Image file is required', 400);
    }

    // Check if the goal exists and belongs to the teacher
    const goal = await prisma.learningGoal.findFirst({
        where: { id: goalId, teacherId },
    });

    if (!goal) {
        // If goal not found, delete the uploaded file to avoid cluttering the disk
        fs.unlinkSync(file.path);
        throw new AppError('Learning Goal not found or access denied', 404);
    }

    // Form the web-accessible path
    const imageUrl = `/uploads/${file.filename}`;

    // Update the database record
    const updatedGoal = await prisma.learningGoal.update({
        where: { id: goalId },
        data: {
            characterImageUrl: imageUrl,
            characterPrompt: req.body.prompt || 'Uploaded image',
            // Reset generation IDs since this is not a generated image
            characterImageId: null, 
            characterGenId: null,
        }
    });

    res.json({
        success: true,
        data: updatedGoal
    });
};
