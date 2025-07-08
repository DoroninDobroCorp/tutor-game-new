import { apiSlice } from '../../app/api/apiSlice';
import type {
    StoryChapterHistory,
    SubmitLessonPayload,
    StudentProfile,
    Lesson as LessonType
} from '../../types/models';

export const studentApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get student profile with learning goals
    getStudentProfile: builder.query<StudentProfile, void>({
      query: () => ({
        url: '/student/profile',
        method: 'GET',
      }),
      transformResponse: (response: { data: StudentProfile }) => response.data,
      providesTags: [{ type: 'Student', id: 'PROFILE' }],
    }),

    // Get current lesson for the student
    getCurrentLesson: builder.query<LessonType | null, void>({
      query: () => ({
        url: '/student/current-lesson',
        method: 'GET',
      }),
      transformResponse: (response: { data: LessonType | null }) => response.data,
      // This tag will be invalidated after submitting a lesson to fetch the next one
      providesTags: (result) => 
        result ? [{ type: 'Student' as const, id: 'CURRENT_LESSON' }] : [],
    }),

    // Submit lesson results
    submitLesson: builder.mutation<{ success: boolean; message: string }, SubmitLessonPayload>({
      query: ({ lessonId, ...data }) => ({
        url: `/student/lessons/${lessonId}/submit`,
        method: 'POST',
        data,
      }),
      // Invalidate the current lesson to trigger a refetch
      invalidatesTags: () => [{ type: 'Student' as const, id: 'CURRENT_LESSON' }],
    }),
    
    // Get story history for a learning goal
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
  }),
});

export const { 
  useGetStudentProfileQuery,
  useGetCurrentLessonQuery, 
  useSubmitLessonMutation,
  useGetStoryHistoryQuery,
} = studentApi;

// All types are now imported from '../../types/models'
