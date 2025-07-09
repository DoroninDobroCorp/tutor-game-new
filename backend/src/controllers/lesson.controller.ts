import { Request, Response } from 'express';
import { AppError } from '../utils/errors';
import prisma from '../db';
import { generateLessonContent } from '../services/openai.service';

export const generateLessonContentHandler = async (req: Request, res: Response) => {
    const { lessonId } = req.params;
    const { chatHistory } = req.body;
    const teacherId = req.user?.userId;

    const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: { section: { include: { learningGoal: true } } }
    });

    if (!lesson || lesson.section.learningGoal.teacherId !== teacherId) {
        throw new AppError('Lesson not found or you do not have permission', 404);
    }
    
    const { learningGoal } = lesson.section;
    const { studentId, subject, studentAge, setting, language } = learningGoal;

    const performanceLogs = await prisma.studentPerformanceLog.findMany({
        where: {
            studentId: studentId,
            lesson: { section: { learningGoalId: learningGoal.id } }
        },
        orderBy: { createdAt: 'desc' },
        take: 20
    });

    const performanceContext = performanceLogs.length > 0
        ? "Context on student's previous answers: " + performanceLogs.map(log => {
            let context = '';
            if (log.question) {
                context += `For question: "${log.question}", `
            }
            context += `student answered: "${log.answer}"`;
            if (log.isCorrect !== null && log.isCorrect !== undefined) {
                context += ` (this was ${log.isCorrect ? 'correct' : 'incorrect'})`
            }
            if (log.aiNote) {
                context += `. AI note: "${log.aiNote}"`;
            }
            return context;
        }).join('; ')
        : undefined;
        
    const generatedData = await generateLessonContent(
        lesson.title, subject, studentAge, setting, language || 'Russian', performanceContext, chatHistory
    );
    
    // The 'generatedData' object now contains both 'chatResponse' and 'blocks'
    // We don't save to db, just return the AI's proposal
    res.json({ success: true, data: generatedData });
};

export const updateLessonContentHandler = async (req: Request, res: Response) => {
    const { lessonId } = req.params;
    const { content } = req.body;
    const userId = req.user?.userId;

    if (!content) {
        throw new AppError('Content is required', 400);
    }

    const lessonWithSection = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: { section: { select: { learningGoal: { select: { teacherId: true } } } } }
    });

    if (!lessonWithSection || lessonWithSection.section.learningGoal.teacherId !== userId) {
        throw new AppError('Not authorized to update this lesson', 403);
    }

    const updatedLesson = await prisma.lesson.update({
        where: { id: lessonId },
        data: { content, status: 'PENDING_APPROVAL' },
    });

    res.json({ success: true, data: updatedLesson });
};
