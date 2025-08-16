import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api';
import { Store, Clock, ArrowLeft, Key } from 'lucide-react';
import { toast } from 'sonner';
import ImageUpload from '../../components/ImageUpload';
import ConfirmDialog from '../../components/ConfirmDialog';

interface shop {
  _id: string;
  name: string;
  description: string;
  location: string;
  image: string;
  is_active: boolean;
  is_open: boolean;
  final_validity_time: string;
  qrValidityMinutes: number;
}

const EditShopPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [shop, setshop] = useState<shop | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    image: '',
    is_active: true,
    is_open: true,
    final_validity_time: '18:30',
    qrValidityMinutes: '20'
  });
  const [changePasswordDialog, setChangePasswordDialog] = useState<{
    is_open: boolean;
    shopName: string;
  }>({
    is_open: false,
    shopName: ''
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const fetchshop = async () => {
      try {
        const { data } = await api.get(`/api/shops/${id}/`);
        setshop(data);
        
        // Format the time for the input
        const validityTime = data.final_validity_time 
          ? new Date(data.final_validity_time).toLocaleTimeString('en-US', {
              hour12: false,
              hour: '2-digit',
              minute: '2-digit'
            })
          : '18:30';

        setFormData({
          name: data.name || '',
          description: data.description || '',
          location: data.location || '',
          image: data.image || '',
          is_active: data.is_active ?? true,
          is_open: data.is_open ?? true,
          final_validity_time: validityTime,
          qrValidityMinutes: (data.qrValidityMinutes || 20).toString()
        });
        setLoading(false);
      } catch (error) {
        toast.error('Failed to load shop details');
        navigate('/admin/shops');
      }
    };

    if (id) {
      fetchshop();
    }
  }, [id, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Validate required fields
      if (!formData.name || !formData.description || !formData.location) {
        throw new Error('Please fill in all required fields');
      }

      // Validate QR validity minutes
      const qrMinutes = parseInt(formData.qrValidityMinutes);
      if (isNaN(qrMinutes) || qrMinutes < 1 || qrMinutes > 60) {
        throw new Error('QR validity must be between 1 and 60 minutes');
      }

      // Create final validity time for today
      const now = new Date();
      const [hours, minutes] = formData.final_validity_time.split(':');
      const final_validityDate = new Date();
      final_validityDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      // If the time is in the past, set it for tomorrow
      if (final_validityDate <= now) {
        final_validityDate.setDate(final_validityDate.getDate() + 1);
      }

      const payload = {
        name: formData.name,
        description: formData.description,
        location: formData.location,
        image: formData.image || undefined,
        is_active: formData.is_active,
        is_open: formData.is_open,
        final_validity_time: final_validityDate.toISOString(),
        qrValidityMinutes: qrMinutes
      };

      await api.patch(`/api/shops/${id}/`, payload);
      
      toast.success('shop updated successfully');
      navigate('/kisok-ac-back-office/shops');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update shop';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleImageUpload = (imagePath: string) => {
    setFormData(prev => ({ ...prev, image: imagePath }));
  };

  const handleChangePasswordClick = () => {
    setChangePasswordDialog({
      is_open: true,
      shopName: shop?.name || ''
    });
    setNewPassword(''); // Reset password field
  };

  const handleChangePasswordConfirm = async () => {
    if (!newPassword.trim()) {
      toast.error('Please enter a new password');
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    try {
      setChangingPassword(true);
      const response = await api.post('/api/users/change_shop_admin_password/', {
        shop_id: id,
        new_password: newPassword
      });
      
      toast.success('Password changed successfully!', {
        description: `Password updated for ${response.data.admin_email}`,
        duration: 5000
      });
      
      setChangePasswordDialog({
        is_open: false,
        shopName: ''
      });
      setNewPassword('');
    } catch (error: any) {
      toast.error('Failed to change password', {
        description: error.response?.data?.error || 'An error occurred'
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleChangePasswordCancel = () => {
    setChangePasswordDialog({
      is_open: false,
      shopName: ''
    });
    setNewPassword('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--primary)]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center mb-4 sm:mb-6 space-y-2 sm:space-y-0">
        <button
          onClick={() => navigate('/admin/shops')}
          className="flex items-center text-[var(--primary)] hover:underline mr-0 sm:mr-4 w-fit"
        >
          <ArrowLeft size={20} className="mr-2" />
          <span className="hidden sm:inline">Back to shops</span>
          <span className="sm:hidden">Back</span>
        </button>
        <h1 className="text-xl sm:text-2xl font-bold">Edit Shop</h1>
        <div className="ml-auto">
          <button
            onClick={handleChangePasswordClick}
            className="btn-secondary flex items-center px-3 py-2 text-sm"
            title="Change Shop Admin Password"
          >
            <Key size={16} className="mr-2" />
            <span className="hidden sm:inline">Change Password</span>
            <span className="sm:hidden">Password</span>
          </button>
        </div>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center">
              <Store size={24} className="mr-2 text-[var(--primary)]" />
              shop Details
            </h2>
            
            <div>
              <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">
                shop Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="input"
                required
                placeholder="Enter shop name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">
                Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="input"
                rows={3}
                required
                placeholder="Enter shop description"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">
                Location *
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                className="input"
                required
                placeholder="Enter shop location"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">
                shop Image
              </label>
              <ImageUpload
                onImageUpload={handleImageUpload}
                currentImage={formData.image}
              />
              <p className="text-sm text-[var(--gray-500)] mt-1">
                Upload a new shop image or keep the current one
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">
                  <Clock size={16} className="inline mr-1" />
                  Final Validity Time *
                </label>
                <input
                  type="time"
                  name="final_validity_time"
                  value={formData.final_validity_time}
                  onChange={handleChange}
                  className="input"
                  required
                />
                <p className="text-sm text-[var(--gray-500)] mt-1">
                  shop closes for orders at this time
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">
                  QR Validity (minutes) *
                </label>
                <input
                  type="number"
                  name="qrValidityMinutes"
                  value={formData.qrValidityMinutes}
                  onChange={handleChange}
                  className="input"
                  min="1"
                  max="60"
                  required
                />
                <p className="text-sm text-[var(--gray-500)] mt-1">
                  How long QR codes remain valid (1-60 minutes)
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">shop Status</h3>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                  className="h-4 w-4 text-[var(--primary)] border-[var(--gray-300)] rounded"
                />
                <label className="ml-2 text-sm text-[var(--gray-700)]">
                  shop is active
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="is_open"
                  checked={formData.is_open}
                  onChange={handleChange}
                  className="h-4 w-4 text-[var(--primary)] border-[var(--gray-300)] rounded"
                />
                <label className="ml-2 text-sm text-[var(--gray-700)]">
                  shop is currently open
                </label>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4">
            <button
              type="button"
              onClick={() => navigate('/admin/shops')}
              className="btn-secondary w-full sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary w-full sm:w-auto"
            >
              {saving ? (
                <span className="flex items-center justify-center">
                  <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></span>
                  Updating...
                </span>
              ) : (
                'Update Shop'
              )}
            </button>
          </div>
        </form>
      </div>

      <ConfirmDialog
        is_open={changePasswordDialog.is_open}
        title="Change Shop Admin Password"
        message={
          <div className="space-y-4">
            <p>Enter a new password for the admin of <strong>"{changePasswordDialog.shopName}"</strong></p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter new password (min 6 characters)"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Minimum 6 characters required
              </p>
            </div>
          </div>
        }
        confirmText={changingPassword ? "Changing..." : "Change Password"}
        cancelText="Cancel"
        onConfirm={handleChangePasswordConfirm}
        onCancel={handleChangePasswordCancel}
        type="warning"
        disabled={changingPassword || !newPassword.trim()}
      />
    </div>
  );
};

export default EditShopPage;