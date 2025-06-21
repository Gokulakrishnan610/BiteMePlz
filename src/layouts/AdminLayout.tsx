import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  BarChart3, 
  Store, 
  Users, 
  LogOut, 
  Menu, 
  X,
  Receipt,
  TrendingUp,
  DollarSign,
  Zap
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

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const isPathActive = (path: string) => {
    return location.pathname.includes(path);
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-[var(--primary-bg)] via-[var(--secondary-bg)] to-[var(--primary-bg)]">
      {/* Mobile Sidebar Toggle */}
      <div className="lg:hidden fixed top-4 left-4 z-30">
        <button
          onClick={toggleSidebar}
          className="p-3 rounded-xl bg-[var(--card-bg)] border border-[var(--border-color)] shadow-lg hover:bg-[var(--hover-bg)] transition-all duration-200"
        >
          {isSidebarOpen ? <X size={24} className="text-[var(--primary-text)]" /> : <Menu size={24} className="text-[var(--primary-text)]" />}
        </button>
      </div>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden backdrop-blur-sm"
          onClick={closeSidebar}
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={`w-72 sidebar fixed inset-y-0 left-0 z-20 transform ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 transition-transform duration-300 ease-in-out shadow-2xl`}
      >
        {/* Logo Section */}
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
        <nav className="mt-6 px-3">
          <div className="space-y-2">
            <Link
              to="/admin"
              className={`sidebar-item rounded-xl ${
                isActive('/admin') ? 'active' : ''
              }`}
              onClick={closeSidebar}
            >
              <BarChart3 size={20} className="mr-3" />
              <span>Dashboard</span>
            </Link>
            
            <Link
              to="/admin/shops"
              className={`sidebar-item rounded-xl ${
                isPathActive('/admin/shops') ? 'active' : ''
              }`}
              onClick={closeSidebar}
            >
              <Store size={20} className="mr-3" />
              <span>Shops</span>
            </Link>
            
            <Link
              to="/admin/users"
              className={`sidebar-item rounded-xl ${
                isActive('/admin/users') ? 'active' : ''
              }`}
              onClick={closeSidebar}
            >
              <Users size={20} className="mr-3" />
              <span>Users</span>
            </Link>
          </div>

          {/* Transaction Features */}
          <div className="mt-8">
            <div className="px-3 py-2">
              <h3 className="text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider">
                Financial Management
              </h3>
            </div>
            
            <div className="space-y-2">
              <Link
                to="/admin/transactions"
                className={`sidebar-item rounded-xl ${
                  isActive('/admin/transactions') ? 'active' : ''
                }`}
                onClick={closeSidebar}
              >
                <Receipt size={20} className="mr-3" />
                <span>All Transactions</span>
              </Link>
              
              <Link
                to="/admin/analytics"
                className={`sidebar-item rounded-xl ${
                  isActive('/admin/analytics') ? 'active' : ''
                }`}
                onClick={closeSidebar}
              >
                <TrendingUp size={20} className="mr-3" />
                <span>Analytics</span>
              </Link>
              
              <Link
                to="/admin/financial-reports"
                className={`sidebar-item rounded-xl ${
                  isActive('/admin/financial-reports') ? 'active' : ''
                }`}
                onClick={closeSidebar}
              >
                <DollarSign size={20} className="mr-3" />
                <span>Financial Reports</span>
              </Link>
            </div>
          </div>
        </nav>
        
        {/* Logout Button */}
        <div className="absolute bottom-0 w-full p-6 border-t border-[var(--border-color)]">
          <button
            onClick={handleLogout}
            className="w-full sidebar-item rounded-xl text-[var(--error)] hover:bg-red-500/10 hover:border-red-500/30"
          >
            <LogOut size={20} className="mr-3" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-72">
        <header className="page-header z-10 shadow-lg">
          <div className="px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-[var(--primary-text)]">
                Admin Dashboard
              </h2>
              <p className="text-[var(--muted-text)] text-sm">Manage your campus kiosk system</p>
            </div>
            <Link 
              to="/" 
              className="btn-secondary text-sm hover:text-[var(--accent-purple)]"
            >
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

export default AdminLayout;