import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowLeft, Zap, Shield, Key, CheckCircle } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

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
      const { data } = await api.post('/api/users/forgot-password', {
        email: formData.email
      });

      setUserId(data.userId);
      setStep('otp');
      toast.success('OTP sent to your email');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send reset email');
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
      const { data } = await api.post('/api/users/verify-reset-otp', {
        userId,
        otp: formData.otp
      });

      setResetToken(data.resetToken);
      setStep('password');
      toast.success('OTP verified successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Invalid OTP');
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
      const { data } = await api.post('/api/users/reset-password', {
        userId,
        resetToken,
        newPassword: formData.newPassword
      });

      toast.success('Password reset successfully');
      navigate('/login');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    try {
              await api.post('/api/users/resend-reset-otp', { userId });
      toast.success('New OTP sent to your email');
    } catch (error: any) {
      toast.error('Failed to resend OTP');
    }
  };

  const renderEmailStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-gradient-to-r from-[var(--accent-purple)] to-[var(--accent-violet)] rounded-full glow">
            <Mail className="text-white" size={32} />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-[var(--primary-text)] mb-2">Forgot Password</h2>
        <p className="text-[var(--secondary-text)]">
          Enter your email address and we'll send you an OTP to reset your password
        </p>
      </div>

      <form onSubmit={handleEmailSubmit} className="space-y-6">
        <div className="form-group">
          <label htmlFor="email" className="form-label">
            <Mail size={16} className="inline mr-2" />
            Email Address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="input"
            placeholder="Enter your registered email"
            required
          />
          <p className="form-help">
            We'll send you a 6-digit OTP to reset your password
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary py-3 text-lg"
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
    </div>
  );

  const renderOTPStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-gradient-to-r from-[var(--accent-purple)] to-[var(--accent-violet)] rounded-full glow">
            <Shield className="text-white" size={32} />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-[var(--primary-text)] mb-2">Verify OTP</h2>
        <p className="text-[var(--secondary-text)]">
          Enter the 6-digit OTP sent to {formData.email}
        </p>
      </div>

      <form onSubmit={handleOTPSubmit} className="space-y-6">
        <div className="form-group">
          <label htmlFor="otp" className="form-label">
            <Key size={16} className="inline mr-2" />
            Enter OTP
          </label>
          <input
            type="text"
            id="otp"
            name="otp"
            value={formData.otp}
            onChange={handleChange}
            className="input text-center text-2xl tracking-widest"
            placeholder="000000"
            maxLength={6}
            required
          />
          <p className="form-help text-center">
            Please enter the 6-digit OTP sent to your email
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary py-3 text-lg"
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
          className="w-full btn-secondary py-3"
        >
          <Mail size={20} className="inline mr-2" />
          Resend OTP
        </button>
      </form>
    </div>
  );

  const renderPasswordStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-gradient-to-r from-[var(--accent-purple)] to-[var(--accent-violet)] rounded-full glow">
            <Lock className="text-white" size={32} />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-[var(--primary-text)] mb-2">Reset Password</h2>
        <p className="text-[var(--secondary-text)]">
          Create a new secure password for your account
        </p>
      </div>

      <form onSubmit={handlePasswordSubmit} className="space-y-6">
        <div className="form-group">
          <label htmlFor="newPassword" className="form-label">
            <Lock size={16} className="inline mr-2" />
            New Password
          </label>
          <input
            type="password"
            id="newPassword"
            name="newPassword"
            value={formData.newPassword}
            onChange={handleChange}
            className="input"
            placeholder="Enter new password"
            minLength={6}
            required
          />
          <p className="form-help">
            Password must be at least 6 characters long
          </p>
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword" className="form-label">
            <CheckCircle size={16} className="inline mr-2" />
            Confirm New Password
          </label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            className="input"
            placeholder="Confirm new password"
            minLength={6}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary py-3 text-lg"
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
    </div>
  );

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

        {/* Reset Form */}
        <div className="form-container p-8">
          {step === 'email' && renderEmailStep()}
          {step === 'otp' && renderOTPStep()}
          {step === 'password' && renderPasswordStep()}

          <div className="text-center mt-6">
            <Link
              to="/login"
              className="flex items-center justify-center text-[var(--accent-purple)] hover:text-[var(--accent-violet)] transition-colors group"
            >
              <ArrowLeft size={16} className="mr-1 group-hover:-translate-x-1 transition-transform" />
              Back to Login
            </Link>
          </div>
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

export default ForgotPasswordPage;