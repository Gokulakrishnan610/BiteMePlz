import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { Package } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import Loader from '../../components/Loader';
import ImageUpload from '../../components/ImageUpload';

const CreateProductPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'others', // Default to 'others'
    price: '',
    stock: '',
    image: ''
  });

  const categories = [
    { value: 'food', label: 'Food' },
    { value: 'beverages', label: 'Beverages' },
    { value: 'snacks', label: 'Snacks' },
    { value: 'stationery', label: 'Stationery' },
    { value: 'electronics', label: 'Electronics' },
    { value: 'others', label: 'Others' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      
      
      const createData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: Number(formData.price),
        stock: Number(formData.stock),
        image: formData.image,
        shop_id: user?.shop
      };
      
      
      
      const response = await api.post('/api/products/', createData);
      
      
      toast.success('Product created successfully');
      navigate('/shop-admin/products');
    } catch (error: any) {
      console.error('Error creating product:', error);
      toast.error(error.response?.data?.message || 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      
      return newData;
    });
  };

  const handleImageUpload = (imagePath: string) => {
    setFormData(prev => ({ ...prev, image: imagePath }));
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Add New Product</h1>

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
                Selected: {categories.find(cat => cat.value === formData.category)?.label || formData.category}
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
                min="0"
                step="0.01"
                required
                placeholder="Enter price"
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
                placeholder="Enter stock quantity"
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
                Upload a product image or leave empty to use default
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/shop-admin/products')}
              className="btn-secondary"
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
                  <Loader size={16} className="mr-2" />
                  Creating...
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