import { GoogleGenerativeAI } from '@google/generative-ai';

export type KnowledgeLabel = 'EXCELLENT' | 'REFRESH' | 'UNKNOWN';

const API_KEY = process.env.GOOGLE_GENAI_API_KEY;
const MODEL = process.env.GOOGLE_GENAI_MODEL || 'gemini-1.5-flash';

function simpleHeuristic(answer: string): KnowledgeLabel {
  const normalized = answer.trim();
  if (normalized.length > 200) return 'EXCELLENT';
  if (normalized.length > 40) return 'REFRESH';
  return 'UNKNOWN';
}

export async function generateFollowupsForTopics(input: Array<{
  topicTitle: string;
  firstQuestion?: string | null;
  firstAnswer: string;
  language?: string;
  maxQuestions?: number;
}>): Promise<Array<{ topicTitle: string; questions: string[] }>> {
  const maxDefault = 2;
  if (!API_KEY) {
    // Fallback: produce up to N short generic follow-ups if the first answer looks weak
    return input.map(({ topicTitle, firstAnswer, maxQuestions }) => {
      const max = Math.min(maxDefault, Math.max(0, maxQuestions || maxDefault));
      const base: string[] = [];
      const len = (firstAnswer || '').trim().length;
      if (len > 200) return { topicTitle, questions: [] };
      if (len > 40) base.push(`Раскрой подробнее ключевые шаги по теме «${topicTitle}».`);
      else base.push(`С чего бы ты начал изучение темы «${topicTitle}»? Назови основные понятия.`);
      if (base.length < max) base.push(`Приведи короткий пример по теме «${topicTitle}».`);
      return { topicTitle, questions: base.slice(0, max) };
    });
  }

  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: MODEL });
    const tasks = input.map(async ({ topicTitle, firstQuestion, firstAnswer, language, maxQuestions }) => {
      const max = Math.min(2, Math.max(0, maxQuestions || 2));
      const prompt = `You are an educational assistant. Given a student's first answer for a topic, generate up to ${max} short follow-up questions in ${language || 'Russian'}. If the answer is excellent and further probing is unnecessary, return zero questions.
Do NOT penalize typos or poor formatting; focus on conceptual understanding. If the answer is empty or very vague, start with the most basic clarifying question.
Topic: ${topicTitle}
First question: ${firstQuestion || '—'}
Student first answer: ${firstAnswer}

Rules:
- 0 questions if answer is clearly excellent and complete.
- Otherwise, 1–2 concise, incremental questions (no explanations, only questions).
- Return as plain list items separated by newlines, no numbering.
`;
      const result = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }] });
      const text = result.response.text().trim();
      const lines = text.split(/\r?\n/).map(s => s.replace(/^[-*\d.\s]+/, '').trim()).filter(Boolean);
      return { topicTitle, questions: lines.slice(0, max) };
    });
    return await Promise.all(tasks);
  } catch {
    // Network/model error → fallback simple
    return input.map(({ topicTitle, firstAnswer, maxQuestions }) => {
      const max = Math.min(maxDefault, Math.max(0, maxQuestions || maxDefault));
      const base: string[] = [];
      const len = (firstAnswer || '').trim().length;
      if (len > 200) return { topicTitle, questions: [] };
      if (len > 40) base.push(`Можешь уточнить ключевые моменты по теме «${topicTitle}»?`);
      else base.push(`Какие основные понятия связаны с темой «${topicTitle}»?`);
      if (base.length < max) base.push(`Приведи простой пример по теме «${topicTitle}».`);
      return { topicTitle, questions: base.slice(0, max) };
    });
  }
}

export async function classifyKnowledgeLevel(params: { topicTitle: string; questionText: string; answer: string }): Promise<KnowledgeLabel> {
  const { topicTitle, questionText, answer } = params;

  // Fallback to heuristic if no key
  if (!API_KEY) return simpleHeuristic(answer);

  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: MODEL });

    const prompt = `You are an educational assistant. Classify the student's knowledge succinctly.
Topic: ${topicTitle}
Question: ${questionText}
Answer: ${answer}

Return only one of the following labels exactly:
- EXCELLENT (clearly knows and explains)
- REFRESH (has partial knowledge, needs refresh)
- UNKNOWN (can't explain or doesn't know)

Output: label only.`;

    const result = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }] });
    const text = result.response.text().trim().toUpperCase();

    if (text.includes('EXCELLENT')) return 'EXCELLENT';
    if (text.includes('REFRESH')) return 'REFRESH';
    if (text.includes('UNKNOWN')) return 'UNKNOWN';

    return simpleHeuristic(answer);
  } catch {
    // Network/model error: fallback
    return simpleHeuristic(answer);
  }
}
