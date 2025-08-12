import { apiSlice } from '../../app/api/apiSlice';
import type { 
    LearningGoal,
    RoadmapProposal,
    StoryChapterHistory
} from '../../types/models';

export const goalApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
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
        
        getLearningGoalById: builder.query<LearningGoal, string>({
            query: (goalId) => ({
                url: `/goals/${goalId}`,
                method: 'GET',
            }),
            transformResponse: (response: { data: LearningGoal }) => response.data,
            providesTags: (result, _error, id) => {
                const tags: any[] = [{ type: 'Goal', id }];
                if (result?.sections) {
                    result.sections.forEach(section => {
                        if (section.lessons) {
                            section.lessons.forEach(lesson => {
                                tags.push({ type: 'Lesson', id: lesson.id });
                            });
                        }
                    });
                }
                return tags;
            },
        }),

        createLearningGoal: builder.mutation<LearningGoal, Partial<LearningGoal>>({
            query: (data) => ({
                url: '/goals',
                method: 'POST',
                data
            }),
            transformResponse: (response: { data: LearningGoal }) => response.data,
            invalidatesTags: [{ type: 'Goal', id: 'LIST' }],
        }),

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

        getGoalStoryHistory: builder.query<StoryChapterHistory[], string>({
            query: (goalId) => ({
                url: `/goals/${goalId}/story-history`,
                method: 'GET',
            }),
            transformResponse: (response: { data: StoryChapterHistory[] }) => response.data || [],
            providesTags: (result, _error, goalId) => 
                result ? [{ type: 'Goal' as const, id: `STORY_HISTORY_${goalId}` }] : [],
        }),

        generateRoadmapProposal: builder.mutation<RoadmapProposal, { 
            goalId: string; 
            chatHistory: any[]; 
        }>({
            query: ({ goalId, chatHistory }) => ({
                url: `/goals/${goalId}/generate-roadmap`,
                method: 'POST',
                data: { chatHistory },
            }),
            transformResponse: (response: { data: RoadmapProposal }) => response.data,
        }),

        updateRoadmap: builder.mutation<LearningGoal, { goalId: string; roadmap: any[] }>({
            query: ({ goalId, roadmap }) => ({
                url: `/goals/${goalId}/roadmap`,
                method: 'PUT',
                data: { roadmap },
            }),
            transformResponse: (response: { data: LearningGoal }) => response.data,
            invalidatesTags: (_, __, { goalId }) => [
                { type: 'Goal', id: goalId },
                { type: 'Goal', id: 'LIST' }
            ],
        }),

        generateCharacterForGoal: builder.mutation<LearningGoal, { goalId: string; prompt: string }>({
            query: ({ goalId, prompt }) => ({
                url: `/goals/${goalId}/generate-character`,
                method: 'POST',
                data: { prompt },
            }),
            transformResponse: (response: { data: LearningGoal }) => response.data,
            invalidatesTags: (_result, _error, { goalId }) => [
                { type: 'Goal', id: goalId }, 
                { type: 'Goal', id: 'LIST' }
            ],
        }),

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
                    isFormData: true
                };
            },
            transformResponse: (response: { data: LearningGoal }) => response.data,
            invalidatesTags: (_result, _error, { goalId }) => [{ type: 'Goal', id: 'LIST' }, { type: 'Goal', id: goalId }],
        }),

        updateCharacterPrompt: builder.mutation<LearningGoal, { goalId: string; prompt: string }>({
            query: ({ goalId, prompt }) => ({
                url: `/goals/${goalId}/character-prompt`,
                method: 'PUT',
                data: { prompt },
            }),
            transformResponse: (response: { data: LearningGoal }) => response.data,
            invalidatesTags: (_result, _error, { goalId }) => [
                { type: 'Goal', id: goalId },
                { type: 'Goal', id: 'LIST' }
            ],
        }),

        // Diagnostic Topics (Teacher)
        getGoalTopics: builder.query<Array<{ id: string; title: string; description?: string | null }>, string>({
            query: (goalId) => ({
                url: `/goals/${goalId}/topics`,
                method: 'GET',
            }),
            transformResponse: (response: { data: Array<{ id: string; title: string; description?: string | null }> }) => response.data,
            providesTags: (_result, _error, goalId) => [{ type: 'Goal' as const, id: `TOPICS_${goalId}` }],
        }),
        upsertGoalTopics: builder.mutation<Array<{ id: string; title: string; description?: string | null }>, { goalId: string; topics: Array<{ id?: string; title: string; description?: string | null }> }>({
            query: ({ goalId, topics }) => ({
                url: `/goals/${goalId}/topics`,
                method: 'PUT',
                data: { topics },
            }),
            transformResponse: (response: { data: Array<{ id: string; title: string; description?: string | null }> }) => response.data,
            invalidatesTags: (_res, _err, { goalId }) => [{ type: 'Goal' as const, id: `TOPICS_${goalId}` }],
        }),
        deleteGoalTopic: builder.mutation<{ message: string }, { goalId: string; topicId: string }>({
            query: ({ goalId, topicId }) => ({
                url: `/goals/${goalId}/topics/${topicId}`,
                method: 'DELETE',
            }),
            invalidatesTags: (_res, _err, { goalId }) => [{ type: 'Goal' as const, id: `TOPICS_${goalId}` }],
        }),

        // Diagnostics latest summary for teacher
        getLatestDiagnosticSummaryForGoalTeacher: builder.query<
            { exists: boolean; summary?: { total: number; labels: { EXCELLENT: number; REFRESH: number; UNKNOWN: number } }; suggestedRoadmap?: Array<{ sectionTitle: string; lessons: string[] }> },
            string
        >({
            query: (goalId) => ({ url: `/goals/${goalId}/diagnostics/latest-summary`, method: 'GET' }),
            transformResponse: (response: { data: any }) => response.data,
            providesTags: (_res, _err, goalId) => [{ type: 'Goal' as const, id: `DIAG_SUMMARY_${goalId}` }],
        }),

        // Diagnostics topics generation (AI) for teacher
        generateDiagnosticTopics: builder.mutation<{ topics: Array<string | { title: string; firstQuestion: string }> }, { goalId: string; teacherNote?: string }>({
            query: ({ goalId, teacherNote }) => ({
                url: `/goals/${goalId}/diagnostics/generate-topics`,
                method: 'POST',
                data: teacherNote ? { teacherNote } : {},
            }),
            transformResponse: (response: { data: { topics: Array<string | { title: string; firstQuestion: string }> } }) => response.data,
        }),
    }),
});

export const {
    useGetLearningGoalsQuery,
    useGetLearningGoalByIdQuery,
    useCreateLearningGoalMutation,
    useDeleteLearningGoalMutation,
    useGetGoalStoryHistoryQuery,
    useLazyGetGoalStoryHistoryQuery,
    useGenerateRoadmapProposalMutation,
    useUpdateRoadmapMutation,
    useGenerateCharacterForGoalMutation,
    useUploadCharacterImageMutation,
    useUpdateCharacterPromptMutation,
    useGetGoalTopicsQuery,
    useUpsertGoalTopicsMutation,
    useDeleteGoalTopicMutation,
    useGetLatestDiagnosticSummaryForGoalTeacherQuery,
    useGenerateDiagnosticTopicsMutation,
} = goalApi;
