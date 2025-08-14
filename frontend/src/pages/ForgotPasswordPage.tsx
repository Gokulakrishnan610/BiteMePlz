import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowLeft, Shield, Key, CheckCircle } from 'lucide-react';
import api from '../api';
import { toast } from 'sonner';

const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'email' | 'otp' | 'password'>('email');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    otp: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email) {
      toast.error('Please enter your email address');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/api/users/forgot-password/', { email: formData.email });
      setUserId(data.userId || '');
      setStep('otp');
      toast.success('OTP sent to your email');
    } catch (error: any) {
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.otp) {
      toast.error('Please enter the OTP');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/api/users/verify-reset-otp', { userId, otp: formData.otp });
      setResetToken(data.resetToken);
      setStep('password');
      toast.success('OTP verified successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.newPassword || !formData.confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (formData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }
    setLoading(true);
    try {
      await api.post('/api/users/reset-password', { userId, resetToken, newPassword: formData.newPassword });
      toast.success('Password reset successfully');
      navigate('/login');
    } catch (error: any) {
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    try {
      await api.post('/api/users/resend-reset-otp', { userId });
      toast.success('New OTP sent to your email');
    } catch (error: any) {
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to resend OTP');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-purple-100">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <img
                src="/images/rec college.png"
                alt="REC College Logo"
                className="h-20 w-auto object-contain"
              />
            </div>
          </div>

          {step === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  <Mail size={16} className="inline mr-2" />
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                  placeholder="Enter your registered email"
                  required
                />
                <p className="text-xs text-gray-500">We'll send you a 6-digit OTP to reset your password</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></span>
                    Sending OTP...
                  </span>
                ) : (
                  <>
                    <Mail size={20} className="inline mr-2" />
                    Send Reset OTP
                  </>
                )}
              </button>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleOTPSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
                  <Key size={16} className="inline mr-2" />
                  Enter OTP
                </label>
                <input
                  type="text"
                  id="otp"
                  name="otp"
                  value={formData.otp}
                  onChange={handleChange}
                  className="w-full px-4 py-3 text-center text-xl tracking-widest border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                  placeholder="000000"
                  maxLength={6}
                  required
                />
                <p className="text-xs text-gray-500 text-center">Please enter the 6-digit OTP sent to {formData.email}</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></span>
                    Verifying...
                  </span>
                ) : (
                  <>
                    <Shield size={20} className="inline mr-2" />
                    Verify OTP
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleResendOTP}
                className="w-full border border-gray-300 hover:border-purple-500 hover:bg-purple-50 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors"
              >
                <Mail size={20} className="inline mr-2" />
                Resend OTP
              </button>
            </form>
          )}

          {step === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                  <Lock size={16} className="inline mr-2" />
                  New Password
                </label>
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                  placeholder="Enter new password"
                  minLength={6}
                  required
                />
                <p className="text-xs text-gray-500">Password must be at least 6 characters long</p>
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  <CheckCircle size={16} className="inline mr-2" />
                  Confirm New Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                  placeholder="Confirm new password"
                  minLength={6}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></span>
                    Resetting...
                  </span>
                ) : (
                  <>
                    <Lock size={20} className="inline mr-2" />
                    Reset Password
                  </>
                )}
              </button>
            </form>
          )}

          <div className="text-center mt-6">
            <Link
              to="/login"
              className="flex items-center justify-center text-purple-600 hover:text-purple-700 transition-colors group"
            >
              <ArrowLeft size={16} className="mr-1 group-hover:-translate-x-1 transition-transform" />
              Back to Login
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-gray-500 text-sm">© 2024 REC College. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;