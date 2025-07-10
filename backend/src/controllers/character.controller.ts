import { Request, Response } from 'express';
import { AppError } from '../utils/errors';
import prisma from '../db';
import { generateCharacter } from '../services/openai.service';
import { startImageGeneration, getGenerationResult, uploadImageToLeonardo } from '../services/leonardo.service';
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
            language: true,
            illustrationStyle: true
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
        presetStyle: goal.illustrationStyle as 'ILLUSTRATION' | 'ANIME' | undefined,
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
                characterImageId: null, // We'll upload to Leonardo when needed
                characterPrompt: req.body.prompt || 'Uploaded character image',
                characterGenId: null, // Reset generation ID since this is an upload
            }
        });

        // Keep the file for future use
        // fs.unlinkSync(file.path); // <--- Don't delete the file, we need it for future generations

        res.json({
            success: true,
            data: updatedGoal
        });
    } catch (error) {
        // Clean up the uploaded file if there's an error
        if (file && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }
        // Re-throw the error to be handled by the global error handler
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
