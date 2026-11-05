import axios from 'axios';
import { getUserFromToken } from './auth.js';

// Base API URL (read from environment variable for flexibility)
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Create an Axios instance with defaults
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

// Request interceptor: attach Authorization header if token exists
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401 (unauthorized) globally
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    // If we get a 401 and haven't retried yet, try refreshing the token
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refresh_token') || sessionStorage.getItem('refresh_token');
        if (refreshToken) {
          const resp = await axios.post(`${API_BASE_URL}/auth/refresh/`, { refresh: refreshToken });
          const { access, refresh } = resp.data;
          // Store the new tokens
          localStorage.setItem('access_token', access);
          localStorage.setItem('refresh_token', refresh);
          // Update the Authorization header and retry original request
          originalRequest.headers['Authorization'] = `Bearer ${access}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed – clear session and redirect to login
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
      }
    }
    // Propagate other errors
    return Promise.reject(error);
  }
);

/**
 * Wrapper around apiClient to provide a consistent return shape.
 * Returns { data, error, loading } for easy consumption in components.
 */
export const request = async (method, url, payload = null, config = {}) => {
  const result = { data: null, error: null, loading: true };
  try {
    const response = await apiClient({ method, url, data: payload, ...config });
    result.data = response.data;
  } catch (err) {
    result.error = err;
  } finally {
    result.loading = false;
  }
  return result;
};

export default apiClient;
