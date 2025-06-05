import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// This function MUST be here, in the "heart" of the API,
// so it applies to ALL requests
const baseQuery = fetchBaseQuery({
  baseUrl: 'http://localhost:3002/api',
  prepareHeaders: (headers) => {
    // Get token from localStorage (the one we saved during login)
    const token = window.localStorage.getItem('token'); 
    if (token) {
      // If token exists, add it to headers for EVERY request
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQuery, // Use our new configuration with headers
  tagTypes: ['User', 'Game'],
  endpoints: () => ({}),
});

export default apiSlice;
