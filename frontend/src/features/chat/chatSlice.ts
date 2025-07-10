import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit';
import { RootState } from '../../app/store';

export type Message = {
  id: string;
  senderId: string;
  recipientId: string;
  senderName: string;
  senderRole: 'student' | 'teacher';
  content: string;
  timestamp: string;
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
    setUnreadCounts: (state, action: PayloadAction<Record<string, number>>) => {
      state.unreadCounts = action.payload;
    },
    setMessagesForUser: (state, action: PayloadAction<{ partnerId: string, messages: Message[] }>) => {
      state.messagesByPartnerId[action.payload.partnerId] = action.payload.messages;
    },
    addMessage: (state, action: PayloadAction<{ message: Message, currentUserId: string }>) => {
      const { message, currentUserId } = action.payload;
      const partnerId = message.senderId === currentUserId ? message.recipientId : message.senderId;

      const conversation = state.messagesByPartnerId[partnerId] || [];
      if (!conversation.some(m => m.id === message.id)) {
        state.messagesByPartnerId[partnerId] = [...conversation, message];
      }

      // Увеличиваем счетчик, только если сообщение не от нас И чат с этим пользователем не активен
      if (message.senderId !== currentUserId && state.activeChatPartnerId !== partnerId) {
        state.unreadCounts[partnerId] = (state.unreadCounts[partnerId] || 0) + 1;
      }
    },
    setActiveChat: (state, action: PayloadAction<string | null>) => {
      const partnerId = action.payload;
      state.activeChatPartnerId = partnerId;
      // При открытии чата сбрасываем счетчик для этого пользователя.
      if (partnerId && state.unreadCounts[partnerId]) {
        delete state.unreadCounts[partnerId];
      }
    },
    resetChatState: () => initialState,
  },
});

export const { 
  setUnreadCounts,
  setMessagesForUser,
  addMessage,
  setActiveChat,
  resetChatState
} = chatSlice.actions;

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
