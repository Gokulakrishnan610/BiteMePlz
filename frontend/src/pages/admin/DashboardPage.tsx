import React, { useEffect, useState } from 'react';
import api from '../../api';
import { BarChart2, Users, Store, TrendingUp, RefreshCw, DollarSign, ShoppingBag, Package } from 'lucide-react';
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

interface AdminDashboardPageProps {
  setMaintenanceMode: React.Dispatch<React.SetStateAction<boolean>>;
}

const DashboardPage: React.FC<AdminDashboardPageProps> = ({ setMaintenanceMode }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [maintenanceMode, setLocalMaintenanceMode] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    
    // Set up real-time updates every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      
      // Fetch all required data in parallel
      const [usersRes, shopsRes, ordersRes, transactionsRes] = await Promise.all([
        api.get('/users'),
        api.get('/shops'),
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
      const totalRevenue = allOrders.reduce((sum: number, order: any) => sum + (order.totalPrice || 0), 0);
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
        const shopOrders = allOrders.filter((order: any) => order.shop?.id === shop.id || order.shop?._id === shop._id);
        const shopRevenue = shopOrders.reduce((sum: number, order: any) => sum + (order.totalPrice || 0), 0);
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
        
        const dayOrders = allOrders.filter((order: any) => 
          order.createdAt?.startsWith(dateStr)
        );
        const dayRevenue = dayOrders.reduce((sum: number, order: any) => sum + (order.totalPrice || 0), 0);
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
      const shops = await api.get('/shops/');
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
          const { data } = await api.get(`/orders/shop/?shop_id=${shopId}`);
          // Handle paginated response for orders too
          const ordersData = data.results || data;
          allOrders.push(...ordersData);
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
      const shops = await api.get('/shops/');
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
          const { data } = await api.get(`/transactions/shop/?shop_id=${shopId}`);
          // Handle paginated response for transactions too
          const transactionsData = data.results || data;
          allTransactions.push(...transactionsData);
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
    <div className="min-h-screen bg-[var(--background)] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold">Real-time Admin Dashboard</h1>
            <p className="text-[var(--secondary-text)] mt-2">
              Monitor system performance and user activity
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-[var(--card)] p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[var(--secondary-text)] text-sm">Total Users</p>
                <p className="text-2xl font-bold text-[var(--primary-text)]">{stats.totalUsers}</p>
              </div>
              <Users className="w-8 h-8 text-[var(--primary)]" />
            </div>
          </div>

          <div className="bg-[var(--card)] p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[var(--secondary-text)] text-sm">Total shops</p>
                <p className="text-2xl font-bold text-[var(--primary-text)]">{stats.totalshops}</p>
              </div>
              <Store className="w-8 h-8 text-[var(--primary)]" />
            </div>
          </div>

          <div className="bg-[var(--card)] p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[var(--secondary-text)] text-sm">Total Orders</p>
                <p className="text-2xl font-bold text-[var(--primary-text)]">{stats.totalOrders}</p>
              </div>
                              <ShoppingBag className="w-8 h-8 text-[var(--primary)]" />
            </div>
          </div>

          <div className="bg-[var(--card)] p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[var(--secondary-text)] text-sm">Total Revenue</p>
                <p className="text-2xl font-bold text-[var(--primary-text)]">₹{stats.totalRevenue.toFixed(2)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-[var(--primary)]" />
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Daily Stats Chart */}
          <div className="bg-[var(--card)] p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Daily Activity</h3>
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
          <div className="bg-[var(--card)] p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Transaction Types</h3>
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
        <div className="bg-[var(--card)] p-6 rounded-lg shadow-sm mb-8">
          <h3 className="text-lg font-semibold mb-4">shop Performance</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left py-2">shop</th>
                  <th className="text-right py-2">Orders</th>
                  <th className="text-right py-2">Revenue</th>
                  <th className="text-right py-2">Avg Order</th>
                </tr>
              </thead>
              <tbody>
                {stats.shopPerformance.map((shop, index) => (
                  <tr key={index} className="border-b border-[var(--border)]">
                    <td className="py-2">{shop.shopName}</td>
                    <td className="text-right py-2">{shop.orders}</td>
                    <td className="text-right py-2">₹{shop.revenue.toFixed(2)}</td>
                    <td className="text-right py-2">₹{shop.avgOrderValue.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-[var(--card)] p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Recent Orders</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left py-2">Order ID</th>
                  <th className="text-left py-2">shop</th>
                  <th className="text-left py-2">Customer</th>
                  <th className="text-right py-2">Amount</th>
                  <th className="text-left py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentOrders.map((order) => (
                  <tr key={order._id} className="border-b border-[var(--border)]">
                    <td className="py-2">{order._id.slice(-8)}</td>
                    <td className="py-2">{order.shop?.name || 'Unknown'}</td>
                    <td className="py-2">{order.user?.name || 'Unknown'}</td>
                    <td className="text-right py-2">₹{order.totalPrice?.toFixed(2) || '0.00'}</td>
                    <td className="py-2">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
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