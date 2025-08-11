//---------------------------------------------------------------
// gemini.service.ts
// Сервис работы с Google Gemini (Vertex AI): генерация задач, уроков, историй и т.д.
//---------------------------------------------------------------
import axios from 'axios';
import { GoogleAuth } from 'google-auth-library';
import { config } from '../config/env';
import { AppError } from '../utils/errors';

//--- Вспомогательные константы ---------------------------------
const MODEL_NAME = "gemini-2.5-flash"; // Модель Vertex AI Generative
const TEMP_LOW = 0.2;
const TEMP_MID = 0.45;
const TEMP_HIGH = 0.85;

// Safety настройки для Vertex AI
const safetySettings = [
    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
] as const;

// Конфигурация Vertex AI
const { gcpProjectId, gcpLocation } = config;
if (!gcpProjectId || !gcpLocation) {
  throw new Error('GCP_PROJECT_ID и LOCATION должны быть заданы для работы Gemini через Vertex AI.');
}
const GEMINI_ENDPOINT = `https://${gcpLocation}-aiplatform.googleapis.com/v1/projects/${gcpProjectId}/locations/${gcpLocation}/publishers/google/models/${MODEL_NAME}:generateContent`;

const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });

// Простые типы сообщений для чата
type GeminiRole = 'user' | 'model';
interface GeminiPart { text: string }
interface GeminiContent { role: GeminiRole; parts: GeminiPart[] }

// Аккуратный парсер JSON из произвольного текстового ответа модели
function parseJsonFromText(text: string) {
  // Удаляем возможные markdown-кодовые блоки
  const cleaned = text.replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Пытаемся вытащить первый JSON-объект по скобкам
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      const candidate = cleaned.slice(start, end + 1);
      try {
        return JSON.parse(candidate);
      } catch {
        // Игнор
      }
    }
    throw new Error('Invalid JSON from Gemini');
  }
}

function createGeminiHistory(systemPrompt: string, chatHistory: { role: 'user' | 'assistant'; content: string }[]): GeminiContent[] {
    const history: GeminiContent[] = [];

    // Системный промпт + первый запрос пользователя объединяются в первый элемент истории
    const firstUserMessage = chatHistory.shift();
    const initialPrompt = `${systemPrompt}\n\n${firstUserMessage?.content || ''}`;
    history.push({ role: 'user', parts: [{ text: initialPrompt }] });

    // Остальная история конвертируется в формат user/model
    chatHistory.forEach(msg => {
        history.push({
            role: (msg.role === 'assistant' ? 'model' : 'user') as GeminiRole,
            parts: [{ text: msg.content }]
        });
    });
    return history;
}

async function callGemini(prompt: string, temperature: number, isJson: boolean) {
  try {
    const client = await auth.getClient();
    const token = await client.getAccessToken();

    const body = {
      contents: [ { role: 'user', parts: [ { text: prompt } ] } ],
      safetySettings,
      generationConfig: {
        temperature,
        maxOutputTokens: 24576,
        responseMimeType: isJson ? 'application/json' : 'text/plain',
      },
    };

    const { data } = await axios.post(GEMINI_ENDPOINT, body, {
      headers: { Authorization: `Bearer ${token.token || token}`, 'Content-Type': 'application/json' },
      timeout: 180000,
    });
    const text = (data.candidates?.[0]?.content?.parts || [])
      .map((p: any) => p.text)
      .filter(Boolean)
      .join('');
    if (!text) throw new Error('No content received from Gemini (Vertex)');
    return isJson ? parseJsonFromText(text) : text;
  } catch (err) {
    console.error('Error calling Gemini Vertex API:', (err as any)?.response?.data || err);
    throw new Error('Failed to get response from Gemini');
  }
}

