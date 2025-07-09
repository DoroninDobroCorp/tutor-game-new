import OpenAI from 'openai';
import { config } from '../config/env';

const openai = new OpenAI({
  apiKey: config.openaiApiKey,
});

export const generateMathProblem = async (topic: string, difficulty: number) => {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `Create a math problem about ${topic} with difficulty ${difficulty}/10. 
          Format the response as JSON with the following structure:
          {
            "question": "The math problem",
            "options": ["option1", "option2", "option3", "option4"],
            "correctAnswer": 0, // index of the correct answer
            "explanation": "Step-by-step solution"
          }`,
        },
      ],
      temperature: 0.5,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error('No content received from OpenAI');
    
    return JSON.parse(content);
  } catch (error) {
    console.error('Error generating math problem with OpenAI:', error);
    throw new Error('Failed to generate math problem');
  }
};

export const generateLessonContent = async (
    lessonTitle: string, 
    subject: string, 
    studentAge: number, 
    setting: string, 
    language: string,
    performanceContext?: string // <-- 1. Добавлен новый необязательный параметр
) => {
    // 2. Базовое системное сообщение остается как есть
    let systemMessage = `
You are an expert curriculum designer and a creative methodologist for children's education in ${language}.
Your task is to create content for a single lesson titled "${lessonTitle}" within a larger subject of "${subject}" for a ${studentAge}-year-old student.
The lesson should be broken down into a series of small, manageable blocks, each lasting 3-13 minutes.

RULES:
1.  Your response MUST BE ONLY a valid JSON object with a single root key "blocks".
2.  "blocks" must be an array of objects.
3.  Each block object must have three keys:
    - - "type": "theory", "practice", or "youtube".
    - "duration": an estimated time in minutes (number, 3-13).
    - "content": For "theory" and "practice", this is text. For "youtube", this MUST be only the full YouTube URL.
4.  **Pedagogical value is the #1 priority.** The lesson must be accurate, logical, and age-appropriate.
5.  The theme "${setting}" is secondary. Use it for examples or narrative framing ONLY if it enhances the lesson and does not compromise the educational goal. Do not invent concepts to fit the theme.
6.  If the topic is complex, create more blocks. If it's simple, create fewer.

Example Response Format:
{
  "blocks": [
    {
      "type": "theory",
      "duration": 5,
      "content": "This is the theoretical part of the lesson..."
    },
    {
      "type": "practice",
      "duration": 8,
      "content": "This is a practical task or question for the student..."
    }
  ]
}
`;

    // 3. Если контекст успеваемости передан, дополняем системное сообщение
    if (performanceContext) {
        systemMessage += `
---
IMPORTANT CONTEXT: Below are the student's previous raw answers. Analyze them to understand the student's level. 
If you see mistakes or uncertainty in the answers, create more practice blocks on those topics. If the student seems confident, you can introduce a more complex task. Do not comment on the student's answers, just use them to build a better, more adaptive lesson.
Student's performance context: ${performanceContext}`;
    }

    const userMessage = `Generate the lesson content for "${lessonTitle}".`;

    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4-turbo',
            messages: [
                { role: 'system', content: systemMessage }, // <-- Используем дополненный systemMessage
                { role: 'user', content: userMessage }
            ],
            response_format: { type: "json_object" },
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) {
            throw new Error('No content received from OpenAI for lesson generation.');
        }

        const parsedJson = JSON.parse(content);
        if (!parsedJson.blocks || !Array.isArray(parsedJson.blocks)) {
            throw new Error("AI did not return a valid 'blocks' array.");
        }

        return parsedJson;

    } catch (error) {
        console.error('[FATAL ERROR] An error occurred in generateLessonContent:', error);
        throw new Error('Failed to generate lesson content due to an internal error.');
    }
};

export const generateStorySnippet = async (
    lessonTitle: string,
    setting: string,
    studentAge: number,
    characterPrompt: string,
    language: string,
    refinementPrompt?: string,
    storyContext?: string
): Promise<string> => {
    const systemPrompt = `You are a talented writer of engaging, humorous, and slightly mysterious educational stories for children in ${language}.
    Your task is to create a short, intriguing story snippet (3-5 sentences) for a ${studentAge}-year-old.
    
    RULES:
    1. The story must be fun and unexpected, not preachy or boring. Avoid clichés. Use humor and mystery.
    2. Your primary goal is to CREATE INTRIGUE and NARRATIVE, not to teach.
    3. The lesson topic is "${lessonTitle}". You should subtly HINT at this topic or create a situation where the concepts from the lesson MIGHT be useful, but DO NOT include any direct tasks, questions, or explanations.
    4. If a story context is provided, you MUST use it as a basis. The student's response in the context is the MOST IMPORTANT part. The new story must be a direct, logical continuation of the student's action or idea.
    5. The story MUST end with an open-ended, intriguing question to the student, like "What do you think the character should do?" or "What strange thing did they find?"
    6. Your output must be ONLY the story text. No explanations or extra text.`;

    let userPrompt = '';

    if (storyContext) {
        // Context already includes teacher's text and student's response
        userPrompt += `${storyContext}\n\n`;
        userPrompt += `Based on the student's response, continue the story, naturally leading into the new lesson: "${lessonTitle}".`;
    } else {
        userPrompt = `Lesson Title: "${lessonTitle}"
        Story Setting: "${setting}"
        Main Character: "${characterPrompt}"
        \nWrite the very first chapter of the story.`;
    }

    if (refinementPrompt) {
        userPrompt += `\n\nRefine the story with the following instruction: "${refinementPrompt}"`;
    }
    
    userPrompt += '\n\nWrite the story snippet now.';

    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4-turbo',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            max_tokens: 400,
            temperature: 0.85,
        });

        return completion.choices[0]?.message?.content || 'Не удалось сгенерировать фрагмент истории.';
    } catch (error) {
        console.error('Error generating story snippet with OpenAI:', error);
        throw new Error('Failed to generate story snippet.');
    }
};

export const translateForImagePrompt = async (text: string): Promise<string> => {
    const systemPrompt = `You are an expert prompt engineer for AI image generation models.
    Analyze the user's text, which describes a scene. Your task is to extract the main visual elements and convert them into a concise, powerful, comma-separated list of keywords in ENGLISH.
    Focus on: main characters, key objects, the environment, actions, and the overall mood/atmosphere.
    Limit the output to about 20-30 words.

    Example Input (Russian): "Отважная девочка-исследователь в смешных носках и с яркими волосами скачет на коне по торговому центру. Вокруг витрины магазинов."
    Example Output: "cinematic action shot, whimsical heroine explorer with bright hair and long socks, riding a horse inside a modern shopping mall, shop windows, dynamic composition, cartoon style"

    Your output MUST be only the resulting English prompt. No extra text or explanations.`;

    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4-turbo',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: text },
            ],
            max_tokens: 150,
            temperature: 0.3,
        });

        return completion.choices[0]?.message?.content || text;
    } catch (error) {
        console.error('Error translating text for image prompt:', error);
        return text;
    }
};

