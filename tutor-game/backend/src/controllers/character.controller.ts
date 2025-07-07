import { Request, Response } from 'express';
import { AppError } from '../utils/errors';
import prisma from '../db';
import { generateCharacter } from '../services/openai.service';
import { startImageGeneration, getGenerationResult } from '../services/leonardo.service';
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

    // Start the image generation process
    const { generationId } = await startImageGeneration({
        prompt: imagePrompt,
    });
    
    console.log('[LEONARDO.AI] Started image generation with ID:', generationId);
    
    // Poll for the result (with a reasonable timeout)
    const maxAttempts = 30; // 30 attempts * 2 seconds = 1 minute max wait
    let attempts = 0;
    let imageResult;
    
    while (attempts < maxAttempts) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between checks
        
        imageResult = await getGenerationResult(generationId);
        
        if (imageResult.status === 'COMPLETE' && imageResult.url) {
            console.log('[LEONARDO.AI] Image generation completed successfully');
            break;
        } else if (imageResult.status === 'FAILED') {
            throw new AppError("Failed to generate character image from Leonardo.", 500);
        }
        
        console.log(`[LEONARDO.AI] Image generation in progress (attempt ${attempts}/${maxAttempts})`);
    }
    
    if (!imageResult?.url) {
        throw new AppError("Image generation timed out. Please try again.", 504);
    }

    // Save the character data
    const updatedGoal = await prisma.learningGoal.update({
        where: { id: goalId },
        data: {
            characterPrompt: `${characterDetails.name} - ${characterDetails.description}`,
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
