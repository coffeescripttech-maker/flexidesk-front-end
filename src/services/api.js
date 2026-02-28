import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  withCredentials: true,
});

export const USER_TOKEN_KEY = 'flexidesk_user_token';
export const REFRESH_TOKEN_KEY = 'flexidesk_refresh_token';
export const ADMIN_TOKEN_KEY = 'flexidesk_admin_token';
export const CURRENT_KEY = 'flexidesk_current_user_email';

// Helper to get stored token
function getStoredToken() {
  return (
    localStorage.getItem(USER_TOKEN_KEY) ||
    sessionStorage.getItem(USER_TOKEN_KEY) ||
    localStorage.getItem(ADMIN_TOKEN_KEY) ||
    sessionStorage.getItem(ADMIN_TOKEN_KEY) ||
    ''
  );
}

// Helper to get refresh token
function getRefreshToken() {
  return (
    localStorage.getItem(REFRESH_TOKEN_KEY) ||
    sessionStorage.getItem(REFRESH_TOKEN_KEY) ||
    ''
  );
}

// Helper to save tokens
export function saveTokens(accessToken, refreshToken) {
  if (accessToken) {
    localStorage.setItem(USER_TOKEN_KEY, accessToken);
  }
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
}

// Helper to clear tokens
export function clearTokens() {
  localStorage.removeItem(USER_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  sessionStorage.removeItem(USER_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
}

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token expiration and auto-refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh token
        const refreshToken = getRefreshToken();
        if (refreshToken) {
          console.log('[API] Attempting token refresh...');
          
          const { data } = await axios.post(
            `${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}/auth/refresh`,
            { refreshToken },
            { withCredentials: true }
          );

          // Save new access token
          localStorage.setItem(USER_TOKEN_KEY, data.token);
          console.log('[API] Token refreshed successfully');

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${data.token}`;
          return api(originalRequest);
        } else {
          console.log('[API] No refresh token available');
        }
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        console.error('[API] Token refresh failed:', refreshError.message);
        clearTokens();
        
        // Only redirect if not already on login page
        if (!window.location.pathname.includes('/login')) {
          const currentPath = window.location.pathname;
          const nextParam = currentPath !== '/' ? `?next=${encodeURIComponent(currentPath)}` : '';
          window.location.href = `/login${nextParam}`;
        }
        
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
