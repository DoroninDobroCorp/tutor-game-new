import { apiSlice } from '../../app/api/apiSlice';

interface SubmitLessonPayload {
  lessonId: string;
  studentResponseText: string;
  answers: string[];
}

export const studentApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get current lesson for the student
    getCurrentLesson: builder.query<Lesson | null, void>({
      query: () => ({
        url: '/student/current-lesson',
        method: 'GET',
      }),
      transformResponse: (response: { data: Lesson | null }) => response.data,
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
  }),
});

export const { 
  useGetCurrentLessonQuery, 
  useSubmitLessonMutation,
} = studentApi;

// Types
export interface Lesson {
  id: string;
  title: string;
  order: number;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'COMPLETED';
  content?: {
    blocks: Array<{
      type: 'theory' | 'practice' | 'with_teacher';
      content: string;
    }>;
  };
  storyChapter?: {
    id: string;
    teacherSnippetText: string;
    teacherSnippetImageUrl?: string;
    studentSnippetText?: string;
    studentSnippetStatus: 'LOCKED' | 'DRAFT' | 'SUBMITTED' | 'APPROVED';
  };
  section: {
    id: string;
    title: string;
    order: number;
    learningGoal: {
      id: string;
      subject: string;
      studentAge: number;
    };
  };
}
