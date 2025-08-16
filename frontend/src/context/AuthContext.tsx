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
  setCartResetCallback: (callback: () => void) => void;
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
  const [cartResetCallback, setCartResetCallback] = useState<(() => void) | null>(null);

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
          
          // Clear cart on initialization to ensure fresh state for current user
          if (cartResetCallback) {
            cartResetCallback();
          }
        }
      } catch (error) {
        // Clear corrupted data
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        // Also clear cart if there's an error
        if (cartResetCallback) {
          cartResetCallback();
        }
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [cartResetCallback]);

  // Clear cart whenever user changes
  useEffect(() => {
    if (cartResetCallback && user) {
      cartResetCallback();
    }
  }, [user?._id, cartResetCallback]);

  const login = async (email: string, password: string) => {
    try {
      // Clear cart when logging in (in case a different user was previously logged in)
      if (cartResetCallback) {
        cartResetCallback();
      }
      
      const { data } = await api.post('/api/users/login/', { email: email.trim().toLowerCase(), password });

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
      throw new Error(msg || 'Invalid email or password');
    }
  };

  const register = async (name: string, email: string, password: string, role: string) => {
    try {
      // Clear cart when registering (in case a different user was previously logged in)
      if (cartResetCallback) {
        cartResetCallback();
      }
      
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
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  };

  const logout = () => {
    // Clear cart when logging out
    if (cartResetCallback) {
      cartResetCallback();
    }
    
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
      // Clear cart when parent logs in (in case a different user was previously logged in)
      if (cartResetCallback) {
        cartResetCallback();
      }
      
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
      
    } catch (error: any) {
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
    isParent: user?.role === 'parent',
    setCartResetCallback
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};