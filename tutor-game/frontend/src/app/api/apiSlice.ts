import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { RootState } from '../../app/store';

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token || localStorage.getItem('token');
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['User', 'Student', 'Teacher', 'Story', 'Goal'],
  endpoints: (builder) => ({
    // Generate endpoints
    generateStory: builder.mutation<{ story: string }, { prompt: string; ageGroup?: string; subject?: string }>({
      query: (body) => ({
        url: '/generate/story',
        method: 'POST',
        body,
      }),
    }),
    continueStory: builder.mutation<{ story: string }, { storyId: string; continuation: string }>({
      query: (body) => ({
        url: '/generate/continue',
        method: 'POST',
        body,
      }),
    }),
    
    // Math endpoints
    getMathProblem: builder.query<MathProblem, { difficulty?: string; topic?: string }>({
      query: (params) => ({
        url: '/student/math-problem',
        params,
      }),
    }),
    submitAnswer: builder.mutation<{ correct: boolean; correctAnswer?: number }, { problemId: string; answer: number }>({
      query: (body) => ({
        url: '/student/math-answer',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {
  useGenerateStoryMutation,
  useContinueStoryMutation,
  useGetMathProblemQuery,
  useLazyGetMathProblemQuery,
  useSubmitAnswerMutation,
} = apiSlice;

export interface MathProblem {
  id: string;
  question: string;
  answer: number;
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
  explanation?: string;
}

export default apiSlice;
