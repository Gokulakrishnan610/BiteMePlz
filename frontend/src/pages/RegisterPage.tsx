
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, Eye, EyeOff, Zap, Mail, Lock, User, CreditCard } from 'lucide-react';
import api from '../api';
import { toast } from 'sonner';

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

          {step === 'register' ? (
            <form onSubmit={handleRegister} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  <User size={16} className="inline mr-2" />
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${errors.name ? 'border-red-400' : 'border-gray-300'}`}
                  placeholder="Enter your full name"
                  required
                />
                {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <label htmlFor="rollNo" className="block text-sm font-medium text-gray-700">
                  <CreditCard size={16} className="inline mr-2" />
                  Roll Number
                </label>
                <input
                  type="text"
                  id="rollNo"
                  name="rollNo"
                  value={formData.rollNo}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${errors.rollNo ? 'border-red-400' : 'border-gray-300'}`}
                  placeholder="Enter your roll number"
                  required
                />
                {errors.rollNo && <p className="text-sm text-red-600">{errors.rollNo}</p>}
              </div>

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
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${errors.email ? 'border-red-400' : 'border-gray-300'}`}
                  placeholder="Enter your email"
                  required
                />
                {errors.email && <p className="text-sm text-red-600">{errors.email}</p>}
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
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${errors.password ? 'border-red-400' : 'border-gray-300'}`}
                    placeholder="Create a password"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-purple-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {errors.password && <p className="text-sm text-red-600">{errors.password}</p>}
                <p className="text-xs text-gray-500">Minimum 6 characters</p>
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
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
                    className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${errors.confirmPassword ? 'border-red-400' : 'border-gray-300'}`}
                    placeholder="Confirm your password"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={toggleConfirmPasswordVisibility}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-purple-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-sm text-red-600">{errors.confirmPassword}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
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
              <div className="space-y-2">
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
                  <Mail size={16} className="inline mr-2" />
                  Enter OTP
                </label>
                <input
                  type="text"
                  id="otp"
                  name="otp"
                  value={formData.otp}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 text-center text-xl tracking-widest border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${errors.otp ? 'border-red-400' : 'border-gray-300'}`}
                  required
                  maxLength={6}
                  placeholder="000000"
                />
                {errors.otp && <p className="text-sm text-red-600">{errors.otp}</p>}
                <p className="text-xs text-gray-500 text-center">
                  Please enter the 6-digit OTP sent to {formData.email}
                </p>
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
                  'Verify OTP'
                )}
              </button>

              <button
                type="button"
                onClick={handleResendOTP}
                disabled={loading}
                className="w-full border border-gray-300 hover:border-purple-500 hover:bg-purple-50 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Resend OTP
              </button>
            </form>
          )}

          <div className="text-center mt-6">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link 
                to="/login" 
                className="text-purple-600 hover:text-purple-700 font-medium transition-colors"
              >
                Sign in here
              </Link>
            </p>
          </div>
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

export default RegisterPage;
