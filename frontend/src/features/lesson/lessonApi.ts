import { apiSlice } from '../../app/api/apiSlice';
import { Lesson, StoryChapter } from '../../types/models';

export const lessonApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
        generateLessonContent: builder.mutation<{ data: { chatResponse: string, blocks: any[] } }, { lessonId: string; chatHistory: any[] }>({
            query: ({ lessonId, chatHistory }) => ({
                url: `/lessons/${lessonId}/generate-content`, data: { chatHistory },
                method: 'POST',
            }),
            invalidatesTags: (_r, _e, { lessonId }) => [{ type: 'Goal', id: 'LIST' }, { type: 'Lesson', id: lessonId }],
        }),
        
        generateControlWorkContent: builder.mutation<{ data: { chatResponse: string; blocks: any[] } }, { lessonId: string; chatHistory: any[] }>({
            query: ({ lessonId, chatHistory }) => ({
                url: `/lessons/${lessonId}/generate-control-work`,
                method: 'POST',
                data: { chatHistory },
            }),
            invalidatesTags: (_r, _e, { lessonId }) => [{ type: 'Lesson', id: lessonId }],
        }),

        updateLessonContent: builder.mutation<Lesson, { lessonId: string; content: any }>({
            query: ({ lessonId, content }) => ({
                url: `/lessons/${lessonId}/content`,
                method: 'PUT',
                data: { content },
            }),
            invalidatesTags: (_r, _e, { lessonId }) => [{ type: 'Goal', id: 'LIST' }, { type: 'Lesson', id: lessonId }],
        }),

        // Save diagnostic topics for a lesson
        saveDiagnosticTopics: builder.mutation<
            { success: boolean; data: Lesson },
            { lessonId: string; topics: Array<string | { title: string; firstQuestion?: string; firstQuestionExample?: string }> }
        >({
            query: ({ lessonId, topics }) => ({
                url: `/lessons/${lessonId}/diagnostic`,
                method: 'PATCH',
                data: { topics },
            }),
            invalidatesTags: (_r, _e, { lessonId }) => [{ type: 'Lesson', id: lessonId }],
        }),

        generateStorySnippet: builder.mutation<{ data: { text: string; imagePrompt: string; useCharacterReference: boolean; } }, { lessonId: string, [key: string]: any }>({
            query: ({ lessonId, ...data }) => ({
                url: `/lessons/${lessonId}/story/generate`,
                method: 'POST',
                data,
            }),
            invalidatesTags: (_r, _e, { lessonId }) => [{ type: 'Lesson', id: lessonId }],
        }),
        
        approveStorySnippet: builder.mutation<StoryChapter, { lessonId: string, [key: string]: any }>({
            query: ({ lessonId, ...data }) => ({
                url: `/lessons/${lessonId}/story/approve`,
                method: 'PUT',
                data,
            }),
            invalidatesTags: (_r, _e, { lessonId }) => [{ type: 'Goal', id: 'LIST' }, { type: 'Lesson', id: lessonId }],
        }),
        
        approveStorySnippetWithUpload: builder.mutation<StoryChapter, { lessonId: string; image: File; text: string; prompt: string }>({
            query: ({ lessonId, image, text, prompt }) => {
                const formData = new FormData();
                formData.append('image', image);
                formData.append('text', text);
                formData.append('prompt', prompt);
                return {
                    url: `/lessons/${lessonId}/story/approve-with-upload`,
                    method: 'PUT',
                    data: formData,
                    isFormData: true
                };
            },
            invalidatesTags: (_r, _e, { lessonId }) => [{ type: 'Goal', id: 'LIST' }, { type: 'Lesson', id: lessonId }],
        }),

        regenerateStoryImage: builder.mutation<{ data: { imageUrl: string; prompt: string } }, { lessonId: string; prompt: string; useCharacterReference: boolean; }>({
            query: ({ lessonId, prompt, useCharacterReference }) => ({
                url: `/lessons/${lessonId}/story/regenerate-image`,
                method: 'POST',
                data: { prompt, useCharacterReference },
            }),
        }),
    }),
});

export const {
    useGenerateLessonContentMutation,
    useSaveDiagnosticTopicsMutation,
    useUpdateLessonContentMutation,
    useGenerateStorySnippetMutation,
    useApproveStorySnippetMutation,
    useApproveStorySnippetWithUploadMutation,
    useRegenerateStoryImageMutation,
    useGenerateControlWorkContentMutation,
} = lessonApi;