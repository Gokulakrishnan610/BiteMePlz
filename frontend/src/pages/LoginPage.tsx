import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, Eye, EyeOff, Zap, Mail, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      toast.success('Login successful');
      navigate('/');
    } catch (error) {
      toast.error('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--primary-bg)] via-[var(--secondary-bg)] to-[var(--primary-bg)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-full bg-gradient-to-r from-[var(--accent-purple)] to-[var(--accent-violet)] glow">
              <Zap size={32} className="text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold gradient-text mb-2">Campus Kiosk</h1>
          <p className="text-[var(--muted-text)]">Your digital campus marketplace</p>
        </div>

        {/* Login Form */}
        <div className="form-container p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <LogIn className="text-[var(--accent-purple)]" size={48} />
            </div>
            <h2 className="text-2xl font-bold text-[var(--primary-text)] mb-2">Welcome Back</h2>
            <p className="text-[var(--secondary-text)]">
              Sign in to your account to continue
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                <Mail size={16} className="inline mr-2" />
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="Enter your email"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                <Lock size={16} className="inline mr-2" />
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pr-12"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-[var(--muted-text)] hover:text-[var(--accent-purple)] transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 text-lg"
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
                className="text-[var(--accent-purple)] hover:text-[var(--accent-violet)] transition-colors block"
              >
                Forgot your password?
              </Link>
              <div className="border-t border-[var(--border-color)] pt-4">
                <p className="text-[var(--secondary-text)]">
                  Don't have an account?{' '}
                  <Link 
                    to="/register" 
                    className="text-[var(--accent-purple)] hover:text-[var(--accent-violet)] font-medium transition-colors"
                  >
                    Register here
                  </Link>
                </p>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-[var(--muted-text)] text-sm">
            © 2024 Campus Kiosk. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;