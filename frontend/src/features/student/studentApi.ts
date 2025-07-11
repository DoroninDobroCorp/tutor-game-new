import { apiSlice } from '../../app/api/apiSlice';
import type {
    StoryChapterHistory,
    StudentProfile,
    Lesson as LessonType,
    AIAssessmentResponse,
} from '../../types/models';

interface SubmitLessonApiPayload {
    lessonId: string;
    formData: FormData;
}


export const studentApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getStudentProfile: builder.query<StudentProfile, void>({
      query: () => ({
        url: '/student/profile',
        method: 'GET',
      }),
      transformResponse: (response: { data: StudentProfile }) => response.data,
      providesTags: [{ type: 'Student', id: 'PROFILE' }],
    }),

    getCurrentLesson: builder.query<LessonType | null, void>({
      query: () => ({
        url: '/student/current-lesson',
        method: 'GET',
      }),
      transformResponse: (response: { data: LessonType | null }) => response.data,
      providesTags: (result) => 
        result ? [{ type: 'Student' as const, id: 'CURRENT_LESSON' }] : [],
    }),

    submitLesson: builder.mutation<{ success: boolean; message: string }, SubmitLessonApiPayload>({
      query: ({ lessonId, formData }) => ({
        url: `/student/lessons/${lessonId}/submit`,
        method: 'POST',
        data: formData,
        isFormData: true,
      }),
      invalidatesTags: () => [{ type: 'Student' as const, id: 'CURRENT_LESSON' }],
    }),
    
    getStoryHistory: builder.query<StoryChapterHistory[], string>({
      query: (goalId) => ({
        url: `/student/story/${goalId}`,
        method: 'GET',
      }),
      transformResponse: (response: { data: StoryChapterHistory[] }) => response.data || [],
      providesTags: (result, _error, goalId) => {
        return result ? [{ type: 'Student' as const, id: `STORY_${goalId}` }] : [];
      },
    }),

    lessonPracticeChat: builder.mutation<{ data: AIAssessmentResponse }, { lessonId: string; initialAnswers?: string[]; chatHistory?: any[] }>({
      query: ({ lessonId, ...body }) => ({
        url: `/student/lessons/${lessonId}/practice-chat`,
        method: 'POST',
        data: body,
      }),
    }),

    endLessonForReview: builder.mutation<{ success: boolean; message: string }, { lessonId: string }>({
      query: ({ lessonId }) => ({
        url: `/student/lessons/${lessonId}/end-for-review`,
        method: 'POST',
      }),
      invalidatesTags: ['Goal', { type: 'Student', id: 'CURRENT_LESSON' }, { type: 'Student', id: 'PROFILE' }],
    }),
  }),
});

export const { 
  useGetStudentProfileQuery,
  useGetCurrentLessonQuery, 
  useSubmitLessonMutation,
  useGetStoryHistoryQuery,
  useLessonPracticeChatMutation,
  useEndLessonForReviewMutation,
} = studentApi;
