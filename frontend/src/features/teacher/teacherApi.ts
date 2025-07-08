import { apiSlice } from '../../app/api/apiSlice';
import type { StudentInfo, PerformanceLog } from '../../types/models';

// API Slice
export const teacherApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        // Connect a student to the teacher
        connectStudent: builder.mutation<{ message: string }, { email: string }>({
            query: (data) => ({
                url: '/teacher/students/connect',
                method: 'POST',
                data,
            }),
            invalidatesTags: [{ type: 'Student', id: 'LIST' }],
        }),

        // Get list of connected students
        getConnectedStudents: builder.query<StudentInfo[], void>({
            query: () => ({
                url: '/teacher/students',
                method: 'GET',
            }),
            transformResponse: (response: { data: StudentInfo[] }) => response.data,
            providesTags: (result) => 
                result 
                    ? [
                        ...result.map(({ id }) => ({ type: 'Student' as const, id })),
                        { type: 'Student', id: 'LIST' }
                    ]
                    : [{ type: 'Student', id: 'LIST' }],
        }),

        // Get performance logs for a student's goal
        getPerformanceLogs: builder.query<PerformanceLog[], { goalId: string; studentId: string }>({
            query: ({ goalId, studentId }) => ({
                url: `/teacher/goals/${goalId}/students/${studentId}/logs`,
                method: 'GET',
            }),
            transformResponse: (response: { data: PerformanceLog[] }) => response.data || [],
            providesTags: (result = [], _error, { studentId, goalId }) => [
                ...result.map(() => ({ type: 'Student' as const, id: studentId })),
                ...result.map(() => ({ type: 'Goal' as const, id: goalId }))
            ]
        }),
    }),
});

// Export hooks
export const {
    useConnectStudentMutation,
    useGetConnectedStudentsQuery,
    useGetPerformanceLogsQuery,
    useLazyGetPerformanceLogsQuery,
} = teacherApi;
