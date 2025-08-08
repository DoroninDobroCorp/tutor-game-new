import { apiSlice } from '../../app/api/apiSlice';
import { logout, setUser } from './authSlice';
import type { User, UserRole } from '../../types/models';

// Types for our API
type LoginCredentials = {
  email: string;
  password: string;
};

type RegisterCredentials = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole; // 'student' | 'teacher'
};

type AuthResponse = {
  user: User;
  accessToken: string;
};

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
};

// Auth API endpoints using the base apiSlice
export const authApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<ApiResponse<AuthResponse>, LoginCredentials>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        data: credentials,
        credentials: 'include',
      }),
      invalidatesTags: ['User'],
      transformResponse: (response: ApiResponse<AuthResponse>) => {
        if (!response.data?.user || !response.data?.accessToken) {
          throw new Error('Invalid server response');
        }
        return {
          success: true,
          data: {
            user: response.data.user,
            accessToken: response.data.accessToken,
          },
        };
      },
    }),
    register: builder.mutation<ApiResponse<AuthResponse>, RegisterCredentials>({
      query: (credentials) => {
        const payload = {
          ...credentials,
          // Send role in UPPERCASE to match backend expectations
          role: credentials.role.toUpperCase() as 'STUDENT' | 'TEACHER'
        };
        
        return {
          url: '/auth/register',
          method: 'POST',
          data: payload,
          credentials: 'include',
        };
      },
      invalidatesTags: ['User'],
      transformResponse: (response: ApiResponse<AuthResponse>) => {
        if (!response.data?.user || !response.data?.accessToken) {
          throw new Error('Invalid server response');
        }
        return {
          success: true,
          data: {
            user: response.data.user,
            accessToken: response.data.accessToken,
          },
        };
      },
    }),
    logout: builder.mutation<{ success: boolean }, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
        credentials: 'include',
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(logout());
          // Reset API state after a short delay
          setTimeout(() => {
            dispatch(apiSlice.util.resetApiState());
          }, 1000);
        } catch (err) {
          console.log('Logout error:', err);
          // Even if the server request fails, we still want to clear the local state
          dispatch(logout());
        }
      },
    }),
    refreshToken: builder.mutation<ApiResponse<AuthResponse>, void>({
      query: () => ({
        url: '/auth/refresh',
        method: 'POST',
        credentials: 'include',
      }),
      transformResponse: (response: ApiResponse<AuthResponse>) => {
        if (!response.data?.user || !response.data?.accessToken) {
          throw new Error('Invalid refresh token response');
        }
        return {
          success: true,
          data: {
            user: response.data.user,
            accessToken: response.data.accessToken,
          },
        };
      },
    }),
    getProfile: builder.query<ApiResponse<{ user: User }>, void>({
      query: () => ({
        url: '/auth/me',
        credentials: 'include', // Important for cookies
      }),
      transformResponse: (response: ApiResponse<{ user: User }>) => {
        if (!response.data?.user) {
          throw new Error('No user data received');
        }
        return response;
      },
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data.data?.user) {
            dispatch(setUser(data.data.user));
          }
        } catch (error) {
          console.error('Failed to fetch profile:', error);
          dispatch(logout());
        }
      },
      // Invalidate this query when the user logs out
      providesTags: ['User'],
    }),
  }),
});

// Export hooks for usage in components
export const { 
  useLoginMutation, 
  useRegisterMutation, 
  useLogoutMutation,
  useRefreshTokenMutation,
  useGetProfileQuery 
} = authApiSlice;

// Export the api slice for use in the store
export default authApiSlice;
