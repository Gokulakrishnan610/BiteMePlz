import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';
import { Store, Plus, Edit, Trash2, Eye, Clock, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmDialog from '../../components/ConfirmDialog';

interface shop {
  id: string;
  name: string;
  description: string;
  location: string;
  is_active: boolean;
  is_open: boolean;
  createdAt: string;
  final_validity_time: string;
}

const ShopsPage: React.FC = () => {
  const [shops, setshops] = useState<shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState<{
    is_open: boolean;
    shop_id: string;
    shopName: string;
  }>({
    is_open: false,
    shop_id: '',
    shopName: ''
  });

  useEffect(() => {
    fetchshops();
  }, []);

  const fetchshops = async () => {
    try {
      const all: shop[] = [];
      type Paginated<T> = { results: T[]; next: string | null };
      let page = 1;
      let next: string | null = `/api/shops/?page=${page}`;
      while (next) {
        const response = await api.get(next);
        const data = response.data as Paginated<shop> | shop[];
        const shopsData = Array.isArray(data) ? data : data.results;
        all.push(...shopsData);
        next = Array.isArray(data) ? null : data.next;
      }
      setshops(all);
      setLoading(false);
    } catch (error) {
      toast.error('Failed to fetch shops');
      setLoading(false);
    }
  };

  const handleDeleteClick = (shop: shop) => {
    setDeleteDialog({
      is_open: true,
      shop_id: shop.id,
      shopName: shop.name
    });
  };

  const handleDeleteConfirm = async () => {
    try {
              await api.delete(`/api/shops/${deleteDialog.shop_id}/`);
      toast.success('shop deleted successfully');
      fetchshops();
    } catch (error) {
      toast.error('Failed to delete shop');
    } finally {
      setDeleteDialog({
        is_open: false,
        shop_id: '',
        shopName: ''
      });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({
      is_open: false,
      shop_id: '',
      shopName: ''
    });
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  if (loading) {
    return null;
  }

  return (
    <div className="space-y-4 sm:space-y-6 fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold gradient-text">Shop Management</h1>
          <p className="text-[var(--secondary-text)] mt-2 text-sm sm:text-base">Manage all campus shops and their settings</p>
        </div>
        <Link to="/kisok-ac-back-office/shops/create" className="btn-primary flex items-center justify-center w-full sm:w-auto">
          <Plus size={20} className="mr-2" />
          <span className="hidden sm:inline">Create Shop</span>
          <span className="sm:hidden">Create</span>
        </Link>
      </div>

      {/* shops Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {shops.map((shop) => (
          <div key={shop.id} className="card hover:scale-105 transition-all duration-300 glow-hover overflow-hidden">
            {/* shop Header */}
            <div className="card-header">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 space-y-3 sm:space-y-0">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div className="p-2 bg-gradient-to-r from-[var(--accent-purple)] to-[var(--accent-violet)] rounded-lg flex-shrink-0">
                    <Store className="text-white" size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-bold text-[var(--primary-text)] truncate">{shop.name}</h3>
                    <div className="flex items-center text-[var(--muted-text)] text-sm mt-1">
                      <MapPin size={14} className="mr-1 flex-shrink-0" />
                      <span className="text-[var(--secondary-text)] truncate">{shop.location}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 sm:gap-1">
                  <span className={`badge text-xs ${
                    shop.is_active ? 'badge-success' : 'badge-error'
                  }`}>
                    {shop.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <span className={`badge text-xs ${
                    shop.is_open ? 'badge-success' : 'badge-warning'
                  }`}>
                    {shop.is_open ? 'Open' : 'Closed'}
                  </span>
                </div>
              </div>

              <p className="text-[var(--secondary-text)] text-sm line-clamp-2 mb-4">
                {shop.description}
              </p>

              <div className="flex items-center text-[var(--muted-text)] text-sm">
                <Clock size={14} className="mr-1" />
                <span className="text-[var(--secondary-text)]">Closes at {formatTime(shop.final_validity_time)}</span>
              </div>
            </div>

            {/* shop Actions */}
            <div className="card-footer">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
                <span className="text-[var(--muted-text)] text-sm">
                  Created {new Date(shop.createdAt).toLocaleDateString()}
                </span>
                <div className="flex justify-center sm:justify-end space-x-2">
                  <Link
                    to={`/kisok-ac-back-office/shops/${shop.id}`}
                    className="p-2 text-[var(--info)] hover:bg-[var(--hover-bg)] rounded-lg transition-colors"
                    title="View Details"
                  >
                    <Eye size={16} />
                  </Link>
                  <Link
                    to={`/kisok-ac-back-office/shops/${shop.id}/edit`}
                    className="p-2 text-[var(--accent-purple)] hover:bg-[var(--hover-bg)] rounded-lg transition-colors"
                    title="Edit Shop"
                  >
                    <Edit size={16} />
                  </Link>
                  <button
                    onClick={() => handleDeleteClick(shop)}
                    className="p-2 text-[var(--error)] hover:bg-[var(--hover-bg)] rounded-lg transition-colors"
                    title="Delete Shop"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {shops.length === 0 && (
        <div className="text-center py-8 sm:py-16">
          <div className="card p-6 sm:p-12 max-w-md mx-auto">
            <Store size={48} className="sm:hidden text-[var(--muted-text)] mx-auto mb-4" />
            <Store size={64} className="hidden sm:block text-[var(--muted-text)] mx-auto mb-6" />
            <h3 className="text-xl sm:text-2xl font-semibold text-[var(--secondary-text)] mb-3 sm:mb-4">
              No Shops Found
            </h3>
            <p className="text-[var(--muted-text)] mb-4 sm:mb-6 text-sm sm:text-base">
              Get started by creating your first shop.
            </p>
            <Link to="/kisok-ac-back-office/shops/create" className="btn-primary w-full sm:w-auto">
              <Plus size={20} className="inline mr-2" />
              Create First Shop
            </Link>
          </div>
        </div>
      )}

      <ConfirmDialog
        is_open={deleteDialog.is_open}
        title="Delete shop"
        message={`Are you sure you want to delete "${deleteDialog.shopName}"? This action cannot be undone and will also delete all associated products and orders.`}
        confirmText="Delete shop"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        type="danger"
      />
    </div>
  );
};

export default ShopsPage;