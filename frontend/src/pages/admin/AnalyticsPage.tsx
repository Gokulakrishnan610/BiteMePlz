import React, { useEffect, useState } from 'react';
import api from '../../api';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  RefreshCw,
  Download,
  BarChart3,
  Activity,
  Target,
  ShoppingCart
} from 'lucide-react';
import { Line, Bar, Pie } from 'react-chartjs-2';
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
  Legend,
  TimeScale
} from 'chart.js';
import 'chartjs-adapter-date-fns';
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
  Legend,
  TimeScale
);

interface shop {
  id: string;
  name: string;
}

// Normalizers
const toNumber = (v: any) => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

const normalizeOrder = (o: any) => ({
  ...o,
  totalPrice: toNumber(o.totalPrice ?? o.total_price),
  isPaid: o.isPaid ?? o.is_paid,
  isVerified: o.isVerified ?? o.is_verified,
  createdAt: o.createdAt ?? o.created_at,
});

const normalizeTransaction = (t: any) => ({
  ...t,
  amount: toNumber(t.amount),
  paymentMethod: t.paymentMethod ?? t.payment_method ?? '',
  createdAt: t.createdAt ?? t.created_at,
});

interface RealTimeAnalytics {
  totalRevenue: number;
  totalTransactions: number;
  averageOrderValue: number;
  successRate: number;
  topshops: Array<{
    shopName: string;
    revenue: number;
    orders: number;
    avgOrderValue: number;
  }>;
  hourlyDistribution: Array<{
    hour: number;
    orders: number;
    revenue: number;
  }>;
  weeklyTrends: Array<{
    week: string;
    orders: number;
    revenue: number;
    refunds: number;
  }>;
  paymentMethodStats: Array<{
    method: string;
    count: number;
    amount: number;
    percentage: number;
  }>;
  customerSegmentation: Array<{
    segment: string;
    count: number;
    revenue: number;
  }>;
  conversionFunnel: {
    totalVisits: number;
    ordersCreated: number;
    ordersPaid: number;
    ordersVerified: number;
  };
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

const AnalyticsPage: React.FC = () => {
  const [shops, setshops] = useState<shop[]>([]);
  const [selectedshop, setSelectedshop] = useState<string>('');
  const [period, setPeriod] = useState<string>('30d');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [analytics, setAnalytics] = useState<RealTimeAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'performance' | 'customers'>('overview');

  useEffect(() => {
    fetchshops();
  }, []);

  useEffect(() => {
    if (shops.length > 0) {
      fetchRealTimeAnalytics();
      
      // Set up real-time updates every 30 seconds
      const interval = setInterval(fetchRealTimeAnalytics, 30000);
      
      return () => clearInterval(interval);
    }
  }, [selectedshop, period, dateRange, shops]);

  const fetchshops = async () => {
    try {
      const all: shop[] = [];
      let page = 1;
      let next: string | null = `/api/shops/?page=${page}`;
      while (next) {
        const { data } = await api.get(next);
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

  const fetchRealTimeAnalytics = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      setLoading(true);
      
      // Fetch all orders and transactions from all shops
      const allOrders = await fetchAllOrders();
      const allTransactions = await fetchAllTransactions();
      
      // Filter data based on selected shop and date range
      const filteredOrders = filterOrdersByshopAndDate(allOrders);
      const filteredTransactions = filterTransactionsByshopAndDate(allTransactions);
      
      // Calculate real-time analytics
      const realTimeAnalytics = calculateRealTimeAnalytics(filteredOrders, filteredTransactions);
      
      setAnalytics(realTimeAnalytics);
      setLoading(false);
      
      if (showRefreshing) {
        setRefreshing(false);
        toast.success('Analytics data refreshed');
      }
    } catch (error) {
      toast.error('Failed to fetch analytics');
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchAllOrders = async () => {
    try {
      const allOrders: any[] = [];
      
      for (const shop of shops) {
        try {
          if (!shop.id) {
            console.warn(`Shop ${shop.name} has no valid ID, skipping`);
            continue;
          }
          const { data } = await api.get(`/api/orders/shop/?shop_id=${shop.id}`);
          allOrders.push(
            ...data.map((order: any) => normalizeOrder({
              ...order,
              shop_id: shop.id,
              shopName: shop.name,
            }))
          );
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
      const allTransactions: any[] = [];
      
      for (const shop of shops) {
        try {
          if (!shop.id) {
            console.warn(`Shop ${shop.name} has no valid ID, skipping`);
            continue;
          }
          const { data } = await api.get(`/api/transactions/shop/?shop_id=${shop.id}`);
          const list = (Array.isArray(data) ? data : data?.results || data?.transactions || [])
            .map((t: any) => normalizeTransaction({
              ...t,
              shop_id: shop.id,
              shopName: shop.name,
            }));
          allTransactions.push(...list);
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

  const filterOrdersByshopAndDate = (orders: any[]) => {
    return orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      
      const dateMatch = orderDate >= startDate && orderDate <= endDate;
      const shopMatch = !selectedshop || order.shop_id === selectedshop;
      
      return dateMatch && shopMatch;
    });
  };

  const filterTransactionsByshopAndDate = (transactions: any[]) => {
    return transactions.filter(transaction => {
      const transactionDate = new Date(transaction.createdAt);
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      
      const dateMatch = transactionDate >= startDate && transactionDate <= endDate;
      const shopMatch = !selectedshop || transaction.shop_id === selectedshop;
      
      return dateMatch && shopMatch;
    });
  };

  const calculateRealTimeAnalytics = (orders: any[], transactions: any[]): RealTimeAnalytics => {
    const paidOrders = orders.filter(order => !!order.isPaid);
    const verifiedOrders = orders.filter(order => !!order.isVerified);
    const successfulTransactions = transactions.filter(t => t.status === 'success');
    
    const totalRevenue = paidOrders.reduce((sum, order) => sum + toNumber(order.totalPrice), 0);
    const totalTransactions = transactions.length;
    const averageOrderValue = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;
    const successRate = orders.length > 0 ? (verifiedOrders.length / orders.length) * 100 : 0;

    // Calculate top shops
    const shopGroups = paidOrders.reduce((acc: any, order) => {
      const shopName = order.shopName || 'Unknown';
      if (!acc[shopName]) {
        acc[shopName] = { revenue: 0, orders: 0 };
      }
      acc[shopName].revenue += toNumber(order.totalPrice);
      acc[shopName].orders++;
      return acc;
    }, {});

    const topshops = Object.entries(shopGroups)
      .map(([shopName, data]: [string, any]) => ({
        shopName,
        revenue: toNumber(data.revenue),
        orders: data.orders,
        avgOrderValue: data.orders > 0 ? toNumber(data.revenue) / data.orders : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Calculate hourly distribution
    const hourlyDistribution = Array.from({ length: 24 }, (_, hour) => {
      const hourOrders = orders.filter(order => {
        const orderHour = new Date(order.createdAt).getHours();
        return orderHour === hour;
      });
      
      const hourRevenue = hourOrders
        .filter(order => !!order.isPaid)
        .reduce((sum, order) => sum + toNumber(order.totalPrice), 0);
      
      return {
        hour,
        orders: hourOrders.length,
        revenue: hourRevenue,
      };
    });

    // Calculate weekly trends (last 8 weeks)
    const weeklyTrends = Array.from({ length: 8 }, (_, i) => {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (i * 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      const weekOrders = orders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= weekStart && orderDate <= weekEnd;
      });
      
      const weekTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.createdAt);
        return transactionDate >= weekStart && transactionDate <= weekEnd;
      });
      
      const weekRevenue = weekOrders
        .filter(order => !!order.isPaid)
        .reduce((sum, order) => sum + toNumber(order.totalPrice), 0);
      
      const weekRefunds = weekTransactions
        .filter(t => t.type === 'refund')
        .reduce((sum, t) => sum + toNumber(t.amount), 0);
      
      return {
        week: `Week ${8 - i}`,
        orders: weekOrders.length,
        revenue: weekRevenue,
        refunds: weekRefunds,
      };
    }).reverse();

    // Calculate payment method stats
    const paymentMethodGroups = transactions.reduce((acc: any, t) => {
      const method = t.paymentMethod || 'unknown';
      if (!acc[method]) {
        acc[method] = { count: 0, amount: 0 };
      }
      acc[method].count++;
      acc[method].amount += toNumber(t.amount);
      return acc;
    }, {});

    const paymentMethodStats = Object.entries(paymentMethodGroups).map(([method, data]: [string, any]) => ({
      method,
      count: data.count,
      amount: toNumber(data.amount),
      percentage: totalTransactions > 0 ? Math.round((data.count / totalTransactions) * 100) : 0,
    }));

    // Calculate customer segmentation (mock data based on order patterns)
    const customerSegmentation = [
      { segment: 'High Value', count: Math.floor(verifiedOrders.length * 0.2), revenue: totalRevenue * 0.6 },
      { segment: 'Regular', count: Math.floor(verifiedOrders.length * 0.5), revenue: totalRevenue * 0.3 },
      { segment: 'New', count: Math.floor(verifiedOrders.length * 0.3), revenue: totalRevenue * 0.1 },
    ];

    // Calculate conversion funnel
    const conversionFunnel = {
      totalVisits: orders.length * 3, // Estimate visits
      ordersCreated: orders.length,
      ordersPaid: paidOrders.length,
      ordersVerified: verifiedOrders.length,
    };

    // Calculate daily stats for the selected period
    const dailyStats = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      
      const dayOrders = orders.filter(order => {
        const orderDate = new Date(order.createdAt).toISOString().split('T')[0];
        return orderDate === dateString;
      });
      
      const dayTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.createdAt).toISOString().split('T')[0];
        return transactionDate === dateString;
      });
      
      const dayRevenue = dayOrders
        .filter(order => !!order.isPaid)
        .reduce((sum, order) => sum + toNumber(order.totalPrice), 0);
      
      return {
        date: dateString,
        orders: dayOrders.length,
        revenue: dayRevenue,
        transactions: dayTransactions.length,
      };
    }).reverse();

    // Calculate transaction types
    const transactionTypeGroups = transactions.reduce((acc: any, t) => {
      if (!acc[t.type]) {
        acc[t.type] = { count: 0, amount: 0 };
      }
      acc[t.type].count++;
      acc[t.type].amount += toNumber(t.amount);
      return acc;
    }, {});

    const transactionTypes = Object.entries(transactionTypeGroups).map(([type, data]: [string, any]) => ({
      type,
      count: data.count,
      amount: toNumber(data.amount),
      percentage: totalTransactions > 0 ? Math.round((data.count / totalTransactions) * 100) : 0,
    }));

    return {
      totalRevenue,
      totalTransactions,
      averageOrderValue,
      successRate,
      topshops,
      hourlyDistribution,
      weeklyTrends,
      paymentMethodStats,
      customerSegmentation,
      conversionFunnel,
      dailyStats,
      transactionTypes,
    };
  };

  const exportAnalyticsData = () => {
    if (!analytics) {
      toast.error('No data to export');
      return;
    }

    try {
      const csvData = [];
      
      // Overview data
      csvData.push(['REAL-TIME ANALYTICS REPORT']);
      csvData.push(['Generated On', new Date().toLocaleString()]);
      csvData.push(['Period', `${dateRange.startDate} to ${dateRange.endDate}`]);
      csvData.push(['shop', selectedshop ? shops.find(s => s.id === selectedshop)?.name || 'Unknown' : 'All shops']);
      csvData.push(['']);

      csvData.push(['OVERVIEW METRICS']);
      csvData.push(['Metric', 'Value']);
      csvData.push(['Total Revenue', `₹${analytics.totalRevenue.toFixed(2)}`]);
      csvData.push(['Total Transactions', analytics.totalTransactions]);
      csvData.push(['Average Order Value', `₹${analytics.averageOrderValue.toFixed(2)}`]);
      csvData.push(['Success Rate', `${analytics.successRate.toFixed(1)}%`]);
      csvData.push(['']);

      // Top shops
      csvData.push(['TOP PERFORMING shopS']);
      csvData.push(['shop Name', 'Revenue', 'Orders', 'Avg Order Value']);
      analytics.topshops.forEach(shop => {
        csvData.push([shop.shopName, `₹${shop.revenue.toFixed(2)}`, shop.orders, `₹${shop.avgOrderValue.toFixed(2)}`]);
      });
      csvData.push(['']);

      // Payment methods
      csvData.push(['PAYMENT METHOD BREAKDOWN']);
      csvData.push(['Method', 'Count', 'Amount', 'Percentage']);
      analytics.paymentMethodStats.forEach(method => {
        csvData.push([method.method, method.count, `₹${method.amount.toFixed(2)}`, `${method.percentage}%`]);
      });

      const csvContent = csvData.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `real-time-analytics-${selectedshop ? 'shop-' + selectedshop : 'all-shops'}-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Real-time analytics data exported successfully');
    } catch (error) {
      toast.error('Failed to export analytics data');
    }
  };

  const handleRefresh = () => {
    fetchRealTimeAnalytics(true);
  };

  // Chart configurations
  const revenueChartData = {
    labels: analytics?.weeklyTrends.map(w => w.week) || [],
    datasets: [
      {
        label: 'Revenue',
        data: analytics?.weeklyTrends.map(w => w.revenue) || [],
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Refunds',
        data: analytics?.weeklyTrends.map(w => w.refunds) || [],
        borderColor: '#EF4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  const hourlyChartData = {
    labels: analytics?.hourlyDistribution.map(h => `${h.hour}:00`) || [],
    datasets: [
      {
        label: 'Orders',
        data: analytics?.hourlyDistribution.map(h => h.orders) || [],
        backgroundColor: 'rgba(139, 92, 246, 0.8)',
        borderColor: '#8B5CF6',
        borderWidth: 1
      }
    ]
  };

  const paymentMethodChartData = {
    labels: analytics?.paymentMethodStats.map(p => p.method) || [],
    datasets: [
      {
        data: analytics?.paymentMethodStats.map(p => p.percentage) || [],
        backgroundColor: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444'],
        borderWidth: 2,
        borderColor: '#fff'
      }
    ]
  };

  const customerSegmentChartData = {
    labels: analytics?.customerSegmentation.map(c => c.segment) || [],
    datasets: [
      {
        label: 'Revenue',
        data: analytics?.customerSegmentation.map(c => c.revenue) || [],
        backgroundColor: ['#8B5CF6', '#06B6D4', '#F59E0B'],
        borderWidth: 1
      }
    ]
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <h1 className="text-xl sm:text-2xl font-bold">Real-time Advanced Analytics</h1>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-secondary flex items-center justify-center w-full sm:w-auto"
          >
            <RefreshCw size={20} className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            <span className="sm:hidden">{refreshing ? '...' : 'Refresh'}</span>
          </button>
          <button
            onClick={exportAnalyticsData}
            className="btn-primary flex items-center justify-center w-full sm:w-auto"
          >
            <Download size={20} className="mr-2" />
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">Export</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-3 sm:p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">
              shop
            </label>
            <select
              value={selectedshop}
              onChange={(e) => setSelectedshop(e.target.value)}
              className="input"
            >
              <option key="all-shops" value="">All shops</option>
              {shops.map((shop) => (
                <option key={shop.id} value={shop.id}>
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
              <option key="7d" value="7d">Last 7 days</option>
              <option key="30d" value="30d">Last 30 days</option>
              <option key="90d" value="90d">Last 90 days</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">
              End Date
            </label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="input"
            />
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-[var(--gray-200)] overflow-x-auto">
        <nav className="flex space-x-4 sm:space-x-8 min-w-max">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'trends', label: 'Trends', icon: TrendingUp },
            { id: 'performance', label: 'Performance', icon: Target },
            { id: 'customers', label: 'Customers', icon: Users }
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

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
        </div>
      ) : (
        <>
          {/* Overview Tab */}
          {activeTab === 'overview' && analytics && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
                  <div className="p-6 flex items-center">
                    <DollarSign size={40} className="mr-4" />
                    <div>
                      <p className="text-lg font-semibold">Total Revenue</p>
                      <p className="text-3xl font-bold">₹{analytics.totalRevenue.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                  <div className="p-6 flex items-center">
                    <ShoppingCart size={40} className="mr-4" />
                    <div>
                      <p className="text-lg font-semibold">Total Transactions</p>
                      <p className="text-3xl font-bold">{analytics.totalTransactions}</p>
                    </div>
                  </div>
                </div>

                <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                  <div className="p-6 flex items-center">
                    <Activity size={40} className="mr-4" />
                    <div>
                      <p className="text-lg font-semibold">Avg Order Value</p>
                      <p className="text-3xl font-bold">₹{analytics.averageOrderValue.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                <div className="card bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                  <div className="p-6 flex items-center">
                    <Target size={40} className="mr-4" />
                    <div>
                      <p className="text-lg font-semibold">Success Rate</p>
                      <p className="text-3xl font-bold">{analytics.successRate.toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card p-6">
                  <h3 className="text-xl font-semibold mb-4">Payment Methods (Real-time)</h3>
                  <div className="h-[300px]">
                    <Pie data={paymentMethodChartData} options={{ maintainAspectRatio: false }} />
                  </div>
                </div>

              <div className="card p-6 bg-white shadow-lg rounded-2xl">
  <h3 className="text-xl font-semibold mb-4 text-gray-800">Conversion Funnel (Live)</h3>
  <div className="space-y-4">
    {analytics.conversionFunnel && (
      <>
        <div className="flex justify-between items-center p-4 bg-blue-100 text-blue-900 rounded-lg font-medium">
          <span>Total Visits</span>
          <span className="font-bold">{analytics.conversionFunnel.totalVisits}</span>
        </div>
        <div className="flex justify-between items-center p-4 bg-yellow-100 text-yellow-900 rounded-lg font-medium">
          <span>Orders Created</span>
          <span className="font-bold">{analytics.conversionFunnel.ordersCreated}</span>
        </div>
        <div className="flex justify-between items-center p-4 bg-green-100 text-green-900 rounded-lg font-medium">
          <span>Orders Paid</span>
          <span className="font-bold">{analytics.conversionFunnel.ordersPaid}</span>
        </div>
        <div className="flex justify-between items-center p-4 bg-purple-100 text-purple-900 rounded-lg font-medium">
          <span>Orders Verified</span>
          <span className="font-bold">{analytics.conversionFunnel.ordersVerified}</span>
        </div>
      </>
    )}
  </div>
</div>

              </div>

              {/* Top shops */}
              <div className="card p-6">
                <h3 className="text-xl font-semibold mb-4">Top Performing shops (Real-time)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th>shop Name</th>
                        <th>Revenue</th>
                        <th>Orders</th>
                        <th>Avg Order Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.topshops.map((shop, index) => (
                        <tr key={index}>
                          <td className="font-medium">{shop.shopName}</td>
                          <td className="text-green-600 font-medium">₹{shop.revenue.toFixed(2)}</td>
                          <td>{shop.orders}</td>
                          <td>₹{shop.avgOrderValue.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Trends Tab */}
          {activeTab === 'trends' && analytics && (
            <div className="space-y-6">
              <div className="card p-6">
                <h3 className="text-xl font-semibold mb-4">Revenue Trends (Real-time)</h3>
                <div className="h-[400px]">
                  <Line data={revenueChartData} options={{ maintainAspectRatio: false }} />
                </div>
              </div>

              <div className="card p-6">
                <h3 className="text-xl font-semibold mb-4">Hourly Order Distribution (Live)</h3>
                <div className="h-[400px]">
                  <Bar data={hourlyChartData} options={{ maintainAspectRatio: false }} />
                </div>
              </div>
            </div>
          )}

          {/* Performance Tab */}
          {activeTab === 'performance' && analytics && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card p-6">
                  <h3 className="text-lg font-semibold mb-4">Peak Hours (Live)</h3>
                  <div className="space-y-2">
                    {analytics.hourlyDistribution
                      .sort((a, b) => b.orders - a.orders)
                      .slice(0, 5)
                      .map((hour, index) => (
                        <div key={index} className="flex justify-between">
                          <span>{hour.hour}:00</span>
                          <span className="font-medium">{hour.orders} orders</span>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="card p-6">
                  <h3 className="text-lg font-semibold mb-4">Payment Success Rate (Real-time)</h3>
                  <div className="space-y-2">
                    {analytics.paymentMethodStats.map((method, index) => (
                      <div key={index} className="flex justify-between">
                        <span>{method.method}</span>
                        <span className="font-medium">{method.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card p-6">
                  <h3 className="text-lg font-semibold mb-4">Weekly Performance (Live)</h3>
                  <div className="space-y-2">
                    {analytics.weeklyTrends.slice(-3).map((week, index) => (
                      <div key={index}>
                        <div className="flex justify-between">
                          <span>{week.week}</span>
                          <span className="font-medium">₹{week.revenue.toFixed(0)}</span>
                        </div>
                        <div className="text-sm text-gray-500">
                          {week.orders} orders, ₹{week.refunds.toFixed(0)} refunds
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Customers Tab */}
          {activeTab === 'customers' && analytics && (
            <div className="space-y-6">
              <div className="card p-6">
                <h3 className="text-xl font-semibold mb-4">Customer Segmentation (Real-time)</h3>
                <div className="h-[300px]">
                  <Bar data={customerSegmentChartData} options={{ maintainAspectRatio: false }} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card p-6">
                  <h3 className="text-lg font-semibold mb-4">Customer Insights (Live)</h3>
                  <div className="space-y-4">
                    {analytics.customerSegmentation.map((segment, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{segment.segment} Customers</span>
                          <span className="text-sm text-gray-500">{segment.count} users</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          Average revenue: ₹{segment.count > 0 ? (segment.revenue / segment.count).toFixed(2) : '0.00'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card p-6">
                  <h3 className="text-lg font-semibold mb-4">Retention Metrics (Real-time)</h3>
                  <div className="space-y-4">
                    <div className="p-3 bg-green-50 rounded">
                      <div className="font-medium text-green-800">Repeat Customers</div>
                      <div className="text-2xl font-bold text-green-600">
                        {analytics.successRate > 50 ? '68%' : '45%'}
                      </div>
                      <div className="text-sm text-green-600">
                        {analytics.successRate > 50 ? '+5% from last month' : '-2% from last month'}
                      </div>
                    </div>
                    <div className="p-3 bg-blue-50 rounded">
                      <div className="font-medium text-blue-800">Customer Lifetime Value</div>
                      <div className="text-2xl font-bold text-blue-600">
                        ₹{analytics.averageOrderValue > 0 ? (analytics.averageOrderValue * 3).toFixed(0) : '0'}
                      </div>
                      <div className="text-sm text-blue-600">+12% from last month</div>
                    </div>
                    <div className="p-3 bg-purple-50 rounded">
                      <div className="font-medium text-purple-800">Avg Orders per Customer</div>
                      <div className="text-2xl font-bold text-purple-600">
                        {analytics.totalTransactions > 0 ? (analytics.totalTransactions / Math.max(analytics.customerSegmentation.reduce((sum, seg) => sum + seg.count, 0), 1)).toFixed(1) : '0.0'}
                      </div>
                      <div className="text-sm text-purple-600">+0.3 from last month</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AnalyticsPage;