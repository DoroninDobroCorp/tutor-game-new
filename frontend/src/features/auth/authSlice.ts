import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "../../app/store";
import { authApiSlice } from "./authApi";
import type { User } from "../../types/models";

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

// ✅ Начальное состояние теперь ЕДИНСТВЕННЫЙ источник правды при запуске.
// Добавлено чтение пользователя из localStorage для более быстрой гидратации состояния
const storedUserItem = localStorage.getItem("user");
const initialUser: User | null = storedUserItem
  ? JSON.parse(storedUserItem)
  : null;
const storedToken = localStorage.getItem("token");

const initialState: AuthState = {
  user: initialUser, // Пытаемся взять пользователя из localStorage
  token: storedToken, // Пытаемся взять токен из localStorage
  isAuthenticated: !!storedToken, // Начальный статус зависит от наличия токена
};

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // ✅ Редьюсер для выхода
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    },
    // ✅ Редьюсер для установки пользователя, будет вызван из AuthInitializer
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      // Также обновим localStorage, чтобы он был синхронизирован
      localStorage.setItem("user", JSON.stringify(action.payload));
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
        localStorage.setItem("token", accessToken);
        localStorage.setItem("user", JSON.stringify(user));
      },
    );
    builder.addMatcher(
      authApiSlice.endpoints.register.matchFulfilled,
      (state, action) => {
        const { user, accessToken } = action.payload.data;
        state.token = accessToken;
        state.isAuthenticated = true;
        state.user = user;
        localStorage.setItem("token", accessToken);
        localStorage.setItem("user", JSON.stringify(user));
      },
    );
    // Упрощаем логику обновления токена, так как бэкенд возвращает только accessToken
    builder.addMatcher(
      authApiSlice.endpoints.refreshToken.matchFulfilled,
      (state, action) => {
        // Ответ от refresh содержит только accessToken
        const { accessToken } = action.payload.data;
        state.token = accessToken;
        state.isAuthenticated = true;
        localStorage.setItem("token", accessToken);
        // Обновление данных пользователя происходит через getProfile
      },
    );
  },
});

export const { logout, setUser } = authSlice.actions;

export const selectCurrentUser = (state: RootState) => state.auth.user;
export const selectCurrentToken = (state: RootState) => state.auth.token;
export const selectIsAuthenticated = (state: RootState) =>
  state.auth.isAuthenticated;

export default authSlice.reducer;
