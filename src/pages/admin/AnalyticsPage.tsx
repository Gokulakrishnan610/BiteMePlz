import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  Store,
  Calendar,
  RefreshCw
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

interface Shop {
  _id: string;
  name: string;
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

const AnalyticsPage: React.FC = () => {
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShop, setSelectedShop] = useState<string>('');
  const [period, setPeriod] = useState<string>('30d');
  const [transactionStats, setTransactionStats] = useState<TransactionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [overallStats, setOverallStats] = useState({
    totalRevenue: 0,
    totalTransactions: 0,
    averageOrderValue: 0,
    successRate: 0
  });

  useEffect(() => {
    fetchShops();
  }, []);

  useEffect(() => {
    if (shops.length > 0) {
      fetchAnalytics();
    }
  }, [selectedShop, period, shops]);

  const fetchShops = async () => {
    try {
      const { data } = await axios.get('/api/shops');
      setShops(data);
    } catch (error) {
      toast.error('Failed to fetch shops');
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      if (selectedShop) {
        // Fetch analytics for specific shop
        const { data } = await axios.get(`/api/transactions/shop/${selectedShop}/stats?period=${period}`);
        setTransactionStats(data);
        
        // Calculate overall stats for the shop
        const totalAmount = data.stats.reduce((sum: number, stat: any) => sum + stat.totalAmount, 0);
        const totalCount = data.stats.reduce((sum: number, stat: any) => sum + stat.count, 0);
        const successfulTransactions = data.stats.find((s: any) => s._id === 'payment')?.count || 0;
        
        setOverallStats({
          totalRevenue: totalAmount,
          totalTransactions: totalCount,
          averageOrderValue: totalCount > 0 ? totalAmount / totalCount : 0,
          successRate: totalCount > 0 ? (successfulTransactions / totalCount) * 100 : 0
        });
      } else {
        // Fetch analytics for all shops
        let allStats: any = { stats: [], dailyStats: [] };
        let totalRevenue = 0;
        let totalTransactions = 0;
        let successfulTransactions = 0;
        
        for (const shop of shops) {
          try {
            const { data } = await axios.get(`/api/transactions/shop/${shop._id}/stats?period=${period}`);
            
            // Aggregate stats
            data.stats.forEach((stat: any) => {
              const existingStat = allStats.stats.find((s: any) => s._id === stat._id);
              if (existingStat) {
                existingStat.count += stat.count;
                existingStat.totalAmount += stat.totalAmount;
                existingStat.avgAmount = existingStat.totalAmount / existingStat.count;
              } else {
                allStats.stats.push({ ...stat });
              }
              
              totalRevenue += stat.totalAmount;
              totalTransactions += stat.count;
              if (stat._id === 'payment') {
                successfulTransactions += stat.count;
              }
            });
            
            // Aggregate daily stats
            data.dailyStats.forEach((dailyStat: any) => {
              const existingDailyStat = allStats.dailyStats.find((s: any) => 
                s._id.date === dailyStat._id.date && s._id.type === dailyStat._id.type
              );
              if (existingDailyStat) {
                existingDailyStat.count += dailyStat.count;
                existingDailyStat.amount += dailyStat.amount;
              } else {
                allStats.dailyStats.push({ ...dailyStat });
              }
            });
          } catch (error) {
            console.error(`Failed to fetch analytics for shop ${shop.name}:`, error);
          }
        }
        
        setTransactionStats(allStats);
        setOverallStats({
          totalRevenue,
          totalTransactions,
          averageOrderValue: totalTransactions > 0 ? totalRevenue / totalTransactions : 0,
          successRate: totalTransactions > 0 ? (successfulTransactions / totalTransactions) * 100 : 0
        });
      }
      
      setLoading(false);
    } catch (error) {
      toast.error('Failed to fetch analytics');
      setLoading(false);
    }
  };

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

  const revenueData = {
    labels: transactionStats?.stats.map(s => s._id.charAt(0).toUpperCase() + s._id.slice(1)) || [],
    datasets: [{
      label: 'Revenue',
      data: transactionStats?.stats.map(s => s.totalAmount) || [],
      backgroundColor: 'rgba(16, 185, 129, 0.5)',
      borderColor: '#10B981',
      borderWidth: 1
    }]
  };

  // Daily transaction trends
  const dailyData = {
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
        <button
          onClick={fetchAnalytics}
          className="btn-secondary flex items-center"
        >
          <RefreshCw size={20} className="mr-2" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">
              Shop
            </label>
            <select
              value={selectedShop}
              onChange={(e) => setSelectedShop(e.target.value)}
              className="input"
            >
              <option value="">All Shops</option>
              {shops.map((shop) => (
                <option key={shop._id} value={shop._id}>
                  {shop.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">
              Period
            </label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="input"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="p-6 flex items-center">
            <DollarSign size={40} className="mr-4" />
            <div>
              <p className="text-lg font-semibold">Total Revenue</p>
              <p className="text-3xl font-bold">₹{overallStats.totalRevenue.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="p-6 flex items-center">
            <TrendingUp size={40} className="mr-4" />
            <div>
              <p className="text-lg font-semibold">Total Transactions</p>
              <p className="text-3xl font-bold">{overallStats.totalTransactions}</p>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <div className="p-6 flex items-center">
            <Users size={40} className="mr-4" />
            <div>
              <p className="text-lg font-semibold">Avg Order Value</p>
              <p className="text-3xl font-bold">₹{overallStats.averageOrderValue.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <div className="p-6 flex items-center">
            <Store size={40} className="mr-4" />
            <div>
              <p className="text-lg font-semibold">Success Rate</p>
              <p className="text-3xl font-bold">{overallStats.successRate.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--primary)]"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Transaction Types */}
          <div className="card p-6">
            <h3 className="text-xl font-semibold mb-4">Transaction Types</h3>
            <div className="h-[300px]">
              <Doughnut data={transactionTypeData} options={{ maintainAspectRatio: false }} />
            </div>
          </div>

          {/* Revenue by Type */}
          <div className="card p-6">
            <h3 className="text-xl font-semibold mb-4">Revenue by Transaction Type</h3>
            <div className="h-[300px]">
              <Bar data={revenueData} options={{ maintainAspectRatio: false }} />
            </div>
          </div>

          {/* Daily Trends */}
          <div className="card p-6 lg:col-span-2">
            <h3 className="text-xl font-semibold mb-4">Daily Transaction Trends</h3>
            <div className="h-[400px]">
              <Line data={dailyData} options={{ maintainAspectRatio: false }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsPage;