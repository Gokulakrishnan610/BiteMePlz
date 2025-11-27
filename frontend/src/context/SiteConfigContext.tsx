import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../api';

interface SiteConfig {
  login_enabled: boolean;
  registration_enabled: boolean;
  ordering_enabled: boolean;
  restricted_years_login: string[];
  restricted_years_registration: string[];
  restricted_years_ordering: string[];
  restricted_departments_login: string[];
  restricted_departments_registration: string[];
  restricted_departments_ordering: string[];
}

interface SiteConfigContextType {
  config: SiteConfig | null;
  loading: boolean;
  refreshConfig: () => Promise<void>;
  isLoginAllowed: (year?: string, department?: string) => boolean;
  isRegistrationAllowed: (year?: string, department?: string) => boolean;
  isOrderingAllowed: (year?: string, department?: string) => boolean;
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
        restricted_years_login: [],
        restricted_years_registration: [],
        restricted_years_ordering: [],
        restricted_departments_login: [],
        restricted_departments_registration: [],
        restricted_departments_ordering: [],
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

  const isLoginAllowed = (year?: string, department?: string): boolean => {
    if (!config) return true;
    if (!config.login_enabled) return false;
    if (year && config.restricted_years_login.includes(year)) return false;
    if (department && config.restricted_departments_login.includes(department)) return false;
    return true;
  };

  const isRegistrationAllowed = (year?: string, department?: string): boolean => {
    if (!config) return true;
    if (!config.registration_enabled) return false;
    if (year && config.restricted_years_registration.includes(year)) return false;
    if (department && config.restricted_departments_registration.includes(department)) return false;
    return true;
  };

  const isOrderingAllowed = (year?: string, department?: string): boolean => {
    if (!config) return true;
    if (!config.ordering_enabled) return false;
    if (year && config.restricted_years_ordering.includes(year)) return false;
    if (department && config.restricted_departments_ordering.includes(department)) return false;
    return true;
  };

  const value = {
    config,
    loading,
    refreshConfig,
    isLoginAllowed,
    isRegistrationAllowed,
    isOrderingAllowed,
  };

  return (
    <SiteConfigContext.Provider value={value}>
      {children}
    </SiteConfigContext.Provider>
  );
};