async function callGeminiWithChat(history: GeminiContent[], temperature: number, isJson: boolean) {
  try {
    const client = await auth.getClient();
    const token = await client.getAccessToken();

    if (history.length === 0) throw new Error('Chat history is empty');
    // Отправляем всю историю целиком
    const body = {
      contents: history,
      safetySettings,
      generationConfig: {
        temperature,
        maxOutputTokens: 24576,
        responseMimeType: isJson ? 'application/json' : 'text/plain',
      },
    };

    const { data } = await axios.post(GEMINI_ENDPOINT, body, {
      headers: { Authorization: `Bearer ${token.token || token}`, 'Content-Type': 'application/json' },
      timeout: 180000,
    });
    const text = (data.candidates?.[0]?.content?.parts || [])
      .map((p: any) => p.text)
      .filter(Boolean)
      .join('');
    if (!text) throw new Error('No content received from Gemini (Vertex)');
    return isJson ? parseJsonFromText(text) : text;
  } catch (err) {
    console.error('Error calling Gemini Vertex API (chat):', (err as any)?.response?.data || err);
    throw new Error('Failed to get response from Gemini');
  }
}

//----------------------------------------------------------------
// 1.  Генерация одной математической задачи
//----------------------------------------------------------------
export const generateMathProblem = async (
  topic: string,
  difficulty: number,
) => {
  const prompt = `Create a math problem about ${topic} with difficulty ${difficulty}/10. 
Format the response strictly as JSON with keys:
{
  "question": "...",
  "options": ["...", "...", "...", "..."],
  "correctAnswer": 0,
  "explanation": "..."
}`;
  
  try {
      return await callGemini(prompt, 0.5, true);
  } catch(err) {
      console.error('Error generating math problem with Gemini:', err);
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
  let systemPrompt = `You are an expert curriculum designer and a creative methodologist for children's education in ${language}.
Your task is to have a conversation with a teacher to create content for a single lesson titled "${lessonTitle}" for a ${studentAge}-year-old student, within the subject of "${subject}".`;

  systemPrompt += `
RULES:
1. Respond with ONLY valid JSON:
   {
     "chatResponse": "string",
     "blocks": [ { "type": "...", "duration": 0, "content": "..." } ]
   }
2. "type" is one of "theory" | "practice" | "youtube".
3. For "youtube" blocks "content" MUST be a full YouTube URL.
4. Be conversational in "chatResponse", but strict with JSON format.
5. The theme "${setting}" is for framing; do not sacrifice pedagogy for it.
6. For "theory" and "practice" blocks, use simple HTML tags for formatting in the "content" field. Use <h3> for subheadings, <b> for bold text, <i> for italics, and <p> for paragraphs to ensure correct spacing. Do not use Markdown (e.g., **, ###).`;

  if (performanceContext) {
    systemPrompt += `

---
IMPORTANT CONTEXT (student performance):
${performanceContext}
---
First, diagnose which answers were wrong.
If a topic was hard, add more practice/theory.
If mastered, raise difficulty or introduce the next concept.
Explain what you changed in "chatResponse".`;
  }

  try {
    if (chatHistory.length === 0) {
        const prompt = `${systemPrompt}\n\nGenerate the initial lesson content for "${lessonTitle}".`;
        return await callGemini(prompt, TEMP_MID, true);
    } else {
        const geminiHistory = createGeminiHistory(systemPrompt, chatHistory);
        return await callGeminiWithChat(geminiHistory, TEMP_MID, true);
    }
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
  lessonType: string,
  refinementPrompt?: string,
  storyContext?: string,
): Promise<{
  storyText: string;
  imagePrompt: string;
  useCharacterReference: boolean;
}> => {
  let systemPrompt = `You are a talented writer of engaging, humorous, and slightly mysterious educational stories for children in ${language}.
You are writing chapter ${currentLessonNumber} of ${totalLessons} for a ${studentAge}-year-old. 
Main character: "${characterPrompt}".

Respond ONLY with valid JSON:
{
  "storyText": "...",
  "imagePrompt": "...",
  "useCharacterReference": true|false
}

Rules:
- storyText = 2-3 paragraphs, end with an open question about the next action (UNLESS it is a CONTROL_WORK lesson).
- imagePrompt = a detailed, descriptive prompt in ENGLISH for generating the scene. Single paragraph describing the environment, characters, action, and mood.
- useCharacterReference = true|false. If true, the main character is central to the scene. The "imagePrompt" MUST then include the character reference marker "[1]" where the character should appear. If false, do not include "[1]".
- The story is a reward for completing the lesson on "${lessonTitle}". A direct mention of the lesson topic is not required, the story should primarily continue the adventure.`;
  
  if (lessonType === 'CONTROL_WORK') {
    systemPrompt += `\n- SPECIAL INSTRUCTION: This chapter is for a 'Control Work' lesson. The story must describe a difficult challenge, a final test, or a battle from its beginning to its epic conclusion. The story must be conclusive and NOT end with an open question for the student. The tone should be serious and climactic.`;
  }
  
  let userPrompt = '';
  if (storyContext) {
    userPrompt = `${storyContext}\n\nContinue the story. This is lesson ${currentLessonNumber} of ${totalLessons}.`;
  } else {
    userPrompt = `Lesson Title: "${lessonTitle}"\nStory Setting: "${setting}"\nMain Character: "${characterPrompt}"\nWrite the FIRST chapter.`;
  }
  if (refinementPrompt) userPrompt += `\n\nTeacher's extra instruction: "${refinementPrompt}"`;

  const fullPrompt = `${systemPrompt}\n\n${userPrompt}\n\nGenerate JSON now.`;

  try {
    const data = await callGemini(fullPrompt, TEMP_HIGH, true);
    if (
      typeof data.storyText !== 'string' ||
      typeof data.imagePrompt !== 'string' ||
      typeof data.useCharacterReference !== 'boolean'
    )
      throw new Error('Invalid JSON structure from Gemini');
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
): Promise<{ name: string; description: string; imagePrompt: string; subjectDescription: string; }> => {
  const prompt = `You are a creative writer for children's educational stories.
The story is about "${subject}" in a "${setting}" setting for a ${age}-year-old.
User idea: "${basePrompt}".
Your task is to develop this idea into a character and create a detailed prompt for an image generation AI (like Imagen 3).

Respond ONLY with this JSON format:
{
  "name": "string, a short and memorable name in ${language}",
  "description": "string, a short and engaging character description in ${language}",
  "imagePrompt": "string, a detailed, descriptive prompt in ENGLISH for generating the character. It should be a single paragraph describing appearance, style, and mood. For example: 'Cartoon adult character for a math adventure game; friendly, smart, slightly mysterious. Clean line art, bright colors, neutral background.'",
  "subjectDescription": "string, a short, generic description in ENGLISH of the character type for the AI. For example: 'a friendly cartoon robot', 'an anime-style magical girl', 'a photorealistic brave knight'."
}
Do not use comma-separated keywords for "imagePrompt".`;

  try {
    const data = await callGemini(prompt, 0.55, true);
     if (
      typeof data.name !== 'string' ||
      typeof data.description !== 'string' ||
      typeof data.imagePrompt !== 'string' ||
      typeof data.subjectDescription !== 'string'
    )
      throw new Error('Invalid JSON structure from Gemini for character generation');
    return data;
  } catch (err) {
    console.error('Error generating character:', err);
    throw new Error('Failed to generate character');
  }
};


//----------------------------------------------------------------
// 5.  ДВУХ-ШАГОВАЯ ОЦЕНКА ответов ученика
//----------------------------------------------------------------

async function gradeAnswers(
  context: string,
) {
  const prompt = `You are a meticulous but fair grader. 
Your rules:
1. If the student's answer is conceptually correct but has a minor typo (e.g., 'paralelogram' instead of 'parallelogram'), mark "isCorrect" as true.
2. Analyze each answer independently based on the provided task.

FIRST, think step-by-step about each answer.
THEN output ONLY JSON:
{
  "analysis": [
    { "task": "...", "studentAnswer": "...", "isCorrect": true|false }
  ],
  "hasErrors": true|false
}

Here is the context:
${context}`;
  const result = await callGemini(prompt, TEMP_LOW, true);
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


async function buildTutorMessage(
  grading: { hasErrors: boolean; analysis: any[] },
  studentAge: number,
  language: string,
) {
   const prompt = `You are a fun, friendly AI tutor for a ${studentAge}-year-old, speaking ${language}.
Your goal is to ensure the student masters the topics they got wrong.

The Input JSON shows the initial grading results of the student's first attempt.

RULES:
1. If "hasErrors": false, the student answered everything correctly. ONLY praise them, set "isSessionComplete": true, and "newQuestion": null.
2. If "hasErrors": true, your job is to start the practice session.
3. Identify the **first** topic where "isCorrect": false.
4. Briefly and kindly explain the concept for that first error.
5. **Immediately** provide a new, similar practice question on that same topic. Do not ask for permission, just give the task.
6. Set "isSessionComplete" to false.

Respond ONLY with this valid JSON format:
{
  "responseText": "...", // Your friendly explanation and the new question text
  "isSessionComplete": boolean, // Should be false if hasErrors is true
  "newQuestion": { "content": "string", "type": "practice" } | null
}

Here is the input from the grader:
${JSON.stringify(grading)}
`;
  const data = await callGemini(prompt, TEMP_MID, true);
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

export const getAIAssessment = async (
  lesson: { title: string; content: any },
  studentAnswers: string[],
  studentAge: number,
  language: string,
  chatHistory: { role: 'user' | 'assistant'; content: string }[] = [],
  lessonType?: string,
) => {
    // NEW LOGIC FOR CONTROL WORK
    if (lessonType === 'CONTROL_WORK') {
        if (chatHistory.length > 0) {
            const systemPrompt = `You are a strict but fair AI examiner conducting a control work in ${language} for a ${studentAge}-year-old.
Your task is based on the LAST user message in the chat history:
1.  **If the last message is an ANSWER to a question**: Evaluate if it's correct.
    - If CORRECT: Respond with \`"isCorrect": true\`, \`"responseText": "Верно."\`, and \`"newQuestion": null\`.
    - If INCORRECT: Explain the error briefly, and create a NEW, similar question on the same topic. Respond with \`"isCorrect": false\`, your explanation in \`"responseText"\`, and the new question object in \`"newQuestion"\`.
2.  **If the last message is the exact phrase "GENERATE_NEW_QUESTION_ON_FAILED_TOPIC"**: This is a command. Analyze the entire chat history, find a topic where the student struggled, and generate a new practice question on that topic. Respond with \`"isCorrect": true\`, \`"responseText": "Вот новое задание."\`, and the new question in \`"newQuestion"\`.
3.  Respond ONLY with this valid JSON format:
    {
      "responseText": "...",
      "isCorrect": boolean,
      "isSessionComplete": false,
      "newQuestion": { "content": "string", "type": "practice" } | null
    }
`;
            const geminiHistory = createGeminiHistory(systemPrompt, chatHistory);
            try {
                return await callGeminiWithChat(geminiHistory, TEMP_LOW, true);
            } catch (err) {
                console.error('[getAIAssessment] control work error:', err);
                throw new Error('Failed to get AI assessment for control work');
            }
        }
        throw new AppError('Control work assessment requires a chat history.', 400);
    }
    
  // --- EXISTING LOGIC FOR REGULAR LESSONS ---
  if (chatHistory.length === 0) {
    const practiceBlocks: string[] = (lesson.content?.blocks || [])
      .filter((b: any) => b.type === 'practice')
      .map((b: any) => b.content);

    let context = `The student has completed the lesson "${lesson.title}".\nHere are the tasks and answers:\n`;
    practiceBlocks.forEach((q, i) => {
      context += `- Task: "${q}"\n  Answer: "${
        studentAnswers[i] ?? 'No answer'
      }"\n`;
    });

    const grading = await gradeAnswers(context);
    return await buildTutorMessage(grading, studentAge, language);
  }

  // Handle follow-up chat
  const systemPrompt = `You are a friendly and encouraging AI tutor, continuing a practice session.
Your goal is to get **two consecutive correct answers** from the student for each topic they struggled with. The chat history contains the original problems, the student's initial answers, and our conversation so far.

YOUR TASK, based on the student's LATEST answer:
1.  **Analyze the Answer**: Is it correct? Be lenient with minor typos.
2.  **If the answer is CORRECT**:
    a. Check the history for this topic. Was the PREVIOUS answer to your question also correct?
    b. If YES (this is the 2nd correct answer in a row): Praise them for mastering the topic! Then, check if there are OTHER topics left that they got wrong in the initial assessment (visible at the start of the chat history).
        - If other topics remain: Move to the NEXT failed topic and provide a new question.
        - If all initially failed topics are mastered: Great! Now, review our follow-up conversation. If the student made any errors on the questions you generated, find the topic of their LAST mistake and ask one more new question on that topic. Only if ALL initially failed topics are mastered AND there are no errors in our follow-up chat, should you congratulate them, set "isSessionComplete": true, and set "newQuestion": null.
    c. If NO (this is the 1st correct answer): Excellent! Praise them and provide ANOTHER, slightly different question on the SAME topic.
3.  **If the answer is INCORRECT**:
    a. The "two consecutive correct answers" counter for this topic is now reset.
    b. Gently explain the mistake.
    c. Provide a new, slightly easier question on the SAME topic to help them try again.
4.  **CRITICAL**: Do NOT ask "Want another one?". Always provide the next question unless "isSessionComplete" is true.

Respond ONLY with this valid JSON format:
{
  "responseText": "...", // Your conversational response including the new question or final praise.
  "isSessionComplete": boolean, // true ONLY when all initially failed topics are mastered (2 correct in a row).
  "newQuestion": { "content": "string", "type": "practice" } | null // The new question. null ONLY if isSessionComplete is true.
}`;
  
  try {
      const geminiHistory = createGeminiHistory(systemPrompt, chatHistory);
      return await callGeminiWithChat(geminiHistory, TEMP_MID, true);
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
  const systemPrompt = `You are a world-class curriculum designer.
Goal: build a learning plan on "${subject}" for a ${age}-year-old. Respond ONLY with:
{
  "chatResponse": "...",
  "roadmap": [
    { "sectionTitle": "...", "lessons": ["...", "..."] }
  ]
}`;

  try {
      if (chatHistory.length === 0) {
        const prompt = `${systemPrompt}\n\nCreate the initial complete, sectioned learning plan.`;
        return await callGemini(prompt, TEMP_MID, true);
      } else {
        const geminiHistory = createGeminiHistory(systemPrompt, chatHistory);
        return await callGeminiWithChat(geminiHistory, TEMP_MID, true);
      }
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
  const prompt = `You are an assistant great at summarising stories for children.
Return ONLY JSON: { "summary": "..." } (2-3 concise sentences in ${language}).

Here is the story history:
${storyHistory}`;

  try {
    const data = await callGemini(prompt, 0.35, true);
    if (!data || typeof data.summary !== 'string')
      throw new Error('Invalid summary JSON');
    return data;
  } catch (err) {
    console.error('Error generating story summary:', err);
    throw new Error('Failed to generate story summary');
  }
};

//----------------------------------------------------------------
// 8.  Генерация контрольной работы по темам раздела
//----------------------------------------------------------------
export const generateControlWorkExercises = async (
  sectionTopics: string[],
  subject: string,
  studentAge: number,
  language: string,
  chatHistory: { role: 'user' | 'assistant'; content: string }[] = [],
): Promise<{ chatResponse: string, blocks: any[] }> => {
  const systemPrompt = `You are an expert curriculum designer for children in ${language}.
Your task is to have a conversation with a teacher to create exercises for a control work on the subject "${subject}" for a ${studentAge}-year-old student.
The control work must cover these topics:
- ${sectionTopics.join('\n- ')}

RULES:
1. Respond ONLY with valid JSON in the format: { "chatResponse": "string", "blocks": [ { "type": "practice", "content": "..." } ] }
2. "chatResponse" is your conversational message to the teacher.
3. The "blocks" array must contain a separate JSON object for EACH exercise. ONE exercise per block.
4. For EACH topic listed above, create AT LEAST ONE exercise block.
5. If there are fewer than 3 topics, create more exercises to ensure there are AT LEAST 3 blocks in total.
6. "content" field should contain a clear exercise. Use simple HTML for formatting: <h3>, <b>, <i>, <p>. No Markdown.
7. Difficulty should be appropriate for a test.
8. In "chatResponse", explain your choices and ask for feedback.`;

  try {
      if (chatHistory.length === 0) {
        const prompt = `${systemPrompt}\n\nTeacher: "Generate the initial set of exercises for the control work based on the topics."\n\nNow, generate your JSON response.`;
        return await callGemini(prompt, TEMP_MID, true);
      } else {
        const geminiHistory = createGeminiHistory(systemPrompt, chatHistory);
        return await callGeminiWithChat(geminiHistory, TEMP_MID, true);
      }
  } catch (err) {
    console.error('[generateControlWorkExercises] error:', err);
    throw new Error('Failed to generate control work exercises');
  }
};