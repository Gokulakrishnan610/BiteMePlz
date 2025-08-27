import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  BarChart3, 
  Package, 
  ShoppingBag, 
  LogOut, 
  Menu, 
  X,
  Receipt,
  Users
} from 'lucide-react';

const ShopAdminLayout: React.FC = () => {
  const { logout, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/kisok-sp-back-office/login');
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  const is_active = (path: string) => {
    return location.pathname === path;
  };

  React.useEffect(() => {
    if (user?.is_sub_admin) {
      if (location.pathname === '/kisok-sp-back-office' || location.pathname === '/kisok-sp-back-office/') {
        navigate('/kisok-sp-back-office/products', { replace: true });
      }
    }
  }, [user, location.pathname, navigate]);

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50">
      {/* Mobile Sidebar Toggle */}
      <div className="lg:hidden fixed top-4 left-4 z-30">
        <button
          onClick={toggleSidebar}
          className="p-3 rounded-xl bg-white border border-gray-200 shadow-lg hover:bg-gray-50 transition-all duration-200"
        >
          {isSidebarOpen ? <X size={24} className="text-gray-900" /> : <Menu size={24} className="text-gray-900" />}
        </button>
      </div>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900 z-20 lg:hidden"
          onClick={closeSidebar}
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={`w-72 sm:w-80 bg-white fixed inset-y-0 left-0 z-20 transform ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 transition-transform duration-300 ease-in-out shadow-2xl`}
      >
        {/* Logo Section */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
              <img
                src="https://students.rajalakshmi.org/images/rec_logo.png"
                alt="REC KIOSK Logo"
                className="h-10 w-auto"
              />
              <div className="flex h-16 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-violet-600 text-white"></div>
            <div>
             
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-6 px-3">
          <div className="space-y-2">
            {/* Only show Dashboard link for original shop admins (not sub-admins) */}
            {user && !user.is_sub_admin && (
              <Link
                to="/kisok-sp-back-office"
                className={`flex items-center px-6 py-3 text-gray-600 hover:bg-gray-100 hover:text-purple-600 transition-all duration-200 border-l-4 border-transparent hover:border-purple-600 rounded-xl ${
                  is_active('/kisok-sp-back-office') ? 'bg-gray-100 text-purple-600 border-purple-600' : ''
                }`}
                onClick={closeSidebar}
              >
                <BarChart3 size={20} className="mr-3" />
                <span>Dashboard</span>
              </Link>
            )}
            
            <Link
              to="/kisok-sp-back-office/products"
              className={`flex items-center px-6 py-3 text-gray-600 hover:bg-gray-100 hover:text-purple-600 transition-all duration-200 border-l-4 border-transparent hover:border-purple-600 rounded-xl ${
                location.pathname.includes('/kisok-sp-back-office/products') ? 'bg-gray-100 text-purple-600 border-purple-600' : ''
              }`}
              onClick={closeSidebar}
            >
              <Package size={20} className="mr-3" />
              <span>Products</span>
            </Link>
            
            <Link
              to="/kisok-sp-back-office/orders"
              className={`flex items-center px-6 py-3 text-gray-600 hover:bg-gray-100 hover:text-purple-600 transition-all duration-200 border-l-4 border-transparent hover:border-purple-600 rounded-xl ${
                is_active('/kisok-sp-back-office/orders') ? 'bg-gray-100 text-purple-600 border-purple-600' : ''
              }`}
              onClick={closeSidebar}
            >
              <ShoppingBag size={20} className="mr-3" />
              <span>Orders</span>
            </Link>
            
            <Link
              to="/kisok-sp-back-office/transactions"
              className={`flex items-center px-6 py-3 text-gray-600 hover:bg-gray-100 hover:text-purple-600 transition-all duration-200 border-l-4 border-transparent hover:border-purple-600 rounded-xl ${
                is_active('/kisok-sp-back-office/transactions') ? 'bg-gray-100 text-purple-600 border-purple-600' : ''
              }`}
              onClick={closeSidebar}
            >
              <Receipt size={20} className="mr-3" />
              <span>Transactions</span>
            </Link>
            
            {/* Scan QR removed */}
            
            {/* Order Verification link for shop admins only */}
            {user && !user.is_sub_admin && (
              <Link
                to="/kisok-sp-back-office/order-verification"
                className={`flex items-center px-6 py-3 text-gray-600 hover:bg-gray-100 hover:text-purple-600 transition-all duration-200 border-l-4 border-transparent hover:border-purple-600 rounded-xl ${
                  is_active('/kisok-sp-back-office/order-verification') ? 'bg-gray-100 text-purple-600 border-purple-600' : ''
                }`}
                onClick={closeSidebar}
              >
                <Receipt size={20} className="mr-3" />
                <span>Order Verification</span>
              </Link>
            )}
            
            {/* Only show Sub-Admins link for original shop admins (not sub-admins) */}
            {user && !user.is_sub_admin && (
              <Link
                to="/kisok-sp-back-office/sub-admins"
                className={`flex items-center px-6 py-3 text-gray-600 hover:bg-gray-100 hover:text-purple-600 transition-all duration-200 border-l-4 border-transparent hover:border-purple-600 rounded-xl ${
                  is_active('/kisok-sp-back-office/sub-admins') ? 'bg-gray-100 text-purple-600 border-purple-600' : ''
                }`}
                onClick={closeSidebar}
              >
                <Users size={20} className="mr-3" />
                <span>Sub-Admins</span>
              </Link>
            )}
          </div>
        </nav>
        
        {/* Logout Button */}
        <div className="absolute bottom-0 w-full p-6 border-t border-gray-200 bg-white">
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-6 py-3 text-red-600 hover:bg-red-50 hover:border-red-200 transition-all duration-200 border-l-4 border-transparent hover:border-red-500 rounded-xl"
          >
            <LogOut size={20} className="mr-3" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-72 xl:ml-80">
        <header className="bg-white border-b border-gray-200 z-10 shadow-lg">
          <div className="px-3 sm:px-4 lg:px-6 xl:px-8 py-4 flex justify-between items-center">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
                {user?.is_sub_admin ? 'Sub-Admin Panel' : 'Shop Management'}
              </h2>
              <p className="text-gray-600 text-sm truncate">
                {user?.is_sub_admin ? 'Manage orders' : 'Manage your shop and products'}
              </p>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 xl:p-8">
          <div className="fade-in max-w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default ShopAdminLayout;