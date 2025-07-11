import OpenAI from 'openai';
import { config } from '../config/env';

const openai = new OpenAI({
  apiKey: config.openaiApiKey,
});

export const generateMathProblem = async (topic: string, difficulty: number) => {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1',
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
    performanceContext?: string,
    chatHistory: { role: 'user' | 'assistant', content: string }[] = []
) => {
    let systemMessage = `You are an expert curriculum designer and a creative methodologist for children's education in ${language}.
Your task is to have a conversation with a teacher to create content for a single lesson titled "${lessonTitle}" for a ${studentAge}-year-old student, within the subject of "${subject}".

RULES:
1.  Your response MUST BE ONLY a valid JSON object with TWO root keys:
    - "chatResponse": A string containing your conversational reply to the teacher. This is where you explain your choices or ask clarifying questions.
    - "blocks": An array of lesson block objects.
2.  "blocks" must be an array. Each block object must have three keys:
    - "type": Can be "theory", "practice", or "youtube".
    - "duration": An estimated time in minutes (number).
    - "content": For "theory" and "practice", this is text content. For "youtube", this MUST be only the full YouTube URL.
3.  Be conversational in "chatResponse" but strict with the JSON format.
4.  The theme "${setting}" is for framing, don't sacrifice pedagogy for it.

Example Response Format:
{
  "chatResponse": "Great idea to add a video! I've found one that explains the concept visually and added a new practice block to reinforce it. How does this look?",
  "blocks": [
    { "type": "theory", "duration": 5, "content": "..." },
    { "type": "youtube", "duration": 4, "content": "https://www.youtube.com/watch?v=some_id" },
    { "type": "practice", "duration": 8, "content": "..." }
  ]
}`;

    if (performanceContext) {
        systemMessage += `\n\n---
IMPORTANT CONTEXT: Below are the student's answers from their last three lessons for this goal. Your critical task is to analyze them to adapt the new lesson's content.
- First, you MUST determine if the student's answers were correct or incorrect for the given questions. The student is just learning, so be gentle in your evaluation.
- If the student struggled with a topic (gave incorrect or incomplete answers), you MUST add more practice or theory blocks for repetition to help them master it.
- If the student answered correctly and seems to understand the topic, you MUST make the new tasks more challenging or introduce a related, more advanced concept.
- In your "chatResponse", you MUST explain what you observed from the student's answers and how you've adjusted the lesson plan based on it.

Student's performance context from the last 3 lessons:
${performanceContext}`;
    }

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [{ role: 'system', content: systemMessage }];

    if (chatHistory.length === 0) {
        messages.push({ role: 'user', content: `Generate the initial lesson content for "${lessonTitle}".` });
    } else {
        const openAiChatHistory = chatHistory.map(msg => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content
        }))
        messages.push(...openAiChatHistory);
    }

    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4.1',
            messages: messages,
            response_format: { type: "json_object" },
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) {
            throw new Error('No content received from OpenAI for lesson generation.');
        }

        const parsedJson = JSON.parse(content);
        if (!parsedJson.blocks || !Array.isArray(parsedJson.blocks) || typeof parsedJson.chatResponse !== 'string') {
            throw new Error("AI did not return a valid { chatResponse, blocks } object.");
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
            model: 'gpt-4.1',
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
            model: 'gpt-4.1',
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
      model: 'gpt-4.1',
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

export const getAIAssessment = async (
    lesson: { title: string, content: any },
    studentAnswers: string[],
    studentAge: number,
    language: string,
    chatHistory: { role: 'user' | 'assistant', content: string }[] = []
): Promise<any> => {
    const practiceBlocks = (lesson.content?.blocks || [])
        .filter((block: any) => block.type === 'practice')
        .map((block: any) => block.content);

    let context = `The student has completed the lesson "${lesson.title}".\n`;
    context += "Here are the tasks and the student's answers:\n";
    practiceBlocks.forEach((question: string, index: number) => {
        context += `- Task: "${question}"\n  Student's Answer: "${studentAnswers[index] || 'No answer'}"\n`;
    });

    const systemPrompt = `You are a fun, friendly, and slightly humorous AI tutor for a ${studentAge}-year-old student, speaking ${language}. Your task is to review the student's answers and provide interactive follow-up practice ONLY if needed.

    YOUR PROCESS (Strictly follow these steps):
    1.  **Analyze Answers**: 
        - On the VERY FIRST turn (when chat history is empty), analyze the provided initial student answers.
        - Be gentle in your evaluation. Do not be a perfectionist. Ignore minor typos or different phrasing if the core concept is correct. Only flag an answer as INCORRECT if it is conceptually wrong.
    2.  **Decision Path**:
        -   **If ALL initial answers are correct:** Your *only* task is to praise the student and confirm completion. Your JSON response MUST have "isSessionComplete": true, and "newQuestion": null. Do NOT ask any new questions.
        -   **If ANY initial answer is incorrect:** Begin a practice session. Your first "responseText" should explain the mistake simply and then IMMEDIATELY provide a new, similar question about the topic the student struggled with. DO NOT ask "are you ready?". You MUST provide the question directly. The JSON response MUST have "isSessionComplete": false and a valid "newQuestion" object.
    3.  **Practice Loop (if started)**:
        -   When the student answers your new question, analyze it.
        -   If correct, praise them and track their "correct in a row" streak. If the streak for a topic reaches 2 (two), consider that topic mastered.
        -   If incorrect, gently correct them and provide another new question on the same topic.
        -   Once all originally failed topics are mastered (2 correct answers in a row for each), your JSON response MUST have "isSessionComplete": true, and "newQuestion": null.
    
    RESPONSE FORMAT (MANDATORY):
    You MUST respond with ONLY a valid JSON object with the following structure:
    {
      "responseText": "A string containing your friendly, conversational reply to the student.",
      "isSessionComplete": boolean, // Set to true ONLY when all topics are mastered or were correct from the start.
      "newQuestion": { // An object for a new practice question. This should be null if no new question is needed or the session is complete.
        "content": "The text of the new question.",
        "type": "practice"
      }
    }
    
    CRITICAL RULE: If your \`responseText\` mentions or implies that you are asking a new question (e.g., "Let's try another one", "Here is a new task"), then the \`newQuestion\` field in your JSON response MUST contain the question object and MUST NOT be null. Conversely, if \`isSessionComplete\` is true, your \`responseText\` should celebrate success and NOT mention a new question.

    EXAMPLE (First Interaction, one error found):
    {
      "responseText": "Hey, great job on the lesson! 💪 I noticed on the question about finding the area, you multiplied instead of adding. Let’s try another one just like it to make sure you've got it! Here it is:",
      "isSessionComplete": false,
      "newQuestion": {
        "content": "A square has a side length of 5cm. What is its PERIMETER?",
        "type": "practice"
      }
    }

    EXAMPLE (Session Complete):
    {
      "responseText": "YES! That's three in a row! You're a true math wizard! 🧙‍♂️ You've totally mastered this. Ready for the next part of your adventure?",
      "isSessionComplete": true,
      "newQuestion": null
    }`;

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt }
    ];

    if (chatHistory.length > 0) {
        messages.push(...chatHistory.map(msg => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content
        })));
    } else {
        messages.push({ role: 'user', content: `Initial context: ${context}\n\nThis is my first message. Please analyze my initial answers and give me your first response.` });
    }
    
    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4.1',
            messages,
            response_format: { type: "json_object" },
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) throw new Error('No content from AI.');
        
        return JSON.parse(content);
    } catch (error) {
        console.error('[OpenAI Service] Error in getAIAssessment:', error);
        throw new Error('Failed to get AI assessment.');
    }
};

