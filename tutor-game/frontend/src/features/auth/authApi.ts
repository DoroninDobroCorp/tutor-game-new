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
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          // Save user data on successful token verification
          dispatch(setCredentials(data));
        } catch (err) {
          // If server returns an error (e.g., 401), do nothing
          // User will remain unauthenticated
          console.log('Profile fetch error:', err);
        }
      },
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
