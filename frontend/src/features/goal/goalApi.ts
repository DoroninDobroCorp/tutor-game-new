import { apiSlice } from '../../app/api/apiSlice';
import { toast } from 'react-hot-toast';
import type { 
    LearningGoal,
    RoadmapProposal,
    ContentSection
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
            providesTags: (_result, _error, id) => [{ type: 'Goal', id }],
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
    useUploadCharacterImageMutation,
} = goalApi;
