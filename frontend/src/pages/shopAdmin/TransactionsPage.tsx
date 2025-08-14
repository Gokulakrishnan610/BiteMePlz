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
  Users,
  X,
  BarChart3
} from 'lucide-react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
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
import { useAuth } from '../../context/AuthContext';
import { useAdminShop } from '../../context/AdminShopContext';
import { toast } from 'sonner';

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

interface RealTimeAnalytics {
  hourlyDistribution: Array<{
    hour: number;
    count: number;
    amount: number;
  }>;
  dailyTrends: Array<{
    date: string;
    transactions: number;
    revenue: number;
  }>;
  typeBreakdown: Array<{
    type: string;
    count: number;
    amount: number;
    percentage: number;
  }>;
  paymentMethodStats: Array<{
    method: string;
    count: number;
    amount: number;
    percentage: number;
  }>;
  topCustomers: Array<{
    name: string;
    rollNo: string;
    totalSpent: number;
    transactionCount: number;
  }>;
}

// Normalize API responses (snake_case -> camelCase) and handle array/object payloads
const normalizeTransaction = (t: any): Transaction => ({
  _id: t._id || t.id,
  type: t.type,
  amount: typeof t.amount === 'number' ? t.amount : Number(t.amount || 0),
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
        totalPrice:
          typeof t.order.totalPrice === 'number'
            ? t.order.totalPrice
            : Number(t.order.total_price ?? t.order.totalPrice ?? 0),
      }
    : (undefined as any),
  metadata: t.metadata,
});

const extractTransactions = (data: any): Transaction[] => {
  const list = Array.isArray(data) ? data : data?.results || data?.transactions || [];
  return (list as any[]).map(normalizeTransaction);
};

