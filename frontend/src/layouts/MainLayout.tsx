import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Footer from '../components/Footer';
import { CartProvider } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const MainLayout: React.FC = () => {
  useAuth();
  const location = useLocation();
  
  // Note: Header visibility handled within individual pages/components if needed

  return (
    <CartProvider>
      <div className="flex flex-col min-h-screen">
        <main className="flex-grow">
          <Outlet />
        </main>
        <div className={location.pathname.startsWith('/shop/') ? 'hidden md:block' : ''}>
          <Footer />
        </div>
      </div>
    </CartProvider>
  );
};

export default MainLayout;