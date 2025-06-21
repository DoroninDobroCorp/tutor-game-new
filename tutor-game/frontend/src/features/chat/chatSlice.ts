import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../../app/store';

export interface ChatState {
  unreadCounts: Record<string, number>; // { [userId]: count }
}

const initialState: ChatState = {
  unreadCounts: {},
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    // Set initial unread counts
    setInitialUnreadCounts: (state, action: PayloadAction<Record<string, number>>) => {
      state.unreadCounts = action.payload;
    },
    // Increment unread count for a specific user
    incrementUnreadCount: (state, action: PayloadAction<string>) => {
      const userId = action.payload;
      state.unreadCounts[userId] = (state.unreadCounts[userId] || 0) + 1;
    },
    // Clear unread count for a specific user (when chat is opened)
    clearUnreadCount: (state, action: PayloadAction<string>) => {
      delete state.unreadCounts[action.payload];
    },
    // Reset chat state (on logout)
    resetChatState: () => initialState,
  },
});

export const { 
  setInitialUnreadCounts, 
  incrementUnreadCount, 
  clearUnreadCount,
  resetChatState
} = chatSlice.actions;

// Selectors
export const selectTotalUnreadCount = (state: RootState) =>
  Object.values(state.chat.unreadCounts).reduce((acc, count) => acc + count, 0);

export const selectUnreadCountForUser = (userId: string) => (state: RootState) =>
  state.chat.unreadCounts[userId] || 0;

export default chatSlice.reducer;
