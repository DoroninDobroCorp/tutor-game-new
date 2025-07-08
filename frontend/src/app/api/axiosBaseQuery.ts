import { BaseQueryFn } from '@reduxjs/toolkit/query';
import axios, { AxiosRequestConfig, AxiosError } from 'axios';
import { RootState } from '../store';

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
  async ({ url, method = 'GET', data, params, isFormData }, { getState }) => {
    // Get token from state at call time, not module initialization
    const token = (getState() as RootState).auth.token;

    const headers: AxiosRequestConfig['headers'] = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Don't set Content-Type for FormData, axios will handle it with the correct boundary
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const result = await axios({
        url: baseUrl + url,
        method,
        data,
        params,
        headers,
        withCredentials: true,
      });
      return { data: result.data };
    } catch (axiosError) {
      const err = axiosError as AxiosError;
      return {
        error: {
          status: err.response?.status,
          data: err.response?.data || err.message,
        },
      };
    }
  };
