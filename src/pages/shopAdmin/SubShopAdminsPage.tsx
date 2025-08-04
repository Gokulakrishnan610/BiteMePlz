import React, { useEffect, useState } from 'react';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';
import { 
  Users, 
  Plus, 
  Trash2, 
  UserPlus, 
  AlertCircle, 
  Shield, 
  Clock, 
  Mail, 
  User,
  CheckCircle,
  XCircle,
  Info,
  Sparkles,
  Eye,
  EyeOff,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Copy,
  Star,
  TrendingUp,
  Activity
} from 'lucide-react';
import toast from 'react-hot-toast';

interface SubShopAdmin {
  _id: string;
  name: string;
  email: string;
  rollNo: string;
  is_sub_admin: boolean;
  parent_admin: string;
  created_at: string;
}

interface CreateSubAdminForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const SubShopAdminsPage: React.FC = () => {
  const { user } = useAuth();
  const [subAdmins, setSubAdmins] = useState<SubShopAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState<CreateSubAdminForm>({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    fetchSubAdmins();
  }, []);

  const fetchSubAdmins = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users/sub-shop-admins');
      setSubAdmins(response.data);
    } catch (error: any) {
      console.error('Error fetching sub-shop admins:', error);
      setError(error.response?.data?.message || 'Failed to fetch sub-shop admins');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      setCreating(true);
      await api.post('/users/sub-shop-admin', {
        name: formData.name,
        email: formData.email,
        password: formData.password
      });
      toast.success('Sub-shop admin created successfully! 🎉');
      setFormData({ name: '', email: '', password: '', confirmPassword: '' });
      setShowCreateForm(false);
      fetchSubAdmins();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create sub-shop admin');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteSubAdmin = async (adminId: string, adminName: string) => {
    if (!confirm(`Are you sure you want to delete ${adminName}? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeleting(adminId);
      await api.delete(`/users/sub-shop-admin/${adminId}`);
      toast.success(`${adminName} has been removed successfully`);
      fetchSubAdmins();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete sub-shop admin');
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const created = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)} day${Math.floor(diffInHours / 24) > 1 ? 's' : ''} ago`;
    return formatDate(dateString);
  };

  const filteredSubAdmins = subAdmins.filter(admin =>
    admin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.rollNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="relative">
            <div className="flex space-x-2 text-4xl font-bold text-purple-600 mb-4">
              <span className="animate-bounce" style={{ animationDelay: '0ms' }}>R</span>
              <span className="animate-bounce" style={{ animationDelay: '150ms' }}>E</span>
              <span className="animate-bounce" style={{ animationDelay: '300ms' }}>C</span>
            </div>
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
              <div className="w-16 h-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-pulse"></div>
            </div>
          </div>
          <p className="text-[var(--secondary-text)] animate-pulse">Loading sub-admins...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="relative mb-6">
            <AlertCircle className="mx-auto text-[var(--error)] mb-4" size={48} />
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
              <div className="w-12 h-1 bg-red-500 rounded-full animate-pulse"></div>
            </div>
          </div>
          <p className="text-[var(--error)] mb-4">{error}</p>
          <button 
            onClick={fetchSubAdmins}
            className="btn-primary mt-4 flex items-center gap-2 mx-auto"
          >
            <Activity size={16} />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Enhanced Header Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-2xl"></div>
        <div className="relative flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 p-6">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-3">
              <div className="relative">
                <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl shadow-lg">
                  <Users className="text-white" size={28} />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-4xl font-bold text-[var(--primary-text)] bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Sub-Shop Admins
                </h1>
                <p className="text-[var(--secondary-text)] mt-1 text-lg">
                  Manage additional admin accounts for your shop
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn-primary flex items-center gap-3 px-8 py-4 text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            <UserPlus size={24} />
            Add Sub-Admin
          </button>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          <div className="relative p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium mb-1">Total Sub-Admins</p>
                <p className="text-3xl font-bold">{subAdmins.length}</p>
                <p className="text-blue-200 text-xs mt-1">Active accounts</p>
              </div>
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Users size={32} className="text-blue-200" />
              </div>
            </div>
          </div>
        </div>
        
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500 via-green-600 to-green-700 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          <div className="relative p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium mb-1">Active Today</p>
                <p className="text-3xl font-bold">{subAdmins.length}</p>
                <p className="text-green-200 text-xs mt-1">Currently online</p>
              </div>
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <CheckCircle size={32} className="text-green-200" />
              </div>
            </div>
          </div>
        </div>
        
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          <div className="relative p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium mb-1">Available Slots</p>
                <p className="text-3xl font-bold">∞</p>
                <p className="text-purple-200 text-xs mt-1">Unlimited capacity</p>
              </div>
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Sparkles size={32} className="text-purple-200" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--secondary-text)]" size={20} />
          <input
            type="text"
            placeholder="Search sub-admins..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-4 py-2 bg-[var(--card-bg)] rounded-xl border border-[var(--border)]">
            <Filter size={16} className="text-[var(--secondary-text)]" />
            <span className="text-sm text-[var(--secondary-text)]">Filter</span>
          </div>
          <div className="text-sm text-[var(--secondary-text)]">
            {filteredSubAdmins.length} of {subAdmins.length} sub-admins
          </div>
        </div>
      </div>

      {/* Enhanced Create Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card max-w-lg w-full mx-4 transform transition-all duration-300 scale-100 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl shadow-lg">
                  <UserPlus className="text-white" size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-[var(--primary-text)]">
                    Create Sub-Admin
                  </h3>
                  <p className="text-[var(--secondary-text)] text-sm">
                    Add a new sub-admin to your shop
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-[var(--secondary-text)] hover:text-[var(--primary-text)] p-2 hover:bg-[var(--hover)] rounded-xl transition-all duration-200"
              >
                <XCircle size={24} />
              </button>
            </div>
            
            <form onSubmit={handleCreateSubAdmin} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label flex items-center gap-2 mb-2">
                    <User size={16} />
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="form-control w-full"
                    placeholder="Enter full name"
                    required
                  />
                </div>
                
                <div>
                  <label className="form-label flex items-center gap-2 mb-2">
                    <Mail size={16} />
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="form-control w-full"
                    placeholder="Enter email address"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label flex items-center gap-2 mb-2">
                    <Shield size={16} />
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="form-control w-full pr-12"
                      placeholder="Enter password (min 6 characters)"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--secondary-text)] hover:text-[var(--primary-text)]"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="form-label flex items-center gap-2 mb-2">
                    <Shield size={16} />
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="form-control w-full pr-12"
                      placeholder="Confirm password"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--secondary-text)] hover:text-[var(--primary-text)]"
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="btn-secondary flex-1 py-4 text-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="btn-primary flex-1 py-4 text-lg font-medium flex items-center justify-center gap-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  {creating ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <UserPlus size={20} />
                      Create Admin
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enhanced Sub-Admins List */}
      <div className="card shadow-xl">
        <div className="p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl shadow-lg">
              <Users className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[var(--primary-text)]">
                Sub-Shop Admins ({filteredSubAdmins.length})
              </h2>
              <p className="text-[var(--secondary-text)]">
                Manage your shop's sub-administrators
              </p>
            </div>
          </div>

          {filteredSubAdmins.length === 0 ? (
            <div className="text-center py-16">
              <div className="relative mb-6">
                <div className="p-6 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full w-24 h-24 mx-auto flex items-center justify-center">
                  <Users size={40} className="text-purple-600" />
                </div>
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                  <div className="w-16 h-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-[var(--primary-text)] mb-3">
                {searchTerm ? 'No matching sub-admins' : 'No sub-admins yet'}
              </h3>
              <p className="text-[var(--secondary-text)] mb-8 max-w-md mx-auto">
                {searchTerm 
                  ? 'Try adjusting your search terms'
                  : 'Create your first sub-admin to help manage orders and scan QR codes during busy periods.'
                }
              </p>
              {!searchTerm && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="btn-primary flex items-center gap-3 mx-auto px-8 py-4 text-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  <Plus size={24} />
                  Create First Sub-Admin
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSubAdmins.map((admin, index) => (
                <div 
                  key={admin._id} 
                  className="group card hover:shadow-2xl transition-all duration-300 border-l-4 border-l-purple-500 transform hover:scale-105"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl shadow-lg">
                            <User className="text-white" size={20} />
                          </div>
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-[var(--primary-text)] text-lg mb-1">
                            {admin.name}
                          </h3>
                          <p className="text-sm text-[var(--secondary-text)] mb-2">
                            {admin.email}
                          </p>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                              <CheckCircle size={12} />
                              <span>Active</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                              <Star size={12} />
                              <span>Sub-Admin</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => copyToClipboard(admin.email)}
                          className="p-2 text-[var(--secondary-text)] hover:text-[var(--primary-text)] hover:bg-[var(--hover)] rounded-lg transition-colors"
                          title="Copy email"
                        >
                          <Copy size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteSubAdmin(admin._id, admin.name)}
                          disabled={deleting === admin._id}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete sub-admin"
                        >
                          {deleting === admin._id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-3 text-[var(--secondary-text)]">
                        <Shield size={14} />
                        <span>Roll No: {admin.rollNo}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[var(--secondary-text)]">
                        <Clock size={14} />
                        <span>Created {getTimeAgo(admin.created_at)}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-[var(--border)]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <TrendingUp size={14} className="text-green-500" />
                          <span className="text-xs text-[var(--secondary-text)]">Ready to assist</span>
                        </div>
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Info Card */}
      <div className="card bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 border-blue-200 shadow-xl">
        <div className="p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl shadow-lg">
              <Info className="text-white" size={24} />
            </div>
            <div>
              <h3 className="font-bold text-blue-800 text-xl">About Sub-Shop Admins</h3>
              <p className="text-blue-600 text-sm">Understanding their capabilities and permissions</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-blue-700 p-3 bg-white/50 rounded-xl">
                <CheckCircle size={18} className="text-green-500" />
                <span className="font-medium">Can scan QR codes and verify orders</span>
              </div>
              <div className="flex items-center gap-3 text-blue-700 p-3 bg-white/50 rounded-xl">
                <CheckCircle size={18} className="text-green-500" />
                <span className="font-medium">Access to products and orders management</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-blue-700 p-3 bg-white/50 rounded-xl">
                <CheckCircle size={18} className="text-green-500" />
                <span className="font-medium">View transaction history</span>
              </div>
              <div className="flex items-center gap-3 text-blue-700 p-3 bg-white/50 rounded-xl">
                <CheckCircle size={18} className="text-green-500" />
                <span className="font-medium">Perfect for busy periods and events</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubShopAdminsPage; 