import { Request as ExpressRequest, Response } from 'express';
import prisma from '../db';
import { classifyKnowledgeLevelLLM, generateDiagnosticTopics } from '../services/gemini.service';
import { classifyKnowledgeLevel as classifyKnowledgeLevelAI, generateFollowupsForTopics } from '../services/ai.service';
import { LessonType } from '@prisma/client';
import { AppError } from '../utils/errors';

interface Request extends ExpressRequest {
  user?: { userId: string; role: string };
}

// Phase 1: submit first answers for all topics, generate follow-ups in batch
export const submitFirstAnswersHandler = async (req: Request, res: Response) => {
  const studentId = req.user?.userId;
  const { sessionId } = req.params as { sessionId: string };
  const { answers } = (req.body || {}) as { answers?: Array<{ topicId: string; answer: string }>; };
  if (!studentId) throw new AppError('Not authenticated', 401);
  if (!Array.isArray(answers) || answers.length === 0) throw new AppError('answers[] required', 400);

  const session = await prisma.diagnosticSession.findFirst({
    where: { id: sessionId, studentId },
    include: { goal: true },
  });
  if (!session) throw new AppError('Session not found', 404);
  if (session.status !== 'ACTIVE') throw new AppError('Session already finished', 400);

  const topics = await prisma.topic.findMany({ where: { learningGoalId: session.goalId } });
  const topicsById = new Map(topics.map(t => [t.id, t] as const));

  // Save initial turns with AI labels
  const turnsToCreate: any[] = [];
  for (const a of answers) {
    const topic = topicsById.get(a.topicId);
    if (!topic) continue;
    const fq = (topic as any).firstQuestion || 'Первый вопрос';
    const label = await classifyKnowledgeLevelAI({ topicTitle: topic.title, questionText: fq, answer: a.answer });
    turnsToCreate.push({ sessionId, topicId: topic.id, questionText: fq, studentAnswer: a.answer, aiLabel: label });
  }
  if (turnsToCreate.length) {
    await prisma.diagnosticTurn.createMany({ data: turnsToCreate });
  }

  // Generate follow-ups for non-excellent
  const nonExcellent = turnsToCreate.filter(t => t.aiLabel !== 'EXCELLENT');
  let followups: Array<{ topicId: string; questions: string[] }> = [];
  if (nonExcellent.length) {
    const aiInput = nonExcellent.map(t => ({
      topicTitle: topicsById.get(t.topicId)!.title,
      firstQuestion: (topicsById.get(t.topicId) as any)!.firstQuestion || null,
      firstAnswer: t.studentAnswer,
      language: session.goal.language || 'Russian',
      maxQuestions: 2,
    }));
    const aiGenerated = await generateFollowupsForTopics(aiInput);
    // Map back to topicIds
    const titleToId = new Map(topics.map(t => [t.title, t.id] as const));
    followups = aiGenerated.map(item => ({ topicId: titleToId.get(item.topicTitle) || '', questions: item.questions })).filter(f => f.topicId && f.questions.length > 0);
  }

  res.json({ success: true, data: { followups } });
};

