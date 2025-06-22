import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { Package, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Loader from '../../components/Loader';
import ImageUpload from '../../components/ImageUpload';

interface Product {
  name: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  image: string;
  isAvailable: boolean;
}

const EditProductPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Product>({
    name: '',
    description: '',
    category: 'others',
    price: 0,
    stock: 0,
    image: '',
    isAvailable: true
  });

  const categories = [
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
        const { data } = await axios.get(`/api/products/${id}`);
        setFormData(data);
        setLoading(false);
      } catch (err) {
        setError('Failed to load product');
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await axios.put(`/api/products/${id}`, formData);
      toast.success('Product updated successfully');
      navigate('/shop-admin/products');
    } catch (error) {
      toast.error('Failed to update product');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const value = e.target.type === 'checkbox' 
      ? (e.target as HTMLInputElement).checked 
      : e.target.value;
    
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleImageUpload = (imagePath: string) => {
    setFormData({ ...formData, image: imagePath });
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
                name="isAvailable"
                checked={formData.isAvailable}
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
              onClick={() => navigate('/shop-admin/products')}
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
                  <Loader size={16} className="mr-2" />
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