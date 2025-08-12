import { apiSlice } from '../../app/api/apiSlice';
import type { Achievement } from '../../types/models';

export interface GenerateImagePayload {
  prompt: string;
}

export const achievementsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getStudentAchievements: builder.query<Achievement[], void>({
      query: () => ({ url: '/student/achievements', method: 'GET' }),
      transformResponse: (resp: { success: boolean; data: Achievement[] }) => resp.data || [],
      providesTags: (result = []) => [
        ...result.map((a) => ({ type: 'Achievement' as const, id: a.id })),
        { type: 'Achievement' as const, id: 'LIST' },
      ],
    }),

    getTeacherAchievements: builder.query<Achievement[], { studentId: string }>({
      query: ({ studentId }) => ({ url: `/teacher/achievements`, method: 'GET', params: { studentId } }),
      transformResponse: (resp: { success: boolean; data: Achievement[] }) => resp.data || [],
      providesTags: (result = []) => [
        ...result.map((a) => ({ type: 'Achievement' as const, id: a.id })),
        { type: 'Achievement' as const, id: 'LIST' },
      ],
    }),

    generateAchievementImage: builder.mutation<{ imageUrl: string; prompt: string }, GenerateImagePayload>({
      query: (data) => ({ url: '/teacher/achievements/generate-image', method: 'POST', data }),
      transformResponse: (resp: { success: boolean; data: { imageUrl: string; prompt: string } }) => resp.data,
    }),

    uploadAchievementImage: builder.mutation<{ imageUrl: string }, { file: File }>({
      query: ({ file }) => {
        const formData = new FormData();
        formData.append('image', file);
        return { url: '/teacher/achievements/upload', method: 'POST', data: formData, headers: { 'Content-Type': 'multipart/form-data' } };
      },
      transformResponse: (resp: { success: boolean; data: { imageUrl: string } }) => resp.data,
    }),

    createAchievement: builder.mutation<Achievement, { studentId: string; title: string; reason: string; imageUrl?: string | null }>({
      query: (data) => ({ url: '/teacher/achievements', method: 'POST', data }),
      transformResponse: (resp: { success: boolean; data: Achievement }) => resp.data,
      invalidatesTags: [{ type: 'Achievement', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetStudentAchievementsQuery,
  useGetTeacherAchievementsQuery,
  useGenerateAchievementImageMutation,
  useUploadAchievementImageMutation,
  useCreateAchievementMutation,
} = achievementsApi;