// Phase 2: submit follow-up answers and finish with summary
export const submitFollowupAnswersHandler = async (req: Request, res: Response) => {
  const studentId = req.user?.userId;
  const { sessionId } = req.params as { sessionId: string };
  const { items } = (req.body || {}) as { items?: Array<{ topicId: string; qa: Array<{ question: string; answer: string }> }>; };
  if (!studentId) throw new AppError('Not authenticated', 401);
  if (!Array.isArray(items)) throw new AppError('items[] required', 400);

  const session = await prisma.diagnosticSession.findFirst({
    where: { id: sessionId, studentId },
    include: { goal: true },
  });
  if (!session) throw new AppError('Session not found', 404);
  if (session.status !== 'ACTIVE') throw new AppError('Session already finished', 400);

  const topics = await prisma.topic.findMany({ where: { learningGoalId: session.goalId } });
  const topicsById = new Map(topics.map(t => [t.id, t] as const));

  // Save follow-up turns with AI labels
  for (const it of items) {
    const topic = topicsById.get(it.topicId);
    if (!topic) continue;
    for (const qa of it.qa || []) {
      const label = await classifyKnowledgeLevelAI({ topicTitle: topic.title, questionText: qa.question, answer: qa.answer });
      await prisma.diagnosticTurn.create({
        data: {
          sessionId,
          topicId: topic.id,
          questionText: qa.question,
          studentAnswer: qa.answer,
          aiLabel: label,
        }
      });
    }
  }

  // Mark session finished
  await prisma.diagnosticSession.update({ where: { id: sessionId }, data: { status: 'FINISHED' } });

  // Build summary and suggested roadmap (same logic as finish handler)
  const turns = await prisma.diagnosticTurn.findMany({ where: { sessionId }, orderBy: { createdAt: 'asc' }, include: { topic: true } });
  const summary = {
    total: turns.length,
    labels: {
      EXCELLENT: turns.filter(t => t.aiLabel === 'EXCELLENT').length,
      REFRESH: turns.filter(t => t.aiLabel === 'REFRESH').length,
      UNKNOWN: turns.filter(t => t.aiLabel === 'UNKNOWN').length,
    },
  };
  const excellent = turns.filter(t => t.aiLabel === 'EXCELLENT' && t.topic);
  const refresh = turns.filter(t => t.aiLabel === 'REFRESH' && t.topic);
  const unknown = turns.filter(t => t.aiLabel === 'UNKNOWN' && t.topic);
  const suggestedRoadmap = [
    unknown.length ? { sectionTitle: 'Основы', lessons: unknown.map(t => t.topic?.title || 'Тема') } : null,
    refresh.length ? { sectionTitle: 'Повторение', lessons: refresh.map(t => t.topic?.title || 'Тема') } : null,
    excellent.length ? { sectionTitle: 'Продвинутое', lessons: excellent.map(t => `${t.topic?.title || 'Тема'} — продвинутые задания`) } : null,
  ].filter(Boolean);

  res.json({ success: true, data: { finished: true, summary, suggestedRoadmap } });
};

// Helper: fetch topics ordered for a goal
const getGoalTopics = async (goalId: string) => {
  return prisma.topic.findMany({ where: { learningGoalId: goalId }, orderBy: { createdAt: 'asc' } });
};

export const startDiagnosticHandler = async (req: Request, res: Response) => {
  const studentId = req.user?.userId;
  const { goalId } = req.body as { goalId?: string };
  if (!studentId) throw new AppError('Not authenticated', 401);
  if (!goalId) throw new AppError('goalId is required', 400);

  // Ensure goal belongs to student
  const goal = await prisma.learningGoal.findFirst({ where: { id: goalId, studentId }, select: { id: true } });
  if (!goal) throw new AppError('Goal not found or access denied', 404);

  let topics = await getGoalTopics(goalId);
  if (topics.length === 0) {
    // Fallback: try to backfill topics from DIAGNOSTIC lesson content
    const diagLesson = await prisma.lesson.findFirst({
      where: {
        type: LessonType.DIAGNOSTIC,
        section: { learningGoalId: goalId },
      },
      select: { content: true },
    });
    const contentTopics: string[] | undefined = (diagLesson?.content as any)?.topics;
    const cleaned = Array.isArray(contentTopics)
      ? contentTopics.map((t) => (t || '').trim()).filter(Boolean)
      : [];

    if (cleaned.length > 0) {
      await prisma.topic.createMany({
        data: cleaned.map((title) => ({ title, description: null, learningGoalId: goalId })),
        skipDuplicates: true,
      });
      topics = await getGoalTopics(goalId);
    }

    if (topics.length === 0) {
      throw new AppError('Темы не заданы учителем для этой цели', 400);
    }
  }

  // Resume existing ACTIVE session if any
  let session = await prisma.diagnosticSession.findFirst({
    where: { goalId, studentId, status: 'ACTIVE' },
  });

  if (!session) {
    session = await prisma.diagnosticSession.create({
      data: { goalId, studentId, status: 'ACTIVE', currentIdx: 0 },
    });
  }

  // Simple intro + disclaimer
  const intro = 'Ты входишь в новое приключение! Сейчас мы коротко поговорим по важным темам, чтобы понять, что ты уже знаешь. Готов?';
  const disclaimer = 'Это диагностика. Абсолютно нормально чего-то не знать — главное отвечать честно. Если не уверен – так и пиши.';

  const initialQuestions = topics.map((t) => ({
    topicId: t.id,
    title: t.title,
    firstQuestion: (t as any).firstQuestion || null,
  }));

  res.json({ success: true, data: { sessionId: session.id, intro, disclaimer, totalTopics: topics.length, initialQuestions } });
};

