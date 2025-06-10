import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'register' | 'verify'>('register');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    rollNo: '',
    password: '',
    confirmPassword: '',
    otp: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const { data } = await axios.post('/api/users/register', {
        name: formData.name,
        email: formData.email,
        rollNo: formData.rollNo,
        password: formData.password
      });

      setUserId(data.userId);
      setStep('verify');
      toast.success('OTP sent to your email');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data } = await axios.post('/api/users/verify-otp', {
        userId,
        otp: formData.otp
      });

      toast.success('Registration successful');
      navigate('/login');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    try {
      await axios.post('/api/users/resend-otp', { userId });
      toast.success('New OTP sent to your email');
    } catch (error: any) {
      toast.error('Failed to resend OTP');
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="card max-w-md w-full">
        <div className="text-center mb-8">
          <UserPlus className="mx-auto text-[var(--primary)]" size={48} />
          <h1 className="text-2xl font-bold mt-4">Create Account</h1>
          <p className="text-[var(--gray-600)] mt-2">
            {step === 'register' ? 'Sign up to start shopping' : 'Verify your email'}
          </p>
        </div>

        {step === 'register' ? (
          <form onSubmit={handleRegister}>
            <div className="mb-4">
              <label htmlFor="name" className="block text-sm font-medium text-[var(--gray-700)] mb-1">
                Full Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="input"
                required
              />
            </div>

            <div className="mb-4">
              <label htmlFor="rollNo" className="block text-sm font-medium text-[var(--gray-700)] mb-1">
                Roll Number
              </label>
              <input
                type="text"
                id="rollNo"
                name="rollNo"
                value={formData.rollNo}
                onChange={handleChange}
                className="input"
                required
              />
            </div>

            <div className="mb-4">
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
                required
              />
            </div>

            <div className="mb-4">
              <label htmlFor="password" className="block text-sm font-medium text-[var(--gray-700)] mb-1">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="input"
                required
                minLength={6}
              />
            </div>

            <div className="mb-6">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-[var(--gray-700)] mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="input"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary mb-4"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-purple-600 mr-2"></span>
                  Creating account...
                </span>
              ) : (
                'Create Account'
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify}>
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
                required
                maxLength={6}
                placeholder="Enter 6-digit OTP"
              />
              <p className="text-sm text-[var(--gray-600)] mt-2">
                Please enter the OTP sent to your email
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary mb-4"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-purple-600 mr-2"></span>
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
        )}

        <p className="text-center text-[var(--gray-600)] mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-[var(--primary)] hover:underline">
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;