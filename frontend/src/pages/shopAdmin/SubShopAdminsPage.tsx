import React, { useEffect, useState } from 'react';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useAdminShop } from '../../context/AdminShopContext';
import { 
  Users, 
  Plus, 
  Trash2, 
  UserPlus, 
  AlertCircle, 
  Shield, 
  Mail, 
  User,
  X,
  Eye,
  EyeOff,
  Search,
  Store
} from 'lucide-react';
import { toast } from 'sonner';

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
  const { selectedShop } = useAdminShop();
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

  useEffect(() => {
    // Refetch when selected shop changes (for admin users)
    if (user?.role === 'admin' && selectedShop) {
      fetchSubAdmins();
    }
  }, [selectedShop]);

  const fetchSubAdmins = async () => {
    try {
      setLoading(true);
      let url = '/api/users/sub_shop_admins/';
      
      // If user is admin and has a selected shop, include shop_id
      if (user?.role === 'admin' && selectedShop) {
        url += `?shop_id=${selectedShop.id}`;
      }
      
      const response = await api.get(url);
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
      const payload: any = {
        name: formData.name,
        email: formData.email,
        password: formData.password
      };
      
      // If user is admin and has a selected shop, include shop_id
      if (user?.role === 'admin' && selectedShop) {
        payload.shop_id = selectedShop.id;
      }
      
      await api.post('/api/users/sub_shop_admin/', payload);
      toast.success('Sub-shop admin created successfully! 🎉');
      setFormData({ name: '', email: '', password: '', confirmPassword: '' });
      setShowCreateForm(false);
      fetchSubAdmins();
    } catch (error: any) {
      console.error('Error creating sub-admin:', error.response?.data);
      const errorMessage = error.response?.data?.details 
        ? `Validation failed: ${JSON.stringify(error.response.data.details)}`
        : error.response?.data?.error || error.response?.data?.message || 'Failed to create sub-shop admin';
      toast.error(errorMessage);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4 mx-auto"></div>
          <p className="text-[var(--secondary-text)]">Loading sub-admins...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertCircle className="mx-auto text-[var(--error)] mb-4" size={48} />
          <p className="text-[var(--error)] mb-4">{error}</p>
          <button 
            onClick={fetchSubAdmins}
            className="btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Check if admin user hasn't selected a shop
  if (user?.role === 'admin' && !selectedShop) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <Store className="mx-auto text-blue-500 mb-4" size={48} />
          <h2 className="text-xl font-semibold text-[var(--primary-text)] mb-2">Select a Shop</h2>
          <p className="text-[var(--secondary-text)]">
            Please select a shop from the dropdown above to manage its sub-admins.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--primary-text)]">Sub-Shop Admins</h1>
          <p className="text-[var(--secondary-text)] mt-1">
            Manage additional admin accounts for your shop
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          Add Sub-Admin
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--secondary-text)]">Total Sub-Admins</p>
              <p className="text-2xl font-semibold text-[var(--primary-text)] mt-1">{subAdmins.length}</p>
            </div>
            <Users size={24} className="text-blue-500" />
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--secondary-text)]">Active</p>
              <p className="text-2xl font-semibold text-[var(--primary-text)] mt-1">{subAdmins.length}</p>
            </div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--secondary-text)]">Available Slots</p>
              <p className="text-2xl font-semibold text-[var(--primary-text)] mt-1">Unlimited</p>
            </div>
            <Shield size={24} className="text-blue-500" />
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--secondary-text)]" size={18} />
          <input
            type="text"
            placeholder="Search sub-admins..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="text-sm text-[var(--secondary-text)]">
          {filteredSubAdmins.length} of {subAdmins.length}
        </div>
      </div>

      {/* Create Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card max-w-lg w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-[var(--primary-text)]">
                Create Sub-Admin
              </h3>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-[var(--secondary-text)] hover:text-[var(--primary-text)]"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateSubAdmin} className="space-y-4">
              <div>
                <label className="form-label">Full Name</label>
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
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="form-control w-full"
                  placeholder="Enter email address"
                  required
                />
              </div>
              
              <div>
                <label className="form-label">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="form-control w-full pr-10"
                    placeholder="Min 6 characters"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--secondary-text)]"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="form-label">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="form-control w-full pr-10"
                    placeholder="Confirm password"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--secondary-text)]"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus size={18} />
                      Create
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sub-Admins List */}
      <div className="card">
        {filteredSubAdmins.length === 0 ? (
          <div className="text-center py-12">
            <Users size={48} className="mx-auto text-[var(--secondary-text)] mb-4" />
            <h3 className="text-lg font-medium text-[var(--primary-text)] mb-2">
              {searchTerm ? 'No matching sub-admins' : 'No sub-admins yet'}
            </h3>
            <p className="text-[var(--secondary-text)] mb-6">
              {searchTerm 
                ? 'Try adjusting your search terms'
                : 'Create your first sub-admin to help manage orders and scan QR codes.'
              }
            </p>
            {!searchTerm && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="btn-primary flex items-center gap-2 mx-auto"
              >
                <Plus size={18} />
                Create First Sub-Admin
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left py-3 px-4 text-sm font-medium text-[var(--secondary-text)]">Name</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-[var(--secondary-text)]">Email</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-[var(--secondary-text)]">Roll No</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-[var(--secondary-text)]">Created</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-[var(--secondary-text)]">Status</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-[var(--secondary-text)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubAdmins.map((admin) => (
                  <tr key={admin._id} className="border-b border-[var(--border)] hover:bg-[var(--hover)]">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <User size={16} className="text-blue-600" />
                        </div>
                        <span className="font-medium text-[var(--primary-text)]">{admin.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[var(--secondary-text)]">{admin.email}</td>
                    <td className="py-3 px-4 text-[var(--secondary-text)]">{admin.rollNo}</td>
                    <td className="py-3 px-4 text-[var(--secondary-text)] text-sm">{formatDate(admin.created_at)}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                        Active
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleDeleteSubAdmin(admin._id, admin.name)}
                          disabled={deleting === admin._id}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          {deleting === admin._id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubShopAdminsPage; 