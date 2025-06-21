import { apiSlice } from '../../app/api/apiSlice';

export const teacherApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Connect a student to the current teacher by email
    connectStudent: builder.mutation<{ message: string }, { email: string }>({
      query: (body) => ({
        url: '/teacher/students/connect',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Teacher', 'Student'],
    }),
    
    // Get all students connected to the current teacher
    getConnectedStudents: builder.query<Array<{
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
      lastActive: string | null;
    }>, void>({
      query: () => '/teacher/students',
      transformResponse: (response: { data: any }) => response.data,
      providesTags: (result) => 
        result 
          ? [...result.map(({ id }) => ({ type: 'Student' as const, id })), { type: 'Student', id: 'LIST' }]
          : [{ type: 'Student', id: 'LIST' }],
    }),
  }),
});

export const {
  useConnectStudentMutation,
  useGetConnectedStudentsQuery,
} = teacherApi;
