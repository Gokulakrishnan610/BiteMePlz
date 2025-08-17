import React from 'react';
import { Wallet as WalletIcon, Wifi, WifiOff } from 'lucide-react';
import { useWallet } from '../context/WalletContext';

const Wallet: React.FC = () => {
  const { balance, loading, isWebSocketConnected } = useWallet();

  if (loading) {
    return (
      <div className="flex items-center space-x-2 bg-[var(--card-bg)] px-4 py-2 rounded-lg border border-[var(--border-color)]">
        <WalletIcon size={20} className="text-[var(--muted-text)]" />
        <div className="h-4 w-16 bg-[var(--border-color)] animate-pulse rounded"></div>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2 bg-[var(--card-bg)] px-4 py-2 rounded-lg border border-[var(--border-color)] hover:border-[var(--accent-purple)] transition-colors duration-200">
      <WalletIcon size={20} className="text-[var(--accent-purple)]" />
      <span className="font-medium text-[var(--primary-text)]">₹{Number(balance || 0).toFixed(2)}</span>
      <div className="flex items-center ml-1">
        {isWebSocketConnected ? (
          <Wifi size={12} className="text-green-500" title="Real-time updates connected" />
        ) : (
          <WifiOff size={12} className="text-gray-400" title="Real-time updates disconnected" />
        )}
      </div>
    </div>
  );
};

export default Wallet;