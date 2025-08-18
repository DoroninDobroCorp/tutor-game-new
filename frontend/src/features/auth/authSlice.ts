import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../../app/store';
import { authApiSlice } from './authApi';
import type { User } from '../../types/models';

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // ✅ Редьюсер для выхода
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
    },
    // ✅ Редьюсер для установки пользователя, будет вызван из AuthInitializer
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
    // ✅ Отдельный редьюсер для обновления access-токена (используется при refresh)
    setToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
      state.isAuthenticated = true;
    },
  },
  // ✅ Автоматически обновляем стейт после запросов
  extraReducers: (builder) => {
    // Когда мутации login, register или refreshToken успешно завершены, выполняем этот код
    builder.addMatcher(
      authApiSlice.endpoints.login.matchFulfilled,
      (state, action) => {
        const { user, accessToken } = action.payload.data;
        state.token = accessToken;
        state.isAuthenticated = true;
        state.user = user;
      }
    );
    builder.addMatcher(
      authApiSlice.endpoints.register.matchFulfilled,
      (state, action) => {
        const { user, accessToken } = action.payload.data;
        state.token = accessToken;
        state.isAuthenticated = true;
        state.user = user;
      }
    );
    // Упрощаем логику обновления токена, так как бэкенд возвращает только accessToken
    builder.addMatcher(
      authApiSlice.endpoints.refreshToken.matchFulfilled,
      (state, action) => {
        // Ответ от refresh содержит только accessToken
        const { accessToken } = action.payload.data;
        state.token = accessToken;
        state.isAuthenticated = true;
        // Обновление данных пользователя происходит через getProfile
      }
    );
  },
});

export const { logout, setUser, setToken } = authSlice.actions;

export const selectCurrentUser = (state: RootState) => state.auth.user;
export const selectCurrentToken = (state: RootState) => state.auth.token;
export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated;

export default authSlice.reducer;
