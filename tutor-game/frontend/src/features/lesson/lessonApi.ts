import { apiSlice } from '../../app/api/apiSlice';
import { Lesson, StoryChapter } from '../goal/goalApi';

export const lessonApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        // УПРАВЛЕНИЕ КОНТЕНТОМ УРОКА
        generateLessonContent: builder.mutation<{ data: Lesson }, { lessonId: string }>({
            query: ({ lessonId }) => ({
                url: `/lessons/${lessonId}/generate-content`,
                method: 'POST',
            }),
            invalidatesTags: (_r, _e, { lessonId }) => [{ type: 'Goal', id: 'LIST' }, { type: 'Lesson', id: lessonId }],
        }),
        
        updateLessonContent: builder.mutation<Lesson, { lessonId: string; content: any }>({
            query: ({ lessonId, content }) => ({
                url: `/lessons/${lessonId}/content`,
                method: 'PUT',
                body: { content },
            }),
            invalidatesTags: (_r, _e, { lessonId }) => [{ type: 'Goal', id: 'LIST' }, { type: 'Lesson', id: lessonId }],
        }),

        // УПРАВЛЕНИЕ ИСТОРИЕЙ (STORY CHAPTER)
        generateStorySnippet: builder.mutation<{ data: StoryChapter }, { lessonId: string, [key: string]: any }>({
            query: ({ lessonId, ...body }) => ({
                url: `/lessons/${lessonId}/story/generate`,
                method: 'POST',
                body,
            }),
            invalidatesTags: (_r, _e, { lessonId }) => [{ type: 'Lesson', id: lessonId }],
        }),
        
        approveStorySnippet: builder.mutation<StoryChapter, { lessonId: string, [key: string]: any }>({
            query: ({ lessonId, ...body }) => ({
                url: `/lessons/${lessonId}/story/approve`,
                method: 'PUT',
                body,
            }),
            invalidatesTags: (_r, _e, { lessonId }) => [{ type: 'Goal', id: 'LIST' }, { type: 'Lesson', id: lessonId }],
        }),
        
        approveStorySnippetWithUpload: builder.mutation<StoryChapter, { lessonId: string; image: File }>({
            query: ({ lessonId, image }) => {
                const formData = new FormData();
                formData.append('image', image);
                return {
                    url: `/lessons/${lessonId}/story/approve-with-upload`,
                    method: 'PUT',
                    body: formData,
                };
            },
            invalidatesTags: (_r, _e, { lessonId }) => [{ type: 'Goal', id: 'LIST' }, { type: 'Lesson', id: lessonId }],
        }),
    }),
});

export const {
    useGenerateLessonContentMutation,
    useUpdateLessonContentMutation,
    useGenerateStorySnippetMutation,
    useApproveStorySnippetMutation,
    useApproveStorySnippetWithUploadMutation,
} = lessonApi;
