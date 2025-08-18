import { BaseQueryFn } from '@reduxjs/toolkit/query';
import axios, { AxiosRequestConfig, AxiosError } from 'axios';
import { RootState } from '../store';
import { logout, setToken } from '../../features/auth/authSlice';

let refreshPromise: Promise<string> | null = null;

export const axiosBaseQuery =
  ({ baseUrl }: { baseUrl: string } = { baseUrl: '' }): BaseQueryFn<
    {
      url: string;
      method?: AxiosRequestConfig['method'];
      data?: AxiosRequestConfig['data'];
      params?: AxiosRequestConfig['params'];
      headers?: AxiosRequestConfig['headers'];
      isFormData?: boolean;
    },
    unknown,
    { status?: number; data?: any }
  > =>
  async ({ url, method = 'GET', data, params, isFormData, headers: customHeaders }, { getState, dispatch, signal }) => {
    // Get token from state at call time, not module initialization
    const token = (getState() as RootState).auth.token;

    const headers: AxiosRequestConfig['headers'] = { ...(customHeaders || {}) };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Don't set Content-Type for FormData, axios will handle it with the correct boundary
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    const doRequest = async () =>
      axios({
        url: baseUrl + url,
        method,
        data,
        params,
        headers,
        withCredentials: true,
        signal,
      });

    try {
      const result = await doRequest();
      return { data: result.data };
    } catch (axiosError) {
      const err = axiosError as AxiosError<any>;
      const status = err.response?.status;

      // If unauthorized, try refresh once
      if (status === 401) {
        try {
          if (!refreshPromise) {
            refreshPromise = axios
              .post(
                baseUrl + '/auth/refresh',
                {},
                { withCredentials: true, signal }
              )
              .then((res) => {
                const newToken = res.data?.data?.accessToken || res.data?.accessToken;
                if (!newToken) throw new Error('No access token in refresh response');
                dispatch(setToken(newToken));
                return newToken;
              })
              .finally(() => {
                refreshPromise = null;
              });
          }
          await refreshPromise;

          // Retry original request with updated token header
          const updatedToken = (getState() as RootState).auth.token;
          const retryHeaders: AxiosRequestConfig['headers'] = { ...(headers || {}) };
          if (updatedToken) retryHeaders['Authorization'] = `Bearer ${updatedToken}`;
          const retryRes = await axios({
            url: baseUrl + url,
            method,
            data,
            params,
            headers: retryHeaders,
            withCredentials: true,
            signal,
          });
          return { data: retryRes.data };
        } catch (refreshErr) {
          // Refresh failed — logout
          dispatch(logout());
          return {
            error: {
              status: 401,
              data: 'Unauthorized',
            },
          };
        }
      }

      // Map error payload
      const payload = err.response?.data ?? err.message ?? 'Request failed';
      return {
        error: {
          status,
          data: payload,
        },
      };
    }
  };
