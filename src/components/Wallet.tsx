import React from 'react';
import { Wallet as WalletIcon } from 'lucide-react';
import { useWallet } from '../context/WalletContext';

const Wallet: React.FC = () => {
  const { balance, loading } = useWallet();

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <WalletIcon size={20} className="text-[var(--gray-400)]" />
        <div className="h-4 w-16 bg-[var(--gray-200)] animate-pulse rounded"></div>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <WalletIcon size={20} className="text-[var(--primary)]" />
      <span className="font-medium">₹{balance}</span>
    </div>
  );
};

export default Wallet;