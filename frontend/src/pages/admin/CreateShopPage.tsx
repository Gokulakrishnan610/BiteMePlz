import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { Store, Clock } from 'lucide-react';
import { toast } from 'sonner';
import ImageUpload from '../../components/ImageUpload';

const CreateShopPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    shopName: '',
    shopDescription: '',
    shopLocation: '',
    shopImage: '',
    final_validity_time: '18:30', // Default to 6:30 PM
    qr_validity_minutes: '20'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.name || !formData.email || !formData.password || 
          !formData.shopName || !formData.shopDescription || !formData.shopLocation) {
        throw new Error('Please fill in all required fields');
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        throw new Error('Please enter a valid email address');
      }

      // Validate password length
      if (formData.password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      // Validate QR validity minutes
      const qrMinutes = parseInt(formData.qr_validity_minutes);
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
        email: formData.email,
        password: formData.password,
        shopName: formData.shopName,
        shopDescription: formData.shopDescription,
        shopLocation: formData.shopLocation,
        shopImage: formData.shopImage || '',
        final_validity_time: final_validityDate.toISOString(),
        qr_validity_minutes: qrMinutes
      };

      await api.post('/api/users/shop_admin/', payload);
      
      toast.success('shop created successfully');
      navigate('/kisok-ac-back-office/shops');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to create shop';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageUpload = (imagePath: string) => {
    setFormData({ ...formData, shopImage: imagePath });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Create New Shop</h1>

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
                name="shopName"
                value={formData.shopName}
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
                name="shopDescription"
                value={formData.shopDescription}
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
                name="shopLocation"
                value={formData.shopLocation}
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
                currentImage={formData.shopImage}
              />
              <p className="text-sm text-[var(--gray-500)] mt-1">
                Upload a shop image or leave empty to use default
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
                  name="qr_validity_minutes"
                  value={formData.qr_validity_minutes}
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
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center">
              <Store size={24} className="mr-2 text-[var(--primary)]" />
              shop Admin Details
            </h2>
            
            <div>
              <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">
                Admin Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="input"
                required
                placeholder="Enter admin name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">
                Admin Email *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="input"
                required
                placeholder="Enter admin email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">
                Admin Password *
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="input"
                required
                minLength={6}
                placeholder="Enter admin password"
              />
              <p className="text-sm text-[var(--gray-500)] mt-1">
                Minimum 6 characters
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4">
            <button
              type="button"
              onClick={() => navigate('/kisok-ac-back-office/shops')}
              className="btn-secondary w-full sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full sm:w-auto"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></span>
                  Creating...
                </span>
              ) : (
                'Create Shop'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateShopPage; 