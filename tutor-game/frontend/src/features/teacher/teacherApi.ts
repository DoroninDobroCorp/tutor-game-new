import { apiSlice } from '../../app/api/apiSlice';

// Types
export interface StudentInfo {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
}

// Types for performance logs
export interface PerformanceLog {
    id: string;
    question?: string | null;
    answer: string;
    isCorrect: boolean | null;
    createdAt: string;
    lesson: {
        title: string;
    };
}

// API Slice
export const teacherApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        // Connect a student to the teacher
        connectStudent: builder.mutation<{ message: string }, { email: string }>({
            query: (body) => ({
                url: '/teacher/students/connect',
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'Student', id: 'LIST' }],
        }),

        // Get list of connected students
        getConnectedStudents: builder.query<StudentInfo[], void>({
            query: () => '/teacher/students',
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
            query: ({ goalId, studentId }) => `/teacher/goals/${goalId}/students/${studentId}/logs`,
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
