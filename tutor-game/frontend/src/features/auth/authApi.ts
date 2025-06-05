import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { setCredentials, logout } from './authSlice';
import { RootState } from '../../app/store';
import { toast } from 'react-hot-toast';

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  email: string;
  password: string;
  role: 'STUDENT' | 'TEACHER';
  firstName: string;
  lastName: string;
}

interface AuthResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'student' | 'teacher';
    avatar?: string;
  };
  accessToken: string;
  refreshToken: string;
}

const baseQuery = fetchBaseQuery({
  baseUrl: 'http://localhost:3002/api/auth',
  credentials: 'include',
  mode: 'cors',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
  prepareHeaders: (headers, { getState }) => {
    try {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    } catch (error) {
      console.error('Error in prepareHeaders:', error);
      return headers;
    }
  },
});

const baseQueryWithReauth = async (args: any, api: any, extraOptions: any) => {
  let result = await baseQuery(args, api, extraOptions);
  
  // If token is invalid or expired
  if (result?.error?.status === 401) {
    console.log('Token expired or invalid, attempting to refresh...');
    
    try {
      // Try to refresh the token (refresh token is sent via cookie)
      const refreshResult = await baseQuery({
        url: '/refresh',
        method: 'POST',
        credentials: 'include',
      }, api, extraOptions);
      
      if (refreshResult?.data) {
        const data = refreshResult.data as { accessToken: string };
        console.log('Token refresh successful');
        
        // Update the stored access token
        const state = api.getState() as RootState;
        const currentUser = state.auth.user;
        
        if (currentUser) {
          api.dispatch(setCredentials({
            user: currentUser,
            token: data.accessToken,
            // Don't update refreshToken here - it's httpOnly cookie
          }));
          
          // Retry the initial query with the new token
          const retryResult = await baseQuery(args, api, extraOptions);
          return retryResult;
        }
      }
    } catch (error) {
      console.error('Error during token refresh:', error);
    }
    
    // If we get here, refresh failed - log the user out
    console.log('Token refresh failed, logging out...');
    api.dispatch(logout());
    window.location.href = '/login';
    return result;
  }
  
  return result;
};

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: baseQueryWithReauth,
  endpoints: (builder) => ({
    login: builder.mutation<AuthResponse, LoginRequest>({
      query: (credentials) => ({
        url: '/login',
        method: 'POST',
        body: credentials,
        credentials: 'include',
      }),
      async onQueryStarted(_args, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setCredentials({
            user: data.user,
            token: data.accessToken,
            // Don't store refreshToken here - it's httpOnly cookie
          }));
          
          // Redirect based on user role
          const redirectPath = data.user.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard';
          window.location.href = redirectPath;
        } catch (error) {
          console.error('Login failed:', error);
          throw error; // Let the component handle the error
        }
      },
    }),
    register: builder.mutation<{ data: AuthResponse }, RegisterRequest>({
      query: (userData) => ({
        url: '/register',
        method: 'POST',
        body: userData,
      }),
      async onQueryStarted(_args, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          console.log('Registration successful:', data);
          
          // The response is wrapped in a data property
          const responseData = data.data;
          
          dispatch(setCredentials({
            user: responseData.user,
            token: responseData.accessToken,
            refreshToken: responseData.refreshToken
          }));
          
          // Show success message
          toast.success('Registration successful!');
          
          // Redirect based on user role
          const dashboardPath = responseData.user.role.toLowerCase() === 'teacher' ? '/teacher' : '/student';
          console.log('Redirecting to:', dashboardPath);
          window.location.href = dashboardPath;
          
        } catch (error) {
          console.error('Registration failed in onQueryStarted:', error);
          // Don't show error here - it will be handled by the component
        }
      },
    }),
    getMe: builder.query<AuthResponse['user'], void>({
      query: () => ({
        url: '/me',
        credentials: 'include',
      }),
      // Force refetch when the page is focused or reconnected
      // This helps recover from token expiration
      onCacheEntryAdded: async (_arg, { dispatch, cacheDataLoaded }) => {
        try {
          const { data: user } = await cacheDataLoaded;
          
          // Update the auth state with the latest user data
          if (user) {
            dispatch(setCredentials({
              user,
              token: localStorage.getItem('token') || '',
            }));
          }
        } catch (error) {
          console.error('Error in getMe subscription:', error);
        }
      },
    }),
    logout: builder.mutation<void, void>({
      query: () => ({
        url: '/logout',
        method: 'POST',
        credentials: 'include',
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } catch (error) {
          console.error('Logout API call failed, but proceeding with client cleanup:', error);
        } finally {
          // Always clear client-side auth state
          localStorage.removeItem('token');
          sessionStorage.removeItem('token');
          dispatch(logout());
          
          // Redirect to login page after a short delay
          setTimeout(() => {
            window.location.href = '/login';
          }, 100);
        }
      },
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useGetMeQuery,
  useLogoutMutation,
} = authApi;