export const getDiagnosticSessionHandler = async (req: Request, res: Response) => {
  const studentId = req.user?.userId;
  const { sessionId } = req.params as { sessionId: string };
  if (!studentId) throw new AppError('Not authenticated', 401);

  const session = await prisma.diagnosticSession.findFirst({
    where: { id: sessionId, studentId },
    include: { turns: { orderBy: { createdAt: 'asc' }, include: { topic: true } }, goal: true },
  });
  if (!session) throw new AppError('Session not found', 404);

  const topics = await getGoalTopics(session.goalId);
  res.json({ success: true, data: { session, totalTopics: topics.length } });
};

export const nextDiagnosticQuestionHandler = async (req: Request, res: Response) => {
  const studentId = req.user?.userId;
  const { sessionId } = req.params as { sessionId: string };
  if (!studentId) throw new AppError('Not authenticated', 401);

  const session = await prisma.diagnosticSession.findFirst({ where: { id: sessionId, studentId } });
  if (!session) throw new AppError('Session not found', 404);
  if (session.status !== 'ACTIVE') throw new AppError('Session already finished', 400);

  const topics = await getGoalTopics(session.goalId);
  if (session.currentIdx >= topics.length) {
    return res.json({ success: true, data: { done: true } });
  }

  const topic = topics[session.currentIdx];
  // Simple question template (AI can be integrated later)
  const question = `Коротко расскажи, что ты знаешь по теме: "${topic.title}". Если не знаешь, так и скажи.`;

  res.json({ success: true, data: { topicId: topic.id, question, index: session.currentIdx, total: topics.length } });
};

export const answerDiagnosticHandler = async (req: Request, res: Response) => {
  const studentId = req.user?.userId;
  const { sessionId } = req.params as { sessionId: string };
  const { topicId, questionText, answer } = req.body as { topicId?: string; questionText?: string; answer?: string };
  if (!studentId) throw new AppError('Not authenticated', 401);
  if (!topicId || !questionText || typeof answer !== 'string') throw new AppError('topicId, questionText, answer are required', 400);

  const session = await prisma.diagnosticSession.findFirst({ where: { id: sessionId, studentId } });
  if (!session) throw new AppError('Session not found', 404);
  if (session.status !== 'ACTIVE') throw new AppError('Session already finished', 400);

  // AI classification via existing Vertex AI Gemini service (with internal fallback)
  const aiLabel = await classifyKnowledgeLevelLLM({ topicTitle: (await prisma.topic.findUnique({ where: { id: topicId }, select: { title: true } }))?.title || 'Тема', questionText, answer });

  const turn = await prisma.diagnosticTurn.create({
    data: {
      sessionId: session.id,
      topicId,
      questionText,
      studentAnswer: answer,
      aiLabel,
    },
  });

  // Move pointer to next topic if current matches
  const topics = await getGoalTopics(session.goalId);
  const nextIdx = Math.min(session.currentIdx + 1, topics.length);
  await prisma.diagnosticSession.update({ where: { id: session.id }, data: { currentIdx: nextIdx } });

  res.json({ success: true, data: { turn } });
};

