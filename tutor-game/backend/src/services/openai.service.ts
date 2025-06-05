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
