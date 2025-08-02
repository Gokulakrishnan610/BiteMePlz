// ✂️ Top Imports (No changes)
import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  BarChart3, Store, Users, LogOut, Menu, X,
  Receipt, TrendingUp, DollarSign, Zap,
  Activity, FileText
} from 'lucide-react';

const AdminLayout: React.FC = () => {
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);
  const isActive = (path: string) => location.pathname === path;
  const isPathActive = (path: string) => location.pathname.includes(path);

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
            <div className="p-2 bg-gradient-to-r from-[var(--accent-purple)] to-[var(--accent-violet)] rounded-xl">
              <Zap className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold gradient-text">Admin Portal</h1>
              <p className="text-[var(--muted-text)] text-sm">Campus Kiosk</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-6 px-3 pb-28 space-y-8 overflow-y-auto">
          
          {/* Section: Main */}
          <div>
            <h3 className="text-xs text-[var(--muted-text)] uppercase font-semibold px-3 mb-2 tracking-wide">
              Main
            </h3>
            <div className="space-y-2">
              <SidebarLink to="/admin" icon={BarChart3} active={isActive('/admin')} closeSidebar={closeSidebar} label="Dashboard" />
              <SidebarLink to="/admin/shops" icon={Store} active={isPathActive('/admin/shops')} closeSidebar={closeSidebar} label="Shops" />
              <SidebarLink to="/admin/users" icon={Users} active={isActive('/admin/users')} closeSidebar={closeSidebar} label="Users" />
            </div>
          </div>

          {/* Section: Financial Management */}
          <div>
            <h3 className="text-xs text-[var(--muted-text)] uppercase font-semibold px-3 mb-2 tracking-wide">
              Financial
            </h3>
            <div className="space-y-2">
              <SidebarLink to="/admin/transactions" icon={Receipt} active={isActive('/admin/transactions')} closeSidebar={closeSidebar} label="Transactions" />
              <SidebarLink to="/admin/analytics" icon={TrendingUp} active={isActive('/admin/analytics')} closeSidebar={closeSidebar} label="Analytics" />
              <SidebarLink to="/admin/financial-reports" icon={DollarSign} active={isActive('/admin/financial-reports')} closeSidebar={closeSidebar} label="Reports" />
            </div>
          </div>

          {/* Section: System */}
          <div>
            <h3 className="text-xs text-[var(--muted-text)] uppercase font-semibold px-3 mb-2 tracking-wide">
              System
            </h3>
            <div className="space-y-2">
              <SidebarLink to="/admin/shop-logs" icon={FileText} active={isActive('/admin/shop-logs')} closeSidebar={closeSidebar} label="Shop Logs" />
              {/* <SidebarLink to="/admin/student-analytics" icon={Activity} active={isActive('/admin/student-analytics')} closeSidebar={closeSidebar} label="Student Analytics" /> */}
            </div>
          </div>
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
              <h2 className="text-xl font-semibold text-[var(--primary-text)]">Admin Dashboard</h2>
              <p className="text-sm text-[var(--muted-text)]">Manage your campus kiosk system</p>
            </div>
            <Link to="/" className="btn-secondary text-sm hover:text-[var(--accent-purple)]">
              Go to Main Site
            </Link>
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
