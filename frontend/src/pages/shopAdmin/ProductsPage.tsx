import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';
import { Package, Plus, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAdminShop } from '../../context/AdminShopContext';
import { toast } from 'sonner';
import Loader from '../../components/Loader';
import { Product } from '../../types';

const ProductsPage: React.FC = () => {
  const { user } = useAuth();
  const { selectedShop } = useAdminShop();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [disabledCategories, setDisabledCategories] = useState<string[]>([]);
  const [savingCategories, setSavingCategories] = useState(false);

  // Determine the effective shop ID
  const effectiveShopId = user?.role === 'admin' && selectedShop ? selectedShop.id : user?.shop;

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        if (!effectiveShopId) {
          setLoading(false);
          return;
        }
        
        const { data } = await api.get(`/api/products/?shop=${effectiveShopId}`);
        // Handle paginated response and add backward compatibility for stock_mode
        const productsData = data.results || data;
        setProducts(productsData.map((product: Product) => ({
          ...product,
          stock_mode: product.stock_mode || 'stock' // Default to 'stock' for backward compatibility
        })));
        setLoading(false);
      } catch (error: any) {
        toast.error('Failed to fetch products');
        setLoading(false);
      }
    };

    fetchProducts();
  }, [effectiveShopId]);

  useEffect(() => {
    const fetchDisabled = async () => {
      try {
        if (!effectiveShopId) return;
        const { data } = await api.get(`/api/shops/${effectiveShopId}/`);
        setDisabledCategories(data.disabled_categories || []);
      } catch {}
    };
    fetchDisabled();
  }, [effectiveShopId]);

  const toggleCategory = (cat: string) => {
    setDisabledCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const saveCategories = async () => {
    try {
      if (!effectiveShopId) return;
      setSavingCategories(true);
      await api.put(`/api/shops/${effectiveShopId}/`, { disabled_categories: disabledCategories, shop_admin_id: (user as any)?._id || (user as any)?.id });
      toast.success('Category visibility updated');
    } catch {
      toast.error('Failed to update categories');
    } finally {
      setSavingCategories(false);
    }
  };

  const toggleAvailability = async (p: Product, next: boolean) => {
    try {
      const productId = p.id || p._id;
      const response = await api.put(`/api/products/${productId}/`, { 
        is_available: next, 
        shop_id: effectiveShopId 
      });
      
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
      toast.error(e?.response?.data?.error || e?.response?.data?.message || 'Failed to update product');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;

    try {
      await api.delete(`/api/products/${id}/`);
      toast.success('Product deleted successfully');
      setProducts((prev) => prev.filter((p) => (p.id || p._id) !== id));
    } catch (error: any) {
      toast.error('Failed to delete product');
    }
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <h1 className="text-xl sm:text-2xl font-bold">Products</h1>
        <Link 
          to={user?.role === 'admin' && selectedShop ? '/kisok-ac-back-office/shop-admin/products/create' : '/kisok-sp-back-office/products/create'} 
          className="btn-primary flex items-center justify-center w-full sm:w-auto"
        >
          <Plus size={20} className="mr-2" />
          <span className="hidden sm:inline">Add Product</span>
          <span className="sm:hidden">Add</span>
        </Link>
      </div>

      <div className="card p-3 sm:p-4 mb-4">
        <h2 className="text-base sm:text-lg font-semibold mb-2">Category Controls</h2>
        <p className="text-sm text-gray-600 mb-3">Enable/disable entire categories. Disabled categories will be hidden from customers.</p>
        <div className="flex flex-wrap gap-2">
          {['breakfast','lunch','food','beverages','snacks','stationery','electronics','others'].map((cat) => (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              className={`px-2 sm:px-3 py-1 rounded border text-xs sm:text-sm ${disabledCategories.includes(cat) ? 'bg-red-50 text-red-700 border-red-300' : 'bg-green-50 text-green-700 border-green-300'}`}
            >
              <span className="hidden sm:inline">{disabledCategories.includes(cat) ? `Disabled: ${cat}` : `Enabled: ${cat}`}</span>
              <span className="sm:hidden">{cat}</span>
            </button>
          ))}
        </div>
        <div className="mt-3">
          <button onClick={saveCategories} disabled={savingCategories} className="btn-primary px-3 sm:px-4 py-2 w-full sm:w-auto">
            {savingCategories ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-full">
            <thead>
              <tr>
                <th className="text-left py-2 px-2 text-sm">Name</th>
                <th className="text-left py-2 px-2 text-sm">Price</th>
                <th className="text-left py-2 px-2 text-sm">Stock</th>
                <th className="text-left py-2 px-2 text-sm">Status</th>
                <th className="text-left py-2 px-2 text-sm hidden md:table-cell">Created At</th>
                <th className="text-left py-2 px-2 text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id || product._id} className="border-b border-[var(--border)]">
                  <td className="py-2 px-2">
                    <div className="flex items-center">
                      <Package size={20} className="mr-2 text-[var(--primary)] flex-shrink-0" />
                      <span className="truncate max-w-32">{product.name}</span>
                    </div>
                  </td>
                  <td className="py-2 px-2 text-sm">₹{product.price}</td>
                  <td className="py-2 px-2">
                    <span className={`text-sm ${
                      product.stock_mode === 'live_stock' ? 'text-[var(--primary)]' :
                      product.stock === 0 ? 'text-[var(--error)]' : 'text-[var(--success)]'
                    }`}>
                      {product.stock_mode === 'live_stock' ? 'Livestock' : product.stock}
                    </span>
                  </td>
                  <td className="py-2 px-2">
                    <span className={`badge text-xs ${product.is_available ? 'badge-success' : 'badge-error'}`}>
                      {product.is_available ? 'Available' : 'Unavailable'}
                    </span>
                  </td>
                  <td className="py-2 px-2 hidden md:table-cell text-sm">{new Date(product.createdAt).toLocaleDateString()}</td>
                  <td className="py-2 px-2">
                    <div className="flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-2 items-start sm:items-center">
                      <button
                        onClick={() => toggleAvailability(product, !product.is_available)}
                        className={`${product.is_available ? 'text-red-600' : 'text-green-600'} px-2 py-1 rounded border text-xs sm:text-sm w-full sm:w-auto`}
                        title={product.is_available ? 'Disable Product' : 'Enable Product'}
                      >
                        {product.is_available ? 'Disable' : 'Enable'}
                      </button>
                      <div className="flex space-x-1 sm:space-x-2">
                        <Link
                          to={user?.role === 'admin' && selectedShop ? `/kisok-ac-back-office/shop-admin/products/edit/${product.id || product._id}` : `/kisok-sp-back-office/products/edit/${product.id || product._id}`}
                          className="p-2 text-[var(--primary)] hover:bg-[var(--gray-100)] rounded"
                          title="Edit Product"
                        >
                          <Edit size={18} />
                        </Link>
                        <button
                          onClick={() => handleDelete(product.id || product._id)}
                          className="p-2 text-[var(--error)] hover:bg-[var(--gray-100)] rounded"
                          title="Delete Product"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {products.length === 0 && (
          <div className="text-center py-8 sm:py-12">
            <Package size={40} className="sm:hidden text-[var(--gray-400)] mx-auto mb-3" />
            <Package size={48} className="hidden sm:block text-[var(--gray-400)] mx-auto mb-4" />
            <h2 className="text-lg sm:text-xl font-semibold text-[var(--gray-600)] mb-2">
              No Products Yet
            </h2>
            <p className="text-[var(--gray-500)] text-sm sm:text-base">
              Start by adding your first product.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductsPage;