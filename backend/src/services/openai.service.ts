//---------------------------------------------------------------
// openai-service.ts
// Сервис работы с OpenAI: генерация задач, уроков, историй и т.д.
// Переписан 13 июля 2025 г. — улучшена логика рассуждений,
// добавлена двух‑шаговая проверка ответов ученика.
//---------------------------------------------------------------
import OpenAI from 'openai';
import { config } from '../config/env';

//--- инициализация клиента -------------------------------------
const openai = new OpenAI({ apiKey: config.openaiApiKey });

//--- Вспомогательные константы ---------------------------------
const TEMP_LOW = 0.2;    // для «строгой» проверочной логики
const TEMP_MID = 0.45;   // для дружелюбного ответа / креатива
const TEMP_HIGH = 0.85;  // для историй и творчества

//----------------------------------------------------------------
// 1.  Генерация одной математической задачи
//----------------------------------------------------------------
export const generateMathProblem = async (
  topic: string,
  difficulty: number,
) => {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-latest',
      temperature: 0.5,
      messages: [
        {
          role: 'system',
          content: `Create a math problem about ${topic} with difficulty ${difficulty}/10. 
Format the response strictly as JSON with keys:
{
  "question": "...",
  "options": ["...", "...", "...", "..."],
  "correctAnswer": 0,
  "explanation": "..."
}`,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error('No content received from OpenAI');

    return JSON.parse(raw);
  } catch (err) {
    console.error('Error generating math problem with OpenAI:', err);
    throw new Error('Failed to generate math problem');
  }
};

//----------------------------------------------------------------
// 2.  Генерация содержимого одного урока
//----------------------------------------------------------------
export const generateLessonContent = async (
  lessonTitle: string,
  subject: string,
  studentAge: number,
  setting: string,
  language: string,
  performanceContext?: string,
  chatHistory: { role: 'user' | 'assistant'; content: string }[] = [],
) => {
  // --- system prompt --------------------------------------------------
  let systemMessage = `You are an expert curriculum designer and a creative methodologist for children's education in ${language}.
Your task is to have a conversation with a teacher to create content for a single lesson titled "${lessonTitle}" for a ${studentAge}-year-old student, within the subject of "${subject}".`;

  // ---- правила формата JSON -----------------------------------------
  systemMessage += `
RULES:
1. Respond with ONLY valid JSON:
   {
     "chatResponse": "string",
     "blocks": [ { "type": "...", "duration": 0, "content": "..." } ]
   }
2. "type" is one of "theory" | "practice" | "youtube".
3. For "youtube" blocks "content" MUST be a full YouTube URL.
4. Be conversational in "chatResponse", but strict with JSON format.
5. The theme "${setting}" is for framing; do not sacrifice pedagogy for it.`;

  // ---- если есть контекст успеваемости, добавляем --------------------
  if (performanceContext) {
    systemMessage += `

---
IMPORTANT CONTEXT (student performance):
${performanceContext}
---
First, diagnose which answers were wrong.
If a topic was hard, add more practice/theory.
If mastered, raise difficulty or introduce the next concept.
Explain what you changed in "chatResponse".`;
  }

  // ---- формируем сообщения ------------------------------------------
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemMessage },
  ];

  if (chatHistory.length === 0) {
    messages.push({
      role: 'user',
      content: `Generate the initial lesson content for "${lessonTitle}".`,
    });
  } else {
    messages.push(
      ...chatHistory.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    );
  }

  // ---- запрос -------------------------------------------------------
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-latest',
      messages,
      temperature: 0.45,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error('No content received');

    const data = JSON.parse(raw);
    if (
      !data ||
      typeof data.chatResponse !== 'string' ||
      !Array.isArray(data.blocks)
    ) {
      throw new Error('AI did not return valid { chatResponse, blocks }');
    }

    return data;
  } catch (err) {
    console.error('[generateLessonContent] error:', err);
    throw new Error('Failed to generate lesson content');
  }
};

//----------------------------------------------------------------
// 3.  Генерация сюжетного отрывка
//----------------------------------------------------------------
export const generateStorySnippet = async (
  lessonTitle: string,
  setting: string,
  studentAge: number,
  characterPrompt: string,
  language: string,
  currentLessonNumber: number,
  totalLessons: number,
  refinementPrompt?: string,
  storyContext?: string,
): Promise<{
  storyText: string;
  imagePrompt: string;
  useCharacterReference: boolean;
}> => {
  // --- system prompt --------------------------------------------------
  const systemPrompt = `You are a talented writer of engaging, humorous, and slightly mysterious educational stories for children in ${language}.
You are writing chapter ${currentLessonNumber} of ${totalLessons} for a ${studentAge}-year-old. 
Main character: "${characterPrompt}".
Respond ONLY with valid JSON:
{
  "storyText": "...",
  "imagePrompt": "...",
  "useCharacterReference": true|false
}
Rules:
- storyText = 2‑3 paragraphs, end with open question about next action;
- imagePrompt = 15‑25 English keywords, comma‑separated, describing the scene;
- if useCharacterReference=true, include the main character in prompt; else do not.
- subtle link to lesson topic "${lessonTitle}", no direct tasks.`;

  // --- user prompt ----------------------------------------------------
  let userPrompt = '';
  if (storyContext) {
    userPrompt = `${storyContext}

Continue the story. This is lesson ${currentLessonNumber} of ${totalLessons}.`;
  } else {
    userPrompt = `Lesson Title: "${lessonTitle}"
Story Setting: "${setting}"
Main Character: "${characterPrompt}"
Write the FIRST chapter.`;
  }
  if (refinementPrompt)
    userPrompt += `\n\nTeacher's extra instruction: "${refinementPrompt}"`;

  userPrompt += '\n\nGenerate JSON now.';

  // --- запрос ---------------------------------------------------------
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-latest',
      temperature: TEMP_HIGH,
      response_format: { type: 'json_object' },
      max_tokens: 600,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error('No content from OpenAI');

    const data = JSON.parse(raw);
    if (
      typeof data.storyText !== 'string' ||
      typeof data.imagePrompt !== 'string' ||
      typeof data.useCharacterReference !== 'boolean'
    )
      throw new Error('Invalid JSON structure');

    return data;
  } catch (err) {
    console.error('Error generating story snippet:', err);
    throw new Error('Failed to generate story snippet');
  }
};

//----------------------------------------------------------------
// 4.  Генерация нового персонажа
//----------------------------------------------------------------
export const generateCharacter = async (
  subject: string,
  age: number,
  setting: string,
  basePrompt: string,
  language: string,
): Promise<{ name: string; description: string; imagePrompt: string }> => {
  const systemPrompt = `You are a creative writer for children's educational stories.
The story is about "${subject}" in a "${setting}" setting for a ${age}-year-old.
User idea: "${basePrompt}".
Respond ONLY with JSON:
{
  "name": "...",
  "description": "...",
  "imagePrompt": "..."
}
"imagePrompt" in ENGLISH, comma‑separated keywords.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-latest',
      temperature: 0.55,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Generate character now.' },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error('No content for character');

    return JSON.parse(raw);
  } catch (err) {
    console.error('Error generating character:', err);
    throw new Error('Failed to generate character');
  }
};

//----------------------------------------------------------------
// 5.  ДВУХ‑ШАГОВАЯ ОЦЕНКА ответов ученика
//----------------------------------------------------------------

//---- Шаг 1. Проверяем ответы (строгая логика) ------------------
async function gradeAnswers(
  context: string,
  studentAge: number,
  language: string,
) {
  const { choices } = await openai.chat.completions.create({
    model: 'gpt-4o-latest',
    temperature: TEMP_LOW,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are a meticulous grader. 
FIRST, think step‑by‑step inside <scratchpad></scratchpad>. 
THEN output ONLY JSON:
{
  "analysis": [
    { "task": "...", "studentAnswer": "...", "isCorrect": true|false }
  ],
  "hasErrors": true|false
}`,
      },
      { role: 'user', content: context },
    ],
  });

  const raw = choices[0]?.message?.content;
  if (!raw) throw new Error('[gradeAnswers] Empty response');

  const result = JSON.parse(raw);
  if (
    !result ||
    !Array.isArray(result.analysis) ||
    typeof result.hasErrors !== 'boolean'
  )
    throw new Error('[gradeAnswers] Invalid JSON');

  return result as {
    analysis: { task: string; studentAnswer: string; isCorrect: boolean }[];
    hasErrors: boolean;
  };
}

