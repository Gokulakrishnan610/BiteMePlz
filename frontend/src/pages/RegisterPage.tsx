
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, Eye, EyeOff, Zap, Mail, Lock, User, CreditCard, AlertCircle, GraduationCap, Briefcase } from 'lucide-react';
import { useSiteConfig } from '../context/SiteConfigContext';
import api from '../api';
import { toast } from 'sonner';

interface AcademicYear {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
  order: number;
}

interface Department {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
  order: number;
}

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'register' | 'verify'>('register');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const { config, loading: configLoading, isRegistrationAllowed } = useSiteConfig();
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<'student' | 'staff'>('student');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    rollNo: '',
    staffCode: '',
    year: '',
    department: '',
    password: '',
    confirmPassword: '',
    otp: ''
  });

  // Fetch academic years and departments on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [yearsResponse, deptsResponse] = await Promise.all([
          api.get('/api/startup/academic-years/'),
          api.get('/api/startup/departments/')
        ]);
        setAcademicYears(yearsResponse.data);
        setDepartments(deptsResponse.data);
      } catch (error) {
        console.error('Failed to fetch years/departments:', error);
        toast.error('Failed to load registration options');
      } finally {
        setDataLoading(false);
      }
    };
    fetchData();
  }, []);

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    // Name validation (common for both roles)
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    // Email validation (common for both roles)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Role-specific validation
    if (selectedRole === 'student') {
      // Student role validation
      
      // Roll number validation
      if (!formData.rollNo.trim()) {
        newErrors.rollNo = 'Roll number is required';
      } else if (formData.rollNo.trim().length < 3) {
        newErrors.rollNo = 'Roll number must be at least 3 characters';
      }

      // Year validation
      if (!formData.year) {
        newErrors.year = 'Year is required';
      }

      // Department validation
      if (!formData.department) {
        newErrors.department = 'Department is required';
      }
    } else if (selectedRole === 'staff') {
      // Staff role validation
      
      // Staff code validation
      if (!formData.staffCode.trim()) {
        newErrors.staffCode = 'Staff code is required';
      } else if (formData.staffCode.trim().length < 3) {
        newErrors.staffCode = 'Staff code must be at least 3 characters';
      }
    }

    // Password validation (common for both roles)
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    // Confirm password validation (common for both roles)
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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

  const handleRoleChange = (role: 'student' | 'staff') => {
    setSelectedRole(role);
    
    // Clear role-specific fields when switching
    if (role === 'student') {
      setFormData({
        ...formData,
        staffCode: '',
        // Preserve common fields: name, email, password, confirmPassword
      });
    } else {
      setFormData({
        ...formData,
        rollNo: '',
        year: '',
        department: '',
        // Preserve common fields: name, email, password, confirmPassword
      });
    }
    
    // Clear any errors when switching roles
    setErrors({});
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if registration is enabled
    if (config && !config.registration_enabled) {
      toast.error('Registration is currently disabled. Please try again later.');
      return;
    }

    // Check year and department restrictions (only for students)
    if (selectedRole === 'student' && !isRegistrationAllowed(formData.year, formData.department)) {
      toast.error('Registration is currently restricted for your year or department. Please contact administration.');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Build request payload based on role
      let requestPayload: any = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        confirm_password: formData.confirmPassword,
        role: selectedRole
      };

      // Add role-specific fields
      if (selectedRole === 'student') {
        requestPayload.roll_no = formData.rollNo.trim();
        requestPayload.year = formData.year;
        requestPayload.department = formData.department;
      } else if (selectedRole === 'staff') {
        requestPayload.staff_code = formData.staffCode.trim();
      }

      const { data } = await api.post('/api/users/register/', requestPayload);

      setUserId(data.userId);
      setStep('verify');
      toast.success('OTP sent to your email');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Registration failed';
      toast.error(errorMessage);
      
      // Handle role-specific error responses
      if (error.response?.status === 400 && errorMessage.includes('already exists')) {
        if (errorMessage.includes('email')) {
          setErrors({ email: 'An account with this email already exists' });
        } else if (errorMessage.includes('roll')) {
          setErrors({ rollNo: 'An account with this roll number already exists' });
        } else if (errorMessage.includes('staff code')) {
          setErrors({ staffCode: 'An account with this staff code already exists' });
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

  if (configLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    );
  }

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

          {/* Role Selection */}
          {step === 'register' && (
            <div className="mb-6">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => handleRoleChange('student')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 transition-all duration-200 ${
                    selectedRole === 'student'
                      ? 'border-purple-600 bg-purple-50 text-purple-700'
                      : 'border-gray-300 bg-white text-gray-600 hover:border-purple-300 hover:bg-purple-25'
                  }`}
                >
                  <GraduationCap size={20} />
                  <span className="font-medium">Student</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleChange('staff')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 transition-all duration-200 ${
                    selectedRole === 'staff'
                      ? 'border-purple-600 bg-purple-50 text-purple-700'
                      : 'border-gray-300 bg-white text-gray-600 hover:border-purple-300 hover:bg-purple-25'
                  }`}
                >
                  <Briefcase size={20} />
                  <span className="font-medium">Staff</span>
                </button>
              </div>
            </div>
          )}

          {config && !config.registration_enabled && step === 'register' && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-sm font-medium text-yellow-800">Registration Temporarily Disabled</p>
                <p className="text-xs text-yellow-700 mt-1">
                  New registrations are currently disabled. Please try again later or contact support.
                </p>
              </div>
            </div>
          )}

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

              {/* Staff-specific fields */}
              {selectedRole === 'staff' && (
                <div className="space-y-2">
                  <label htmlFor="staffCode" className="block text-sm font-medium text-gray-700">
                    <CreditCard size={16} className="inline mr-2" />
                    Staff Code
                  </label>
                  <input
                    type="text"
                    id="staffCode"
                    name="staffCode"
                    value={formData.staffCode}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${errors.staffCode ? 'border-red-400' : 'border-gray-300'}`}
                    placeholder="Enter your staff code"
                    required
                  />
                  {errors.staffCode && <p className="text-sm text-red-600">{errors.staffCode}</p>}
                </div>
              )}

              {/* Student-specific fields */}
              {selectedRole === 'student' && (
                <>
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

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="year" className="block text-sm font-medium text-gray-700">
                        Year
                      </label>
                      <select
                        id="year"
                        name="year"
                        value={formData.year}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${errors.year ? 'border-red-400' : 'border-gray-300'}`}
                        required
                        disabled={dataLoading}
                      >
                        <option value="">Select Year</option>
                        {academicYears.map((year) => (
                          <option key={year.id} value={year.code}>
                            {year.name}
                          </option>
                        ))}
                      </select>
                      {errors.year && <p className="text-sm text-red-600">{errors.year}</p>}
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="department" className="block text-sm font-medium text-gray-700">
                        Department
                      </label>
                      <select
                        id="department"
                        name="department"
                        value={formData.department}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${errors.department ? 'border-red-400' : 'border-gray-300'}`}
                        required
                        disabled={dataLoading}
                      >
                        <option value="">Select Dept</option>
                        {departments.map((dept) => (
                          <option key={dept.id} value={dept.code}>
                            {dept.code}
                          </option>
                        ))}
                      </select>
                      {errors.department && <p className="text-sm text-red-600">{errors.department}</p>}
                    </div>
                  </div>
                </>
              )}

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
                disabled={loading || (config && !config.registration_enabled)}
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
