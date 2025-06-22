import { apiSlice } from '../../app/api/apiSlice';

interface Student {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
}

interface LearningGoal {
    id: string; 
    subject: string; 
    setting: string; 
    studentAge: number; 
    studentId: string;
    student: Student;
    sections: Array<{id: string; title: string; description: string; order: number}>;
    language?: string;
}
interface RoadmapProposal { sectionTitle: string; lessons: string[]; }

export const teacherApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    connectStudent: builder.mutation<{ message: string }, { email: string }>({
      query: (body) => ({ url: '/teacher/students/connect', method: 'POST', body }),
      invalidatesTags: ['Teacher', 'Student'],
    }),
    getConnectedStudents: builder.query<Array<{ id: string; email: string; firstName: string | null; lastName: string | null; }>, void>({
      query: () => '/teacher/students',
      transformResponse: (response: { data: any }) => response.data,
      providesTags: (result) => result ? [...result.map(({ id }) => ({ type: 'Student' as const, id })), { type: 'Student', id: 'LIST' }] : [{ type: 'Student', id: 'LIST' }],
    }),
    // --- Learning Goals Endpoints ---
    createLearningGoal: builder.mutation<LearningGoal, Omit<LearningGoal, 'id'>>({
        query: (body) => ({ url: '/goals', method: 'POST', body }),
        transformResponse: (response: { data: LearningGoal }) => response.data,
    }),
    getLearningGoal: builder.query<LearningGoal, string>({
        query: (goalId) => ({ url: `/goals/${goalId}`, method: 'GET' }),
        transformResponse: (response: { data: LearningGoal }) => response.data,
    }),
    getLearningGoals: builder.query<LearningGoal[], void>({
        query: () => '/goals',
        transformResponse: (response: { data: LearningGoal[] }) => response.data,
        providesTags: (result) =>
            result ? [...result.map(({ id }) => ({ type: 'User' as const, id })), { type: 'User', id: 'LIST' }] : [{ type: 'User', id: 'LIST' }],
    }),
    updateLearningGoal: builder.mutation<LearningGoal, Partial<LearningGoal>>({
        query: (body) => ({ url: '/goals', method: 'PUT', body }),
        transformResponse: (response: { data: LearningGoal }) => response.data,
    }),
    deleteLearningGoal: builder.mutation<void, string>({
        query: (goalId) => ({ url: `/goals/${goalId}`, method: 'DELETE' }),
    }),
    generateRoadmapProposal: builder.mutation<RoadmapProposal[], { goalId: string; existingPlan?: RoadmapProposal[]; feedback?: string }>({
        query: ({ goalId, ...body }) => ({
            url: `/goals/${goalId}/generate-roadmap`,
            method: 'POST',
            body: Object.keys(body).length > 0 ? body : undefined
        }),
        transformResponse: (response: { data: RoadmapProposal[] }) => response.data,
    }),
    updateRoadmap: builder.mutation<void, { goalId: string; roadmap: RoadmapProposal[] }>({
        query: ({ goalId, roadmap }) => ({ url: `/goals/${goalId}/roadmap`, method: 'PUT', body: { roadmap } }),
    }),
  }),
});

export const {
  useConnectStudentMutation, 
  useGetConnectedStudentsQuery,
  useCreateLearningGoalMutation, 
  useGetLearningGoalQuery,
  useGetLearningGoalsQuery,
  useUpdateLearningGoalMutation,
  useDeleteLearningGoalMutation,
  useGenerateRoadmapProposalMutation, 
  useUpdateRoadmapMutation,
} = teacherApi;
