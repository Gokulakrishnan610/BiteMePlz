import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';

interface WalletContextType {
  balance: number;
  loading: boolean;
  refreshBalance: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastError, setLastError] = useState<Date | null>(null);

  const refreshBalance = useCallback(async () => {
    if (!user || !token) {
      setBalance(0);
      setLoading(false);
      return;
    }

    // Don't retry if we had an error in the last 30 seconds
    if (lastError && Date.now() - lastError.getTime() < 30000) {
      return;
    }

    setLoading(true);

    try {
      const { data } = await axios.get('/api/users/profile', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setBalance(data.balance || 0);
      setLastError(null); // Clear any previous errors
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      setLastError(new Date());
      // Don't show toast for every error to avoid spam
      if (!lastError || Date.now() - lastError.getTime() > 60000) {
        toast.error('Failed to update balance');
      }
    } finally {
      setLoading(false);
    }
  }, [user, token, lastError]);

  // Initial load
  useEffect(() => {
    refreshBalance();
  }, [refreshBalance]);

  // Polling for balance every 30 seconds (reduced from 5 seconds)
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      refreshBalance();
    }, 30000); // 30 seconds instead of 5 seconds

    return () => clearInterval(interval);
  }, [user, refreshBalance]);

  // Listen for balance updates from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'walletBalance') {
        const newBalance = Number(e.newValue);
        if (!isNaN(newBalance)) {
          setBalance(newBalance);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Sync localStorage when balance changes
  useEffect(() => {
    localStorage.setItem('walletBalance', balance.toString());
  }, [balance]);

  return (
    <WalletContext.Provider value={{ balance, loading, refreshBalance }}>
      {children}
    </WalletContext.Provider>
  );
};
