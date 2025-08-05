
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, Eye, EyeOff, Zap, Mail, Lock, User, CreditCard } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'register' | 'verify'>('register');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    rollNo: '',
    password: '',
    confirmPassword: '',
    otp: ''
  });

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Roll number validation
    if (!formData.rollNo.trim()) {
      newErrors.rollNo = 'Roll number is required';
    } else if (formData.rollNo.trim().length < 3) {
      newErrors.rollNo = 'Roll number must be at least 3 characters';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const { data } = await api.post('/api/users/register/', {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        roll_no: formData.rollNo.trim(),
        password: formData.password,
        confirm_password: formData.confirmPassword
      });

      setUserId(data.userId);
      setStep('verify');
      toast.success('OTP sent to your email');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Registration failed';
      toast.error(errorMessage);
      
      // Handle specific errors
      if (error.response?.status === 400 && errorMessage.includes('already exists')) {
        if (errorMessage.includes('email')) {
          setErrors({ email: 'An account with this email already exists' });
        } else if (errorMessage.includes('roll')) {
          setErrors({ rollNo: 'An account with this roll number already exists' });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.otp.trim()) {
      setErrors({ otp: 'Please enter the OTP' });
      return;
    }

    setLoading(true);

    try {
      const { data } = await api.post('/api/users/verify-otp/', {
        userId,
        otp: formData.otp.trim()
      });

      toast.success('Registration successful! Please log in.');
      navigate('/login');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'OTP verification failed';
      toast.error(errorMessage);
      
      if (error.response?.status === 400) {
        if (errorMessage.includes('expired')) {
          setErrors({ otp: 'OTP has expired. Please request a new one.' });
        } else if (errorMessage.includes('Invalid')) {
          setErrors({ otp: 'Invalid OTP. Please check and try again.' });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!userId) {
      toast.error('Please complete registration first');
      return;
    }

    try {
      await api.post('/api/users/resend-otp/', { userId });
      toast.success('New OTP sent to your email');
      setErrors({ otp: '' }); // Clear any OTP errors
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to resend OTP';
      toast.error(errorMessage);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--primary-bg)] via-[var(--secondary-bg)] to-[var(--primary-bg)] flex items-center justify-center px-4 py-8">
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

        {/* Registration Form */}
        <div className="form-container p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <UserPlus className="text-[var(--accent-purple)]" size={48} />
            </div>
            <h2 className="text-2xl font-bold text-[var(--primary-text)] mb-2">Create Account</h2>
            <p className="text-[var(--secondary-text)]">
              {step === 'register' ? 'Sign up to start shopping' : 'Verify your email'}
            </p>
          </div>

          {step === 'register' ? (
            <form onSubmit={handleRegister} className="space-y-6">
              <div className="form-group">
                <label htmlFor="name" className="form-label">
                  <User size={16} className="inline mr-2" />
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`input ${errors.name ? 'border-[var(--error)]' : ''}`}
                  placeholder="Enter your full name"
                  required
                />
                {errors.name && <p className="form-error">{errors.name}</p>}
              </div>

              <div className="form-group">
                <label htmlFor="rollNo" className="form-label">
                  <CreditCard size={16} className="inline mr-2" />
                  Roll Number
                </label>
                <input
                  type="text"
                  id="rollNo"
                  name="rollNo"
                  value={formData.rollNo}
                  onChange={handleChange}
                  className={`input ${errors.rollNo ? 'border-[var(--error)]' : ''}`}
                  placeholder="Enter your roll number"
                  required
                />
                {errors.rollNo && <p className="form-error">{errors.rollNo}</p>}
              </div>

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
                  className={`input ${errors.email ? 'border-[var(--error)]' : ''}`}
                  placeholder="Enter your email"
                  required
                />
                {errors.email && <p className="form-error">{errors.email}</p>}
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
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`input pr-12 ${errors.password ? 'border-[var(--error)]' : ''}`}
                    placeholder="Create a password"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-[var(--muted-text)] hover:text-[var(--accent-purple)] transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {errors.password && <p className="form-error">{errors.password}</p>}
                <p className="form-help">Minimum 6 characters</p>
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword" className="form-label">
                  <Lock size={16} className="inline mr-2" />
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`input pr-12 ${errors.confirmPassword ? 'border-[var(--error)]' : ''}`}
                    placeholder="Confirm your password"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={toggleConfirmPasswordVisibility}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-[var(--muted-text)] hover:text-[var(--accent-purple)] transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="form-error">{errors.confirmPassword}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></span>
                    Creating account...
                  </span>
                ) : (
                  <>
                    <UserPlus size={20} className="inline mr-2" />
                    Create Account
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-6">
              <div className="form-group">
                <label htmlFor="otp" className="form-label">
                  <Mail size={16} className="inline mr-2" />
                  Enter OTP
                </label>
                <input
                  type="text"
                  id="otp"
                  name="otp"
                  value={formData.otp}
                  onChange={handleChange}
                  className={`input text-center text-2xl tracking-widest ${errors.otp ? 'border-[var(--error)]' : ''}`}
                  required
                  maxLength={6}
                  placeholder="000000"
                />
                {errors.otp && <p className="form-error">{errors.otp}</p>}
                <p className="form-help text-center">
                  Please enter the 6-digit OTP sent to {formData.email}
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
                disabled={loading}
                className="w-full btn-secondary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Resend OTP
              </button>
            </form>
          )}

          <div className="text-center mt-6">
            <p className="text-[var(--secondary-text)]">
              Already have an account?{' '}
              <Link 
                to="/login" 
                className="text-[var(--accent-purple)] hover:text-[var(--accent-violet)] font-medium transition-colors"
              >
                Sign in here
              </Link>
            </p>
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

export default RegisterPage;
