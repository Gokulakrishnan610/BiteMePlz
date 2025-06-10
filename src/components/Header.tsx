import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { ShoppingCart, User, Menu, X, LogOut, ChevronDown } from 'lucide-react';
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
    <header className="bg-white shadow-md">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <Link to="/" className="text-2xl font-bold text-[var(--primary)]" onClick={closeMenus}>
            Kiosk Webapp
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-[var(--gray-700)] hover:text-[var(--primary)]">
              Home
            </Link>
            {user && (
              <>
                <Link to="/orders" className="text-[var(--gray-700)] hover:text-[var(--primary)]">
                  My Orders
                </Link>
                <Wallet />
              </>
            )}
            {!user && (
              <>
                <Link to="/login" className="text-[var(--gray-700)] hover:text-[var(--primary)]">
                  Login
                </Link>
                <Link to="/register" className="text-[var(--gray-700)] hover:text-[var(--primary)]">
                  Register
                </Link>
              </>
            )}
            <Link to="/cart" className="relative text-[var(--gray-700)] hover:text-[var(--primary)]">
              <ShoppingCart size={20} />
              {getTotalItems() > 0 && (
                <span className="absolute -top-2 -right-2 bg-[var(--accent)] text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {getTotalItems()}
                </span>
              )}
            </Link>
            {user && (
              <div className="relative">
                <button
                  onClick={toggleProfileDropdown}
                  className="flex items-center text-[var(--gray-700)] hover:text-[var(--primary)]"
                >
                  <span className="mr-1">{user.name}</span>
                  <ChevronDown size={16} />
                </button>
                {isProfileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                    <Link
                      to={getDashboardLink()}
                      className="block px-4 py-2 text-sm text-[var(--gray-700)] hover:bg-[var(--gray-100)]"
                      onClick={closeMenus}
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/profile"
                      className="block px-4 py-2 text-sm text-[var(--gray-700)] hover:bg-[var(--gray-100)]"
                      onClick={closeMenus}
                    >
                      Profile
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-[var(--gray-700)] hover:bg-[var(--gray-100)]"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            {user && <Wallet />}
            <Link to="/cart" className="relative mx-4 text-[var(--gray-700)]">
              <ShoppingCart size={20} />
              {getTotalItems() > 0 && (
                <span className="absolute -top-2 -right-2 bg-[var(--accent)] text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {getTotalItems()}
                </span>
              )}
            </Link>
            <button onClick={toggleMenu} className="text-[var(--gray-700)]">
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="md:hidden py-4 border-t border-[var(--gray-200)]">
            <div className="flex flex-col space-y-4">
              <Link
                to="/"
                className="text-[var(--gray-700)] hover:text-[var(--primary)]"
                onClick={closeMenus}
              >
                Home
              </Link>
              {user && (
                <>
                  <Link
                    to="/orders"
                    className="text-[var(--gray-700)] hover:text-[var(--primary)]"
                    onClick={closeMenus}
                  >
                    My Orders
                  </Link>
                  <Link
                    to={getDashboardLink()}
                    className="text-[var(--gray-700)] hover:text-[var(--primary)]"
                    onClick={closeMenus}
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/profile"
                    className="text-[var(--gray-700)] hover:text-[var(--primary)]"
                    onClick={closeMenus}
                  >
                    Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center text-[var(--gray-700)] hover:text-[var(--primary)]"
                  >
                    <LogOut size={18} className="mr-1" />
                    Logout
                  </button>
                </>
              )}
              {!user && (
                <>
                  <Link
                    to="/login"
                    className="text-[var(--gray-700)] hover:text-[var(--primary)]"
                    onClick={closeMenus}
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="text-[var(--gray-700)] hover:text-[var(--primary)]"
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