import { apiSlice } from '../../app/api/apiSlice';

// Types
export interface StudentInfo {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
}

export interface StoryChapter {
    id: string;
    teacherSnippetText: string;
    studentSnippetText: string;
    teacherSnippetImageUrl: string;
    teacherSnippetImagePrompt: string | null;
    teacherSnippetStatus: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'COMPLETED';
}

export interface Lesson {
    id: string;
    title: string;
    status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'COMPLETED';
    order: number;
    content?: { blocks: any[] } | null;
    storyChapter?: StoryChapter | null;
    previousLesson?: Lesson | null;
}

export interface ContentSection {
    id: string;
    title: string;
    order: number;
    lessons: Lesson[];
}

export interface LearningGoal {
    id: string; 
    subject: string; 
    setting: string; 
    studentAge: number; 
    studentId: string;
    student: StudentInfo;
    sections: ContentSection[];
    characterImageUrl?: string | null;
    characterDescription?: string | null;
    characterStatus?: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED';
    characterGenerationId?: string | null;
    imageUrl?: string | null;
    description?: string | null;
    generationId?: string | null;
}

export interface RoadmapProposal {
    sectionTitle: string;
    lessons: string[];
}

export const goalApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        // Получение всех целей обучения
        getLearningGoals: builder.query<LearningGoal[], void>({
            query: () => ({
                url: '/goals',
                method: 'GET'
            }),
            transformResponse: (response: { data: LearningGoal[] }) => response.data,
            providesTags: (result) => 
                result 
                    ? [
                        ...result.map(({ id }) => ({ type: 'Goal' as const, id })),
                        { type: 'Goal', id: 'LIST' }
                    ]
                    : [{ type: 'Goal', id: 'LIST' }],
        }),
        
        // Получение цели обучения по ID
        getLearningGoalById: builder.query<LearningGoal, string>({
            query: (goalId) => ({
                url: `/goals/${goalId}`,
                method: 'GET',
            }),
            transformResponse: (response: { data: LearningGoal }) => response.data,
            providesTags: (_result, _error, id) => [{ type: 'Goal', id }],
        }),

        // Создание новой цели обучения
        createLearningGoal: builder.mutation<LearningGoal, { subject: string; setting: string; studentAge: number }>({
            query: (data) => ({
                url: '/goals',
                method: 'POST',
                data
            }),
            transformResponse: (response: { data: LearningGoal }) => response.data,
            invalidatesTags: [{ type: 'Goal', id: 'LIST' }],
        }),

        // Удаление цели обучения
        deleteLearningGoal: builder.mutation<void, string>({
            query: (goalId) => ({
                url: `/goals/${goalId}`,
                method: 'DELETE',
            }),
            invalidatesTags: (_, __, goalId) => [
                { type: 'Goal', id: goalId },
                { type: 'Goal', id: 'LIST' }
            ],
        }),

        // Генерация предложения по учебному плану
        generateRoadmapProposal: builder.mutation<RoadmapProposal[], { 
            goalId: string; 
            existingPlan?: ContentSection[]; 
            feedback?: string 
        }>({
            query: ({ goalId, ...data }) => ({
                url: `/goals/${goalId}/generate-roadmap`,
                method: 'POST',
                data,
            }),
            transformResponse: (response: { data: RoadmapProposal[] }) => response.data,
        }),

        // Обновление учебного плана
        updateRoadmap: builder.mutation<void, { goalId: string; roadmap: ContentSection[] }>({
            query: ({ goalId, roadmap }) => ({
                url: `/goals/${goalId}/roadmap`,
                method: 'PUT',
                data: { roadmap },
            }),
            invalidatesTags: (_, __, { goalId }) => [
                { type: 'Goal', id: goalId },
                { type: 'Goal', id: 'LIST' }
            ],
        }),

        // Генерация персонажа для цели
        generateCharacterForGoal: builder.mutation<LearningGoal, { goalId: string; prompt: string }>({
            query: ({ goalId, prompt }) => ({
                url: `/goals/${goalId}/generate-character`,
                method: 'POST',
                data: { prompt },
            }),
            transformResponse: (response: { data: LearningGoal }) => response.data,
            // Автоматически обновляет кэш при успешной мутации
            invalidatesTags: (_result, _error, { goalId }) => [
                { type: 'Goal', id: goalId }, 
                { type: 'Goal', id: 'LIST' }
            ],
        }),

        // Подтверждение персонажа
        approveCharacterForGoal: builder.mutation<void, { goalId: string; isApproved: boolean }>({
            query: ({ goalId, isApproved }) => ({
                url: `/goals/${goalId}/character/approve`,
                method: 'POST',
                data: { isApproved },
            }),
            invalidatesTags: (_, __, { goalId }) => [
                { type: 'Goal', id: goalId },
                { type: 'Goal', id: 'LIST' }
            ],
        }),

        // Загрузка своего изображения для персонажа
        uploadCharacterImage: builder.mutation<LearningGoal, { goalId: string; image: File; prompt?: string }>({
            query: ({ goalId, image, prompt }) => {
                const formData = new FormData();
                formData.append('image', image);
                if (prompt) {
                    formData.append('prompt', prompt);
                }
                
                return {
                    url: `/goals/${goalId}/upload-character`,
                    method: 'POST',
                    data: formData,
                    isFormData: true // Add this flag to handle FormData properly
                };
            },
            transformResponse: (response: { data: LearningGoal }) => response.data,
            invalidatesTags: (_result, _error, { goalId }) => [{ type: 'Goal', id: 'LIST' }, { type: 'Goal', id: goalId }],
            async onQueryStarted({ goalId }, { dispatch, queryFulfilled }) {
                const patchResult = dispatch(
                    goalApi.util.updateQueryData('getLearningGoals', undefined, (draft) => {
                        const goal = draft?.find(g => g.id === goalId);
                        if (goal) {
                            goal.characterStatus = 'PENDING_APPROVAL';
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
    }),
});

export const {
    useGetLearningGoalsQuery,
    useGetLearningGoalByIdQuery,
    useCreateLearningGoalMutation,
    useDeleteLearningGoalMutation,
    useGenerateRoadmapProposalMutation,
    useUpdateRoadmapMutation,
    useGenerateCharacterForGoalMutation,
    useApproveCharacterForGoalMutation,
    useUploadCharacterImageMutation,
} = goalApi;
