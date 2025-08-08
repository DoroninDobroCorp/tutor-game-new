import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../../app/store';

export interface AdventureState {
    currentLessonId: string | null;
    practiceAnswers: Record<number, string>;
    storyResponse: string;
}

const initialState: AdventureState = {
    currentLessonId: null,
    practiceAnswers: {},
    storyResponse: '',
};

const adventureSlice = createSlice({
    name: 'adventure',
    initialState,
    reducers: {
        startLesson: (state, action: PayloadAction<string>) => {
            // If it's a new lesson, reset the state
            if (state.currentLessonId !== action.payload) {
                state.currentLessonId = action.payload;
                state.practiceAnswers = {};
                state.storyResponse = '';
            }
        },
        updatePracticeAnswer: (state, action: PayloadAction<{ blockIndex: number; answer: string }>) => {
            state.practiceAnswers[action.payload.blockIndex] = action.payload.answer;
        },
        updateStoryResponse: (state, action: PayloadAction<string>) => {
            state.storyResponse = action.payload;
        },
        resetAdventureState: (state) => {
            state.currentLessonId = null;
            state.practiceAnswers = {};
            state.storyResponse = '';
        },
    },
});

export const {
    startLesson,
    updatePracticeAnswer,
    updateStoryResponse,
    resetAdventureState,
} = adventureSlice.actions;

// Selectors
export const selectAdventure = (state: RootState) => state.adventure;
export const selectPracticeAnswers = (state: RootState) => state.adventure.practiceAnswers;
export const selectStoryResponse = (state: RootState) => state.adventure.storyResponse;

export default adventureSlice.reducer;
