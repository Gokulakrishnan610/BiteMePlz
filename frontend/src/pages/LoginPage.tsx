import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { LogIn, Eye, EyeOff, Mail, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSiteConfig } from '../context/SiteConfigContext';
import api from '../api';
import { toast } from 'sonner';
import LoadingScreen from '../components/LoadingScreen';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPostLoginAnimation, setShowPostLoginAnimation] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { config, loading: configLoading } = useSiteConfig();

  const getExpectedRole = () => {
    if (location.pathname.startsWith('/kisok-ac-back-office/login')) return 'admin';
    if (location.pathname.startsWith('/kisok-sp-back-office/login')) return 'shopAdmin';
    return 'student';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if login is enabled
    if (config && !config.login_enabled) {
      toast.error('Login is currently disabled. Please try again later.');
      return;
    }

    setLoading(true);

    try {
      await login(email, password);
      // Enforce role restriction based on path
      const expectedRole = getExpectedRole();
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (!user.role || user.role !== expectedRole) {
        setLoading(false);
        toast.error('You are not authorized to login here.');
        return;
      }
      setShowPostLoginAnimation(true);
    } catch (err: any) {
      const message = err?.message || 'Invalid email or password';
      // If account not verified, try resending OTP by email to help the user
      if (message.toLowerCase().includes('verify')) {
        try {
          await api.post('/api/users/resend-otp-by-email/', { email });
          toast.success('Verification OTP sent to your email. Please check your inbox.');
        } catch (e: any) {
          // Fall back to showing the original message
        }
      }
      toast.error(message);
      setLoading(false);
    }
  };

  const handleAnimationComplete = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role === 'admin') {
      navigate('/kisok-ac-back-office');
    } else if (user.role === 'shopAdmin') {
      navigate('/kisok-sp-back-office');
    } else {
      navigate('/');
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  if (showPostLoginAnimation) {
    return <LoadingScreen onComplete={handleAnimationComplete} />;
  }

  if (configLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-purple-100">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <img 
                src="/images/rec college.png" 
                alt="REC College Logo" 
                className="h-20 w-auto object-contain"
              />
            </div>
          </div>

          {config && !config.login_enabled && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-sm font-medium text-yellow-800">Login Temporarily Disabled</p>
                <p className="text-xs text-yellow-700 mt-1">
                  Login functionality is currently disabled. Please try again later or contact support.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                <Mail size={16} className="inline mr-2" />
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors bg-white text-black placeholder-gray-400"
                placeholder="Enter your email"
                style={{ color: 'black' }}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                <Lock size={16} className="inline mr-2" />
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-purple-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || (config && !config.login_enabled)}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></span>
                  Signing in...
                </span>
              ) : (
                <>
                  <LogIn size={20} className="inline mr-2" />
                  Sign In
                </>
              )}
            </button>

            <div className="text-center space-y-4">
              <Link 
                to="/forgot-password" 
                className="text-purple-600 hover:text-purple-700 transition-colors block"
              >
                Forgot your password?
              </Link>
              {getExpectedRole() === 'student' && (
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-gray-600">
                    Don't have an account?{' '}
                    <Link 
                      to="/register" 
                      className="text-purple-600 hover:text-purple-700 font-medium transition-colors"
                    >
                      Register here
                    </Link>
                  </p>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-gray-500 text-sm">
            © 2024 REC College. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;