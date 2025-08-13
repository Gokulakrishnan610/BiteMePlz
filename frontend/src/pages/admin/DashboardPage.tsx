import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { Users, Store, RefreshCw, DollarSign, ShoppingBag, ArrowLeft } from 'lucide-react';
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
import toast from 'react-hot-toast';

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

interface DashboardStats {
  totalUsers: number;
  totalshops: number;
  totalOrders: number;
  totalRevenue: number;
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  averageOrderValue: number;
  recentOrders: Array<{
    _id: string;
    totalPrice: number;
    createdAt: string;
    shop: { name: string };
    user: { name: string };
  }>;
  shopPerformance: Array<{
    shopName: string;
    revenue: number;
    orders: number;
    avgOrderValue: number;
  }>;
  dailyStats: Array<{
    date: string;
    orders: number;
    revenue: number;
    transactions: number;
  }>;
  transactionTypes: Array<{
    type: string;
    count: number;
    amount: number;
    percentage: number;
  }>;
}

interface DashboardPageProps {
  setMaintenanceMode?: (mode: boolean) => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ setMaintenanceMode }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    
    // Set up real-time updates (every 10 seconds)
    const interval = setInterval(fetchDashboardData, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      
      // Fetch all required data in parallel
      const [usersRes, shopsRes, ordersRes, transactionsRes] = await Promise.all([
        api.get('/api/users'),
        api.get('/api/shops'),
        fetchAllOrders(),
        fetchAllTransactions()
      ]);

      // Handle paginated responses
      const users = usersRes.data.results || usersRes.data;
      const shops = shopsRes.data.results || shopsRes.data;
      const allOrders = ordersRes;
      const allTransactions = transactionsRes;

      // Calculate dashboard statistics
      const totalUsers = users.length;
      const totalshops = shops.length;
      const totalOrders = allOrders.length;
      const totalRevenue = allOrders
        .filter((order: any) => Boolean(order.is_paid))
        .reduce((sum: number, order: any) => sum + (order.totalPrice || 0), 0);
      const totalTransactions = allTransactions.length;
      const successfulTransactions = allTransactions.filter((t: any) => t.status === 'successful').length;
      const failedTransactions = allTransactions.filter((t: any) => t.status === 'failed').length;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Get recent orders (last 10)
      const recentOrders = allOrders
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10);

      // Calculate shop performance
      const shopPerformance = shops.map((shop: any) => {
        const shopOrders = allOrders.filter((order: any) => {
          const oid = order.shop?.id || order.shop?._id || order.shop_id;
          return oid === shop.id || oid === shop._id;
        });
        const shopRevenue = shopOrders
          .filter((o: any) => Boolean(o.is_paid))
          .reduce((sum: number, order: any) => sum + (Number(order.totalPrice ?? 0)), 0);
        const shopOrderCount = shopOrders.length;
        const avgOrderValue = shopOrderCount > 0 ? shopRevenue / shopOrderCount : 0;

        return {
          shopName: shop.name,
          revenue: shopRevenue,
          orders: shopOrderCount,
          avgOrderValue
        };
      });

      // Calculate daily stats for the last 30 days
      const dailyStats = [];
      const today = new Date();
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayOrders = allOrders.filter((order: any) => order.createdAt?.startsWith(dateStr));
        const dayRevenue = dayOrders
          .filter((o: any) => Boolean(o.is_paid))
          .reduce((sum: number, order: any) => sum + (order.totalPrice || 0), 0);
        const dayTransactions = allTransactions.filter((t: any) => 
          t.createdAt?.startsWith(dateStr)
        );

        dailyStats.push({
          date: dateStr,
          orders: dayOrders.length,
          revenue: dayRevenue,
          transactions: dayTransactions.length
        });
      }

      // Calculate transaction types
      const transactionTypes: Array<{
        type: string;
        count: number;
        amount: number;
        percentage: number;
      }> = [];
      const typeMap = new Map<string, { count: number; amount: number }>();
      
      allTransactions.forEach((transaction: any) => {
        const type = transaction.type || 'unknown';
        if (!typeMap.has(type)) {
          typeMap.set(type, { count: 0, amount: 0 });
        }
        const typeData = typeMap.get(type)!;
        typeData.count++;
        typeData.amount += transaction.amount || 0;
      });

      typeMap.forEach((value, key) => {
        transactionTypes.push({
          type: key,
          count: value.count,
          amount: value.amount,
          percentage: (value.count / totalTransactions) * 100
        });
      });

      setStats({
        totalUsers,
        totalshops,
        totalOrders,
        totalRevenue,
        totalTransactions,
        successfulTransactions,
        failedTransactions,
        averageOrderValue,
        recentOrders,
        shopPerformance,
        dailyStats,
        transactionTypes
      });

      if (showRefreshing) {
        toast.success('Dashboard data refreshed');
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchAllOrders = async () => {
    try {
      const shops = await api.get('/api/shops/');
      const allOrders = [];
      
      // Handle paginated response
      const shopsData = shops.data.results || shops.data;
      
      for (const shop of shopsData) {
        try {
          const shopId = shop.id || shop._id;
          if (!shopId) {
            console.warn(`Shop ${shop.name} has no valid ID, skipping`);
            continue;
          }
          const { data } = await api.get(`/api/orders/shop/?shop_id=${shopId}`);
          // Handle paginated response for orders too
          const ordersData = data.results || data;
          const normalized = (Array.isArray(ordersData) ? ordersData : []).map((o: any) => ({
            ...o,
            createdAt: o.createdAt ?? o.created_at,
            totalPrice: Number(o.totalPrice ?? o.total_price ?? 0),
            shop_id: o.shop_id ?? o.shop?.id ?? o.shop?._id ?? shopId,
            shop: o.shop ?? { id: shopId, name: shop.name },
          }));
          allOrders.push(...normalized);
        } catch (error) {
          console.error(`Failed to fetch orders for shop ${shop.name}:`, error);
        }
      }
      
      return allOrders;
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      return [];
    }
  };

  const fetchAllTransactions = async () => {
    try {
      const shops = await api.get('/api/shops/');
      const allTransactions = [];
      
      // Handle paginated response
      const shopsData = shops.data.results || shops.data;
      
      for (const shop of shopsData) {
        try {
          const shopId = shop.id || shop._id;
          if (!shopId) {
            console.warn(`Shop ${shop.name} has no valid ID, skipping`);
            continue;
          }
          const { data } = await api.get(`/api/transactions/shop/?shop_id=${shopId}`);
          // Handle paginated response for transactions too
          const transactionsData = data.results || data;
          const normalized = (Array.isArray(transactionsData) ? transactionsData : []).map((t: any) => ({
            ...t,
            createdAt: t.createdAt ?? t.created_at,
            amount: Number(t.amount ?? 0),
            type: t.type ?? t.transaction_type ?? 'unknown',
          }));
          allTransactions.push(...normalized);
        } catch (error) {
          console.error(`Failed to fetch transactions for shop ${shop.name}:`, error);
        }
      }
      
      return allTransactions;
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      return [];
    }
  };

  const handleRefresh = () => {
    fetchDashboardData(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)]"></div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-[var(--background)] p-6">
        <p className="text-[var(--error)] mb-4">Failed to load dashboard data</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] p-3 sm:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-4 sm:space-y-0 mb-6 sm:mb-8">
          <div className="flex-1 min-w-0">
            <div className="flex items-center mb-3 sm:mb-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200 mr-2"
                title="Go back"
              >
                <ArrowLeft size={20} className="text-gray-700 dark:text-gray-300" />
              </button>
              <h1 className="text-xl sm:text-2xl font-bold truncate">Real-time Admin Dashboard</h1>
            </div>
            <p className="text-[var(--secondary-text)] mt-2 text-sm sm:text-base">
              Monitor system performance and user activity
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            <span className="sm:hidden">{refreshing ? '...' : 'Refresh'}</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <div className="bg-[var(--card)] p-3 sm:p-4 lg:p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-[var(--secondary-text)] text-xs sm:text-sm truncate">Total Users</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-[var(--primary-text)] truncate">{stats.totalUsers}</p>
              </div>
              <Users className="w-6 h-6 sm:w-8 sm:h-8 text-[var(--primary)] flex-shrink-0" />
            </div>
          </div>

          <div className="bg-[var(--card)] p-3 sm:p-4 lg:p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-[var(--secondary-text)] text-xs sm:text-sm truncate">Total Shops</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-[var(--primary-text)] truncate">{stats.totalshops}</p>
              </div>
              <Store className="w-6 h-6 sm:w-8 sm:h-8 text-[var(--primary)] flex-shrink-0" />
            </div>
          </div>

          <div className="bg-[var(--card)] p-3 sm:p-4 lg:p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-[var(--secondary-text)] text-xs sm:text-sm truncate">Total Orders</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-[var(--primary-text)] truncate">{stats.totalOrders}</p>
              </div>
              <ShoppingBag className="w-6 h-6 sm:w-8 sm:h-8 text-[var(--primary)] flex-shrink-0" />
            </div>
          </div>

          <div className="bg-[var(--card)] p-3 sm:p-4 lg:p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-[var(--secondary-text)] text-xs sm:text-sm truncate">Total Revenue</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-[var(--primary-text)] truncate">₹{stats.totalRevenue.toFixed(2)}</p>
              </div>
              <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-[var(--primary)] flex-shrink-0" />
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Daily Stats Chart */}
          <div className="bg-[var(--card)] p-3 sm:p-4 lg:p-6 rounded-lg shadow-sm">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Daily Activity</h3>
            <Line
              data={{
                labels: stats.dailyStats.map(stat => stat.date),
                datasets: [
                  {
                    label: 'Orders',
                    data: stats.dailyStats.map(stat => stat.orders),
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.1
                  },
                  {
                    label: 'Revenue',
                    data: stats.dailyStats.map(stat => stat.revenue),
                    borderColor: 'rgb(34, 197, 94)',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    tension: 0.1
                  }
                ]
              }}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'top' as const,
                  },
                  title: {
                    display: false,
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                  },
                },
              }}
            />
          </div>

          {/* Transaction Types Chart */}
          <div className="bg-[var(--card)] p-3 sm:p-4 lg:p-6 rounded-lg shadow-sm">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Transaction Types</h3>
            <Doughnut
              data={{
                labels: stats.transactionTypes.map(t => t.type),
                datasets: [
                  {
                    data: stats.transactionTypes.map(t => t.count),
                    backgroundColor: [
                      '#3B82F6',
                      '#10B981',
                      '#F59E0B',
                      '#EF4444',
                      '#8B5CF6',
                      '#06B6D4'
                    ],
                  },
                ],
              }}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'bottom' as const,
                  },
                },
              }}
            />
          </div>
        </div>

        {/* shop Performance */}
        <div className="bg-[var(--card)] p-3 sm:p-4 lg:p-6 rounded-lg shadow-sm mb-6 sm:mb-8">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Shop Performance</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left py-2 px-2 text-sm">Shop</th>
                  <th className="text-right py-2 px-2 text-sm">Orders</th>
                  <th className="text-right py-2 px-2 text-sm">Revenue</th>
                  <th className="text-right py-2 px-2 text-sm">Avg Order</th>
                </tr>
              </thead>
              <tbody>
                {stats.shopPerformance.map((shop, index) => (
                  <tr key={index} className="border-b border-[var(--border)]">
                    <td className="py-2 px-2 text-sm truncate max-w-24">{shop.shopName}</td>
                    <td className="text-right py-2 px-2 text-sm">{shop.orders}</td>
                    <td className="text-right py-2 px-2 text-sm">₹{shop.revenue.toFixed(2)}</td>
                    <td className="text-right py-2 px-2 text-sm">₹{shop.avgOrderValue.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-[var(--card)] p-3 sm:p-4 lg:p-6 rounded-lg shadow-sm">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Recent Orders</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left py-2 px-2 text-sm">Order ID</th>
                  <th className="text-left py-2 px-2 text-sm">Shop</th>
                  <th className="text-left py-2 px-2 text-sm">Customer</th>
                  <th className="text-right py-2 px-2 text-sm">Amount</th>
                  <th className="text-left py-2 px-2 text-sm">Date</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentOrders.map((order) => (
                  <tr key={order._id} className="border-b border-[var(--border)]">
                    <td className="py-2 px-2 text-sm font-mono">{order._id.slice(-8)}</td>
                    <td className="py-2 px-2 text-sm truncate max-w-20">{order.shop?.name || 'Unknown'}</td>
                    <td className="py-2 px-2 text-sm truncate max-w-24">{order.user?.name || 'Unknown'}</td>
                    <td className="text-right py-2 px-2 text-sm">₹{order.totalPrice?.toFixed(2) || '0.00'}</td>
                    <td className="py-2 px-2 text-sm">{new Date(order.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;