export const finishDiagnosticHandler = async (req: Request, res: Response) => {
  const studentId = req.user?.userId;
  const { sessionId } = req.params as { sessionId: string };
  if (!studentId) throw new AppError('Not authenticated', 401);

  const session = await prisma.diagnosticSession.findFirst({ where: { id: sessionId, studentId } });
  if (!session) throw new AppError('Session not found', 404);

  if (session.status !== 'FINISHED') {
    await prisma.diagnosticSession.update({ where: { id: session.id }, data: { status: 'FINISHED' } });
  }

  // Build summary and simple suggested roadmap based on turns
  const turns = await prisma.diagnosticTurn.findMany({
    where: { sessionId: session.id },
    orderBy: { createdAt: 'asc' },
    include: { topic: true },
  });

  const summary = {
    total: turns.length,
    labels: {
      EXCELLENT: turns.filter(t => t.aiLabel === 'EXCELLENT').length,
      REFRESH: turns.filter(t => t.aiLabel === 'REFRESH').length,
      UNKNOWN: turns.filter(t => t.aiLabel === 'UNKNOWN').length,
    },
  };

  // Group topics by label and propose simple sections
  const excellent = turns.filter(t => t.aiLabel === 'EXCELLENT' && t.topic);
  const refresh = turns.filter(t => t.aiLabel === 'REFRESH' && t.topic);
  const unknown = turns.filter(t => t.aiLabel === 'UNKNOWN' && t.topic);

  const suggestedRoadmap = [
    unknown.length
      ? {
          sectionTitle: 'Основы',
          lessons: unknown.map(t => t.topic?.title || 'Тема'),
        }
      : null,
    refresh.length
      ? {
          sectionTitle: 'Повторение',
          lessons: refresh.map(t => t.topic?.title || 'Тема'),
        }
      : null,
    excellent.length
      ? {
          sectionTitle: 'Продвинутое',
          lessons: excellent.map(t => `${t.topic?.title || 'Тема'} — продвинутые задания`),
        }
      : null,
  ].filter(Boolean);

  res.json({ success: true, data: { finished: true, summary, suggestedRoadmap } });
};

// Teacher: latest finished diagnostic summary for a goal
export const getLatestDiagnosticSummaryForGoalTeacherHandler = async (req: Request, res: Response) => {
  const teacherId = req.user?.userId;
  const { goalId } = req.params as { goalId: string };
  if (!teacherId) throw new AppError('Not authenticated', 401);

  // Ensure teacher owns the goal
  const goal = await prisma.learningGoal.findFirst({ where: { id: goalId, teacherId }, select: { id: true } });
  if (!goal) throw new AppError('Goal not found or access denied', 404);

  // Latest finished session for this goal (there is exactly one student per goal)
  const latest = await prisma.diagnosticSession.findFirst({
    where: { goalId, status: 'FINISHED' },
    orderBy: { updatedAt: 'desc' },
  });
  if (!latest) return res.json({ success: true, data: { exists: false } });

  const turns = await prisma.diagnosticTurn.findMany({
    where: { sessionId: latest.id },
    orderBy: { createdAt: 'asc' },
    include: { topic: true },
  });

  const summary = {
    total: turns.length,
    labels: {
      EXCELLENT: turns.filter(t => t.aiLabel === 'EXCELLENT').length,
      REFRESH: turns.filter(t => t.aiLabel === 'REFRESH').length,
      UNKNOWN: turns.filter(t => t.aiLabel === 'UNKNOWN').length,
    },
  };

  const excellent = turns.filter(t => t.aiLabel === 'EXCELLENT' && t.topic);
  const refresh = turns.filter(t => t.aiLabel === 'REFRESH' && t.topic);
  const unknown = turns.filter(t => t.aiLabel === 'UNKNOWN' && t.topic);

  const suggestedRoadmap = [
    unknown.length
      ? { sectionTitle: 'Основы', lessons: unknown.map(t => t.topic?.title || 'Тема') }
      : null,
    refresh.length
      ? { sectionTitle: 'Повторение', lessons: refresh.map(t => t.topic?.title || 'Тема') }
      : null,
    excellent.length
      ? { sectionTitle: 'Продвинутое', lessons: excellent.map(t => `${t.topic?.title || 'Тема'} — продвинутые задания`) }
      : null,
  ].filter(Boolean);

  res.json({ success: true, data: { exists: true, summary, suggestedRoadmap } });
};

// Teacher: AI-generate diagnostic topics for a goal using Gemini
export const generateDiagnosticTopicsForGoalTeacherHandler = async (req: Request, res: Response) => {
  const teacherId = req.user?.userId;
  const { goalId } = req.params as { goalId: string };
  const { teacherNote } = (req.body || {}) as { teacherNote?: string };
  if (!teacherId) throw new AppError('Not authenticated', 401);

  const goal = await prisma.learningGoal.findFirst({
    where: { id: goalId, teacherId },
    select: { subject: true, studentAge: true, language: true },
  });
  if (!goal) throw new AppError('Goal not found or access denied', 404);

  const { topics } = await generateDiagnosticTopics(goal.subject, goal.studentAge, goal.language || 'Russian', teacherNote);
  res.json({ success: true, data: { topics } });
};
