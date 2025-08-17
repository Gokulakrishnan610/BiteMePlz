import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import api from '../api';

interface WalletContextType {
  balance: number;
  loading: boolean;
  error: string | null;
  refreshBalance: () => Promise<void>;
  isWebSocketConnected: boolean;
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
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

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
      const errorMessage = error.response?.data?.message || 'Failed to fetch balance';
      setError(errorMessage);
      setLastError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
    // Auto-refresh on tab focus/visibility change to keep balance fresh across pages
    const onFocus = () => { fetchBalance().catch(() => {}); };
    const onVisibility = () => { if (document.visibilityState === 'visible') fetchBalance().catch(() => {}); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
    // only refetch on auth changes; avoid loops on lastError
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token]);

  const refreshBalance = async () => {
    await fetchBalance();
  };

  // WebSocket connection for real-time wallet updates
  const connectWebSocket = () => {
    if (!user || !token) return;

    const wsUrl = import.meta.env.PROD
      ? `wss://rec-kiosk.onrender.com/ws/wallet/?user_id=${user._id}`
      : `ws://localhost:8000/ws/wallet/?user_id=${user._id}`;

    console.log('Connecting to WebSocket:', wsUrl);
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected successfully');
      setIsWebSocketConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket message received:', data);
        
        if (data.type === 'wallet_update' && data.user_id === user._id) {
          console.log('Wallet update received:', data);
          setBalance(data.balance);
        } else if (data.type === 'connection_established') {
          console.log('WebSocket connection confirmed:', data.message);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsWebSocketConnected(false);
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
      setIsWebSocketConnected(false);
      // Reconnect after 5 seconds
      setTimeout(() => {
        if (user && token) {
          connectWebSocket();
        }
      }, 5000);
    };
  };

  // Connect to WebSocket when user is authenticated
  useEffect(() => {
    if (user && token) {
      connectWebSocket();
    } else {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setIsWebSocketConnected(false);
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [user, token]);

  const value = {
    balance,
    loading,
    error,
    refreshBalance,
    isWebSocketConnected
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};
