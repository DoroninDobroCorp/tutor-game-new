import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: 'http://localhost:3002/api',
    prepareHeaders: (headers) => {
      // Get token from localStorage
      const token = window.localStorage.getItem('token');
      // If we have a token, set the authorization header
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['User', 'Game'],
  endpoints: () => ({}),
});

export default apiSlice;
