import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

// Configure axios defaults
axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
axios.defaults.headers.common['Content-Type'] = 'application/json';

interface User {
  _id: string;
  name: string;
  email: string;
  rollNo: string;
  role: 'admin' | 'shopAdmin' | 'student';
  shop?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const storedUser = localStorage.getItem('user');
        const storedToken = localStorage.getItem('token');
        
        if (storedUser && storedToken) {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          setToken(storedToken);
          axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        }
      } catch (error) {
        console.error('Error loading auth state:', error);
        // Clear corrupted data
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      console.log('Attempting login with:', { email });
      console.log('API URL:', axios.defaults.baseURL);
      
      // Test server connectivity first using a public endpoint
      try {
        await axios.get('/');
        console.log('✅ Server is reachable');
      } catch (error) {
        console.error('❌ Server connectivity test failed:', error);
        throw new Error('Cannot connect to server. Please check if the backend is running.');
      }
      
      const response = await axios.post('/api/users/login', { 
        email, 
        password 
      }, {
        timeout: 10000, // 10 second timeout
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const { data } = response;
      console.log('Login response:', data);
      
      // Validate the response data
      if (!data._id || !data.name || !data.email || !data.role || !data.token) {
        console.error('Invalid login response:', data);
        throw new Error('Invalid login response from server');
      }
      
      const userData = {
        _id: data._id,
        name: data.name,
        email: data.email,
        rollNo: data.rollNo || '',
        role: data.role,
        shop: data.shop,
      };
      
      setUser(userData);
      setToken(data.token);
      
      // Set axios default headers
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      
      // Store in localStorage
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('token', data.token);
      
      console.log('Login successful for:', userData.email);
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Provide specific error messages based on error type
      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout. Please try again.');
      } else if (error.code === 'ERR_NETWORK') {
        throw new Error('Network error. Please check your connection and ensure the backend server is running.');
      } else if (error.response?.status === 401) {
        throw new Error('Invalid email or password');
      } else if (error.response?.status === 400) {
        throw new Error(error.response.data?.message || 'Login failed');
      } else if (error.response?.status === 500) {
        throw new Error('Server error. Please try again later.');
      } else if (error.response?.status === 404) {
        throw new Error('Login endpoint not found. Please check server configuration.');
      } else {
        throw new Error(error.response?.data?.message || error.message || 'Login failed');
      }
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      console.log('Attempting registration with:', { name, email });
      
      const response = await axios.post('/api/users', { 
        name, 
        email, 
        password 
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const { data } = response;
      console.log('Registration response:', data);
      
      // Validate the response data
      if (!data._id || !data.name || !data.email || !data.role || !data.token) {
        throw new Error('Invalid registration response from server');
      }
      
      const userData = {
        _id: data._id,
        name: data.name,
        email: data.email,
        rollNo: data.rollNo || '',
        role: data.role,
        shop: data.shop,
      };
      
      setUser(userData);
      setToken(data.token);
      
      // Set axios default headers
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      
      // Store in localStorage
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('token', data.token);
      
      console.log('Registration successful for:', userData.email);
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // Provide specific error messages
      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout. Please try again.');
      } else if (error.code === 'ERR_NETWORK') {
        throw new Error('Network error. Please check your connection.');
      } else if (error.response?.status === 400) {
        throw new Error(error.response.data?.message || 'Registration failed');
      } else if (error.response?.status === 409) {
        throw new Error('Email already exists');
      } else if (error.response?.status === 500) {
        throw new Error('Server error. Please try again later.');
      } else {
        throw new Error(error.response?.data?.message || error.message || 'Registration failed');
      }
    }
  };

  const logout = () => {
    console.log('Logging out user');
    
    setUser(null);
    setToken(null);
    
    // Remove axios default headers
    delete axios.defaults.headers.common['Authorization'];
    
    // Remove from localStorage
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  const value = {
    user,
    token,
    login,
    register,
    logout,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};