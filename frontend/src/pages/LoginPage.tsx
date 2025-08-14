import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { LogIn, Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
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

  const getExpectedRole = () => {
    if (location.pathname.startsWith('/kisok-ac-back-office/login')) return 'admin';
    if (location.pathname.startsWith('/kisok-sp-back-office/login')) return 'shopAdmin';
    return 'student';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      toast.success('Login successful');
      setShowPostLoginAnimation(true);
    } catch (err: any) {
      const message = err?.message || 'Invalid email or password';
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
              disabled={loading}
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