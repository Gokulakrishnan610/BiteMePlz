import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import api from '../api';

interface WalletContextType {
  balance: number;
  loading: boolean;
  error: string | null;
  refreshBalance: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

interface WalletProviderProps {
  children: React.ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const { user, token } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const fetchBalance = async () => {
    if (!user || !token) {
      setBalance(0);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/api/users/profile/');
      const raw = (response.data?.balance ?? 0);
      const numeric = typeof raw === 'number' ? raw : Number(raw);
      setBalance(Number.isFinite(numeric) ? numeric : 0);
    } catch (error: any) {
      console.error('Failed to fetch balance:', error);
      const errorMessage = error.response?.data?.message || 'Failed to fetch balance';
      setError(errorMessage);
      setLastError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
    // only refetch on auth changes; avoid loops on lastError
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token]);

  const refreshBalance = async () => {
    await fetchBalance();
  };

  const value = {
    balance,
    loading,
    error,
    refreshBalance
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};
