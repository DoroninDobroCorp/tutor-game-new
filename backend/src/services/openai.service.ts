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
    currentLessonNumber: number,
    totalLessons: number,
    refinementPrompt?: string,
    storyContext?: string
): Promise<{ storyText: string; imagePrompt: string; useCharacterReference: boolean }> => {
    const systemPrompt = `You are a talented writer of engaging, humorous, and slightly mysterious educational stories for children in ${language}.
You are writing a multi-chapter story for a ${studentAge}-year-old. The entire adventure consists of ${totalLessons} lessons (chapters). You are now writing the chapter for lesson ${currentLessonNumber}.
The main character description is: "${characterPrompt}".

YOUR MAIN GOAL: Create a coherent, developing story and a corresponding image prompt, returned in a specific JSON format.

RULES:
1.  **JSON Output:** Your response MUST BE ONLY a valid JSON object with THREE keys:
    - "storyText": A string containing the story chapter text (2-3 paragraphs, ending with an intriguing question, unless it's the final chapter).
    - "imagePrompt": A CONCISE (15-25 words), powerful, comma-separated list of keywords in ENGLISH for an AI image generator. It must describe the scene from "storyText" and include style hints like "whimsical, cartoon style, detailed illustration, vibrant colors".
    - "useCharacterReference": A boolean (true/false). Set this to 'true' if the main character is central to this scene. Set it to 'false' if the scene focuses on the environment, an object, or another character, making the main character's presence less important. You have creative freedom to make the best artistic choice.
2.  **Story Arc:** You MUST consider the current lesson number (${currentLessonNumber}) out of the total (${totalLessons}).
    -   Early lessons: Introduce characters, conflict, intrigue.
    -   Middle lessons: Develop plot, add twists.
    -   Late lessons: Move towards a resolution. The final chapter should be conclusive.
3.  **Continuity:** If story context (previous chapters) is provided, you MUST use it. The new chapter must be a direct continuation.
4.  **Lesson Integration:** The topic of the current lesson is "${lessonTitle}". Subtly HINT at this topic. DO NOT include direct tasks or questions. This is NARRATIVE.
5.  **Tone & Style:** The story should be exciting, with humor and mystery. Avoid clichés.
6.  **Character in Prompt:** If \`useCharacterReference\` is true, you MUST include a description of the character in the \`imagePrompt\`. If it's false, you MUST NOT include the main character in the prompt.

Example Response (with character):
{
  "storyText": "The iron door creaked open, revealing a dusty chamber filled with whirring cogs and steaming pipes. Our hero stepped inside, holding their glowing compass. In the center of the room, a tiny, four-armed robot suddenly scurried out from behind a gear, holding up a sign that read 'HALT!'. What could this little guardian want?",
  "imagePrompt": "whimsical illustration, brave explorer hero, inside a steampunk clockwork room, glowing golden compass on a pedestal, a tiny cute four-armed robot stands guard, dynamic composition, vibrant colors, cartoon style",
  "useCharacterReference": true
}

Example Response (without character):
{
  "storyText": "They followed the map to a shimmering waterfall. The water glowed with a soft, magical light, and behind it, a hidden cave entrance was visible. Strange, beautiful flowers grew around the entrance, pulsing with the same light as the water. What secrets could be inside?",
  "imagePrompt": "hidden cave entrance behind a magical glowing waterfall, shimmering water, strange luminous flowers, mysterious atmosphere, digital fantasy art, vibrant colors",
  "useCharacterReference": false
}`;

    let userPrompt = '';

    if (storyContext) {
        userPrompt += `${storyContext}\n\n`;
        userPrompt += `Based on all the previous chapters and especially the student's last response, continue the story for the current lesson: "${lessonTitle}". This is chapter ${currentLessonNumber} of ${totalLessons}.`;
    } else {
        userPrompt = `Lesson Title: "${lessonTitle}"
        Story Setting: "${setting}"
        Main Character: "${characterPrompt}"
        \nWrite the very first chapter (chapter ${currentLessonNumber} of ${totalLessons}) of the story.`;
    }

    if (refinementPrompt) {
        userPrompt += `\n\nTeacher's instruction for this chapter: "${refinementPrompt}"`;
    }
    
    userPrompt += '\n\nGenerate the JSON response now.';

    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4.1',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            response_format: { type: "json_object" },
            max_tokens: 600,
            temperature: 0.85,
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) {
            throw new Error('No content from OpenAI');
        }
        
        const parsedJson = JSON.parse(content);
        if (typeof parsedJson.storyText !== 'string' || typeof parsedJson.imagePrompt !== 'string' || typeof parsedJson.useCharacterReference !== 'boolean') {
            throw new Error('Invalid JSON structure from OpenAI');
        }

        return parsedJson;

    } catch (error) {
        console.error('Error generating story snippet with OpenAI:', error);
        throw new Error('Failed to generate story snippet.');
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
