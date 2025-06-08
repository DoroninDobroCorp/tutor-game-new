import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { store } from '../app/store';
import { AppDispatch } from '../app/store';
import { authApiSlice } from '../features/auth/authApi';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = store.getState().auth.token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
    
    // If unauthorized and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Get the refreshToken endpoint from the authApiSlice
        const refreshToken = authApiSlice.endpoints.refreshToken.initiate();
        const response = await store.dispatch(refreshToken);
        
        // If refresh was successful, retry the original request
        if ('data' in response && response.data && response.data.data) {
          const { accessToken } = response.data.data;
          
          // Update the Authorization header
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          }
          
          // Retry the original request
          return apiClient(originalRequest);
        } else {
          throw new Error('Failed to refresh token: Invalid response data');
        }
      } catch (refreshError) {
        // If refresh token fails, logout the user
(store.dispatch as AppDispatch)(authApiSlice.endpoints.logout.initiate());
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