//---- Шаг 2. Формируем дружелюбный ответ репетитора -------------
async function buildTutorMessage(
  grading: { hasErrors: boolean; analysis: any[] },
  studentAge: number,
  language: string,
) {
  const { choices } = await openai.chat.completions.create({
    model: 'gpt-4o-latest',
    temperature: TEMP_MID,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are a fun, friendly AI tutor for a ${studentAge}-year-old, speaking ${language}.
Input JSON = grading result. 
Rules:
- If hasErrors == false → ONLY praise, "isSessionComplete": true, "newQuestion": null.
- If hasErrors == true  → explain the FIRST error briefly, immediately give ONE similar new question, "isSessionComplete": false.
Respond ONLY with:
{
  "responseText": "...",
  "isSessionComplete": boolean,
  "newQuestion": { "content": "...", "type": "practice" } | null
}`,
      },
      { role: 'user', content: JSON.stringify(grading) },
    ],
  });

  const raw = choices[0]?.message?.content;
  if (!raw) throw new Error('[buildTutorMessage] Empty');

  const data = JSON.parse(raw);
  if (
    typeof data.responseText !== 'string' ||
    typeof data.isSessionComplete !== 'boolean' ||
    (data.newQuestion !== null &&
      (typeof data.newQuestion.content !== 'string' ||
        data.newQuestion.type !== 'practice'))
  )
    throw new Error('[buildTutorMessage] Invalid JSON');

  return data as {
    responseText: string;
    isSessionComplete: boolean;
    newQuestion: { content: string; type: 'practice' } | null;
  };
}

//---- Экспортируемая функция getAIAssessment --------------------
export const getAIAssessment = async (
  lesson: { title: string; content: any },
  studentAnswers: string[],
  studentAge: number,
  language: string,
  chatHistory: { role: 'user' | 'assistant'; content: string }[] = [],
) => {
  // ------------- если первая итерация --------------------------
  if (chatHistory.length === 0) {
    // —‑‑‑ соберём контекст -------------------------------------
    const practiceBlocks: string[] = (lesson.content?.blocks || [])
      .filter((b: any) => b.type === 'practice')
      .map((b: any) => b.content);

    let context = `The student has completed the lesson "${lesson.title}".\nHere are the tasks and answers:\n`;
    practiceBlocks.forEach((q, i) => {
      context += `- Task: "${q}"\n  Answer: "${
        studentAnswers[i] ?? 'No answer'
      }"\n`;
    });

    // —‑‑‑ Шаг 1: строгая проверка ------------------------------
    const grading = await gradeAnswers(context, studentAge, language);

    // —‑‑‑ Шаг 2: дружелюбный ответ -----------------------------
    return await buildTutorMessage(grading, studentAge, language);
  }

  // ------------- если сессия уже идёт --------------------------
  // Передаём историю как есть, но усиливаем «scratchpad» для логики
  const systemPrompt = `You are a friendly AI tutor, continuing practice with the student.
First, think step‑by‑step in <scratchpad></scratchpad>, then output ONLY JSON:
{
  "responseText": "...",
  "isSessionComplete": boolean,
  "newQuestion": { "content": "...", "type": "practice" } | null
}
CRITICAL:
- If you ask a new question, newQuestion MUST be non‑null.
- If you declare session complete, set newQuestion = null.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-latest',
      temperature: TEMP_MID,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        ...chatHistory.map((h) => ({ role: h.role, content: h.content })),
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error('Empty continuation response');

    return JSON.parse(raw);
  } catch (err) {
    console.error('[getAIAssessment] continuation error:', err);
    throw new Error('Failed to get AI assessment');
  }
};

//----------------------------------------------------------------
// 6.  Генерация дорожной карты
//----------------------------------------------------------------
export const generateRoadmap = async (
  subject: string,
  age: number,
  language: string,
  chatHistory: { role: 'user' | 'assistant'; content: string }[] = [],
) => {
  const systemPrompt = `You are a world‑class curriculum designer.
Goal: build a learning plan on "${subject}" for a ${age}-year-old. Respond ONLY with:
{
  "chatResponse": "...",
  "roadmap": [
    { "sectionTitle": "...", "lessons": ["...", "..."] }
  ]
}`;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
  ];

  if (chatHistory.length === 0) {
    messages.push({
      role: 'user',
      content: 'Create the initial complete, sectioned learning plan.',
    });
  } else {
    messages.push(
      ...chatHistory.map((m) => ({ role: m.role, content: m.content })),
    );
  }

  try {
    const { choices } = await openai.chat.completions.create({
      model: 'gpt-4o-latest',
      temperature: 0.45,
      response_format: { type: 'json_object' },
      messages,
    });

    const raw = choices[0]?.message?.content;
    if (!raw) throw new Error('No roadmap content');

    const data = JSON.parse(raw);
    if (
      !data ||
      typeof data.chatResponse !== 'string' ||
      !Array.isArray(data.roadmap)
    )
      throw new Error('Invalid roadmap JSON');

    return data;
  } catch (err) {
    console.error('[generateRoadmap] error:', err);
    throw new Error('Failed to generate roadmap');
  }
};

//----------------------------------------------------------------
// 7.  Краткое резюме истории для напоминания ученику
//----------------------------------------------------------------
export const generateStorySummary = async (
  storyHistory: string,
  language: string,
): Promise<{ summary: string }> => {
  const systemPrompt = `You are an assistant great at summarising stories for children.
Return ONLY JSON: { "summary": "..." } (2‑3 concise sentences in ${language}).`;

  try {
    const { choices } = await openai.chat.completions.create({
      model: 'gpt-4o-latest',
      temperature: 0.35,
      response_format: { type: 'json_object' },
      max_tokens: 250,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: storyHistory },
      ],
    });

    const raw = choices[0]?.message?.content;
    if (!raw) throw new Error('No summary content');

    const data = JSON.parse(raw);
    if (!data || typeof data.summary !== 'string')
      throw new Error('Invalid summary JSON');

    return data;
  } catch (err) {
    console.error('Error generating story summary:', err);
    throw new Error('Failed to generate story summary');
  }
};
