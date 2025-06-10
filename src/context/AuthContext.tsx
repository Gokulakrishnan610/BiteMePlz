import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

interface User {
  _id: string;
  name: string;
  email: string;
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
    // Clear old tokens
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { data } = await axios.post('/api/users/login', { email, password });
      
      setUser({
        _id: data._id,
        name: data.name,
        email: data.email,
        role: data.role,
        shop: data.shop,
      });
      
      setToken(data.token);
      
      // Set axios default headers
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      
      // Store in localStorage
      localStorage.setItem('user', JSON.stringify({
        _id: data._id,
        name: data.name,
        email: data.email,
        role: data.role,
        shop: data.shop,
      }));
      localStorage.setItem('token', data.token);
    } catch (error) {
      throw error;
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const { data } = await axios.post('/api/users', { name, email, password });
      
      setUser({
        _id: data._id,
        name: data.name,
        email: data.email,
        role: data.role,
        shop: data.shop,
      });
      
      setToken(data.token);
      
      // Set axios default headers
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      
      // Store in localStorage
      localStorage.setItem('user', JSON.stringify({
        _id: data._id,
        name: data.name,
        email: data.email,
        role: data.role,
        shop: data.shop,
      }));
      localStorage.setItem('token', data.token);
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
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