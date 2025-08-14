import axios from 'axios';

function resolveApiBaseUrl(): string {
  // 1) Highest priority: explicit env variable
  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim();
  }

  // 2) Next: user override persisted in localStorage
  try {
    const saved = localStorage.getItem('API_BASE_URL');
    if (saved && typeof saved === 'string' && saved.trim()) {
      return saved.trim();
    }
  } catch {}

  // 3) Production fallback
  if (import.meta.env.PROD) {
    return 'https://kisokrec.onrender.com';
  }
  // 4) Dev: use Vite proxy with relative path
  return '';
}

// Create a custom axios instance with dynamic base URL
const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: 15000,
});

export function setApiBaseUrl(newUrl: string) {
  if (!newUrl || typeof newUrl !== 'string') return;
  api.defaults.baseURL = newUrl;
  try {
    localStorage.setItem('API_BASE_URL', newUrl);
  } catch {}
}

export function getApiBaseUrl(): string {
  return api.defaults.baseURL || resolveApiBaseUrl();
}

// Request interceptor to automatically attach token and session ID
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add parent session ID if available
    const parentSessionId = localStorage.getItem('parentSessionId') || sessionStorage.getItem('parentSessionId');
    if (parentSessionId) {
      config.headers['X-Parent-Session-ID'] = parentSessionId;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token and redirect to login
      const userRaw = localStorage.getItem('user');
      let role: string | null = null;
      try {
        role = userRaw ? JSON.parse(userRaw).role : null;
      } catch {}
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Only redirect if not already on login page
      if (!window.location.pathname.includes('/login')) {
        if (role === 'admin') {
          window.location.href = '/kisok-ac-back-office/login';
        } else if (role === 'shopAdmin') {
          window.location.href = '/kisok-sp-back-office/login';
        } else {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api; 