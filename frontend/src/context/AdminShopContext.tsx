import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import api from '../api';

interface Shop {
  id: string;
  name: string;
  location: string;
  is_active: boolean;
  is_open: boolean;
}

interface AdminShopContextType {
  selectedShop: Shop | null;
  setSelectedShop: (shop: Shop | null) => void;
  shops: Shop[];
  loading: boolean;
  refreshShops: () => void;
}

const AdminShopContext = createContext<AdminShopContextType | undefined>(undefined);

export const useAdminShop = () => {
  const context = useContext(AdminShopContext);
  if (context === undefined) {
    throw new Error('useAdminShop must be used within an AdminShopProvider');
  }
  return context;
};

interface AdminShopProviderProps {
  children: ReactNode;
}

export const AdminShopProvider: React.FC<AdminShopProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchShops = async () => {
    if (user?.role !== 'admin') return;
    
    try {
      setLoading(true);
      const all: Shop[] = [];
      let page = 1;
      let next: string | null = `/api/shops/?page=${page}`;
      
      while (next) {
        const { data }: { data: any } = await api.get(next);
        const shopsData = data.results || data;
        if (Array.isArray(shopsData)) {
          all.push(...shopsData);
          next = data.next || null;
        } else {
          all.push(...shopsData);
          next = null;
        }
      }
      setShops(all);
    } catch (error) {
      // Silent fail for shops fetch
    } finally {
      setLoading(false);
    }
  };

  const refreshShops = () => {
    fetchShops();
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchShops();
    }
  }, [user]);

  const value: AdminShopContextType = {
    selectedShop,
    setSelectedShop,
    shops,
    loading,
    refreshShops,
  };

  return (
    <AdminShopContext.Provider value={value}>
      {children}
    </AdminShopContext.Provider>
  );
};
