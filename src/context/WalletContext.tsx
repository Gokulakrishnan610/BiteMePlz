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

  const refreshBalance = useCallback(async () => {
    if (!user || !token) {
      setBalance(0);
      setLoading(false);
      return;
    }

    try {
      const { data } = await axios.get('/api/users/profile', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setBalance(data.balance || 0);
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      toast.error('Failed to update balance');
    } finally {
      setLoading(false);
    }
  }, [user, token]);

  // Initial load
  useEffect(() => {
    refreshBalance();
  }, [refreshBalance]);

  // Set up polling for balance updates
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(refreshBalance, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [user, refreshBalance]);

  // Listen for storage events from other tabs
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

  // Update localStorage when balance changes
  useEffect(() => {
    localStorage.setItem('walletBalance', balance.toString());
  }, [balance]);

  return (
    <WalletContext.Provider value={{ balance, loading, refreshBalance }}>
      {children}
    </WalletContext.Provider>
  );
};