import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../../app/store';
import { authApiSlice } from './authApi';

export type UserRole = 'student' | 'teacher';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatar?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

// ✅ Начальное состояние теперь ЕДИНСТВЕННЫЙ источник правды при запуске.
const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('token'), // Пытаемся взять токен из localStorage
  isAuthenticated: !!localStorage.getItem('token'), // Начальный статус зависит от наличия токена
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
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
    // ✅ Редьюсер для установки пользователя, будет вызван из AuthInitializer
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
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
        localStorage.setItem('token', accessToken);
        localStorage.setItem('user', JSON.stringify(user));
      }
    );
    builder.addMatcher(
      authApiSlice.endpoints.register.matchFulfilled,
      (state, action) => {
        const { user, accessToken } = action.payload.data;
        state.token = accessToken;
        state.isAuthenticated = true;
        state.user = user;
        localStorage.setItem('token', accessToken);
        localStorage.setItem('user', JSON.stringify(user));
      }
    );
    // ВОТ ЭТА ЧАСТЬ - ИСПРАВЛЕНИЕ
    builder.addMatcher(
      authApiSlice.endpoints.refreshToken.matchFulfilled,
      (state, action) => {
        // Мы не всегда получаем юзера в ответе на рефреш, но токен - всегда
        const { accessToken } = action.payload.data;
        state.token = accessToken;
        state.isAuthenticated = true;
        localStorage.setItem('token', accessToken);
        // Если в ответе пришел обновленный пользователь, тоже сохраним его
        if (action.payload.data.user) {
            state.user = action.payload.data.user;
            localStorage.setItem('user', JSON.stringify(action.payload.data.user));
        }
      }
    )
  },
});

export const { logout, setUser } = authSlice.actions;

export const selectCurrentUser = (state: RootState) => state.auth.user;
export const selectCurrentToken = (state: RootState) => state.auth.token;
export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated;

export default authSlice.reducer;
