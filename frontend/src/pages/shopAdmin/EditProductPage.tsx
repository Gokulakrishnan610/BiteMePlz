import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAdminShop } from '../../context/AdminShopContext';
import api from '../../api';
import { AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Loader from '../../components/Loader';
import ImageUpload from '../../components/ImageUpload';

interface ProductFormData {
  name: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  image: string;
  is_available: boolean;

}

const EditProductPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedShop } = useAdminShop();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    category: 'others',
    price: 0,
    stock: 0,
    image: '',
    is_available: true
  });

  // Determine the effective shop ID
  const effectiveShopId = user?.role === 'admin' && selectedShop ? selectedShop.id : user?.shop;

  const categories = [
    { value: 'breakfast', label: 'Breakfast' },
    { value: 'lunch', label: 'Lunch' },
    { value: 'food', label: 'Food' },
    { value: 'beverages', label: 'Beverages' },
    { value: 'snacks', label: 'Snacks' },
    { value: 'stationery', label: 'Stationery' },
    { value: 'electronics', label: 'Electronics' },
    { value: 'others', label: 'Others' }
  ];

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const { data } = await api.get(`/api/products/${id}/`);

        
        // Normalize the category to ensure it matches our enum values
        const normalizedCategory = data.category ? data.category.toLowerCase().trim() : 'others';
        const validCategories = ['breakfast', 'lunch', 'food', 'beverages', 'snacks', 'stationery', 'electronics', 'others'];
        const finalCategory = validCategories.includes(normalizedCategory) ? normalizedCategory : 'others';
        
        setFormData({
          name: data.name || '',
          description: data.description || '',
          category: finalCategory,
          price: data.price || 0,
          stock: data.stock || 0,
          image: data.image || '',
          is_available: data.is_available !== undefined ? data.is_available : true,

        });
        

        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching product:', err);
        setError('Failed to load product');
        setLoading(false);
      }
    };

    if (id) {
      fetchProduct();
    }
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (!effectiveShopId) {
        if (user?.role === 'admin') {
          toast.error('Please select a shop first to edit products.');
        } else {
          toast.error('Shop ID not found. Please contact administrator.');
        }
        setSaving(false);
        return;
      }

      const updateData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        category: formData.category.toLowerCase().trim(), // Ensure lowercase
        price: Number(formData.price),
        stock: Number(formData.stock),
        image: formData.image,
        is_available: formData.is_available,
        shop_id: effectiveShopId // Include shop_id from effective shop
      };
      

      
              await api.put(`/api/products/${id}/`, updateData);

      
      toast.success('Product updated successfully');
      
      // Navigate based on user role and context
      if (user?.role === 'admin' && selectedShop) {
        navigate('/kisok-ac-back-office/shop-admin/products');
      } else {
        navigate('/kisok-sp-back-office/products');
      }
    } catch (error: any) {
      console.error('Error updating product:', error);
      console.error('Full error response:', error.response);
      toast.error(error.response?.data?.message || error.response?.data?.detail || 'Failed to update product');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    

    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => {
        const newData = { ...prev, [name]: checked };

        return newData;
      });
    } else if (type === 'number') {
      setFormData(prev => {
        const newData = { ...prev, [name]: Number(value) };

        return newData;
      });
    } else {
      setFormData(prev => {
        const newData = { ...prev, [name]: value };

        return newData;
      });
    }
  };

  const handleImageUpload = (imagePath: string) => {
    setFormData(prev => ({ ...prev, image: imagePath }));
  };

  if (loading) {
    return <Loader />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertCircle className="mx-auto text-[var(--error)] mb-4" size={48} />
          <p className="text-[var(--error)]">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Edit Product</h1>

      <div className="card">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--secondary-text)] mb-1">
                Product Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="input"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--secondary-text)] mb-1">
                Category *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="input"
                required
              >
                {categories.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-[var(--muted-text)] mt-1">
                Current: {categories.find(cat => cat.value === formData.category)?.label || formData.category}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--secondary-text)] mb-1">
                Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="input"
                rows={3}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--secondary-text)] mb-1">
                Price (₹) *
              </label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                className="input"
                min="0"
                step="0.01"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--secondary-text)] mb-1">
                Stock *
              </label>
              <input
                type="number"
                name="stock"
                value={formData.stock}
                onChange={handleChange}
                className="input"
                min="0"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--secondary-text)] mb-1">
                Product Image
              </label>
              <ImageUpload
                onImageUpload={handleImageUpload}
                currentImage={formData.image}
              />
              <p className="text-sm text-[var(--muted-text)] mt-1">
                Upload a new image or keep the current one
              </p>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                name="is_available"
                checked={formData.is_available}
                onChange={handleChange}
                className="h-4 w-4 text-[var(--accent-purple)] border-[var(--border-color)] rounded focus:ring-[var(--accent-purple)]"
              />
              <label className="ml-2 text-sm text-[var(--secondary-text)]">
                Product is available for sale
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/kisok-sp-back-office/products')}
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
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  Saving...
                </span>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProductPage;