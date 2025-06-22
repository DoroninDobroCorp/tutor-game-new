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

export const generateLessonContent = async (
    lessonTitle: string, 
    subject: string, 
    studentAge: number, 
    setting: string, 
    language: string
) => {
    const systemMessage = `
You are an expert curriculum designer and a creative methodologist for children's education in ${language}.
Your task is to create content for a single lesson titled "${lessonTitle}" within a larger subject of "${subject}" for a ${studentAge}-year-old student.
The lesson should be broken down into a series of small, manageable blocks, each lasting 3-13 minutes.

RULES:
1.  Your response MUST BE ONLY a valid JSON object with a single root key "blocks".
2.  "blocks" must be an array of objects.
3.  Each block object must have three keys:
    - "type": either "theory" or "practice".
    - "duration": an estimated time in minutes (number, 3-13).
    - "content": the actual text for the block. For "practice" blocks, this should be the question or task.
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

    const userMessage = `Generate the lesson content for "${lessonTitle}".`;

    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4-turbo',
            messages: [
                { role: 'system', content: systemMessage },
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
