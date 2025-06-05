import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middlewares/error.middleware';
import { generateStory } from '../services/openai.service';
import { generateStoryImage } from '../services/leonardo.service';

const prisma = new PrismaClient();

export const generateNewStory = async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const { prompt, style = 'fantasy' } = req.body;

  if (!prompt) {
    throw new AppError('Please provide a prompt for the story', 400);
  }

  // Get student's level (simplified - in a real app, this would be calculated based on progress)
  const student = await prisma.student.findUnique({
    where: { id: req.user.userId },
  });

  if (!student) {
    throw new AppError('Student not found', 404);
  }

  const studentLevel = 5; // Default level, in a real app this would be calculated

  // Generate story using OpenAI
  const storyText = await generateStory(prompt, studentLevel);

  // Save story to database
  const story = await prisma.story.create({
    data: {
      chapter: 1, // For the first chapter
      text: storyText,
      prompt,
      student: {
        connect: { id: req.user.userId },
      },
    },
  });

  // Generate image for the story
  const image = await generateStoryImage(storyText, style);

  // Save image to database
  await prisma.generatedImage.create({
    data: {
      id: image.generationId,
      url: image.url,
      prompt: `Illustration for story: ${prompt.substring(0, 200)}`,
      storyId: story.id,
      student: {
        connect: { id: req.user.userId },
      },
    },
  });

  // Update story with the first image
  const updatedStory = await prisma.story.update({
    where: { id: story.id },
    include: {
      images: true,
    },
  });

  res.json({
    success: true,
    data: updatedStory,
  });
};

export const continueStory = async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const { storyId, userInput } = req.body;

  if (!storyId || !userInput) {
    throw new AppError('Please provide storyId and userInput', 400);
  }

  // Get the existing story
  const existingStory = await prisma.story.findUnique({
    where: { id: storyId },
    include: { student: true },
  });

  if (!existingStory) {
    throw new AppError('Story not found', 404);
  }

  // Verify the story belongs to the current user
  if (existingStory.studentId !== req.user.userId) {
    throw new AppError('Access denied', 403);
  }

  // Generate continuation using OpenAI
  const continuationPrompt = `Previous story: ${existingStory.text}\n\nUser input: ${userInput}\n\nContinue the story:`;
  const continuation = await generateStory(continuationPrompt, 5); // Using default level for continuation

  // Create a new story chapter
  const newChapter = await prisma.story.create({
    data: {
      chapter: existingStory.chapter + 1,
      text: continuation,
      prompt: `Continuation of chapter ${existingStory.chapter} based on: ${userInput}`,
      student: {
        connect: { id: req.user.userId },
      },
    },
  });

  // Generate image for the new chapter
  const image = await generateStoryImage(continuation, 'fantasy');

  // Save image to database
  await prisma.generatedImage.create({
    data: {
      id: image.generationId,
      url: image.url,
      prompt: `Illustration for chapter ${newChapter.chapter}`,
      storyId: newChapter.id,
      student: {
        connect: { id: req.user.userId },
      },
    },
  });

  // Get the updated story with images
  const updatedStory = await prisma.story.findUnique({
    where: { id: newChapter.id },
    include: {
      images: true,
    },
  });

  res.json({
    success: true,
    data: updatedStory,
  });
};

export const generateImageForStory = async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const { storyId, prompt, style = 'fantasy' } = req.body;

  if (!storyId || !prompt) {
    throw new AppError('Please provide storyId and prompt', 400);
  }

  // Verify the story exists and belongs to the current user
  const story = await prisma.story.findUnique({
    where: { id: storyId },
    include: { student: true },
  });

  if (!story) {
    throw new AppError('Story not found', 404);
  }

  if (story.studentId !== req.user.userId) {
    throw new AppError('Access denied', 403);
  }

  // Generate image using Leonardo
  const image = await generateStoryImage(`${story.text}\n\nSpecific scene: ${prompt}`, style);

  // Save image to database
  const savedImage = await prisma.generatedImage.create({
    data: {
      id: image.generationId,
      url: image.url,
      prompt: `Custom illustration for story: ${prompt.substring(0, 200)}`,
      storyId: story.id,
      student: {
        connect: { id: req.user.userId },
      },
    },
  });

  res.json({
    success: true,
    data: savedImage,
  });
};
