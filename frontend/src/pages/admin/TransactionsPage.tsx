import React, { useEffect, useState } from 'react';
import api from '../../api';
import { 
  Receipt, 
  Download, 
  Eye, 
  RefreshCw,
  TrendingUp,
  TrendingDown,
  DollarSign,
  X
} from 'lucide-react';
import { toast } from 'sonner';

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
  shop: {
    _id: string;
    name: string;
  };
  metadata: any;
}

interface shop {
  id: string; // Changed from _id
  name: string;
}

// Normalize API responses for transactions
const toNumber = (v: any): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

const normalizeTransaction = (t: any): Transaction => ({
  _id: t._id || t.id,
  type: t.type,
  amount: toNumber(t.amount),
  status: t.status,
  paymentMethod: t.paymentMethod ?? t.payment_method ?? '',
  description: t.description,
  createdAt: t.createdAt ?? t.created_at,
  user: {
    name: t.user?.name,
    email: t.user?.email,
    rollNo: t.user?.rollNo ?? t.user?.roll_no,
  },
  order: t.order
    ? {
        order_id: t.order.order_id,
        totalPrice: toNumber(t.order.totalPrice ?? t.order.total_price),
      }
    : (undefined as any),
  shop: t.shop
    ? {
        _id: t.shop._id || t.shop.id || '',
        name: t.shop.name || '',
      }
    : (undefined as any),
  metadata: t.metadata,
});

const extractTransactions = (data: any): Transaction[] => {
  const list = Array.isArray(data) ? data : data?.results || data?.transactions || [];
  return (list as any[]).map(normalizeTransaction);
};

