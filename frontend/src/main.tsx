import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WalletProvider } from './context/WalletContext';
import { SiteConfigProvider } from './context/SiteConfigContext';
import { ToastProvider } from './components/ToastContainer';
import { Toaster } from './components/Toaster';


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <SiteConfigProvider>
          <AuthProvider>
            <CartProvider>
              <WalletProvider>
                <Toaster richColors position="bottom-right" />
                <App />
              </WalletProvider>
            </CartProvider>
          </AuthProvider>
        </SiteConfigProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>
);