import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import ImageUpload from '../../components/ImageUpload';

const CreateProductPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    image: '',
    category: 'others',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.name.trim() || !formData.description.trim() || !formData.price || !formData.stock || !formData.category) {
        toast.error('Please fill in all required fields');
        setLoading(false);
        return;
      }

      // Validate price and stock
      const price = Number(formData.price);
      const stock = Number(formData.stock);
      
      if (price <= 0) {
        toast.error('Price must be greater than 0');
        setLoading(false);
        return;
      }
      
      if (stock < 0) {
        toast.error('Stock cannot be negative');
        setLoading(false);
        return;
      }

      // Validate shop_id for shop admins
      if (!user?.shop) {
        toast.error('Shop information not found. Please contact administrator.');
        setLoading(false);
        return;
      }

      const createData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: price,
        stock: stock,
        image: formData.image || '',
        shop_id: user.shop,
        category: formData.category,
      };
      

      
      await api.post('/api/products/', createData);
      
      toast.success('Product created successfully');
      navigate('/shop-admin/products');
    } catch (error: any) {
      console.error('Error creating product:', error);
      
      // Handle specific error cases
      if (error.response?.status === 400) {
        const errorData = error.response.data;
        if (errorData.error) {
          toast.error(errorData.error);
        } else if (errorData.message) {
          toast.error(errorData.message);
        } else {
          toast.error('Invalid data provided. Please check your input.');
        }
      } else if (error.response?.status === 403) {
        toast.error('You do not have permission to create products for this shop.');
      } else if (error.response?.status === 404) {
        toast.error('Shop not found. Please contact administrator.');
      } else if (error.response?.status === 500) {
        toast.error('Server error. Please try again later.');
      } else {
        toast.error('Failed to create product. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Validate input based on field type
    if (name === 'price' || name === 'stock') {
      const numValue = Number(value);
      if (value && (isNaN(numValue) || numValue < 0)) {
        return; // Don't update if invalid
      }
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageUpload = (imagePath: string) => {
    setFormData(prev => ({ ...prev, image: imagePath }));
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Add New Product</h1>
        {user?.shop && (
          <div className="text-sm text-[var(--muted-text)]">
            Shop: {user.shop}
          </div>
        )}
      </div>

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
                placeholder="Enter product name"
              />
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
                placeholder="Enter product description"
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
                min="0.01"
                step="0.01"
                required
                placeholder="Enter price (e.g., 99.99)"
              />
              <p className="text-xs text-[var(--muted-text)] mt-1">
                Price must be greater than ₹0
              </p>
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
                placeholder="Enter stock quantity (e.g., 50)"
              />
              <p className="text-xs text-[var(--muted-text)] mt-1">
                Available quantity in stock
              </p>
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
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="food">Food</option>
                <option value="beverages">Beverages</option>
                <option value="snacks">Snacks</option>
                <option value="stationery">Stationery</option>
                <option value="electronics">Electronics</option>
                <option value="others">Others</option>
              </select>
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
                Upload a product image or leave empty to use default
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/kisok-sp-back-office/products')}
              className="btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
            >
              {loading ? (
                <span className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-current mr-2"></div>
                  Creating Product...
                </span>
              ) : (
                'Create Product'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProductPage;