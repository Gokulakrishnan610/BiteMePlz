import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api';
import { 
  ArrowLeft, 
  Store, 
  TrendingUp, 
  Package, 
  ShoppingBag, 
  AlertCircle,
  Download,
  Eye,
  Key
} from 'lucide-react';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { toast } from 'sonner';
import ConfirmDialog from '../../components/ConfirmDialog';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface shop {
  _id: string;
  name: string;
  description: string;
  location: string;
  is_active: boolean;
  is_open: boolean;
  final_validity_time: string;
  qrValidityMinutes: number;
  createdAt: string;
}

interface Analytics {
  totalProducts: number;
  outOfStock: number;
  orderStats: {
    totalOrders: number;
    totalPaidOrders: number;
    totalVerifiedOrders: number;
    totalExpiredOrders: number;
    totalRevenue: number;
  };
  dailyStats: Array<{
    _id: { date: string };
    totalOrders: number;
    paidOrders: number;
    verifiedOrders: number;
    expiredOrders: number;
    revenue: number;
  }>;
  monthlySales: Array<{
    _id: { month: number; year: number };
    count: number;
    total: number;
  }>;
  topProducts: Array<{
    name: string;
    totalSold: number;
    totalRevenue: number;
  }>;
}

interface Transaction {
  _id: string;
  type: string;
  amount: number;
  status: string;
  paymentMethod: string;
  description: string;
  createdAt: string;
  user: {
    name: string;
    email: string;
    rollNo: string;
  };
  order: {
    order_id: string;
    totalPrice: number;
  };
  metadata: any;
}

interface TransactionStats {
  stats: Array<{
    _id: string;
    count: number;
    totalAmount: number;
    avgAmount: number;
  }>;
  dailyStats: Array<{
    _id: { date: string; type: string };
    count: number;
    amount: number;
  }>;
}

const ShopDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [shop, setshop] = useState<shop | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionStats, setTransactionStats] = useState<TransactionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'analytics'>('overview');
  const [transactionFilters, setTransactionFilters] = useState({
    type: '',
    status: '',
    startDate: '',
    endDate: '',
    page: 1
  });
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [changePasswordDialog, setChangePasswordDialog] = useState<{
    is_open: boolean;
    shopName: string;
  }>({
    is_open: false,
    shopName: ''
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (id) {
      fetchshopData();
    }
  }, [id]);

  useEffect(() => {
    if (id && activeTab === 'transactions') {
      fetchTransactions();
    }
  }, [id, activeTab, transactionFilters]);

  const fetchshopData = async () => {
    try {
              const shopRes = await api.get(`/api/shops/${id}/`);
      
      setshop(shopRes.data);
      
      // Load real analytics data
      try {
        const [analyticsRes, transactionStatsRes] = await Promise.all([
                  api.get(`/api/shops/${id}/analytics/`),
        api.get(`/api/shops/${id}/transaction_stats/`)
        ]);
        
        setAnalytics(analyticsRes.data);
        setTransactionStats(transactionStatsRes.data);
      } catch (analyticsErr) {
        console.warn('Analytics data not available:', analyticsErr);
        // Set default empty analytics if endpoints don't exist
        setAnalytics({
          totalProducts: 0,
          outOfStock: 0,
          orderStats: {
            totalOrders: 0,
            totalPaidOrders: 0,
            totalVerifiedOrders: 0,
            totalExpiredOrders: 0,
            totalRevenue: 0,
          },
          dailyStats: [],
          monthlySales: [],
          topProducts: [],
        });
        setTransactionStats({
          stats: [],
          dailyStats: [],
        });
      }
      
      setLoading(false);
    } catch (err) {
      setError('Failed to load shop data');
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(transactionFilters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString());
      });

      const { data } = await api.get(`/api/transactions/shop/?shop_id=${id}&${params}`);
      const list = data.results || data.transactions || [];
      setTransactions(list);
    } catch (err) {
      toast.error('Failed to load transactions');
    }
  };

  const handleTransactionClick = async (transactionId: string) => {
    try {
      const { data } = await api.get(`/api/transactions/${transactionId}/`);
      setSelectedTransaction(data);
    } catch (err) {
      toast.error('Failed to load transaction details');
    }
  };

  const exportTransactions = async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(transactionFilters).forEach(([key, value]) => {
        if (value && key !== 'page') params.append(key, value.toString());
      });
      params.append('limit', '1000'); // Export more records

              const { data } = await api.get(`/api/transactions/shop/?shop_id=${id}&${params}`);
      
      // Convert to CSV
      const csvContent = [
        ['Date', 'Type', 'Amount', 'Status', 'Payment Method', 'User', 'Order ID', 'Description'].join(','),
        ...(data.results || data.transactions || []).map((t: Transaction) => [
          new Date(t.createdAt).toLocaleString(),
          t.type,
          t.amount,
          t.status,
          t.paymentMethod || '',
          t.user.name,
          t.order?.order_id || '',
          `"${t.description}"`
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${shop?.name}-transactions-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Failed to export transactions');
    }
  };

  const handleChangePasswordClick = () => {
    setChangePasswordDialog({
      is_open: true,
      shopName: shop?.name || ''
    });
    setNewPassword(''); // Reset password field
  };

  const handleChangePasswordConfirm = async () => {
    if (!newPassword.trim()) {
      toast.error('Please enter a new password');
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    try {
      setChangingPassword(true);
      const response = await api.post('/api/users/change_shop_admin_password/', {
        shop_id: id,
        new_password: newPassword
      });
      
      toast.success('Password changed successfully!', {
        description: `Password updated for ${response.data.admin_email}`,
        duration: 5000
      });
      
      setChangePasswordDialog({
        is_open: false,
        shopName: ''
      });
      setNewPassword('');
    } catch (error: any) {
      toast.error('Failed to change password', {
        description: error.response?.data?.error || 'An error occurred'
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleChangePasswordCancel = () => {
    setChangePasswordDialog({
      is_open: false,
      shopName: ''
    });
    setNewPassword('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--primary)]"></div>
      </div>
    );
  }

  if (error || !shop) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertCircle className="mx-auto text-[var(--error)] mb-4" size={48} />
          <p className="text-[var(--error)] mb-4">{error}</p>
          <Link to="/kisok-ac-back-office/shops" className="btn-primary">
            Back to shops
          </Link>
        </div>
      </div>
    );
  }

  // Chart data
  const transactionTypeData = {
    labels: transactionStats?.stats.map(s => s._id.charAt(0).toUpperCase() + s._id.slice(1)) || [],
    datasets: [{
      data: transactionStats?.stats.map(s => s.count) || [],
      backgroundColor: [
        '#10B981', // payment - green
        '#EF4444', // refund - red
        '#8B5CF6', // verification - purple
        '#F59E0B', // expiry - yellow
        '#6B7280'  // cancellation - gray
      ]
    }]
  };

  const dailyTransactionData = {
    labels: [...new Set(transactionStats?.dailyStats.map(s => s._id.date))].sort(),
    datasets: [
      {
        label: 'Payment',
        data: transactionStats?.dailyStats
          .filter(s => s._id.type === 'payment')
          .map(s => ({ x: s._id.date, y: s.amount })) || [],
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true
      },
      {
        label: 'Refund',
        data: transactionStats?.dailyStats
          .filter(s => s._id.type === 'refund')
          .map(s => ({ x: s._id.date, y: s.amount })) || [],
        borderColor: '#EF4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true
      }
    ]
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0">
          <Link
            to="/kisok-ac-back-office/shops"
            className="flex items-center text-[var(--primary)] hover:underline mr-0 sm:mr-4 w-fit"
          >
            <ArrowLeft size={20} className="mr-2" />
            <span className="hidden sm:inline">Back to shops</span>
            <span className="sm:hidden">Back</span>
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">{shop.name}</h1>
            <p className="text-[var(--gray-600)] text-sm sm:text-base">{shop.location}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleChangePasswordClick}
            className="btn-secondary flex items-center px-3 py-2 text-sm"
            title="Change Shop Admin Password"
          >
            <Key size={16} className="mr-2" />
            <span className="hidden sm:inline">Change Password</span>
            <span className="sm:hidden">Password</span>
          </button>
          <span className={`badge text-xs ${shop.is_active ? 'badge-success' : 'badge-error'}`}>
            {shop.is_active ? 'Active' : 'Inactive'}
          </span>
          <span className={`badge text-xs ${shop.is_open ? 'badge-success' : 'badge-error'}`}>
            {shop.is_open ? 'Open' : 'Closed'}
          </span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-[var(--gray-200)] overflow-x-auto">
        <nav className="flex space-x-4 sm:space-x-8 min-w-max">
          {[
            { id: 'overview', label: 'Overview', icon: Store },
            { id: 'transactions', label: 'Transactions', icon: ShoppingBag },
            { id: 'analytics', label: 'Analytics', icon: TrendingUp }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === id
                  ? 'border-[var(--primary)] text-[var(--primary)]'
                  : 'border-transparent text-[var(--gray-500)] hover:text-[var(--gray-700)]'
              }`}
            >
              <Icon size={18} className="sm:hidden mr-1" />
              <Icon size={20} className="hidden sm:block mr-2" />
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{label.charAt(0)}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <div className="p-3 sm:p-4 lg:p-6 flex items-center">
              <Package size={24} className="sm:hidden mr-2 sm:mr-4 flex-shrink-0" />
              <Package size={40} className="hidden sm:block mr-4 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm sm:text-lg font-semibold truncate">Total Products</p>
                <p className="text-2xl sm:text-3xl font-bold">{analytics?.totalProducts || 0}</p>
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
            <div className="p-3 sm:p-4 lg:p-6 flex items-center">
              <ShoppingBag size={24} className="sm:hidden mr-2 sm:mr-4 flex-shrink-0" />
              <ShoppingBag size={40} className="hidden sm:block mr-4 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm sm:text-lg font-semibold truncate">Total Orders</p>
                <p className="text-2xl sm:text-3xl font-bold">{analytics?.orderStats.totalOrders || 0}</p>
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <div className="p-3 sm:p-4 lg:p-6 flex items-center">
              <TrendingUp size={24} className="sm:hidden mr-2 sm:mr-4 flex-shrink-0" />
              <TrendingUp size={40} className="hidden sm:block mr-4 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm sm:text-lg font-semibold truncate">Total Revenue</p>
                <p className="text-2xl sm:text-3xl font-bold">₹{analytics?.orderStats.totalRevenue || 0}</p>
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-red-500 to-red-600 text-white">
            <div className="p-3 sm:p-4 lg:p-6 flex items-center">
              <AlertCircle size={24} className="sm:hidden mr-2 sm:mr-4 flex-shrink-0" />
              <AlertCircle size={40} className="hidden sm:block mr-4 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm sm:text-lg font-semibold truncate">Out of Stock</p>
                <p className="text-3xl font-bold">{analytics?.outOfStock || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="card p-3 sm:p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">
                  Type
                </label>
                <select
                  value={transactionFilters.type}
                  onChange={(e) => setTransactionFilters({ ...transactionFilters, type: e.target.value, page: 1 })}
                  className="input"
                >
                  <option value="">All Types</option>
                  <option value="payment">Payment</option>
                  <option value="refund">Refund</option>
                  <option value="verification">Verification</option>
                  <option value="expiry">Expiry</option>
                  <option value="cancellation">Cancellation</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">
                  Status
                </label>
                <select
                  value={transactionFilters.status}
                  onChange={(e) => setTransactionFilters({ ...transactionFilters, status: e.target.value, page: 1 })}
                  className="input"
                >
                  <option value="">All Status</option>
                  <option value="success">Success</option>
                  <option value="failed">Failed</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={transactionFilters.startDate}
                  onChange={(e) => setTransactionFilters({ ...transactionFilters, startDate: e.target.value, page: 1 })}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={transactionFilters.endDate}
                  onChange={(e) => setTransactionFilters({ ...transactionFilters, endDate: e.target.value, page: 1 })}
                  className="input"
                />
              </div>

              <button
                onClick={exportTransactions}
                className="btn-secondary flex items-center justify-center w-full sm:w-auto"
              >
                <Download size={20} className="mr-2" />
                <span className="hidden sm:inline">Export CSV</span>
                <span className="sm:hidden">Export</span>
              </button>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-full">
                <thead>
                  <tr>
                    <th className="text-left py-2 px-2 text-sm">Date</th>
                    <th className="text-left py-2 px-2 text-sm">Type</th>
                    <th className="text-left py-2 px-2 text-sm">Amount</th>
                    <th className="text-left py-2 px-2 text-sm">Status</th>
                    <th className="text-left py-2 px-2 text-sm hidden md:table-cell">User</th>
                    <th className="text-left py-2 px-2 text-sm hidden lg:table-cell">Order</th>
                    <th className="text-left py-2 px-2 text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction._id} className="border-b border-[var(--border)]">
                      <td>{new Date(transaction.createdAt).toLocaleString()}</td>
                      <td>
                        <span className={`badge ${
                          transaction.type === 'payment' ? 'badge-success' :
                          transaction.type === 'refund' ? 'badge-warning' :
                          transaction.type === 'verification' ? 'badge-primary' :
                          transaction.type === 'expiry' ? 'badge-error' :
                          'badge-secondary'
                        }`}>
                          {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                        </span>
                      </td>
                      <td>₹{transaction.amount}</td>
                      <td>
                        <span className={`badge ${
                          transaction.status === 'success' ? 'badge-success' :
                          transaction.status === 'failed' ? 'badge-error' :
                          'badge-warning'
                        }`}>
                          {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                        </span>
                      </td>
                      <td>
                        <div>
                          <p className="font-medium">{transaction.user.name}</p>
                          <p className="text-sm text-[var(--gray-500)]">{transaction.user.rollNo}</p>
                        </div>
                      </td>
                      <td>{transaction.order?.order_id || '-'}</td>
                      <td>
                        <button
                          onClick={() => handleTransactionClick(transaction._id)}
                          className="p-2 text-[var(--primary)] hover:bg-[var(--gray-100)] rounded"
                        >
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-6">
            <h3 className="text-xl font-semibold mb-4">Transaction Types</h3>
            <div className="h-[300px]">
              <Doughnut data={transactionTypeData} options={{ maintainAspectRatio: false }} />
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-xl font-semibold mb-4">Daily Transaction Volume</h3>
            <div className="h-[300px]">
              <Line data={dailyTransactionData} options={{ maintainAspectRatio: false }} />
            </div>
          </div>

          <div className="card p-6 lg:col-span-2">
            <h3 className="text-xl font-semibold mb-4">Top Products</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Units Sold</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics?.topProducts.map((product, index) => (
                    <tr key={index}>
                      <td>{product.name}</td>
                      <td>{product.totalSold}</td>
                      <td>₹{product.totalRevenue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Details Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold">Transaction Details</h3>
                <button
                  onClick={() => setSelectedTransaction(null)}
                  className="text-[var(--gray-500)] hover:text-[var(--gray-700)]"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--gray-700)]">Type</label>
                    <p className="mt-1">{selectedTransaction.type}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--gray-700)]">Amount</label>
                    <p className="mt-1">₹{selectedTransaction.amount}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--gray-700)]">Status</label>
                    <p className="mt-1">{selectedTransaction.status}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--gray-700)]">Payment Method</label>
                    <p className="mt-1">{selectedTransaction.paymentMethod || '-'}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--gray-700)]">Description</label>
                  <p className="mt-1">{selectedTransaction.description}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--gray-700)]">User</label>
                  <p className="mt-1">{selectedTransaction.user.name} ({selectedTransaction.user.rollNo})</p>
                  <p className="text-sm text-[var(--gray-500)]">{selectedTransaction.user.email}</p>
                </div>

                {selectedTransaction.order && (
                  <div>
                    <label className="block text-sm font-medium text-[var(--gray-700)]">Order</label>
                    <p className="mt-1">{selectedTransaction.order.order_id} - ₹{selectedTransaction.order.totalPrice}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-[var(--gray-700)]">Date</label>
                  <p className="mt-1">{new Date(selectedTransaction.createdAt).toLocaleString()}</p>
                </div>

                {selectedTransaction.metadata && Object.keys(selectedTransaction.metadata).length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-[var(--gray-700)]">Additional Details</label>
                    <pre className="mt-1 text-sm bg-[var(--gray-100)] p-3 rounded overflow-x-auto">
                      {JSON.stringify(selectedTransaction.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        is_open={changePasswordDialog.is_open}
        title="Change Shop Admin Password"
        message={
          <div className="space-y-4">
            <p>Enter a new password for the admin of <strong>"{changePasswordDialog.shopName}"</strong></p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter new password (min 6 characters)"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Minimum 6 characters required
              </p>
            </div>
          </div>
        }
        confirmText={changingPassword ? "Changing..." : "Change Password"}
        cancelText="Cancel"
        onConfirm={handleChangePasswordConfirm}
        onCancel={handleChangePasswordCancel}
        type="warning"
        disabled={changingPassword || !newPassword.trim()}
      />
    </div>
  );
};

export default ShopDetailsPage;