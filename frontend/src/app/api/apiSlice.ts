import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from './axiosBaseQuery';

export const apiSlice = createApi({
  reducerPath: 'api',
  // Pass base URL for all requests
  baseQuery: axiosBaseQuery({ baseUrl: import.meta.env.VITE_API_URL || '/api' }),
  tagTypes: ['User', 'Student', 'Teacher', 'Goal', 'Lesson', 'UnreadCount'],
  endpoints: () => ({}),
});

export default apiSlice;
