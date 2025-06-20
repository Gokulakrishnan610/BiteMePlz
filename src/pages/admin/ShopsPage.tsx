import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Store, Plus, Edit, Trash2, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

interface Shop {
  _id: string;
  name: string;
  description: string;
  location: string;
  isActive: boolean;
  createdAt: string;
}

const ShopsPage: React.FC = () => {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    try {
      const { data } = await axios.get('/api/shops');
      setShops(data);
      setLoading(false);
    } catch (error) {
      toast.error('Failed to fetch shops');
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this shop?')) return;

    try {
      await axios.delete(`/api/shops/${id}`);
      toast.success('Shop deleted successfully');
      fetchShops();
    } catch (error) {
      toast.error('Failed to delete shop');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--primary)]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Shops</h1>
        <Link to="/admin/shops/create" className="btn-primary flex items-center">
          <Plus size={20} className="mr-2" />
          Create Shop
        </Link>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th>Name</th>
                <th>Location</th>
                <th>Status</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {shops.map((shop) => (
                <tr key={shop._id}>
                  <td className="flex items-center">
                    <Store size={20} className="mr-2 text-[var(--primary)]" />
                    {shop.name}
                  </td>
                  <td>{shop.location}</td>
                  <td>
                    <span className={`badge ${
                      shop.isActive ? 'badge-success' : 'badge-error'
                    }`}>
                      {shop.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>{new Date(shop.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="flex space-x-2">
                      <Link
                        to={`/admin/shops/${shop._id}`}
                        className="p-2 text-[var(--primary)] hover:bg-[var(--gray-100)] rounded"
                        title="View Details"
                      >
                        <Eye size={18} />
                      </Link>
                      <Link
                        to={`/admin/shops/${shop._id}/edit`}
                        className="p-2 text-[var(--primary)] hover:bg-[var(--gray-100)] rounded"
                        title="Edit Shop"
                      >
                        <Edit size={18} />
                      </Link>
                      <button
                        onClick={() => handleDelete(shop._id)}
                        className="p-2 text-[var(--error)] hover:bg-[var(--gray-100)] rounded"
                        title="Delete Shop"
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
      </div>
    </div>
  );
};

export default ShopsPage;