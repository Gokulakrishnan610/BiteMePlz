import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { ShoppingCart, User, Menu, X, LogOut, ChevronDown, Zap } from 'lucide-react';
import Wallet from './Wallet';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const { getTotalItems } = useCart();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const toggleProfileDropdown = () => {
    setIsProfileDropdownOpen(!isProfileDropdownOpen);
  };

  const closeMenus = () => {
    setIsMenuOpen(false);
    setIsProfileDropdownOpen(false);
  };

  const getDashboardLink = () => {
    if (user?.role === 'admin') return '/admin';
    if (user?.role === 'shopAdmin') return '/shop-admin';
    return '/profile';
  };

  return (
    <header className="bg-[var(--secondary-bg)]/95 backdrop-blur-md border-b border-[var(--border-color)] sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center space-x-2 text-2xl font-bold gradient-text hover:scale-105 transition-transform duration-200" 
            onClick={closeMenus}
          >
            <Zap className="text-[var(--accent-purple)]" size={28} />
            <span>Campus Kiosk</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link 
              to="/" 
              className="text-[var(--secondary-text)] hover:text-[var(--accent-purple)] transition-colors duration-200 relative group"
            >
              Home
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[var(--accent-purple)] transition-all duration-200 group-hover:w-full"></span>
            </Link>
            {user && (
              <>
                <Link 
                  to="/orders" 
                  className="text-[var(--secondary-text)] hover:text-[var(--accent-purple)] transition-colors duration-200 relative group"
                >
                  My Orders
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[var(--accent-purple)] transition-all duration-200 group-hover:w-full"></span>
                </Link>
                <Wallet />
              </>
            )}
            {!user && (
              <>
                <Link 
                  to="/login" 
                  className="text-[var(--secondary-text)] hover:text-[var(--accent-purple)] transition-colors duration-200"
                >
                  Login
                </Link>
                <Link 
                  to="/register" 
                  className="btn-primary px-6 py-2"
                >
                  Register
                </Link>
              </>
            )}
            
            {/* Cart */}
            <Link 
              to="/cart" 
              className="relative text-[var(--secondary-text)] hover:text-[var(--accent-purple)] transition-colors duration-200 p-2 rounded-lg hover:bg-[var(--hover-bg)]"
            >
              <ShoppingCart size={24} />
              {getTotalItems() > 0 && (
                <span className="absolute -top-1 -right-1 bg-gradient-to-r from-[var(--accent-purple)] to-[var(--accent-violet)] text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center animate-pulse">
                  {getTotalItems()}
                </span>
              )}
            </Link>

            {/* User Profile */}
            {user && (
              <div className="relative">
                <button
                  onClick={toggleProfileDropdown}
                  className="flex items-center text-[var(--secondary-text)] hover:text-[var(--accent-purple)] transition-colors duration-200 p-2 rounded-lg hover:bg-[var(--hover-bg)]"
                >
                  <User size={20} className="mr-2" />
                  <span className="mr-1">{user.name}</span>
                  <ChevronDown size={16} className={`transition-transform duration-200 ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {isProfileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-[var(--card-bg)] rounded-xl shadow-2xl border border-[var(--border-color)] py-2 z-50 backdrop-blur-md">
                    <Link
                      to={getDashboardLink()}
                      className="block px-4 py-3 text-sm text-[var(--secondary-text)] hover:bg-[var(--hover-bg)] hover:text-[var(--accent-purple)] transition-colors duration-200"
                      onClick={closeMenus}
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/profile"
                      className="block px-4 py-3 text-sm text-[var(--secondary-text)] hover:bg-[var(--hover-bg)] hover:text-[var(--accent-purple)] transition-colors duration-200"
                      onClick={closeMenus}
                    >
                      Profile
                    </Link>
                    <hr className="my-2 border-[var(--border-color)]" />
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-3 text-sm text-[var(--error)] hover:bg-[var(--hover-bg)] transition-colors duration-200"
                    >
                      <LogOut size={16} className="inline mr-2" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-4">
            {user && <Wallet />}
            <Link 
              to="/cart" 
              className="relative text-[var(--secondary-text)] p-2"
            >
              <ShoppingCart size={24} />
              {getTotalItems() > 0 && (
                <span className="absolute -top-1 -right-1 bg-gradient-to-r from-[var(--accent-purple)] to-[var(--accent-violet)] text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                  {getTotalItems()}
                </span>
              )}
            </Link>
            <button 
              onClick={toggleMenu} 
              className="text-[var(--secondary-text)] hover:text-[var(--accent-purple)] p-2 rounded-lg hover:bg-[var(--hover-bg)] transition-colors duration-200"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="md:hidden py-4 border-t border-[var(--border-color)] bg-[var(--secondary-bg)]/95 backdrop-blur-md">
            <div className="flex flex-col space-y-4">
              <Link
                to="/"
                className="text-[var(--secondary-text)] hover:text-[var(--accent-purple)] transition-colors duration-200 py-2"
                onClick={closeMenus}
              >
                Home
              </Link>
              {user && (
                <>
                  <Link
                    to="/orders"
                    className="text-[var(--secondary-text)] hover:text-[var(--accent-purple)] transition-colors duration-200 py-2"
                    onClick={closeMenus}
                  >
                    My Orders
                  </Link>
                  <Link
                    to={getDashboardLink()}
                    className="text-[var(--secondary-text)] hover:text-[var(--accent-purple)] transition-colors duration-200 py-2"
                    onClick={closeMenus}
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/profile"
                    className="text-[var(--secondary-text)] hover:text-[var(--accent-purple)] transition-colors duration-200 py-2"
                    onClick={closeMenus}
                  >
                    Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center text-[var(--error)] hover:text-red-400 transition-colors duration-200 py-2"
                  >
                    <LogOut size={18} className="mr-2" />
                    Logout
                  </button>
                </>
              )}
              {!user && (
                <>
                  <Link
                    to="/login"
                    className="text-[var(--secondary-text)] hover:text-[var(--accent-purple)] transition-colors duration-200 py-2"
                    onClick={closeMenus}
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="btn-primary inline-block text-center py-3"
                    onClick={closeMenus}
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;