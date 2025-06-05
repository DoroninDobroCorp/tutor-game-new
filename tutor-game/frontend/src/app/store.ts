import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { apiSlice } from './api/apiSlice';
import authReducer, { AuthState } from '../features/auth/authSlice';

// --- START OF MAIN FIX ---

// 1. Try to get token from storage
const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null;

// 2. Create preloaded state for our auth slice.
// If token exists, we initialize the slice with this token.
// If not, Redux will use the initial state from the slice itself.
const preloadedState = token ? {
  auth: {
    user: null, // We still don't know the user, we'll need to request it
    token: token,
    refreshToken: null, // Refresh token is usually not stored in localStorage
    isAuthenticated: !!token, // Set to true if token exists
    isLoading: false,
    error: null
  } as AuthState,
} : undefined;

// --- END OF MAIN FIX ---

export const store = configureStore({
  reducer: {
    [apiSlice.reducerPath]: apiSlice.reducer,
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(apiSlice.middleware),
  devTools: process.env.NODE_ENV !== 'production',
  // 3. Pass the preloaded state to the store
  preloadedState,
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
