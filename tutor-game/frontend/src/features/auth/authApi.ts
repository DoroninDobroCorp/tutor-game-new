import { apiSlice } from '../../app/api/apiSlice';
import { logout, setUser, setCredentials, User } from './authSlice';
import { toast } from 'react-hot-toast';

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
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          const { user, accessToken, refreshToken } = data.data;

          // Save token to localStorage
          window.localStorage.setItem('token', accessToken);
          
          // Set credentials in Redux store
          dispatch(setCredentials({ user, token: accessToken, refreshToken }));
          
          // Show success message
          toast.success('Registration successful! Welcome!');
        } catch (err) {
          // Error will be handled by the component
          console.error('Registration failed in onQueryStarted:', err);
        }
      },
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
    getProfile: builder.query<{ data: User }, void>({
      query: () => '/auth/me',
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          // Update only the user data in the auth state
          dispatch(setUser(data.data)); // Extract user from response.data
        } catch (err) {
          console.error('Failed to fetch profile:', err);
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