export const generateRoadmap = async (
    subject: string,
    age: number,
    language: string,
    chatHistory: { role: 'user' | 'assistant', content: string }[] = []
) => {
  const systemMessage = `You are a world-class curriculum designer. Your task is to have a conversation with a teacher to create a learning plan for a ${age}-year-old student in ${language}.

The main learning goal is: "${subject}".

RULES:
1.  Your response MUST BE ONLY a valid JSON object with TWO root keys:
    - "chatResponse": A string containing your conversational reply to the teacher. This is where you explain your choices.
    - "roadmap": An array of section objects.
2.  Each section object in the "roadmap" array must have "sectionTitle" (string) and "lessons" (array of strings representing lesson titles).
3.  Analyze the user's main goal ("${subject}") and the entire chat history to refine the plan.
4.  Be conversational in "chatResponse" but strict with the JSON format.

Example format:
{
  "chatResponse": "I've updated the plan to include a section on fractions as you suggested. I also moved the geometry section to be later in the plan. Does this look better?",
  "roadmap": [
    { "sectionTitle": "Section 1: The Basics", "lessons": ["Lesson 1.1: First Topic", "Lesson 1.2: Second Topic"] },
    { "sectionTitle": "Section 2: Advanced Concepts", "lessons": ["Lesson 2.1: Third Topic", "Lesson 2.2: Fourth Topic"] }
  ]
}`;
  
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [{ role: 'system', content: systemMessage }];

  if (chatHistory.length === 0) {
    messages.push({ role: 'user', content: `Create the initial complete, sectioned learning plan.` });
  } else {
    const openAiChatHistory = chatHistory.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
    }))
    messages.push(...openAiChatHistory);
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      const finishReason = completion.choices[0]?.finish_reason;
      throw new Error(`No content received from OpenAI. Finish reason: ${finishReason}`);
    }
    
    const parsedJson = JSON.parse(content);

    if (!parsedJson.roadmap || !Array.isArray(parsedJson.roadmap) || typeof parsedJson.chatResponse !== 'string') {
        throw new Error("AI did not return a valid 'roadmap' array or 'chatResponse' string.");
    }
    
    return parsedJson;

  } catch (error) {
    console.error('[FATAL ERROR] An error occurred in generateRoadmap:', error);
    throw new Error('Failed to generate roadmap due to an internal error.');
  }
};
