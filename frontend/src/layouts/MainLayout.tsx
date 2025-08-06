import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { CartProvider } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const MainLayout: React.FC = () => {
  const { user } = useAuth();
  
  // Only show Header for admin and shopAdmin users, not for regular students
  const shouldShowHeader = user && (user.role === 'admin' || user.role === 'shopAdmin');

  return (
    <CartProvider>
      <div className="flex flex-col min-h-screen">
        {shouldShowHeader && <Header />}
        <main className="flex-grow">
          <Outlet />
        </main>
        <Footer />
      </div>
    </CartProvider>
  );
};

export default MainLayout;