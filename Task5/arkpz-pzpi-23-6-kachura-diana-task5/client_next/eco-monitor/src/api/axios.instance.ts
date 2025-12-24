import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

// Base URL configuration - Next.js uses NEXT_PUBLIC_ prefix for client-side env vars
// Defaults to HTTPS, but can be overridden via environment variable
// For HTTP mode: NEXT_PUBLIC_API_BASE_URL=http://localhost:5192
// For HTTPS mode: NEXT_PUBLIC_API_BASE_URL=https://localhost:5192 (default)
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://localhost:5192';

// Only log in development
if (process.env.NODE_ENV === 'development') {
  console.log('API Base URL:', BASE_URL);
}

/**
 * Creates and configures an Axios instance for API requests
 * - Supports session-based authentication via cookies
 * - Handles 401 errors with automatic redirect to login
 * - Configured for JSON request/response
 */
const axiosInstance: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000, // 30 seconds timeout
  withCredentials: true, // Include cookies for session-based auth
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

// Request interceptor - can be used to add auth tokens, etc.
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add any request modifications here if needed
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handles errors and redirects
axiosInstance.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Handle 401 Unauthorized - redirect to login
    if (error.response?.status === 401) {
      // Only redirect if we're in the browser (client-side)
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        const publicPaths = ['/', '/login', '/registration', '/signup'];
        
        // Prevent infinite redirect loops and don't redirect from public pages
        if (!publicPaths.includes(currentPath)) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;

