import axios from 'axios';

// Create a custom axios instance with base URL
const api = axios.create({
  baseURL: 'http://localhost:8000',
  timeout: 10000,
});

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