const TransactionsPage: React.FC = () => {
  const { user } = useAuth();
  const { selectedShop } = useAdminShop();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [analytics, setAnalytics] = useState<RealTimeAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [activeTab, setActiveTab] = useState<'transactions' | 'analytics'>('transactions');
  const [filters, setFilters] = useState({
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
    failedTransactions: 0,
    averageTransactionValue: 0,
    growthRate: 0
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0
  });

  // Determine the effective shop ID
  const effectiveShopId = user?.role === 'admin' && selectedShop ? selectedShop.id : user?.shop;

  useEffect(() => {
    if (effectiveShopId) {
      fetchTransactions();
      if (activeTab === 'analytics') {
        generateRealTimeAnalytics();
      }
    }
  }, [effectiveShopId, filters, activeTab]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString());
      });

      const { data }: { data: any } = await api.get(`/api/transactions/shop/?shop_id=${effectiveShopId}&${params}`);
      const normalized = extractTransactions(data);
      setTransactions(normalized);
      setPagination({
        currentPage: (Array.isArray(data) ? 1 : data.currentPage) || 1,
        totalPages: (Array.isArray(data) ? 1 : data.totalPages) || 1,
        total: (Array.isArray(data) ? normalized.length : data.total) || normalized.length || 0,
      });
      
      // Calculate real stats from normalized data
      const totalTransactions = normalized.length;
      // Amount should include only successful payments
      const totalAmount = normalized
        .filter((t: Transaction) => t.type === 'payment' && t.status === 'success')
        .reduce((sum: number, t: Transaction) => sum + t.amount, 0) || 0;
      const successfulTransactions = normalized.filter((t: Transaction) => t.status === 'success').length || 0;
      const failedTransactions = normalized.filter((t: Transaction) => t.status === 'failed').length || 0;
      const averageTransactionValue = totalTransactions > 0 ? totalAmount / totalTransactions : 0;
      
      // Calculate growth rate by comparing with previous period
      const currentPeriodStart = filters.startDate ? new Date(filters.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const previousPeriodStart = new Date(currentPeriodStart.getTime() - (Date.now() - currentPeriodStart.getTime()));
      
      try {
        const previousParams = new URLSearchParams();
        previousParams.append('startDate', previousPeriodStart.toISOString().split('T')[0]);
        previousParams.append('endDate', currentPeriodStart.toISOString().split('T')[0]);
        
        const { data: previousData }: { data: any } = await api.get(`/api/transactions/shop/?shop_id=${effectiveShopId}&${previousParams}`);
        const previousList = extractTransactions(previousData);
      // For growth calc, also use successful payments only
      const previousAmount = previousList
        .filter((t: Transaction) => t.type === 'payment' && t.status === 'success')
        .reduce((sum: number, t: Transaction) => sum + t.amount, 0) || 0;
        const growthRate = previousAmount > 0 ? ((totalAmount - previousAmount) / previousAmount) * 100 : 0;
        
        setStats({
          totalTransactions,
          totalAmount,
          successfulTransactions,
          failedTransactions,
          averageTransactionValue,
          growthRate,
        });
      } catch (error) {
        // If previous period data fetch fails, set growth rate to 0
        setStats({
          totalTransactions,
          totalAmount,
          successfulTransactions,
          failedTransactions,
          averageTransactionValue,
          growthRate: 0,
        });
      }
      
      setLoading(false);
    } catch (error) {
      toast.error('Failed to fetch transactions');
      setLoading(false);
    }
  };

  const generateRealTimeAnalytics = async () => {
    try {
      // Fetch all transactions for analytics (without pagination)
      const analyticsParams = new URLSearchParams();
      analyticsParams.append('limit', '1000'); // Get more data for analytics
      if (filters.startDate) analyticsParams.append('startDate', filters.startDate);
      if (filters.endDate) analyticsParams.append('endDate', filters.endDate);

      const { data }: { data: any } = await api.get(`/api/transactions/shop/?shop_id=${effectiveShopId}&${analyticsParams}`);
      const allTransactions = extractTransactions(data);

      // Generate hourly distribution from real data
      const hourlyDistribution = Array.from({ length: 24 }, (_, hour) => {
        const hourTransactions = allTransactions.filter((t: Transaction) => {
          const transactionHour = new Date(t.createdAt).getHours();
          return transactionHour === hour;
        });
        
        return {
          hour,
          count: hourTransactions.length,
          amount: hourTransactions.reduce((sum: number, t: Transaction) => sum + t.amount, 0),
        };
      });

      // Generate daily trends from real data (last 7 days)
      const dailyTrends = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        
        const dayTransactions = allTransactions.filter((t: Transaction) => {
          const transactionDate = new Date(t.createdAt).toISOString().split('T')[0];
          return transactionDate === dateString;
        });
        
        return {
          date: dateString,
          transactions: dayTransactions.length,
          revenue: dayTransactions.reduce((sum: number, t: Transaction) => sum + t.amount, 0),
        };
      }).reverse();

      // Generate type breakdown from real data
      const typeGroups = allTransactions.reduce((acc: any, t: Transaction) => {
        if (!acc[t.type]) {
          acc[t.type] = { count: 0, amount: 0 };
        }
        acc[t.type].count++;
        acc[t.type].amount += t.amount;
        return acc;
      }, {});

      const totalTransactions = allTransactions.length;
      const typeBreakdown = Object.entries(typeGroups).map(([type, data]: [string, any]) => ({
        type,
        count: data.count,
        amount: data.amount,
        percentage: totalTransactions > 0 ? Math.round((data.count / totalTransactions) * 100) : 0,
      }));

      // Generate payment method stats from real data
      const paymentMethodGroups = allTransactions.reduce((acc: any, t: Transaction) => {
        const method = t.paymentMethod || 'unknown';
        if (!acc[method]) {
          acc[method] = { count: 0, amount: 0 };
        }
        acc[method].count++;
        acc[method].amount += t.amount;
        return acc;
      }, {});

      const paymentMethodStats = Object.entries(paymentMethodGroups).map(([method, data]: [string, any]) => ({
        method,
        count: data.count,
        amount: data.amount,
        percentage: totalTransactions > 0 ? Math.round((data.count / totalTransactions) * 100) : 0,
      }));

      // Generate top customers from real data
      const customerGroups = allTransactions.reduce((acc: any, t: Transaction) => {
        const key = `${t.user.name}-${t.user.rollNo}`;
        if (!acc[key]) {
          acc[key] = {
            name: t.user.name,
            rollNo: t.user.rollNo,
            totalSpent: 0,
            transactionCount: 0,
          };
        }
        acc[key].totalSpent += t.amount;
        acc[key].transactionCount++;
        return acc;
      }, {});

      const topCustomers = Object.values(customerGroups)
        .sort((a: any, b: any) => b.totalSpent - a.totalSpent)
        .slice(0, 10);

      const realTimeAnalytics: RealTimeAnalytics = {
        hourlyDistribution,
        dailyTrends,
        typeBreakdown,
        paymentMethodStats,
        topCustomers: topCustomers as any,
      };

      setAnalytics(realTimeAnalytics);
    } catch (error) {
      console.error('Failed to generate real-time analytics:', error);
      toast.error('Failed to generate analytics data');
    }
  };

  const handleTransactionClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
  };

  const exportTransactions = async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && key !== 'page') params.append(key, value.toString());
      });
      params.append('limit', '1000'); // Export more records

      const { data }: { data: any } = await api.get(`/api/transactions/shop/?shop_id=${effectiveShopId}&${params}`);
      const list = extractTransactions(data);
      
      const csvData = [] as any[];
      
      // Header with shop info and date range
      csvData.push(['REAL-TIME TRANSACTION REPORT']);
      csvData.push(['shop ID', effectiveShopId || '']);
      csvData.push(['Generated On', new Date().toLocaleString()]);
      csvData.push(['Date Range', `${filters.startDate || 'All'} to ${filters.endDate || 'All'}`]);
      csvData.push(['']);

      // Real-time summary statistics
      csvData.push(['REAL-TIME SUMMARY STATISTICS']);
      csvData.push(['Total Transactions', stats.totalTransactions]);
      csvData.push(['Total Amount', `₹${stats.totalAmount.toFixed(2)}`]);
      csvData.push(['Successful Transactions', stats.successfulTransactions]);
      csvData.push(['Failed Transactions', stats.failedTransactions]);
      csvData.push(['Average Transaction Value', `₹${stats.averageTransactionValue.toFixed(2)}`]);
      csvData.push(['Growth Rate', `${stats.growthRate.toFixed(1)}%`]);
      csvData.push(['']);

      // Transaction details
      csvData.push(['TRANSACTION DETAILS']);
      csvData.push(['Date', 'Type', 'Amount', 'Status', 'Payment Method', 'User Name', 'Roll No', 'Order ID', 'Description']);
      
      list.forEach((t: Transaction) => {
        csvData.push([
          new Date(t.createdAt).toLocaleString(),
          t.type,
          t.amount,
          t.status,
          t.paymentMethod || '',
          t.user.name,
          t.user.rollNo,
          t.order?.order_id || '',
          `"${t.description}"`,
        ]);
      });

      // Real-time analytics data
      if (analytics) {
        csvData.push(['']);
        csvData.push(['REAL-TIME ANALYTICS DATA']);
        
        // Type breakdown
        csvData.push(['']);
        csvData.push(['TRANSACTION TYPE BREAKDOWN']);
        csvData.push(['Type', 'Count', 'Amount', 'Percentage']);
        analytics.typeBreakdown.forEach(type => {
          csvData.push([type.type, type.count, `₹${type.amount.toFixed(2)}`, `${type.percentage}%`]);
        });

        // Payment method stats
        csvData.push(['']);
        csvData.push(['PAYMENT METHOD STATISTICS']);
        csvData.push(['Method', 'Count', 'Amount', 'Percentage']);
        analytics.paymentMethodStats.forEach(method => {
          csvData.push([method.method, method.count, `₹${method.amount.toFixed(2)}`, `${method.percentage}%`]);
        });

        // Top customers
        csvData.push(['']);
        csvData.push(['TOP CUSTOMERS (REAL-TIME)']);
        csvData.push(['Name', 'Roll No', 'Total Spent', 'Transaction Count']);
        analytics.topCustomers.forEach(customer => {
          csvData.push([customer.name, customer.rollNo, `₹${customer.totalSpent.toFixed(2)}`, customer.transactionCount]);
        });

        // Hourly distribution
        csvData.push(['']);
        csvData.push(['HOURLY DISTRIBUTION (REAL-TIME)']);
        csvData.push(['Hour', 'Transaction Count', 'Amount']);
        analytics.hourlyDistribution.forEach(hour => {
          csvData.push([`${hour.hour}:00`, hour.count, `₹${hour.amount.toFixed(2)}`]);
        });

        // Daily trends
        csvData.push(['']);
        csvData.push(['DAILY TRENDS (REAL-TIME)']);
        csvData.push(['Date', 'Transaction Count', 'Revenue']);
        analytics.dailyTrends.forEach(day => {
          csvData.push([day.date, day.transactions, `₹${day.revenue.toFixed(2)}`]);
        });
      }

      const csvContent = csvData.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shop-transactions-realtime-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Real-time transaction report exported successfully');
    } catch (err) {
      toast.error('Failed to export transactions');
    }
  };

  const resetFilters = () => {
    setFilters({
      type: '',
      status: '',
      startDate: '',
      endDate: '',
      search: '',
      page: 1,
      limit: 50
    });
  };

  const handlePageChange = (page: number) => {
    setFilters({ ...filters, page });
  };

  // Chart configurations using real data
  const hourlyChartData = {
    labels: analytics?.hourlyDistribution.map(h => `${h.hour}:00`) || [],
    datasets: [
      {
        label: 'Transaction Count',
        data: analytics?.hourlyDistribution.map(h => h.count) || [],
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: '#3B82F6',
        borderWidth: 1
      }
    ]
  };

  const dailyTrendsData = {
    labels: analytics?.dailyTrends.map(d => new Date(d.date).toLocaleDateString()) || [],
    datasets: [
      {
        label: 'Revenue (₹)',
        data: analytics?.dailyTrends.map(d => d.revenue) || [],
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
        yAxisID: 'y'
      },
      {
        label: 'Transaction Count',
        data: analytics?.dailyTrends.map(d => d.transactions) || [],
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        yAxisID: 'y1'
      }
    ]
  };

  const typeBreakdownData = {
    labels: analytics?.typeBreakdown.map(t => t.type.charAt(0).toUpperCase() + t.type.slice(1)) || [],
    datasets: [
      {
        data: analytics?.typeBreakdown.map(t => t.percentage) || [],
        backgroundColor: ['#10B981', '#EF4444', '#8B5CF6', '#F59E0B', '#6B7280'],
        borderWidth: 2,
        borderColor: '#fff'
      }
    ]
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Real-time Transaction Management</h1>
        <div className="flex gap-2">
          <button
            onClick={() => {
              fetchTransactions();
              if (activeTab === 'analytics') {
                generateRealTimeAnalytics();
              }
            }}
            className="btn-secondary flex items-center"
          >
            <RefreshCw size={20} className="mr-2" />
            Refresh Data
          </button>
          <button
            onClick={exportTransactions}
            className="btn-primary flex items-center"
          >
            <Download size={20} className="mr-2" />
            Export Real-time Report
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-[var(--border-color)]">
        <nav className="flex space-x-8">
          {[
            { id: 'transactions', label: 'Live Transactions', icon: Receipt },
            { id: 'analytics', label: 'Real-time Analytics', icon: BarChart3 }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === id
                  ? 'border-[var(--accent-purple)] text-[var(--accent-purple)]'
                  : 'border-transparent text-[var(--secondary-text)] hover:text-[var(--accent-purple)]'
              }`}
            >
              <Icon size={20} className="mr-2" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Real-time Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="p-4 flex items-center">
            <Receipt size={32} className="mr-3" />
            <div>
              <p className="text-sm font-semibold">Total</p>
              <p className="text-2xl font-bold">{stats.totalTransactions}</p>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="p-4 flex items-center">
            <DollarSign size={32} className="mr-3" />
            <div>
              <p className="text-sm font-semibold">Amount</p>
              <p className="text-2xl font-bold">₹{stats.totalAmount.toFixed(0)}</p>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
          <div className="p-4 flex items-center">
            <TrendingUp size={32} className="mr-3" />
            <div>
              <p className="text-sm font-semibold">Success</p>
              <p className="text-2xl font-bold">{stats.successfulTransactions}</p>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-red-500 to-red-600 text-white">
          <div className="p-4 flex items-center">
            <TrendingDown size={32} className="mr-3" />
            <div>
              <p className="text-sm font-semibold">Failed</p>
              <p className="text-2xl font-bold">{stats.failedTransactions}</p>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <div className="p-4 flex items-center">
            <Users size={32} className="mr-3" />
            <div>
              <p className="text-sm font-semibold">Avg Value</p>
              <p className="text-2xl font-bold">₹{stats.averageTransactionValue.toFixed(0)}</p>
            </div>
          </div>
        </div>

        <div className={`card bg-gradient-to-br ${stats.growthRate >= 0 ? 'from-green-500 to-green-600' : 'from-red-500 to-red-600'} text-white`}>
          <div className="p-4 flex items-center">
            {stats.growthRate >= 0 ? <TrendingUp size={32} className="mr-3" /> : <TrendingDown size={32} className="mr-3" />}
            <div>
              <p className="text-sm font-semibold">Growth</p>
              <p className="text-2xl font-bold">{stats.growthRate >= 0 ? '+' : ''}{stats.growthRate.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </div>

      {activeTab === 'transactions' && (
        <>
          {/* Filters */}
          <div className="card p-4">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-[var(--secondary-text)] mb-1">
                  Type
                </label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value, page: 1 })}
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
                <label className="block text-sm font-medium text-[var(--secondary-text)] mb-1">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
                  className="input"
                >
                  <option value="">All Status</option>
                  <option value="success">Success</option>
                  <option value="failed">Failed</option>
                  <option value="pending">Pending</option>
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

              <div>
                <label className="block text-sm font-medium text-[var(--secondary-text)] mb-1">
                  Search User
                </label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
                  placeholder="Search by name or roll no..."
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
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th>Date</th>
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
                              <p className="font-medium">{transaction.user?.name || 'Unknown User'}</p>
                              <p className="text-sm text-[var(--muted-text)]">{transaction.user?.rollNo || 'N/A'}</p>
                            </div>
                          </td>
                          <td>{transaction.order?.order_id || '-'}</td>
                          <td>
                            <button
                              onClick={() => handleTransactionClick(transaction)}
                              className="p-2 text-[var(--accent-purple)] hover:bg-[var(--hover-bg)] hover:text-[var(--accent-violet)] rounded transition-all duration-200"
                            >
                              <Eye size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex justify-between items-center p-4 border-t border-[var(--border-color)]">
                    <div className="text-sm text-[var(--secondary-text)]">
                      Showing {((pagination.currentPage - 1) * filters.limit) + 1} to {Math.min(pagination.currentPage * filters.limit, pagination.total)} of {pagination.total} transactions
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePageChange(pagination.currentPage - 1)}
                        disabled={pagination.currentPage === 1}
                        className="btn-secondary px-3 py-1 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <span className="px-3 py-1 bg-[var(--card-bg)] rounded border border-[var(--border-color)]">
                        {pagination.currentPage} of {pagination.totalPages}
                      </span>
                      <button
                        onClick={() => handlePageChange(pagination.currentPage + 1)}
                        disabled={pagination.currentPage === pagination.totalPages}
                        className="btn-secondary px-3 py-1 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
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
        </>
      )}

      {activeTab === 'analytics' && analytics && (
        <div className="space-y-6">
          {/* Real-time Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-6">
              <h3 className="text-xl font-semibold mb-4">Real-time Hourly Distribution</h3>
              <div className="h-[300px]">
                <Bar data={hourlyChartData} options={{ maintainAspectRatio: false }} />
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-xl font-semibold mb-4">Live Transaction Type Breakdown</h3>
              <div className="h-[300px]">
                <Doughnut data={typeBreakdownData} options={{ maintainAspectRatio: false }} />
              </div>
            </div>

            <div className="card p-6 lg:col-span-2">
              <h3 className="text-xl font-semibold mb-4">Real-time Daily Trends (Last 7 Days)</h3>
              <div className="h-[400px]">
                <Line 
                  data={dailyTrendsData} 
                  options={{ 
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                          display: true,
                          text: 'Revenue (₹)'
                        }
                      },
                      y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                          display: true,
                          text: 'Transaction Count'
                        },
                        grid: {
                          drawOnChartArea: false,
                        },
                      },
                    }
                  }} 
                />
              </div>
            </div>
          </div>

          {/* Real-time Analytics Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-6">
              <h3 className="text-lg font-semibold mb-4">Top Customers (Real-time)</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left">Customer</th>
                      <th className="text-right">Spent</th>
                      <th className="text-right">Orders</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.topCustomers.slice(0, 10).map((customer, index) => (
                      <tr key={index}>
                        <td>
                          <div>
                            <p className="font-medium">{customer.name}</p>
                            <p className="text-sm text-[var(--muted-text)]">{customer.rollNo}</p>
                          </div>
                        </td>
                        <td className="text-right font-medium text-green-600">
                          ₹{customer.totalSpent.toFixed(2)}
                        </td>
                        <td className="text-right">{customer.transactionCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold mb-4">Payment Method Statistics (Live)</h3>
              <div className="space-y-4">
                {analytics.paymentMethodStats.map((method, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-[var(--hover-bg)] rounded">
                    <div>
                      <p className="font-medium capitalize">{method.method}</p>
                      <p className="text-sm text-[var(--secondary-text)]">{method.count} transactions</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">₹{method.amount.toFixed(2)}</p>
                      <p className="text-sm text-[var(--secondary-text)]">{method.percentage}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Real-time Peak Hours Analysis */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4">Real-time Peak Hours Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded">
                <h4 className="font-medium text-blue-800">Busiest Hour (Live)</h4>
                <p className="text-2xl font-bold text-blue-600">
                  {analytics.hourlyDistribution.reduce((max, hour) => 
                    hour.count > max.count ? hour : max
                  ).hour}:00
                </p>
                <p className="text-sm text-blue-600">
                  {analytics.hourlyDistribution.reduce((max, hour) => 
                    hour.count > max.count ? hour : max
                  ).count} transactions
                </p>
              </div>
              
              <div className="p-4 bg-green-50 rounded">
                <h4 className="font-medium text-green-800">Highest Revenue Hour (Live)</h4>
                <p className="text-2xl font-bold text-green-600">
                  {analytics.hourlyDistribution.reduce((max, hour) => 
                    hour.amount > max.amount ? hour : max
                  ).hour}:00
                </p>
                <p className="text-sm text-green-600">
                  ₹{analytics.hourlyDistribution.reduce((max, hour) => 
                    hour.amount > max.amount ? hour : max
                  ).amount.toFixed(0)}
                </p>
              </div>
              
              <div className="p-4 bg-purple-50 rounded">
                <h4 className="font-medium text-purple-800">Average per Hour (Live)</h4>
                <p className="text-2xl font-bold text-purple-600">
                  {(analytics.hourlyDistribution.reduce((sum, hour) => sum + hour.count, 0) / 24).toFixed(1)}
                </p>
                <p className="text-sm text-purple-600">transactions/hour</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Details Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--card-bg)] rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[var(--border-color)]">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-[var(--primary-text)]">Transaction Details</h3>
                <button
                  onClick={() => setSelectedTransaction(null)}
                  className="text-[var(--muted-text)] hover:text-[var(--accent-purple)] transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
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

                {selectedTransaction.type === 'verification' && (selectedTransaction as any).metadata?.verified_by && (
                  <div>
                    <label className="block text-sm font-medium text-[var(--secondary-text)]">Verified By</label>
                    <p className="mt-1 text-[var(--primary-text)]">
                      {(selectedTransaction as any).metadata.verified_by.name || 'Unknown'}
                      {(selectedTransaction as any).metadata.verified_by.role && (
                        <> ({(selectedTransaction as any).metadata.verified_by.role})</>
                      )}
                      {(selectedTransaction as any).metadata.verified_by.shop?.name && (
                        <> • {(selectedTransaction as any).metadata.verified_by.shop.name}</>
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
                    <pre className="mt-1 text-sm bg-[var(--hover-bg)] p-3 rounded overflow-x-auto text-[var(--primary-text)]">
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