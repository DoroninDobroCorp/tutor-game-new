import { apiSlice } from '../../app/api/apiSlice';

// Типы данных
interface Student {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
}

interface StoryChapter {
    id: string;
    teacherSnippetText: string;
    teacherSnippetImageUrl: string;
    teacherSnippetStatus: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'COMPLETED';
}

interface Lesson {
    id: string;
    title: string;
    status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'COMPLETED';
    order: number;
    content?: {
        blocks: Array<{
            type: 'theory' | 'practice';
            duration: number;
            content: string;
        }>;
    } | null;
    storyChapter?: StoryChapter | null;
}

interface ContentSection {
    id: string;
    title: string;
    order: number;
    lessons: Lesson[];
}

interface LearningGoal {
    id: string; 
    subject: string; 
    setting: string; 
    studentAge: number; 
    studentId: string;
    student: Student;
    sections: ContentSection[];
    language?: string;
    // Character fields
    characterPrompt?: string | null;
    characterImageId?: string | null;
    characterGenId?: string | null;
    characterImageUrl?: string | null;
}

export interface RoadmapProposal { 
    sectionTitle: string; // ИИ возвращает именно 'sectionTitle'
    lessons: string[]; // ИИ возвращает массив строк, а не объектов
}

// API Slice
export const teacherApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Студенты
    connectStudent: builder.mutation<{ message: string }, { email: string }>({
      query: (body) => ({ url: '/teacher/students/connect', method: 'POST', body }),
      invalidatesTags: ['Student'],
    }),
    getConnectedStudents: builder.query<Student[], void>({
      query: () => '/teacher/students',
      transformResponse: (response: { data: Student[] }) => response.data,
      providesTags: (result) => result ? [...result.map(({ id }) => ({ type: 'Student' as const, id })), { type: 'Student', id: 'LIST' }] : [{ type: 'Student', id: 'LIST' }],
    }),
    
    // Учебные планы (Goals)
    getLearningGoals: builder.query<LearningGoal[], void>({
        query: () => '/goals',
        transformResponse: (response: { data: LearningGoal[] }) => response.data,
        providesTags: (result) =>
            result ? [...result.map(({ id }) => ({ type: 'Goal' as const, id })), { type: 'Goal', id: 'LIST' }] : [{ type: 'Goal', id: 'LIST' }],
    }),
    getLearningGoal: builder.query<LearningGoal, string>({
        query: (goalId) => `/goals/${goalId}`,
        transformResponse: (response: { data: LearningGoal }) => response.data,
    }),
    createLearningGoal: builder.mutation<LearningGoal, Partial<LearningGoal>>({
        query: (body) => ({ url: '/goals', method: 'POST', body }),
        transformResponse: (response: { data: LearningGoal }) => response.data,
        invalidatesTags: [{ type: 'Goal', id: 'LIST' }],
    }),
    updateLearningGoal: builder.mutation<LearningGoal, Partial<LearningGoal>>({
        query: (body) => ({ url: '/goals', method: 'PUT', body }),
        transformResponse: (response: { data: LearningGoal }) => response.data,
        invalidatesTags: (_result, _error, { id }) => [{ type: 'Goal', id }],
    }),
    deleteLearningGoal: builder.mutation<{ success: boolean; message: string }, string>({
        query: (goalId) => ({ url: `/goals/${goalId}`, method: 'DELETE' }),
        invalidatesTags: [{ type: 'Goal', id: 'LIST' }],
    }),

    // Roadmap
    generateRoadmapProposal: builder.mutation<RoadmapProposal[], { goalId: string; existingPlan?: ContentSection[]; feedback?: string }>({
        query: ({ goalId, ...body }) => ({ url: `/goals/${goalId}/generate-roadmap`, method: 'POST', body }),
        transformResponse: (response: { data: RoadmapProposal[] }) => response.data,
    }),
    updateRoadmap: builder.mutation<void, { goalId: string; roadmap: ContentSection[] }>({
        query: ({ goalId, roadmap }) => ({ url: `/goals/${goalId}/roadmap`, method: 'PUT', body: { roadmap } }),
        invalidatesTags: () => [{ type: 'Goal', id: 'LIST' }],
    }),

    // Контент уроков
    generateLessonContent: builder.mutation<Lesson, string>({
        query: (lessonId) => ({ url: `/goals/lessons/${lessonId}/generate-content`, method: 'POST' }),
        transformResponse: (response: { data: Lesson }) => response.data,
        async onQueryStarted(lessonId, { dispatch, queryFulfilled }) {
            try {
                const { data: updatedLesson } = await queryFulfilled;
                dispatch(
                    teacherApi.util.updateQueryData('getLearningGoals', undefined, (draft) => {
                        const goal = draft.find(g => g.sections.some(s => s.lessons.some(l => l.id === lessonId)));
                        if (goal) {
                            for (const section of goal.sections) {
                                const lessonIndex = section.lessons.findIndex(l => l.id === lessonId);
                                if (lessonIndex !== -1) {
                                    section.lessons[lessonIndex] = updatedLesson;
                                    break;
                                }
                            }
                        }
                    })
                );
            } catch (error) {
                console.error('Failed to update lesson content optimistically', error);
            }
        },
    }),
    updateLessonContent: builder.mutation<void, { lessonId: string; content: Lesson['content'] }>({
        query: ({ lessonId, content }) => ({ url: `/goals/lessons/${lessonId}/content`, method: 'PUT', body: { content } }),
        async onQueryStarted({ lessonId, content }, { dispatch, queryFulfilled }) {
            const patchResult = dispatch(
                teacherApi.util.updateQueryData('getLearningGoals', undefined, (draft) => {
                    const goal = draft.find(g => g.sections.some(s => s.lessons.some(l => l.id === lessonId)));
                    if (goal) {
                        for (const section of goal.sections) {
                            const lesson = section.lessons.find(l => l.id === lessonId);
                            if (lesson) {
                                lesson.content = content;
                                lesson.status = 'APPROVED';
                                break;
                            }
                        }
                    }
                })
            );
            try {
                await queryFulfilled;
            } catch {
                patchResult.undo();
            }
        },
    }),
    
    // Character creation
    createCharacter: builder.mutation<LearningGoal, { goalId: string; prompt: string }>({
        query: ({ goalId, prompt }) => ({
            url: `/goals/${goalId}/character`,
            method: 'POST',
            body: { prompt },
        }),
        transformResponse: (response: { data: LearningGoal }) => response.data,
        // Update the specific goal in the cache
        onQueryStarted({ goalId }, { dispatch, queryFulfilled }) {
            const patchResult = dispatch(
                teacherApi.util.updateQueryData('getLearningGoals', undefined, (draft) => {
                    const goalIndex = draft.findIndex(g => g.id === goalId);
                    if (goalIndex !== -1) {
                        // This will be updated with the server response
                        draft[goalIndex] = { ...draft[goalIndex] };
                    }
                })
            );
            
            queryFulfilled.catch(() => {
                patchResult.undo();
            });
        },
    }),
    generateCharacterForGoal: builder.mutation<{ data: LeonardoImage }, { goalId: string; prompt: string }>({
      query: ({ goalId, prompt }) => ({
        url: `/goals/${goalId}/generate-character`,
        method: 'POST',
        body: { prompt },
      }),
      invalidatesTags: (_result, _error, { goalId }) => [{ type: 'Goal', id: goalId }],
    }),
    approveCharacterForGoal: builder.mutation<{ data: LearningGoal }, { 
      goalId: string; 
      prompt: string; 
      imageId: string; 
      genId: string; 
      imageUrl: string 
    }>({
      query: ({ goalId, ...body }) => ({
        url: `/goals/${goalId}/approve-character`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { goalId }) => [
        { type: 'Goal', id: goalId },
        { type: 'Goal', id: 'LIST' },
      ],
    }),
        
    // Story Snippet Generation and Approval
    generateStorySnippet: builder.mutation<{ text: string; imageUrl: string }, { lessonId: string; refinementPrompt?: string }>({
      query: ({ lessonId, refinementPrompt }) => ({
        url: `/goals/lessons/${lessonId}/story`,
        method: 'POST',
        body: { refinementPrompt },
      }),
      transformResponse: (response: { data: { text: string; imageUrl: string } }) => response.data,
    }),

    approveStorySnippet: builder.mutation<StoryChapter, { 
      lessonId: string; 
      text: string; 
      imageUrl: string 
    }>({
      query: ({ lessonId, ...body }) => ({
        url: `/goals/lessons/${lessonId}/story/approve`,
        method: 'PUT',
        body,
      }),
      transformResponse: (response: { data: StoryChapter }) => response.data,
      // Invalidate the goals cache to reflect the updated story chapter
      invalidatesTags: () => [
        { type: 'Goal', id: 'LIST' },
      ],
    }),
  }),
});

// Экспортируем хуки
export const {
  useConnectStudentMutation, 
  useGetConnectedStudentsQuery,
  useGetLearningGoalsQuery,
  useCreateLearningGoalMutation, 
  useDeleteLearningGoalMutation,
  useGenerateRoadmapProposalMutation, 
  useUpdateRoadmapMutation,
  useGenerateLessonContentMutation,
  useUpdateLessonContentMutation,
  useGenerateCharacterForGoalMutation,
  useApproveCharacterForGoalMutation,
  useGenerateStorySnippetMutation,
  useApproveStorySnippetMutation,
} = teacherApi;

export type { LearningGoal, ContentSection, Lesson, Student, StoryChapter };

// LeonardoImage type for character generation
export interface LeonardoImage {
  generationId: string;
  imageId: string | null;
  url: string | null;
}
