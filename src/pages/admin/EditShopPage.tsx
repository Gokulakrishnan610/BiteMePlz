import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { Store, Clock, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import ImageUpload from '../../components/ImageUpload';

interface Shop {
  _id: string;
  name: string;
  description: string;
  location: string;
  image: string;
  isActive: boolean;
  isOpen: boolean;
  finalValidityTime: string;
  qrValidityMinutes: number;
}

const EditShopPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [shop, setShop] = useState<Shop | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    image: '',
    isActive: true,
    isOpen: true,
    finalValidityTime: '18:30',
    qrValidityMinutes: '20'
  });

  useEffect(() => {
    const fetchShop = async () => {
      try {
        const { data } = await axios.get(`/api/shops/${id}`);
        setShop(data);
        
        // Format the time for the input
        const validityTime = data.finalValidityTime 
          ? new Date(data.finalValidityTime).toLocaleTimeString('en-US', {
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
          isActive: data.isActive ?? true,
          isOpen: data.isOpen ?? true,
          finalValidityTime: validityTime,
          qrValidityMinutes: (data.qrValidityMinutes || 20).toString()
        });
        setLoading(false);
      } catch (error) {
        toast.error('Failed to load shop details');
        navigate('/admin/shops');
      }
    };

    if (id) {
      fetchShop();
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
      const [hours, minutes] = formData.finalValidityTime.split(':');
      const finalValidityDate = new Date();
      finalValidityDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      // If the time is in the past, set it for tomorrow
      if (finalValidityDate <= now) {
        finalValidityDate.setDate(finalValidityDate.getDate() + 1);
      }

      const payload = {
        name: formData.name,
        description: formData.description,
        location: formData.location,
        image: formData.image || undefined,
        isActive: formData.isActive,
        isOpen: formData.isOpen,
        finalValidityTime: finalValidityDate.toISOString(),
        qrValidityMinutes: qrMinutes
      };

      await axios.put(`/api/shops/${id}`, payload);
      
      toast.success('Shop updated successfully');
      navigate('/admin/shops');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--primary)]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate('/admin/shops')}
          className="flex items-center text-[var(--primary)] hover:underline mr-4"
        >
          <ArrowLeft size={20} className="mr-2" />
          Back to Shops
        </button>
        <h1 className="text-2xl font-bold">Edit Shop</h1>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center">
              <Store size={24} className="mr-2 text-[var(--primary)]" />
              Shop Details
            </h2>
            
            <div>
              <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">
                Shop Name *
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
                Shop Image
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
                  name="finalValidityTime"
                  value={formData.finalValidityTime}
                  onChange={handleChange}
                  className="input"
                  required
                />
                <p className="text-sm text-[var(--gray-500)] mt-1">
                  Shop closes for orders at this time
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
              <h3 className="text-lg font-semibold">Shop Status</h3>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                  className="h-4 w-4 text-[var(--primary)] border-[var(--gray-300)] rounded"
                />
                <label className="ml-2 text-sm text-[var(--gray-700)]">
                  Shop is active
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="isOpen"
                  checked={formData.isOpen}
                  onChange={handleChange}
                  className="h-4 w-4 text-[var(--primary)] border-[var(--gray-300)] rounded"
                />
                <label className="ml-2 text-sm text-[var(--gray-700)]">
                  Shop is currently open
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/admin/shops')}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary"
            >
              {saving ? (
                <span className="flex items-center">
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
    </div>
  );
};

export default EditShopPage;