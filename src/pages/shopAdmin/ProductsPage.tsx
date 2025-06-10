import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Package, Plus, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import Loader from '../../components/Loader';

interface Product {
  _id: string;
  name: string;
  price: number;
  stock: number;
  isAvailable: boolean;
  createdAt: string;
}

const ProductsPage: React.FC = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        if (!user?.shop) return;
        const { data } = await axios.get(`/api/products?shop=${user.shop}`);
        setProducts(data);
        setLoading(false);
      } catch (error) {
        toast.error('Failed to fetch products');
        setLoading(false);
      }
    };

    fetchProducts();
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;

    try {
      await axios.delete(`/api/products/${id}`);
      toast.success('Product deleted successfully');
      setProducts(products.filter(product => product._id !== id));
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
        <Link to="/shop-admin/products/create" className="btn-primary flex items-center">
          <Plus size={20} className="mr-2" />
          Add Product
        </Link>
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
                <tr key={product._id}>
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
                    <span className={`badge ${
                      product.isAvailable ? 'badge-success' : 'badge-error'
                    }`}>
                      {product.isAvailable ? 'Available' : 'Unavailable'}
                    </span>
                  </td>
                  <td>{new Date(product.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="flex space-x-2">
                      <Link
                        to={`/shop-admin/products/edit/${product._id}`}
                        className="p-2 text-[var(--primary)] hover:bg-[var(--gray-100)] rounded"
                      >
                        <Edit size={18} />
                      </Link>
                      <button
                        onClick={() => handleDelete(product._id)}
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