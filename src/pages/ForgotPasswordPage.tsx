import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowLeft } from 'lucide-react';
import axios from 'axios';
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
      const { data } = await axios.post('/api/users/forgot-password', {
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
      const { data } = await axios.post('/api/users/verify-reset-otp', {
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
      const { data } = await axios.post('/api/users/reset-password', {
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
      await axios.post('/api/users/resend-reset-otp', { userId });
      toast.success('New OTP sent to your email');
    } catch (error: any) {
      toast.error('Failed to resend OTP');
    }
  };

  const renderEmailStep = () => (
    <form onSubmit={handleEmailSubmit}>
      <div className="mb-6">
        <label htmlFor="email" className="block text-sm font-medium text-[var(--gray-700)] mb-1">
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
        <p className="text-sm text-[var(--gray-600)] mt-2">
          We'll send you an OTP to reset your password
        </p>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full btn-primary mb-4"
      >
        {loading ? (
          <span className="flex items-center justify-center">
            <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></span>
            Sending OTP...
          </span>
        ) : (
          'Send Reset OTP'
        )}
      </button>
    </form>
  );

  const renderOTPStep = () => (
    <form onSubmit={handleOTPSubmit}>
      <div className="mb-6">
        <label htmlFor="otp" className="block text-sm font-medium text-[var(--gray-700)] mb-1">
          Enter OTP
        </label>
        <input
          type="text"
          id="otp"
          name="otp"
          value={formData.otp}
          onChange={handleChange}
          className="input"
          placeholder="Enter 6-digit OTP"
          maxLength={6}
          required
        />
        <p className="text-sm text-[var(--gray-600)] mt-2">
          Please enter the OTP sent to {formData.email}
        </p>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full btn-primary mb-4"
      >
        {loading ? (
          <span className="flex items-center justify-center">
            <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></span>
            Verifying...
          </span>
        ) : (
          'Verify OTP'
        )}
      </button>

      <button
        type="button"
        onClick={handleResendOTP}
        className="w-full btn-secondary"
      >
        Resend OTP
      </button>
    </form>
  );

  const renderPasswordStep = () => (
    <form onSubmit={handlePasswordSubmit}>
      <div className="mb-4">
        <label htmlFor="newPassword" className="block text-sm font-medium text-[var(--gray-700)] mb-1">
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
      </div>

      <div className="mb-6">
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-[var(--gray-700)] mb-1">
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
        className="w-full btn-primary mb-4"
      >
        {loading ? (
          <span className="flex items-center justify-center">
            <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></span>
            Resetting...
          </span>
        ) : (
          'Reset Password'
        )}
      </button>
    </form>
  );

  const getStepTitle = () => {
    switch (step) {
      case 'email':
        return 'Forgot Password';
      case 'otp':
        return 'Verify OTP';
      case 'password':
        return 'Reset Password';
      default:
        return 'Forgot Password';
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case 'email':
        return 'Enter your email to receive a reset OTP';
      case 'otp':
        return 'Enter the OTP sent to your email';
      case 'password':
        return 'Create a new password for your account';
      default:
        return '';
    }
  };

  const getStepIcon = () => {
    switch (step) {
      case 'email':
        return <Mail className="mx-auto text-[var(--primary)]" size={48} />;
      case 'otp':
        return <Mail className="mx-auto text-[var(--primary)]" size={48} />;
      case 'password':
        return <Lock className="mx-auto text-[var(--primary)]" size={48} />;
      default:
        return <Mail className="mx-auto text-[var(--primary)]" size={48} />;
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="card max-w-md w-full">
        <div className="text-center mb-8">
          {getStepIcon()}
          <h1 className="text-2xl font-bold mt-4">{getStepTitle()}</h1>
          <p className="text-[var(--gray-600)] mt-2">
            {getStepDescription()}
          </p>
        </div>

        {step === 'email' && renderEmailStep()}
        {step === 'otp' && renderOTPStep()}
        {step === 'password' && renderPasswordStep()}

        <div className="text-center">
          <Link
            to="/login"
            className="flex items-center justify-center text-[var(--primary)] hover:underline"
          >
            <ArrowLeft size={16} className="mr-1" />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;