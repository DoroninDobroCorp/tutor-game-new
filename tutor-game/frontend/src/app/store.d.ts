import { AuthState } from '../features/auth/authSlice';
export declare const store: import("@reduxjs/toolkit").EnhancedStore<{
    api: import("@reduxjs/toolkit/query").CombinedState<{}, "User" | "Game", "api">;
    auth: AuthState;
}, import("redux").UnknownAction, import("@reduxjs/toolkit").Tuple<[import("redux").StoreEnhancer<{
    dispatch: import("redux-thunk").ThunkDispatch<{
        api: import("@reduxjs/toolkit/query").CombinedState<{}, "User" | "Game", "api">;
        auth: AuthState;
    }, undefined, import("redux").UnknownAction>;
}>, import("redux").StoreEnhancer]>>;
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