const TransactionsPage: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [shops, setshops] = useState<shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [filters, setFilters] = useState({
    shop: '',
    type: '',
    status: '',
    startDate: '',
    endDate: '',
    search: '',
    page: 1,
    limit: 50
  });
  const [stats, setStats] = useState({
    totalTransactions: 0,
    totalAmount: 0,
    successfulTransactions: 0,
    failedTransactions: 0
  });

  useEffect(() => {
    fetchshops();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [filters, shops]);

  const fetchshops = async () => {
    try {
      const all: shop[] = [];
      let page = 1;
      let next: string | null = `/api/shops/?page=${page}`;
      while (next) {
        const { data }: { data: any } = await api.get(next);
        const shopsData = data.results || data;
        if (Array.isArray(shopsData)) {
          all.push(...shopsData);
          next = data.next || null;
        } else {
          all.push(...shopsData);
          next = null;
        }
      }
      setshops(all);
    } catch (error) {
      toast.error('Failed to fetch shops');
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      
      // If a specific shop is selected, fetch transactions for that shop
      if (filters.shop) {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
          if (value && key !== 'shop') params.append(key, value.toString());
        });

        const { data }: { data: any } = await api.get(`/api/transactions/shop/?shop_id=${filters.shop}&${params}`);
        const list = extractTransactions(data);
        setTransactions(list);
        
        // Calculate stats
        const totalTransactions = list.length || 0;
        // Amount should include only successful payments
        const totalAmount = list
          .filter((t: Transaction) => t.type === 'payment' && t.status === 'success')
          .reduce((sum: number, t: Transaction) => sum + toNumber(t.amount), 0) || 0;
        const successfulTransactions = list.filter((t: Transaction) => t.status === 'success').length || 0;
        const failedTransactions = list.filter((t: Transaction) => t.status === 'failed').length || 0;
        
        setStats({
          totalTransactions,
          totalAmount,
          successfulTransactions,
          failedTransactions
        });
      } else {
        // When showing all shops, wait until shop list is loaded
        if (shops.length === 0) {
          setTransactions([]);
          setStats({
            totalTransactions: 0,
            totalAmount: 0,
            successfulTransactions: 0,
            failedTransactions: 0,
          });
          setLoading(false);
          return;
        }
        // Fetch transactions from all shops
        const allTransactions: Transaction[] = [];
        
        for (const shop of shops) {
          try {
            if (!shop.id) { // Changed from _id
              console.warn(`Shop ${shop.name} has no valid ID, skipping`);
              continue;
            }
            const params = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
              if (value && key !== 'shop') params.append(key, value.toString());
            });

            const { data }: { data: any } = await api.get(`/api/transactions/shop/?shop_id=${shop.id}&${params}`);
            const list = extractTransactions(data).map((t: any) => ({
              ...t,
              shop: { _id: shop.id, name: shop.name },
            }));
            allTransactions.push(...list);
          } catch (error) {
            console.error(`Failed to fetch transactions for shop ${shop.name}:`, error);
          }
        }
        
        // Sort by date (newest first)
        allTransactions.sort((a, b) => new Date(a.createdAt).getTime() < new Date(b.createdAt).getTime() ? 1 : -1);
        
        setTransactions(allTransactions);
        
        // Calculate stats
        const totalTransactions = allTransactions.length;
        // Amount should include only successful payments
        const totalAmount = allTransactions
          .filter((t) => t.type === 'payment' && t.status === 'success')
          .reduce((sum, t) => sum + toNumber(t.amount), 0);
        const successfulTransactions = allTransactions.filter(t => t.status === 'success').length;
        const failedTransactions = allTransactions.filter(t => t.status === 'failed').length;
        
        setStats({
          totalTransactions,
          totalAmount,
          successfulTransactions,
          failedTransactions
        });
      }
      
      setLoading(false);
    } catch (error) {
      toast.error('Failed to fetch transactions');
      setLoading(false);
    }
  };

  const handleTransactionClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
  };

  const exportTransactions = async () => {
    try {
      // Convert to CSV
      const csvContent = [
        ['Date', 'shop', 'Type', 'Amount', 'Status', 'Payment Method', 'User', 'Order ID', 'Description'].join(','),
        ...transactions.map((t: Transaction) => [
          new Date(t.createdAt).toLocaleString(),
          t.shop?.name || 'Unknown',
          t.type,
          toNumber(t.amount).toFixed(2),
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
      a.download = `all-transactions-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Failed to export transactions');
    }
  };

  const resetFilters = () => {
    setFilters({
      shop: '',
      type: '',
      status: '',
      startDate: '',
      endDate: '',
      search: '',
      page: 1,
      limit: 50
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <h1 className="text-xl sm:text-2xl font-bold">All Transactions</h1>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={fetchTransactions}
            className="btn-secondary flex items-center justify-center w-full sm:w-auto"
          >
            <RefreshCw size={20} className="mr-2" />
            <span className="hidden sm:inline">Refresh</span>
            <span className="sm:hidden">Refresh</span>
          </button>
          <button
            onClick={exportTransactions}
            className="btn-primary flex items-center justify-center w-full sm:w-auto"
          >
            <Download size={20} className="mr-2" />
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">Export</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="p-3 sm:p-4 lg:p-6 flex items-center">
            <Receipt size={24} className="sm:hidden mr-2 sm:mr-4 flex-shrink-0" />
            <Receipt size={40} className="hidden sm:block mr-4 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm sm:text-lg font-semibold truncate">Total Transactions</p>
              <p className="text-2xl sm:text-3xl font-bold">{stats.totalTransactions}</p>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="p-3 sm:p-4 lg:p-6 flex items-center">
            <DollarSign size={24} className="sm:hidden mr-2 sm:mr-4 flex-shrink-0" />
            <DollarSign size={40} className="hidden sm:block mr-4 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm sm:text-lg font-semibold truncate">Total Amount</p>
              <p className="text-2xl sm:text-3xl font-bold">₹{stats.totalAmount}</p>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
          <div className="p-3 sm:p-4 lg:p-6 flex items-center">
            <TrendingUp size={24} className="sm:hidden mr-2 sm:mr-4 flex-shrink-0" />
            <TrendingUp size={40} className="hidden sm:block mr-4 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm sm:text-lg font-semibold truncate">Successful</p>
              <p className="text-2xl sm:text-3xl font-bold">{stats.successfulTransactions}</p>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-red-500 to-red-600 text-white">
          <div className="p-3 sm:p-4 lg:p-6 flex items-center">
            <TrendingDown size={24} className="sm:hidden mr-2 sm:mr-4 flex-shrink-0" />
            <TrendingDown size={40} className="hidden sm:block mr-4 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm sm:text-lg font-semibold truncate">Failed</p>
              <p className="text-2xl sm:text-3xl font-bold">{stats.failedTransactions}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-3 sm:p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-[var(--secondary-text)] mb-1">
              shop
            </label>
            <select
              value={filters.shop}
              onChange={(e) => setFilters({ ...filters, shop: e.target.value, page: 1 })}
              className="input"
            >
              <option key="all-shops" value="">All shops</option>
              {shops.map((shop) => (
                <option key={shop.id} value={shop.id}> {/* Changed to shop.id */}
                  {shop.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--secondary-text)] mb-1">
              Type
            </label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value, page: 1 })}
              className="input"
            >
              <option key="all-types" value="">All Types</option>
              <option key="payment" value="payment">Payment</option>
              <option key="refund" value="refund">Refund</option>
              <option key="verification" value="verification">Verification</option>
              <option key="expiry" value="expiry">Expiry</option>
              <option key="cancellation" value="cancellation">Cancellation</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--secondary-text)] mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
              className="input"
            >
              <option key="all-status" value="">All Status</option>
              <option key="success" value="success">Success</option>
              <option key="failed" value="failed">Failed</option>
              <option key="pending" value="pending">Pending</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--secondary-text)] mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value, page: 1 })}
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--secondary-text)] mb-1">
              End Date
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value, page: 1 })}
              className="input"
            />
          </div>

          <button
            onClick={resetFilters}
            className="btn-secondary"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--accent-purple)]"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>shop</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Verified By</th>
                  <th>User</th>
                  <th>Order</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction._id}>
                    <td className="text-[var(--secondary-text)]">{new Date(transaction.createdAt).toLocaleString()}</td>
                    <td className="text-[var(--primary-text)]">{transaction.shop?.name || 'Unknown'}</td>
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
                    <td className="text-[var(--primary-text)]">₹{transaction.amount}</td>
                    <td>
                      <span className={`badge ${
                        transaction.status === 'success' ? 'badge-success' :
                        transaction.status === 'failed' ? 'badge-error' :
                        'badge-warning'
                      }`}>
                        {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                      </span>
                    </td>
                    <td className="text-[var(--secondary-text)]">
                      {transaction.type === 'verification' && (transaction as any).metadata?.verified_by ? (
                        <>
                          {(transaction as any).metadata.verified_by.name || 'Unknown'}
                          {(transaction as any).metadata.verified_by.role ? ` (${(transaction as any).metadata.verified_by.role})` : ''}
                          {(transaction as any).metadata.verified_by.shop?.name ? ` • ${(transaction as any).metadata.verified_by.shop.name}` : ''}
                        </>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>
                      <div>
                        <p className="font-medium text-[var(--primary-text)]">{transaction.user.name}</p>
                        <p className="text-sm text-[var(--muted-text)]">{transaction.user.rollNo}</p>
                      </div>
                    </td>
                    <td className="text-[var(--secondary-text)]">{transaction.order?.order_id || '-'}</td>
                    <td>
                      <button
                        onClick={() => handleTransactionClick(transaction)}
                        className="p-2 text-[var(--accent-purple)] hover:bg-[var(--hover-bg)] rounded transition-colors"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && transactions.length === 0 && (
          <div className="text-center py-12">
            <Receipt size={48} className="text-[var(--muted-text)] mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-[var(--secondary-text)] mb-2">
              No Transactions Found
            </h2>
            <p className="text-[var(--muted-text)]">
              Try adjusting your filters to see more results.
            </p>
          </div>
        )}
      </div>

      {/* Transaction Details Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--card-bg)] rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[var(--border-color)]">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-[var(--primary-text)]">Transaction Details</h3>
                <button
                  onClick={() => setSelectedTransaction(null)}
                  className="text-[var(--muted-text)] hover:text-[var(--primary-text)] transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--secondary-text)]">shop</label>
                    <p className="mt-1 text-[var(--primary-text)]">{selectedTransaction.shop?.name || 'Unknown'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--secondary-text)]">Type</label>
                    <p className="mt-1 text-[var(--primary-text)]">{selectedTransaction.type}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--secondary-text)]">Amount</label>
                    <p className="mt-1 text-[var(--primary-text)]">₹{selectedTransaction.amount}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--secondary-text)]">Status</label>
                    <p className="mt-1 text-[var(--primary-text)]">{selectedTransaction.status}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--secondary-text)]">Payment Method</label>
                    <p className="mt-1 text-[var(--primary-text)]">{selectedTransaction.paymentMethod || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--secondary-text)]">Date</label>
                    <p className="mt-1 text-[var(--primary-text)]">{new Date(selectedTransaction.createdAt).toLocaleString()}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--secondary-text)]">Description</label>
                  <p className="mt-1 text-[var(--primary-text)]">{selectedTransaction.description}</p>
                </div>

                {selectedTransaction.type === 'verification' && selectedTransaction.metadata?.verified_by && (
                  <div>
                    <label className="block text-sm font-medium text-[var(--secondary-text)]">Verified By</label>
                    <p className="mt-1 text-[var(--primary-text)]">
                      {selectedTransaction.metadata.verified_by.name || 'Unknown'}
                      {selectedTransaction.metadata.verified_by.role && (
                        <> ({selectedTransaction.metadata.verified_by.role})</>
                      )}
                      {selectedTransaction.metadata.verified_by.shop?.name && (
                        <> • {selectedTransaction.metadata.verified_by.shop.name}</>
                      )}
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-[var(--secondary-text)]">User</label>
                  <p className="mt-1 text-[var(--primary-text)]">{selectedTransaction.user.name} ({selectedTransaction.user.rollNo})</p>
                  <p className="text-sm text-[var(--muted-text)]">{selectedTransaction.user.email}</p>
                </div>

                {selectedTransaction.order && (
                  <div>
                    <label className="block text-sm font-medium text-[var(--secondary-text)]">Order</label>
                    <p className="mt-1 text-[var(--primary-text)]">{selectedTransaction.order.order_id} - ₹{selectedTransaction.order.totalPrice}</p>
                  </div>
                )}

                {selectedTransaction.metadata && Object.keys(selectedTransaction.metadata).length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-[var(--secondary-text)]">Additional Details</label>
                    <pre className="mt-1 text-sm bg-[var(--secondary-bg)] p-3 rounded overflow-x-auto text-[var(--primary-text)]">
                      {JSON.stringify(selectedTransaction.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionsPage;