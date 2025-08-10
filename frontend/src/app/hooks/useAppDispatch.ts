import { useDispatch } from "react-redux";
import type { RootState } from "../store";
import { ThunkDispatch, UnknownAction } from "@reduxjs/toolkit";

type TypedDispatch = ThunkDispatch<RootState, unknown, UnknownAction>;

export const useAppDispatch = (): TypedDispatch => useDispatch<TypedDispatch>();
