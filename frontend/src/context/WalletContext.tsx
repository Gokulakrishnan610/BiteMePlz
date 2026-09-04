import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useEventStream } from './EventStreamContext';
import api from '../api';
import type { WalletUpdateEvent } from '../lib/realtime';

interface WalletContextType {
  balance: number;
  loading: boolean;
  error: string | null;
  refreshBalance: () => Promise<void>;
  isLiveConnected: boolean;
  connectionMode: 'sse' | 'polling' | 'disconnected';
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
  const { register, isLiveConnected, connectionMode } = useEventStream();
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
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
      const errorMessage = error.response?.data?.message || 'Failed to fetch balance';
      setError(errorMessage);
      // setLastError(errorMessage); // removed
    } finally {
      setLoading(false);
    }
  }, [user, token]);

  useEffect(() => {
    fetchBalance();
    const onFocus = () => { fetchBalance().catch(() => {}); };
    const onVisibility = () => { if (document.visibilityState === 'visible') fetchBalance().catch(() => {}); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fetchBalance]);

  useEffect(() => {
    if (!user || !token) return;

    return register({
      shopIds: [],
      events: {
        wallet_update: (payload) => {
          const data = payload as WalletUpdateEvent;
          if (String(data.user_id) === String(user._id || (user as any).id)) {
            const numeric = typeof data.balance === 'number' ? data.balance : Number(data.balance);
            if (Number.isFinite(numeric)) {
              setBalance(numeric);
            }
          }
        },
      },
      polling: {
        enabled: true,
        intervalMs: 15000,
        fetcher: fetchBalance,
      },
    });
  }, [register, user, token, fetchBalance]);

  const refreshBalance = async () => {
    await fetchBalance();
  };

  const value = {
    balance,
    loading,
    error,
    refreshBalance,
    isLiveConnected,
    connectionMode,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};
