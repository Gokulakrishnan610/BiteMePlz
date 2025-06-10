import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  BarChart3, 
  Store, 
  Users, 
  LogOut, 
  Menu, 
  X 
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

  return (
    <div className="flex h-screen bg-[var(--gray-100)]">
      {/* Mobile Sidebar Toggle */}
      <div className="lg:hidden fixed top-4 left-4 z-30">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-md bg-white shadow-md"
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={closeSidebar}
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={`w-64 bg-[var(--primary-dark)] text-white fixed inset-y-0 left-0 z-20 transform ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 transition-transform duration-300 ease-in-out`}
      >
        <div className="p-6">
          <h1 className="text-2xl font-bold">Admin Portal</h1>
        </div>
        <nav className="mt-6">
          <Link
            to="/admin"
            className={`flex items-center px-6 py-3 hover:bg-[var(--primary)] ${
              isActive('/admin') ? 'bg-[var(--primary)]' : ''
            }`}
            onClick={closeSidebar}
          >
            <BarChart3 size={20} className="mr-3" />
            <span>Dashboard</span>
          </Link>
          <Link
            to="/admin/shops"
            className={`flex items-center px-6 py-3 hover:bg-[var(--primary)] ${
              location.pathname.includes('/admin/shops') ? 'bg-[var(--primary)]' : ''
            }`}
            onClick={closeSidebar}
          >
            <Store size={20} className="mr-3" />
            <span>Shops</span>
          </Link>
          <Link
            to="/admin/users"
            className={`flex items-center px-6 py-3 hover:bg-[var(--primary)] ${
              isActive('/admin/users') ? 'bg-[var(--primary)]' : ''
            }`}
            onClick={closeSidebar}
          >
            <Users size={20} className="mr-3" />
            <span>Users</span>
          </Link>
        </nav>
        <div className="absolute bottom-0 w-full">
          <button
            onClick={handleLogout}
            className="flex items-center px-6 py-3 w-full text-left hover:bg-[var(--primary)]"
          >
            <LogOut size={20} className="mr-3" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-64">
        <header className="bg-white shadow-sm z-10">
          <div className="px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-[var(--gray-800)]">
              Admin Portal
            </h2>
            <Link to="/" className="text-[var(--primary)] hover:underline">
              Go to Main Site
            </Link>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;