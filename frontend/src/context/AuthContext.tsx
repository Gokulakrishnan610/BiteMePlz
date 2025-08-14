import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../api';

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'student' | 'shopAdmin' | 'admin' | 'parent';
  shop?: string;
  balance?: number;
  is_sub_admin?: boolean;
  parent_admin?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  parentLogin: (email: string) => Promise<void>;
  register: (name: string, email: string, password: string, role: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  isParent: boolean;
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
          
          // Set token in api defaults for backward compatibility
          api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
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
      const { data } = await api.post('/api/users/login/', { email, password });

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

      // Set token in api defaults for backward compatibility
      api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;

      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('token', data.token);
    } catch (error: any) {
      const extractBackendMessage = (err: any): string | null => {
        const data = err?.response?.data;
        if (!data) return null;
        if (typeof data === 'string') return data;
        if (typeof data.message === 'string') return data.message;
        if (typeof data.error === 'string') return data.error;
        if (typeof data.detail === 'string') return data.detail;
        if (Array.isArray(data)) {
          const first = data.find((x) => typeof x === 'string');
          if (first) return first;
        }
        if (typeof data === 'object') {
          for (const key of Object.keys(data)) {
            const val = (data as any)[key];
            if (typeof val === 'string') return val;
            if (Array.isArray(val)) {
              const first = val.find((x) => typeof x === 'string');
              if (first) return first;
            }
          }
        }
        return null;
      };

      const msg = extractBackendMessage(error);
      console.error('Login error:', error);
      throw new Error(msg || 'Invalid email or password');
    }
  };

  const register = async (name: string, email: string, password: string, role: string) => {
    try {
      const { data } = await api.post('/api/users/register/', {
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
      
      // Set token in api defaults for backward compatibility
      api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      
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
    
    // Clear api defaults
    delete api.defaults.headers.common['Authorization'];
    
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('hasShownLoadingScreen');
    localStorage.removeItem('parentSessionId');
    sessionStorage.removeItem('parentSessionId');
  };

  const parentLogin = async (email: string) => {
    try {
      // Create a parent user object
      const parentUserData: User = {
        _id: `parent_${Date.now()}`,
        name: `Parent (${email})`,
        email: email,
        role: 'parent',
        balance: 0
      };

      setUser(parentUserData);
      setToken(null); // Parents don't have JWT tokens
      
      // Store parent user data
      localStorage.setItem('user', JSON.stringify(parentUserData));
      localStorage.setItem('parentEmail', email);
      
      console.log('Parent login completed successfully');
    } catch (error: any) {
      console.error('Parent login error:', error);
      throw new Error('Parent login failed');
    }
  };

  const value = {
    user,
    token,
    login,
    parentLogin,
    register,
    logout,
    loading,
    isParent: user?.role === 'parent'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};