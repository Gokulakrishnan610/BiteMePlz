import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../api';

interface SiteConfig {
  login_enabled: boolean;
  registration_enabled: boolean;
  ordering_enabled: boolean;
}

interface SiteConfigContextType {
  config: SiteConfig | null;
  loading: boolean;
  refreshConfig: () => Promise<void>;
}

const SiteConfigContext = createContext<SiteConfigContextType | undefined>(undefined);

export const useSiteConfig = () => {
  const context = useContext(SiteConfigContext);
  if (context === undefined) {
    throw new Error('useSiteConfig must be used within a SiteConfigProvider');
  }
  return context;
};

interface SiteConfigProviderProps {
  children: ReactNode;
}

export const SiteConfigProvider: React.FC<SiteConfigProviderProps> = ({ children }) => {
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchConfig = async () => {
    try {
      const { data } = await api.get('/api/startup/config/');
      setConfig(data);
    } catch (error) {
      console.error('Failed to fetch site configuration:', error);
      // Set default values if fetch fails
      setConfig({
        login_enabled: true,
        registration_enabled: true,
        ordering_enabled: true,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const refreshConfig = async () => {
    await fetchConfig();
  };

  const value = {
    config,
    loading,
    refreshConfig,
  };

  return (
    <SiteConfigContext.Provider value={value}>
      {children}
    </SiteConfigContext.Provider>
  );
};