export const generateCharacter = async (
    subject: string,
    age: number,
    setting: string,
    basePrompt: string,
    language: string
): Promise<{ name: string; description: string; imagePrompt: string }> => {
  const systemPrompt = `You are a creative writer for children's educational games. 
Your task is to create a compelling character for a story based on a user's idea.
The story is about "${subject}" in a "${setting}" setting for a ${age}-year-old child.
The user's core idea for the character is: "${basePrompt}".
Expand on this idea. The final character MUST be related to the user's core idea.
The language of the output must be ${language}.

Your response MUST BE ONLY a valid JSON object with three keys:
1. "name": A short, catchy name for the character (string).
2. "description": A brief, 2-3 sentence description of the character's personality and appearance (string).
3. "imagePrompt": A detailed visual description in ENGLISH for an AI image generator, focusing on appearance, clothing, and key attributes. Use comma-separated keywords.

Example for a "Math in space" theme:
{
  "name": "Зигги",
  "description": "Зигги - любопытный инопланетянин с тремя глазами, который обожает считать звезды. Он носит блестящий скафандр и всегда готов к космическим приключениям.",
  "imagePrompt": "cute alien cartoon character, three big curious eyes, shiny silver spacesuit with a star emblem, floating in space, nebula background, vibrant colors, digital art"
}`;

  const userPrompt = `Generate a character for a ${age}-year-old about ${subject} in a ${setting} world.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content received from OpenAI for character generation.');
    }
    
    return JSON.parse(content);

  } catch (error) {
    console.error('Error generating character with OpenAI:', error);
    throw new Error('Failed to generate character');
  }
};

export const generateRoadmap = async (
    subject: string,
    age: number,
    language: string,
    existingPlan?: any,
    feedback?: string
) => {
  console.log(`[LOG] 1. Starting generateRoadmap for subject: ${subject}, age: ${age}, language: ${language}`);
  
  const systemMessage = `You are a world-class curriculum designer and a creative methodologist for children's education. 
Your task is to create a comprehensive, engaging, and logically structured learning plan for a ${age}-year-old student in ${language}.
The plan must be broken down into logical sections, and each section into specific, bite-sized lesson titles.

RULES:
1.  Analyze the user's main goal.
2.  Structure the entire curriculum into several thematic sections. The section titles should be creative and engaging.
3.  Each section must contain a list of short, clear, and actionable lesson titles.
4.  If an existing plan and teacher feedback are provided, you MUST use them as a basis to refine and improve the plan, not create a new one.
5.  Your response MUST BE ONLY a valid JSON object with a single root key "roadmap", which contains an array of section objects.

Example format:
{
  "roadmap": [
    {
      "sectionTitle": "Section 1: The Basics",
      "lessons": ["Lesson 1.1: First Topic", "Lesson 1.2: Second Topic"]
    },
    {
      "sectionTitle": "Section 2: Advanced Concepts",
      "lessons": ["Lesson 2.1: Third Topic", "Lesson 2.2: Fourth Topic"]
    }
  ]
}`;
  
  let userMessage = `The main learning goal is: "${subject}". Create a complete, sectioned learning plan.`;

  if (existingPlan && existingPlan.length > 0) {
    userMessage = `Here is the current version of the plan that needs to be improved:\n${JSON.stringify(existingPlan, null, 2)}`;
    if (feedback) {
      userMessage += `\n\nPlease apply the following instructions from the teacher to improve the plan: "${feedback}"`;
    } else {
      userMessage += '\n\nPlease review and improve this plan to make it more logical and engaging.';
    }
  }

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemMessage },
    { role: 'user', content: userMessage }
  ];

  console.log('[LOG] 2. Sending request to OpenAI with messages:', JSON.stringify(messages, null, 2));

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages,
      response_format: { type: "json_object" },
    });

    console.log('[LOG] 3. Received FULL response object from OpenAI:', JSON.stringify(completion, null, 2));
    const content = completion.choices[0]?.message?.content;

    if (!content) {
      const finishReason = completion.choices[0]?.finish_reason;
      console.error(`[ERROR] 4. OpenAI response content is empty. Finish reason: ${finishReason}`);
      throw new Error(`No content received from OpenAI. Finish reason: ${finishReason}`);
    }
    
    console.log(`[LOG] 4. Raw "content" from OpenAI:\n---\n${content}\n---`);
    
    console.log(`[LOG] 5. Attempting to parse JSON...`);
    const parsedJson = JSON.parse(content);
    console.log(`[LOG] 6. JSON parsed successfully.`);

    const roadmapArray = parsedJson.roadmap;

    if (!Array.isArray(roadmapArray)) {
      console.error("[ERROR] 7. Parsed data does not contain a 'roadmap' array.");
      throw new Error("AI did not return a valid 'roadmap' array.");
    }
    
    console.log(`[LOG] 8. Success! Roadmap array extracted.`);
    return roadmapArray;

  } catch (error) {
    console.error('[FATAL ERROR] An error occurred in generateRoadmap:', error);
    throw new Error('Failed to generate roadmap due to an internal error.');
  }
};