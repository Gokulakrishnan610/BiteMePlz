// ✂️ Top Imports (No changes)
import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAdminShop } from '../context/AdminShopContext';
import {
  BarChart3, Store, Users, LogOut, Menu, X,
  Receipt, TrendingUp, DollarSign,
  FileText, Package, ShoppingBag, QrCode, Building
} from 'lucide-react';

const AdminLayout: React.FC = () => {
  const { logout, user } = useAuth();
  const { selectedShop, setSelectedShop, shops, loading } = useAdminShop();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/kisok-ac-back-office/login');
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);
  const is_active = (path: string) => location.pathname === path;
  const isPathActive = (path: string) => location.pathname.includes(path);

  const handleShopChange = (shopId: string) => {
    if (shopId === '') {
      setSelectedShop(null);
      navigate('/kisok-ac-back-office');
    } else {
      const shop = shops.find(s => s.id === shopId);
      if (shop) {
        setSelectedShop(shop);
        navigate('/kisok-ac-back-office/shop-admin');
      }
    }
  };

  const isShopAdminMode = selectedShop !== null;

  return (
    <div className="flex h-screen bg-gradient-to-br from-[var(--primary-bg)] via-[var(--secondary-bg)] to-[var(--primary-bg)]">
      
      {/* Mobile Sidebar Toggle */}
      <div className="lg:hidden fixed top-4 left-4 z-30">
        <button
          onClick={toggleSidebar}
          className="p-3 rounded-xl bg-[var(--card-bg)] border border-[var(--border-color)] shadow-md hover:bg-[var(--hover-bg)] transition"
        >
          {isSidebarOpen ? <X size={24} className="text-[var(--primary-text)]" /> : <Menu size={24} className="text-[var(--primary-text)]" />}
        </button>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-10 lg:hidden" onClick={closeSidebar}></div>
      )}

      {/* Sidebar */}
      <aside className={`w-72 bg-[var(--sidebar-bg)] fixed inset-y-0 left-0 z-20 transform transition-transform duration-300 ease-in-out lg:translate-x-0 shadow-xl ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>

        {/* Logo */}
        <div className="p-6 border-b border-[var(--border-color)]">
          <div className="flex items-center space-x-3">
            <img
              src="https://students.rajalakshmi.org/images/rec_logo.png"
              alt="REC KIOSK Logo"
              className="h-10 w-auto"
            />
          </div>
        </div>

        {/* Shop Selector for Admin */}
        {user?.role === 'admin' && (
          <div className="p-4 border-b border-[var(--border-color)]">
            <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
              Access Shop Admin
            </label>
            <select
              value={selectedShop?.id || ''}
              onChange={(e) => handleShopChange(e.target.value)}
              className="w-full p-2 text-sm border border-[var(--border-color)] rounded-lg bg-[var(--card-bg)] text-[var(--primary-text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-purple)]"
              disabled={loading}
            >
              <option value="">Select a shop...</option>
              {shops.map((shop) => (
                <option key={shop.id} value={shop.id}>
                  {shop.name}
                </option>
              ))}
            </select>
            {selectedShop && (
              <div className="mt-2 p-2 bg-[var(--accent-purple)] bg-opacity-10 rounded-lg">
                <p className="text-xs text-[var(--accent-purple)] font-medium">
                  Accessing: {selectedShop.name}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <nav className="mt-6 px-3 pb-28 space-y-8 overflow-y-auto">
          
          {!isShopAdminMode ? (
            // Admin Navigation
            <>
              {/* Section: Main */}
              <div>
                <h3 className="text-xs text-[var(--muted-text)] uppercase font-semibold px-3 mb-2 tracking-wide">
                  Main
                </h3>
                <div className="space-y-2">
                  <SidebarLink to="/kisok-ac-back-office" icon={BarChart3} active={is_active('/kisok-ac-back-office')} closeSidebar={closeSidebar} label="Dashboard" />
                  <SidebarLink to="/kisok-ac-back-office/shops" icon={Store} active={isPathActive('/kisok-ac-back-office/shops')} closeSidebar={closeSidebar} label="shops" />
                  <SidebarLink to="/kisok-ac-back-office/users" icon={Users} active={is_active('/kisok-ac-back-office/users')} closeSidebar={closeSidebar} label="Users" />
                </div>
              </div>

              {/* Section: Financial Management */}
              <div>
                <h3 className="text-xs text-[var(--muted-text)] uppercase font-semibold px-3 mb-2 tracking-wide">
                  Financial
                </h3>
                <div className="space-y-2">
                  <SidebarLink to="/kisok-ac-back-office/transactions" icon={Receipt} active={is_active('/kisok-ac-back-office/transactions')} closeSidebar={closeSidebar} label="Transactions" />
                  <SidebarLink to="/kisok-ac-back-office/analytics" icon={TrendingUp} active={is_active('/kisok-ac-back-office/analytics')} closeSidebar={closeSidebar} label="Analytics" />
                  <SidebarLink to="/kisok-ac-back-office/financial-reports" icon={DollarSign} active={is_active('/kisok-ac-back-office/financial-reports')} closeSidebar={closeSidebar} label="Reports" />
                </div>
              </div>

              {/* Section: System */}
              <div>
                <h3 className="text-xs text-[var(--muted-text)] uppercase font-semibold px-3 mb-2 tracking-wide">
                  System
                </h3>
                <div className="space-y-2">
                  <SidebarLink to="/kisok-ac-back-office/shop-logs" icon={FileText} active={is_active('/kisok-ac-back-office/shop-logs')} closeSidebar={closeSidebar} label="shop Logs" />
                </div>
              </div>
            </>
          ) : (
            // Shop Admin Navigation
            <>
              {/* Section: Shop Admin */}
              <div>
                <h3 className="text-xs text-[var(--muted-text)] uppercase font-semibold px-3 mb-2 tracking-wide">
                  {selectedShop?.name} - Admin
                </h3>
                <div className="space-y-2">
                  <SidebarLink to="/kisok-ac-back-office/shop-admin" icon={BarChart3} active={is_active('/kisok-ac-back-office/shop-admin')} closeSidebar={closeSidebar} label="Dashboard" />
                  <SidebarLink to="/kisok-ac-back-office/shop-admin/products" icon={Package} active={isPathActive('/kisok-ac-back-office/shop-admin/products')} closeSidebar={closeSidebar} label="Products" />
                  <SidebarLink to="/kisok-ac-back-office/shop-admin/orders" icon={ShoppingBag} active={isPathActive('/kisok-ac-back-office/shop-admin/orders')} closeSidebar={closeSidebar} label="Orders" />
                  <SidebarLink to="/kisok-ac-back-office/shop-admin/transactions" icon={Receipt} active={isPathActive('/kisok-ac-back-office/shop-admin/transactions')} closeSidebar={closeSidebar} label="Transactions" />
                  <SidebarLink to="/kisok-ac-back-office/shop-admin/scan" icon={QrCode} active={isPathActive('/kisok-ac-back-office/shop-admin/scan')} closeSidebar={closeSidebar} label="Scan QR" />
                </div>
              </div>
            </>
          )}
        </nav>

        {/* Logout */}
        <div className="absolute bottom-0 w-full p-4 border-t border-[var(--border-color)] bg-[var(--sidebar-bg)]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center p-3 text-sm font-medium rounded-xl text-[var(--error)] hover:bg-red-500/10 hover:border-red-500/30 transition"
          >
            <LogOut size={20} className="mr-3" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-72">
        <header className="z-10 shadow bg-[var(--header-bg)] px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-[var(--primary-text)]">
                {isShopAdminMode ? `${selectedShop?.name} - Shop Admin` : 'Admin Dashboard'}
              </h2>
              <p className="text-sm text-[var(--muted-text)]">
                {isShopAdminMode ? 'Managing shop operations' : 'Manage your campus kiosk system'}
              </p>
            </div>
            {isShopAdminMode && (
              <button
                onClick={() => handleShopChange('')}
                className="flex items-center px-3 py-2 text-sm bg-[var(--accent-purple)] text-white rounded-lg hover:bg-[var(--accent-violet)] transition"
              >
                <Building size={16} className="mr-2" />
                Exit Shop Mode
              </button>
            )}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

// Reusable Sidebar Link Component
const SidebarLink = ({
  to,
  icon: Icon,
  label,
  active,
  closeSidebar
}: {
  to: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
  closeSidebar: () => void;
}) => (
  <Link
    to={to}
    onClick={closeSidebar}
    className={`flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all ${
      active
        ? 'bg-[var(--accent-purple)] text-white shadow-md'
        : 'text-[var(--primary-text)] hover:bg-[var(--hover-bg)]'
    }`}
  >
    <Icon size={20} className="mr-3" />
    {label}
  </Link>
);

export default AdminLayout;
