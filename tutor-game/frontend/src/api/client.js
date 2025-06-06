import axios from 'axios';
import { store } from '../app/store';
const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});
// Request interceptor
apiClient.interceptors.request.use((config) => {
    const token = store.getState().auth.token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});
// Response interceptor
apiClient.interceptors.response.use((response) => response, async (error) => {
    const originalRequest = error.config;
    // If unauthorized and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        try {
            // Try to refresh token
            const response = await axios.post(`${import.meta.env.VITE_API_URL || '/api'}/auth/refresh`, {}, { withCredentials: true });
            const { accessToken, user } = response.data.data;
            // Update the token and user in the store
            store.dispatch({
                type: 'auth/setCredentials',
                payload: {
                    user,
                    token: accessToken
                },
            });
            // Update the Authorization header
            if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            }
            // Retry the original request
            return apiClient(originalRequest);
        }
        catch (refreshError) {
            // If refresh token fails, logout the user
            store.dispatch({ type: 'auth/logout' });
            return Promise.reject(refreshError);
        }
    }
    return Promise.reject(error);
});
export default apiClient;
