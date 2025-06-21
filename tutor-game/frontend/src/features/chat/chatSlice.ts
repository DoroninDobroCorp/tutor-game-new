import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit';
import { RootState } from '../../app/store';

export type Message = {
  id: string;
  senderId: string;
  recipientId: string;
  senderName: string;
  senderRole: 'student' | 'teacher';
  content: string;
  timestamp: string; // Используем string для сериализации
  read: boolean;
};

export interface ChatState {
  messagesByPartnerId: Record<string, Message[]>;
  unreadCounts: Record<string, number>;
  activeChatPartnerId: string | null;
}

const initialState: ChatState = {
  messagesByPartnerId: {},
  unreadCounts: {},
  activeChatPartnerId: null,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    // Получили историю сообщений с сервера
    setMessagesForUser: (state, action: PayloadAction<{ partnerId: string, messages: Message[] }>) => {
      state.messagesByPartnerId[action.payload.partnerId] = action.payload.messages;
    },
    // Пришло одно новое сообщение (от нас или нам)
    addMessage: (state, action: PayloadAction<{ message: Message, currentUserId: string }>) => {
      const { message, currentUserId } = action.payload;
      const partnerId = message.senderId === currentUserId ? message.recipientId : message.senderId;

      if (!state.messagesByPartnerId[partnerId]) {
        state.messagesByPartnerId[partnerId] = [];
      }
      
      // Предотвращаем дублирование сообщений
      if (!state.messagesByPartnerId[partnerId].some(m => m.id === message.id)) {
        state.messagesByPartnerId[partnerId].push(message);
      }

      // Логика счетчика непрочитанных
      if (message.senderId !== currentUserId && state.activeChatPartnerId !== partnerId) {
        state.unreadCounts[partnerId] = (state.unreadCounts[partnerId] || 0) + 1;
      }
    },
    // Пользователь открыл чат
    setActiveChat: (state, action: PayloadAction<string | null>) => {
      const partnerId = action.payload;
      state.activeChatPartnerId = partnerId;
      if (partnerId) {
        // Сбрасываем счетчик для этого чата при его открытии
        delete state.unreadCounts[partnerId];
      }
    },
    resetChatState: () => initialState,
  },
});

export const { 
  setMessagesForUser,
  addMessage,
  setActiveChat,
  resetChatState,
} = chatSlice.actions;

// --- СЕЛЕКТОРЫ С MEMOIZATION ---
const selectMessages = (state: RootState) => state.chat.messagesByPartnerId;
const selectActivePartnerId = (state: RootState) => state.chat.activeChatPartnerId;

export const selectActiveChatMessages = createSelector(
  [selectMessages, selectActivePartnerId],
  (messages, activePartnerId) => {
    if (!activePartnerId) return [];
    return messages[activePartnerId] || [];
  }
);

export const selectTotalUnreadCount = (state: RootState) =>
  Object.values(state.chat.unreadCounts).reduce((acc, count) => acc + count, 0);

export default chatSlice.reducer;
