import React, { useEffect, useState } from 'react';
import axios from 'axios';
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
  totalShops: number;
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

const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
        axios.get('/api/users'),
        axios.get('/api/shops'),
        fetchAllOrders(),
        fetchAllTransactions()
      ]);

      const users = usersRes.data;
      const shops = shopsRes.data;
      const allOrders = ordersRes;
      const allTransactions = transactionsRes;

      // Calculate comprehensive stats
      const totalUsers = users.length;
      const totalShops = shops.length;
      const totalOrders = allOrders.length;
      const paidOrders = allOrders.filter((order: any) => order.isPaid);
      const totalRevenue = paidOrders.reduce((sum: number, order: any) => sum + order.totalPrice, 0);
      const totalTransactions = allTransactions.length;
      const successfulTransactions = allTransactions.filter((t: any) => t.status === 'success').length;
      const failedTransactions = allTransactions.filter((t: any) => t.status === 'failed').length;
      const averageOrderValue = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;

      // Get recent orders (last 10)
      const recentOrders = allOrders
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10);

      // Calculate shop performance
      const shopPerformance = shops.map((shop: any) => {
        const shopOrders = paidOrders.filter((order: any) => order.shop === shop._id);
        const revenue = shopOrders.reduce((sum: number, order: any) => sum + order.totalPrice, 0);
        const orders = shopOrders.length;
        const avgOrderValue = orders > 0 ? revenue / orders : 0;
        
        return {
          shopName: shop.name,
          revenue,
          orders,
          avgOrderValue
        };
      }).sort((a, b) => b.revenue - a.revenue);

      // Generate daily stats for last 7 days
      const dailyStats = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        
        const dayOrders = allOrders.filter((order: any) => {
          const orderDate = new Date(order.createdAt).toISOString().split('T')[0];
          return orderDate === dateString;
        });
        
        const dayTransactions = allTransactions.filter((t: any) => {
          const transactionDate = new Date(t.createdAt).toISOString().split('T')[0];
          return transactionDate === dateString;
        });
        
        const dayRevenue = dayOrders
          .filter((order: any) => order.isPaid)
          .reduce((sum: number, order: any) => sum + order.totalPrice, 0);
        
        return {
          date: dateString,
          orders: dayOrders.length,
          revenue: dayRevenue,
          transactions: dayTransactions.length
        };
      }).reverse();

      // Calculate transaction types
      const transactionTypeGroups = allTransactions.reduce((acc: any, t: any) => {
        if (!acc[t.type]) {
          acc[t.type] = { count: 0, amount: 0 };
        }
        acc[t.type].count++;
        acc[t.type].amount += t.amount;
        return acc;
      }, {});

      const transactionTypes = Object.entries(transactionTypeGroups).map(([type, data]: [string, any]) => ({
        type,
        count: data.count,
        amount: data.amount,
        percentage: totalTransactions > 0 ? Math.round((data.count / totalTransactions) * 100) : 0
      }));

      setStats({
        totalUsers,
        totalShops,
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
      
      setLoading(false);
      if (showRefreshing) {
        setRefreshing(false);
        toast.success('Dashboard data refreshed');
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load dashboard data');
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchAllOrders = async () => {
    try {
      const shops = await axios.get('/api/shops');
      const allOrders: any[] = [];
      
      for (const shop of shops.data) {
        try {
          const { data } = await axios.get(`/api/orders/shop/${shop._id}`);
          allOrders.push(...data.map((order: any) => ({
            ...order,
            shop: shop._id,
            shopName: shop.name
          })));
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
      const shops = await axios.get('/api/shops');
      const allTransactions: any[] = [];
      
      for (const shop of shops.data) {
        try {
          const { data } = await axios.get(`/api/transactions/shop/${shop._id}`);
          if (data.transactions) {
            allTransactions.push(...data.transactions);
          }
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
      <div className="flex items-center justify-center h-full">
        <div className="flex space-x-2 text-4xl font-bold text-purple-600">
          <span className="animate-bounce" style={{ animationDelay: '0ms' }}>R</span>
          <span className="animate-bounce" style={{ animationDelay: '150ms' }}>E</span>
          <span className="animate-bounce" style={{ animationDelay: '300ms' }}>C</span>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-[var(--error)] mb-4">Failed to load dashboard data</p>
          <button onClick={handleRefresh} className="btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Chart configurations
  const dailyRevenueData = {
    labels: stats.dailyStats.map(d => new Date(d.date).toLocaleDateString()),
    datasets: [
      {
        label: 'Revenue (₹)',
        data: stats.dailyStats.map(d => d.revenue),
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Orders',
        data: stats.dailyStats.map(d => d.orders),
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        yAxisID: 'y1'
      }
    ]
  };

  const shopPerformanceData = {
    labels: stats.shopPerformance.slice(0, 5).map(s => s.shopName),
    datasets: [
      {
        label: 'Revenue (₹)',
        data: stats.shopPerformance.slice(0, 5).map(s => s.revenue),
        backgroundColor: 'rgba(139, 92, 246, 0.8)',
        borderColor: '#8B5CF6',
        borderWidth: 1
      }
    ]
  };

  const transactionTypesData = {
    labels: stats.transactionTypes.map(t => t.type.charAt(0).toUpperCase() + t.type.slice(1)),
    datasets: [
      {
        data: stats.transactionTypes.map(t => t.percentage),
        backgroundColor: ['#10B981', '#EF4444', '#8B5CF6', '#F59E0B', '#6B7280'],
        borderWidth: 2,
        borderColor: '#fff'
      }
    ]
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Real-time Admin Dashboard</h1>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn-secondary flex items-center"
        >
          <RefreshCw size={20} className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {/* Real-time Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="p-6 flex items-center">
            <Users size={40} className="mr-4" />
            <div>
              <p className="text-lg font-semibold">Total Users</p>
              <p className="text-3xl font-bold">{stats.totalUsers}</p>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="p-6 flex items-center">
            <Store size={40} className="mr-4" />
            <div>
              <p className="text-lg font-semibold">Active Shops</p>
              <p className="text-3xl font-bold">{stats.totalShops}</p>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <div className="p-6 flex items-center">
            <ShoppingBag size={40} className="mr-4" />
            <div>
              <p className="text-lg font-semibold">Total Orders</p>
              <p className="text-3xl font-bold">{stats.totalOrders}</p>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
          <div className="p-6 flex items-center">
            <DollarSign size={40} className="mr-4" />
            <div>
              <p className="text-lg font-semibold">Total Revenue</p>
              <p className="text-3xl font-bold">₹{stats.totalRevenue.toFixed(0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
          <div className="p-6 flex items-center">
            <Package size={40} className="mr-4" />
            <div>
              <p className="text-lg font-semibold">Transactions</p>
              <p className="text-3xl font-bold">{stats.totalTransactions}</p>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-teal-500 to-teal-600 text-white">
          <div className="p-6 flex items-center">
            <TrendingUp size={40} className="mr-4" />
            <div>
              <p className="text-lg font-semibold">Successful</p>
              <p className="text-3xl font-bold">{stats.successfulTransactions}</p>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-red-500 to-red-600 text-white">
          <div className="p-6 flex items-center">
            <BarChart2 size={40} className="mr-4" />
            <div>
              <p className="text-lg font-semibold">Failed</p>
              <p className="text-3xl font-bold">{stats.failedTransactions}</p>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <div className="p-6 flex items-center">
            <DollarSign size={40} className="mr-4" />
            <div>
              <p className="text-lg font-semibold">Avg Order</p>
              <p className="text-3xl font-bold">₹{stats.averageOrderValue.toFixed(0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4">Daily Revenue & Orders (Real-time)</h2>
          <div className="h-[300px]">
            <Line 
              data={dailyRevenueData} 
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
                      text: 'Orders'
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

        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4">Top Performing Shops (Real-time)</h2>
          <div className="h-[300px]">
            <Bar data={shopPerformanceData} options={{ maintainAspectRatio: false }} />
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4">Transaction Types Distribution</h2>
          <div className="h-[300px]">
            <Doughnut data={transactionTypesData} options={{ maintainAspectRatio: false }} />
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Orders (Live)</h2>
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {stats.recentOrders.map((order, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <p className="font-medium">#{order._id.slice(-8)}</p>
                  <p className="text-sm text-gray-600">{order.user?.name || 'Unknown User'}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(order.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">₹{order.totalPrice}</p>
                  <p className="text-xs text-gray-500">{order.shopName || 'Unknown Shop'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Shop Performance Table */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-4">Shop Performance Overview (Real-time)</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left">Shop Name</th>
                <th className="text-right">Revenue</th>
                <th className="text-right">Orders</th>
                <th className="text-right">Avg Order Value</th>
              </tr>
            </thead>
            <tbody>
              {stats.shopPerformance.slice(0, 10).map((shop, index) => (
                <tr key={index}>
                  <td className="font-medium">{shop.shopName}</td>
                  <td className="text-right font-medium text-green-600">₹{shop.revenue.toFixed(2)}</td>
                  <td className="text-right">{shop.orders}</td>
                  <td className="text-right">₹{shop.avgOrderValue.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;