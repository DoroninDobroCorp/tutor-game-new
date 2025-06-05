import { apiSlice } from '../../app/api/apiSlice';
import { setCredentials, logout } from './authSlice';

// Auth API endpoints using the base apiSlice
export const authApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: { ...credentials },
      }),
    }),
    register: builder.mutation({
      query: (credentials) => ({
        url: '/auth/register',
        method: 'POST',
        body: { ...credentials },
      }),
    }),
    logout: builder.mutation({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(logout());
          // Clear the token from localStorage on logout
          window.localStorage.removeItem('token');
          // Reset API state after a short delay
          setTimeout(() => {
            dispatch(apiSlice.util.resetApiState());
          }, 1000);
        } catch (err) {
          console.log(err);
        }
      },
    }),
    getProfile: builder.query({
      query: () => '/auth/profile',
      // RTK Query will handle caching automatically
    }),
  }),
});

// Export hooks for usage in components
export const { 
  useLoginMutation, 
  useRegisterMutation, 
  useLogoutMutation,
  useGetProfileQuery
} = authApiSlice;
