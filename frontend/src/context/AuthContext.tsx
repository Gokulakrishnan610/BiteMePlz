import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import api from '../api';

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'student' | 'shopAdmin' | 'admin';
  shop?: string;
  balance?: number;
  is_sub_admin?: boolean;
  parent_admin?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state on app load
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const storedUser = localStorage.getItem('user');
        const storedToken = localStorage.getItem('token');

        if (storedUser && storedToken) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setToken(storedToken);
          
          // Set token in axios defaults for backward compatibility
          axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
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
      const { data } = await api.post('/users/login', { email, password });

      if (!data._id || !data.name || !data.email || !data.role || !data.token) {
        throw new Error('Invalid response from server');
      }

      const userData: User = {
        _id: data._id,
        name: data.name,
        email: data.email,
        role: data.role,
        shop: data.shop,
        balance: data.balance,
        is_sub_admin: data.is_sub_admin,
        parent_admin: data.parent_admin
      };

      setUser(userData);
      setToken(data.token);
      
      // Set token in axios defaults for backward compatibility
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('token', data.token);
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  };

  const register = async (name: string, email: string, password: string, role: string) => {
    try {
      const { data } = await api.post('/users/register', {
        name,
        email,
        password,
        role
      });

      if (!data._id || !data.name || !data.email || !data.role || !data.token) {
        throw new Error('Invalid response from server');
      }

      const userData: User = {
        _id: data._id,
        name: data.name,
        email: data.email,
        role: data.role,
        shop: data.shop,
        balance: data.balance,
        is_sub_admin: data.is_sub_admin,
        parent_admin: data.parent_admin
      };

      setUser(userData);
      setToken(data.token);
      
      // Set token in axios defaults for backward compatibility
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('token', data.token);
    } catch (error: any) {
      console.error('Register error:', error);
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    
    // Clear axios defaults
    delete axios.defaults.headers.common['Authorization'];
    
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  const value = {
    user,
    token,
    login,
    register,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};