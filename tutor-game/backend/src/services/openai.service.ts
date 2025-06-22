import OpenAI from 'openai';
import { config } from '../config/env';

const openai = new OpenAI({
  apiKey: config.openaiApiKey,
});

export const generateStory = async (prompt: string, studentLevel: number) => {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a creative storyteller that creates engaging educational stories for students. 
          The story should be appropriate for a student with a math level of ${studentLevel}/10. 
          Make it fun, interactive and include math problems naturally in the narrative.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.8,
      max_tokens: 1000,
    });

    return completion.choices[0]?.message?.content || 'Unable to generate story';
  } catch (error) {
    console.error('Error generating story with OpenAI:', error);
    throw new Error('Failed to generate story');
  }
};

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

export const generateRoadmap = async (subject: string, setting: string, age: number) => {
  console.log(`[LOG] 1. Вызвана функция generateRoadmap.`);

  const messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }> = [
    {
      role: 'system' as const,
      content: `You are an expert curriculum designer for children. Your task is to create a learning plan. The plan should be broken down into logical sections, and each section into specific lessons. The tone should be engaging and tailored to the provided setting. The student is ${age} years old.
      
      Respond ONLY with a valid JSON object in the following format:
      {
        "roadmap": [
          { "sectionTitle": "Title of the First Section", "lessons": ["Lesson 1.1", "Lesson 1.2"] },
          { "sectionTitle": "Title of the Second Section", "lessons": ["Lesson 2.1", "Lesson 2.2"] }
        ]
      }`
    },
    {
      role: 'user' as const,
      content: `Subject: ${subject}\nSetting: ${setting}`
    },
  ];

  // --- ШАГ 2: ЛОГИРУЕМ ТО, ЧТО ОТПРАВЛЯЕМ ---
  console.log('[LOG] 2. Отправляем в OpenAI следующий запрос:');
  console.log(JSON.stringify({ model: 'gpt-4-turbo-preview', messages }, null, 2));

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: messages,
      response_format: { type: "json_object" },
    });

    // --- ШАГ 3: ЛОГИРУЕМ ВЕСЬ ОБЪЕКТ ОТВЕТА ---
    console.log('[LOG] 3. Получен ПОЛНЫЙ объект ответа от OpenAI:');
    console.log(JSON.stringify(completion, null, 2)); // <--- САМЫЙ ВАЖНЫЙ ЛОГ

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      console.error('[ERROR] 4. Поле "content" в ответе OpenAI пустое.');
      // Логируем причину завершения, если она есть
      const finishReason = completion.choices[0]?.finish_reason;
      console.error(`[INFO] Причина завершения (finish_reason): ${finishReason}`);
      throw new Error(`No content received from OpenAI. Finish reason: ${finishReason}`);
    }
    
    console.log(`[LOG] 4. Сырое содержимое поля "content":\n---\n${content}\n---`);
    
    console.log(`[LOG] 5. Пытаемся распарсить (JSON.parse) "content"...`);
    const parsedJson = JSON.parse(content);
    console.log(`[LOG] 6. JSON успешно распарсен.`);

    const roadmapArray = parsedJson.roadmap;

    if (!Array.isArray(roadmapArray)) {
      console.error("[ERROR] 7. 'roadmap' в ответе не является массивом.");
      throw new Error("AI did not return a valid 'roadmap' array.");
    }
    
    console.log(`[LOG] 8. Успех! Возвращаем учебный план.`);
    return roadmapArray;

  } catch (error) {
    console.error('[FATAL ERROR] Ошибка внутри generateRoadmap:', error);
    throw new Error('Failed to generate roadmap');
  }
};
