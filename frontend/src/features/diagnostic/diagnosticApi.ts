import { apiSlice } from '../../app/api/apiSlice';

// Minimal types for diagnostics flow
export type KnowledgeLevel = 'EXCELLENT' | 'REFRESH' | 'UNKNOWN';

export interface DiagnosticTopic {
  id: string;
  title: string;
  description?: string | null;
}

export interface DiagnosticTurn {
  id: string;
  sessionId: string;
  topicId: string;
  questionText: string;
  studentAnswer: string;
  aiLabel: KnowledgeLevel;
  createdAt: string;
  topic?: DiagnosticTopic;
}

export interface DiagnosticSession {
  id: string;
  goalId: string;
  studentId: string;
  status: 'ACTIVE' | 'FINISHED';
  currentIdx: number;
  createdAt: string;
  updatedAt: string;
  turns?: DiagnosticTurn[];
}

export const diagnosticApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Start or resume a diagnostic for a goal
    startDiagnostic: builder.mutation<{
      sessionId: string;
      intro: string;
      disclaimer?: string;
      totalTopics: number;
      initialQuestions?: Array<{ topicId: string; title: string; firstQuestion?: string | null; firstQuestionExample?: string | null }>
    }, { goalId: string }>({
      query: (body) => ({
        url: '/student/diagnostics/start',
        method: 'POST',
        data: body,
      }),
      transformResponse: (response: { data: any }) => response.data,
      invalidatesTags: (_res, _err, _arg) => [{ type: 'Student' as const, id: 'PROFILE' }],
    }),

    // Fetch session state (for resume)
    getDiagnosticSession: builder.query<{ session: DiagnosticSession; totalTopics: number }, string>({
      query: (sessionId) => ({
        url: `/student/diagnostics/${sessionId}`,
        method: 'GET',
      }),
      transformResponse: (response: { data: { session: DiagnosticSession; totalTopics: number } }) => response.data,
      providesTags: (_result, _error, sessionId) => [{ type: 'Student' as const, id: `DIAG_${sessionId}` }],
    }),

    // Get next question
    getNextDiagnosticQuestion: builder.mutation<{ topicId?: string; question?: string; index?: number; total?: number; done?: boolean }, { sessionId: string }>({
      query: ({ sessionId }) => ({
        url: `/student/diagnostics/${sessionId}/next`,
        method: 'POST',
      }),
      transformResponse: (response: { data: any }) => response.data,
    }),

    // Submit answer
    answerDiagnostic: builder.mutation<{ turn: DiagnosticTurn }, { sessionId: string; topicId: string; questionText: string; answer: string }>({
      query: ({ sessionId, ...body }) => ({
        url: `/student/diagnostics/${sessionId}/answer`,
        method: 'POST',
        data: body,
      }),
      transformResponse: (response: { data: { turn: DiagnosticTurn } }) => response.data,
      invalidatesTags: (_res, _err, { sessionId }) => [{ type: 'Student' as const, id: `DIAG_${sessionId}` }],
    }),

    // Finish session
    finishDiagnostic: builder.mutation<{ finished: boolean }, { sessionId: string }>({
      query: ({ sessionId }) => ({
        url: `/student/diagnostics/${sessionId}/finish`,
        method: 'POST',
      }),
      transformResponse: (response: { data: { finished: boolean } }) => response.data,
      invalidatesTags: (_res, _err, { sessionId }) => [
        { type: 'Student' as const, id: `DIAG_${sessionId}` },
        { type: 'Goal' as const, id: 'LIST' },
      ],
    }),

    // Phase 1: submit first answers in batch, get follow-ups
    submitFirstAnswers: builder.mutation<
      { followups: Array<{ topicId: string; questions: string[] }> },
      { sessionId: string; answers: Array<{ topicId: string; answer: string }> }
    >({
      query: ({ sessionId, answers }) => ({
        url: `/student/diagnostics/${sessionId}/first-answers`,
        method: 'POST',
        data: { answers },
      }),
      transformResponse: (response: { data: { followups: Array<{ topicId: string; questions: string[] }> } }) => response.data,
    }),

    // Phase 2: submit follow-up answers and finish
    submitFollowupAnswers: builder.mutation<
      { finished: true; summary: { total: number; labels: Record<string, number> }; suggestedRoadmap: any[] },
      { sessionId: string; items: Array<{ topicId: string; qa: Array<{ question: string; answer: string }> }> }
    >({
      query: ({ sessionId, items }) => ({
        url: `/student/diagnostics/${sessionId}/followup-answers`,
        method: 'POST',
        data: { items },
      }),
      transformResponse: (response: { data: any }) => response.data,
      invalidatesTags: (_res, _err, { sessionId }) => [
        { type: 'Student' as const, id: `DIAG_${sessionId}` },
        { type: 'Goal' as const, id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useStartDiagnosticMutation,
  useGetDiagnosticSessionQuery,
  useGetNextDiagnosticQuestionMutation,
  useAnswerDiagnosticMutation,
  useFinishDiagnosticMutation,
  useSubmitFirstAnswersMutation,
  useSubmitFollowupAnswersMutation,
} = diagnosticApi;
