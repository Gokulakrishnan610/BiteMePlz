import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';
import { Package, Plus, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import Loader from '../../components/Loader';
import { Product } from '../../types';

const ProductsPage: React.FC = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [disabledCategories, setDisabledCategories] = useState<string[]>([]);
  const [savingCategories, setSavingCategories] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        if (!user?.shop) {
          setLoading(false);
          return;
        }
        
        const { data } = await api.get(`/api/products/?shop=${user.shop}`);
        // Handle paginated response
        setProducts(data.results || data);
        setLoading(false);
      } catch (error: any) {
        console.error('Error fetching products:', error);
        toast.error('Failed to fetch products');
        setLoading(false);
      }
    };

    fetchProducts();
  }, [user]);

  useEffect(() => {
    const fetchDisabled = async () => {
      try {
        if (!user?.shop) return;
        const { data } = await api.get(`/api/shops/${user.shop}/`);
        setDisabledCategories(data.disabled_categories || []);
      } catch {}
    };
    fetchDisabled();
  }, [user]);

  const toggleCategory = (cat: string) => {
    setDisabledCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const saveCategories = async () => {
    try {
      if (!user?.shop) return;
      setSavingCategories(true);
      await api.put(`/api/shops/${user.shop}/`, { disabled_categories: disabledCategories, shop_admin_id: (user as any)?._id || (user as any)?.id });
      toast.success('Category visibility updated');
    } catch {
      toast.error('Failed to update categories');
    } finally {
      setSavingCategories(false);
    }
  };

  const toggleAvailability = async (p: Product, next: boolean) => {
    try {
      console.log('Toggling product availability:', { product: p, next });
      const productId = p.id || p._id;
      const response = await api.put(`/api/products/${productId}/`, { 
        is_available: next, 
        shop_id: user?.shop 
      });
      console.log('Update response:', response.data);
      
      setProducts((prev) => prev.map((x) => {
        const xId = x.id || x._id;
        const pId = p.id || p._id;
        if (xId === pId) {
          return { ...x, is_available: next };
        }
        return x;
      }));
      toast.success(`Product ${next ? 'enabled' : 'disabled'}`);
    } catch (e: any) {
      console.error('Error toggling availability:', e);
      console.error('Error response:', e?.response?.data);
      toast.error(e?.response?.data?.error || e?.response?.data?.message || 'Failed to update product');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;

    try {
      await api.delete(`/api/products/${id}/`);
      toast.success('Product deleted successfully');
      setProducts(products.filter(product => (product.id || product._id) !== id));
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Products</h1>
        <Link to="/kisok-sp-back-office/products/create" className="btn-primary flex items-center">
          <Plus size={20} className="mr-2" />
          Add Product
        </Link>
      </div>

      <div className="card p-4 mb-4">
        <h2 className="text-lg font-semibold mb-2">Category Controls</h2>
        <p className="text-sm text-gray-600 mb-3">Enable/disable entire categories. Disabled categories will be hidden from customers.</p>
        <div className="flex flex-wrap gap-2">
          {['breakfast','lunch','food','beverages','snacks','stationery','electronics','others'].map((cat) => (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              className={`px-3 py-1 rounded border text-sm ${disabledCategories.includes(cat) ? 'bg-red-50 text-red-700 border-red-300' : 'bg-green-50 text-green-700 border-green-300'}`}
            >
              {disabledCategories.includes(cat) ? `Disabled: ${cat}` : `Enabled: ${cat}`}
            </button>
          ))}
        </div>
        <div className="mt-3">
          <button onClick={saveCategories} disabled={savingCategories} className="btn-primary px-4 py-2">
            {savingCategories ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th>Name</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id || product._id}>
                  <td className="flex items-center">
                    <Package size={20} className="mr-2 text-[var(--primary)]" />
                    {product.name}
                  </td>
                  <td>₹{product.price}</td>
                  <td>
                    <span className={`${
                      product.stock === 0 ? 'text-[var(--error)]' : 'text-[var(--success)]'
                    }`}>
                      {product.stock}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${product.is_available ? 'badge-success' : 'badge-error'}`}>
                      {product.is_available ? 'Available' : 'Unavailable'}
                    </span>
                  </td>
                  <td>{new Date(product.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="flex space-x-2 items-center">
                      <button
                        onClick={() => toggleAvailability(product, !product.is_available)}
                        className={`${product.is_available ? 'text-red-600' : 'text-green-600'} px-2 py-1 rounded border`}
                        title={product.is_available ? 'Disable Product' : 'Enable Product'}
                      >
                        {product.is_available ? 'Disable' : 'Enable'}
                      </button>
                      <Link
                        to={`/kisok-sp-back-office/products/edit/${product.id || product._id}`}
                        className="p-2 text-[var(--primary)] hover:bg-[var(--gray-100)] rounded"
                      >
                        <Edit size={18} />
                      </Link>
                      <button
                        onClick={() => handleDelete(product.id || product._id)}
                        className="p-2 text-[var(--error)] hover:bg-[var(--gray-100)] rounded"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {products.length === 0 && (
          <div className="text-center py-12">
            <Package size={48} className="text-[var(--gray-400)] mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-[var(--gray-600)] mb-2">
              No Products Yet
            </h2>
            <p className="text-[var(--gray-500)]">
              Start by adding your first product.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductsPage;