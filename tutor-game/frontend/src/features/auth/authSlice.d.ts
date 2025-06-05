import { RootState } from '../../app/store';
type UserRole = 'student' | 'teacher';
interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    avatar?: string;
}
interface AuthState {
    user: User | null;
    token: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
}
export declare const setCredentials: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    user: User;
    token: string;
    refreshToken?: string;
}, "auth/setCredentials">, authStart: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"auth/authStart">, authFailure: import("@reduxjs/toolkit").ActionCreatorWithPayload<string, "auth/authFailure">, logout: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"auth/logout">, clearError: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"auth/clearError">;
export declare const selectCurrentUser: (state: RootState) => User | null;
export declare const selectCurrentToken: (state: RootState) => string | null;
export declare const selectIsAuthenticated: (state: RootState) => boolean;
export declare const selectAuthLoading: (state: RootState) => boolean;
export declare const selectAuthError: (state: RootState) => string | null;
declare const _default: import("redux").Reducer<AuthState>;
export default _default;
