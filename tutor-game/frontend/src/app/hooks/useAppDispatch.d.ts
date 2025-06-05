import type { RootState } from '../store';
import { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
type TypedDispatch = ThunkDispatch<RootState, unknown, UnknownAction>;
export declare const useAppDispatch: () => TypedDispatch;
export {};
