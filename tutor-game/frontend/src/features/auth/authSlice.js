import { createSlice } from '@reduxjs/toolkit';
const initialState = {
    user: null,
    token: localStorage.getItem('token'),
    refreshToken: localStorage.getItem('refreshToken'),
    isAuthenticated: !!localStorage.getItem('token'),
    isLoading: false,
    error: null,
};
const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        // Updates only the user data in the auth state
        setUser: (state, action) => {
            state.user = action.payload;
        },
        setCredentials: (state, action) => {
            state.user = action.payload.user;
            state.token = action.payload.token;
            if (action.payload.refreshToken) {
                state.refreshToken = action.payload.refreshToken;
                localStorage.setItem('refreshToken', action.payload.refreshToken);
            }
            state.isAuthenticated = true;
            state.error = null;
            localStorage.setItem('token', action.payload.token);
            // Also store token in sessionStorage for better security
            sessionStorage.setItem('token', action.payload.token);
        },
        authStart: (state) => {
            state.isLoading = true;
            state.error = null;
        },
        authFailure: (state, action) => {
            state.isLoading = false;
            state.error = action.payload;
            state.isAuthenticated = false;
            state.user = null;
            state.token = null;
            localStorage.removeItem('token');
        },
        logout: (state) => {
            // Clear all auth-related data from state and storage
            state.user = null;
            state.token = null;
            state.refreshToken = null;
            state.isAuthenticated = false;
            state.isLoading = false;
            state.error = null;
            // Remove tokens from all storage locations
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            sessionStorage.removeItem('token');
            // Ensure the token is removed from localStorage (redundant but explicit)
            window.localStorage.removeItem('token');
        },
        clearError: (state) => {
            state.error = null;
        },
    },
});
export const { setUser, setCredentials, authStart, authFailure, logout, clearError, } = authSlice.actions;
export const selectCurrentUser = (state) => state.auth.user;
export const selectCurrentToken = (state) => state.auth.token;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAuthLoading = (state) => state.auth.isLoading;
export const selectAuthError = (state) => state.auth.error;
export default authSlice.reducer;
