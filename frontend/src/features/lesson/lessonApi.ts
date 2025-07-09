import { apiSlice } from '../../app/api/apiSlice';
import { Lesson, StoryChapter } from '../goal/goalApi';

export interface GenerationResult {
    generationId: string;
    imageId: string | null;
    url: string | null;
    status: 'PENDING' | 'COMPLETE' | 'FAILED';
}

export const lessonApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        // ... existing endpoints ...
        
        // New endpoint to check image generation status
        checkStoryImageStatus: builder.query<{ data: GenerationResult }, string>({
            query: (generationId) => ({
                url: `/story/generation/${generationId}`,
                method: 'GET',
            }),
            // Use a valid tag type from the API slice
            providesTags: (result) => 
                result?.data ? [{ type: 'Lesson', id: result.data.generationId }] : [],
        }),
        // УПРАВЛЕНИЕ КОНТЕНТОМ УРОКА
        generateLessonContent: builder.mutation<{ data: { chatResponse: string, blocks: any[] } }, { lessonId: string; chatHistory: any[] }>({
            query: ({ lessonId, chatHistory }) => ({
                url: `/lessons/${lessonId}/generate-content`, data: { chatHistory },
                method: 'POST',
            }),
            invalidatesTags: (_r, _e, { lessonId }) => [{ type: 'Goal', id: 'LIST' }, { type: 'Lesson', id: lessonId }],
        }),
        
        updateLessonContent: builder.mutation<Lesson, { lessonId: string; content: any }>({
            query: ({ lessonId, content }) => ({
                url: `/lessons/${lessonId}/content`,
                method: 'PUT',
                data: { content },
            }),
            invalidatesTags: (_r, _e, { lessonId }) => [{ type: 'Goal', id: 'LIST' }, { type: 'Lesson', id: lessonId }],
        }),

        // УПРАВЛЕНИЕ ИСТОРИЕЙ (STORY CHAPTER)
        generateStorySnippet: builder.mutation<{ data: StoryChapter }, { lessonId: string, [key: string]: any }>({
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
                    isFormData: true // Add this flag to handle FormData properly
                };
            },
            invalidatesTags: (_r, _e, { lessonId }) => [{ type: 'Goal', id: 'LIST' }, { type: 'Lesson', id: lessonId }],
        }),
        
        regenerateStoryImage: builder.mutation<{ data: { generationId: string; prompt: string } }, { lessonId: string; prompt: string }>({
            query: ({ lessonId, prompt }) => ({
                url: `/lessons/${lessonId}/story/regenerate-image`,
                method: 'POST',
                data: { prompt },
            }),
        }),
    }),
});

export const {
    useGenerateLessonContentMutation,
    useUpdateLessonContentMutation,
    useGenerateStorySnippetMutation,
    useApproveStorySnippetMutation,
    useApproveStorySnippetWithUploadMutation,
    useLazyCheckStoryImageStatusQuery,
    useRegenerateStoryImageMutation,
} = lessonApi;
