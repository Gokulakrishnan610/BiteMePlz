import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  Users, 
  TrendingUp, 
  ShoppingCart, 
  Eye, 
  Filter,
  Download,
  RefreshCw,
  BarChart3,
  PieChart,
  Activity,
  Target,
  Clock,
  Search,
  Calendar,
  User,
  Package
} from 'lucide-react';
import { Line, Bar, Doughnut, Pie } from 'react-chartjs-2';
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

interface shop {
  _id: string;
  name: string;
}

interface StudentBehaviorData {
  userJourneys: Array<{
    _id: string;
    user: string;
    shop: string;
    activities: Array<{
      activity: string;
      timestamp: string;
      metadata: any;
    }>;
    startTime: string;
    endTime: string;
    totalActivities: number;
    sessionDuration: number;
  }>;
  conversionFunnel: Array<{
    _id: string;
    count: number;
    uniqueUserCount: number;
  }>;
  popularProducts: Array<{
    _id: string;
    views: number;
    addToCarts: number;
    uniqueUserCount: number;
    conversionRate: number;
  }>;
  activityPatterns: Array<{
    _id: {
      hour: number;
      activity: string;
    };
    count: number;
  }>;
  engagementMetrics: Array<{
    _id: string;
    totalActivities: number;
    sessionCount: number;
    shopCount: number;
    avgActivitiesPerSession: number;
  }>;
}

interface AdvancedInsights {
  customerSegmentation: Array<{
    _id: string;
    count: number;
    avgSpent: number;
    avgOrders: number;
  }>;
  abandonmentAnalysis: Array<{
    _id: null;
    totalSessions: number;
    cartAddSessions: number;
    checkoutStartSessions: number;
    paymentAttemptSessions: number;
    orderPlacedSessions: number;
  }>;
}

const StudentAnalyticsPage: React.FC = () => {
  const [shops, setshops] = useState<shop[]>([]);
  const [behaviorData, setBehaviorData] = useState<StudentBehaviorData | null>(null);
  const [advancedInsights, setAdvancedInsights] = useState<AdvancedInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedshop, setSelectedshop] = useState<string>('');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [filters, setFilters] = useState({
    activity: '',
    userId: ''
  });
  const [activeTab, setActiveTab] = useState<'behavior' | 'insights' | 'patterns' | 'engagement'>('behavior');

  useEffect(() => {
    fetchshops();
  }, []);

  useEffect(() => {
    if (shops.length > 0) {
      fetchStudentAnalytics();
    }
  }, [shops, selectedshop, dateRange, filters]);

  const fetchshops = async () => {
    try {
      const { data } = await axios.get('/api/shops');
      setshops(data);
    } catch (error) {
      toast.error('Failed to fetch shops');
    }
  };

  const fetchStudentAnalytics = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (selectedshop) params.append('shop_id', selectedshop);
      if (dateRange.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange.endDate) params.append('endDate', dateRange.endDate);
      if (filters.activity) params.append('activity', filters.activity);
      if (filters.userId) params.append('userId', filters.userId);

      const endpoint = selectedshop 
        ? `/api/student-analytics/shop/${selectedshop}?${params}`
        : `/api/student-analytics/overview?${params}`;

      const { data } = await axios.get(endpoint);
      setBehaviorData(data);

      // Fetch advanced insights
      if (selectedshop) {
        const insightsRes = await axios.get(`/api/student-analytics/shop/${selectedshop}/insights`);
        setAdvancedInsights(insightsRes.data);
      }

      setLoading(false);
    } catch (error) {
      toast.error('Failed to fetch student analytics');
      setLoading(false);
    }
  };

  const exportAnalytics = async () => {
    try {
      const csvData = [];
      
      // Header
      csvData.push(['STUDENT BEHAVIOR ANALYTICS REPORT']);
      csvData.push(['Generated On', new Date().toLocaleString()]);
      csvData.push(['shop', selectedshop ? shops.find(s => s._id === selectedshop)?.name || 'Unknown' : 'All shops']);
      csvData.push(['Date Range', `${dateRange.startDate} to ${dateRange.endDate}`]);
      csvData.push(['']);

      // User Journeys Summary
      if (behaviorData?.userJourneys) {
        csvData.push(['USER JOURNEY SUMMARY']);
        csvData.push(['Session ID', 'User', 'Total Activities', 'Session Duration (min)', 'Start Time', 'End Time']);
        behaviorData.userJourneys.slice(0, 50).forEach(journey => {
          csvData.push([
            journey._id,
            journey.user,
            journey.totalActivities,
            journey.sessionDuration.toFixed(2),
            new Date(journey.startTime).toLocaleString(),
            new Date(journey.endTime).toLocaleString()
          ]);
        });
        csvData.push(['']);
      }

      // Conversion Funnel
      if (behaviorData?.conversionFunnel) {
        csvData.push(['CONVERSION FUNNEL']);
        csvData.push(['Activity', 'Total Count', 'Unique Users']);
        behaviorData.conversionFunnel.forEach(funnel => {
          csvData.push([funnel._id, funnel.count, funnel.uniqueUserCount]);
        });
        csvData.push(['']);
      }

      // Popular Products
      if (behaviorData?.popularProducts) {
        csvData.push(['POPULAR PRODUCTS']);
        csvData.push(['Product ID', 'Views', 'Add to Carts', 'Unique Users', 'Conversion Rate %']);
        behaviorData.popularProducts.forEach(product => {
          csvData.push([
            product._id,
            product.views,
            product.addToCarts,
            product.uniqueUserCount,
            product.conversionRate.toFixed(2)
          ]);
        });
        csvData.push(['']);
      }

      // Engagement Metrics
      if (behaviorData?.engagementMetrics) {
        csvData.push(['ENGAGEMENT METRICS']);
        csvData.push(['User ID', 'Total Activities', 'Sessions', 'shops Visited', 'Avg Activities/Session']);
        behaviorData.engagementMetrics.slice(0, 50).forEach(metric => {
          csvData.push([
            metric._id,
            metric.totalActivities,
            metric.sessionCount,
            metric.shopCount,
            metric.avgActivitiesPerSession.toFixed(2)
          ]);
        });
      }

      const csvContent = csvData.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `student-analytics-${selectedshop ? 'shop-' + selectedshop : 'all-shops'}-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Student analytics exported successfully');
    } catch (error) {
      toast.error('Failed to export analytics');
    }
  };

  const handleRefresh = () => {
    fetchStudentAnalytics();
    toast.success('Analytics data refreshed');
  };

  // Chart configurations
  const activityPatternsData = {
    labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
    datasets: [
      {
        label: 'shop Visits',
        data: Array.from({ length: 24 }, (_, hour) => {
          const hourData = behaviorData?.activityPatterns.filter(
            p => p._id.hour === hour && p._id.activity === 'shop_visit'
          );
          return hourData?.reduce((sum, d) => sum + d.count, 0) || 0;
        }),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: '#3B82F6',
        borderWidth: 1
      },
      {
        label: 'Product Views',
        data: Array.from({ length: 24 }, (_, hour) => {
          const hourData = behaviorData?.activityPatterns.filter(
            p => p._id.hour === hour && p._id.activity === 'product_view'
          );
          return hourData?.reduce((sum, d) => sum + d.count, 0) || 0;
        }),
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderColor: '#10B981',
        borderWidth: 1
      }
    ]
  };

  const conversionFunnelData = {
    labels: behaviorData?.conversionFunnel.map(f => f._id.replace('_', ' ').toUpperCase()) || [],
    datasets: [
      {
        label: 'Users',
        data: behaviorData?.conversionFunnel.map(f => f.uniqueUserCount) || [],
        backgroundColor: [
          '#3B82F6',
          '#10B981', 
          '#F59E0B',
          '#EF4444',
          '#8B5CF6'
        ],
        borderWidth: 1
      }
    ]
  };

  const customerSegmentationData = {
    labels: advancedInsights?.customerSegmentation.map(c => c._id) || [],
    datasets: [
      {
        data: advancedInsights?.customerSegmentation.map(c => c.count) || [],
        backgroundColor: ['#8B5CF6', '#06B6D4', '#F59E0B', '#EF4444'],
        borderWidth: 2,
        borderColor: '#fff'
      }
    ]
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Student Behavior Analytics</h1>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            className="btn-secondary flex items-center"
          >
            <RefreshCw size={20} className="mr-2" />
            Refresh
          </button>
          <button
            onClick={exportAnalytics}
            className="btn-primary flex items-center"
          >
            <Download size={20} className="mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--secondary-text)] mb-1">
              shop
            </label>
            <select
              value={selectedshop}
              onChange={(e) => setSelectedshop(e.target.value)}
              className="input"
            >
              <option value="">All shops</option>
              {shops.map((shop) => (
                <option key={shop._id} value={shop._id}>
                  {shop.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--secondary-text)] mb-1">
              Activity Type
            </label>
            <select
              value={filters.activity}
              onChange={(e) => setFilters({ ...filters, activity: e.target.value })}
              className="input"
            >
              <option value="">All Activities</option>
              <option value="shop_visit">shop Visit</option>
              <option value="product_view">Product View</option>
              <option value="cart_add">Add to Cart</option>
              <option value="checkout_start">Checkout Start</option>
              <option value="payment_attempt">Payment Attempt</option>
              <option value="order_placed">Order Placed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--secondary-text)] mb-1">
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
            <label className="block text-sm font-medium text-[var(--secondary-text)] mb-1">
              End Date
            </label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--secondary-text)] mb-1">
              User ID
            </label>
            <input
              type="text"
              value={filters.userId}
              onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
              placeholder="Search by user ID..."
              className="input"
            />
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-[var(--border-color)]">
        <nav className="flex space-x-8">
          {[
            { id: 'behavior', label: 'User Behavior', icon: Users },
            { id: 'insights', label: 'Customer Insights', icon: Target },
            { id: 'patterns', label: 'Activity Patterns', icon: BarChart3 },
            { id: 'engagement', label: 'Engagement', icon: Activity }
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

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--accent-purple)]"></div>
        </div>
      ) : (
        <>
          {/* User Behavior Tab */}
          {activeTab === 'behavior' && behaviorData && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                  <div className="p-6 flex items-center">
                    <Users size={40} className="mr-4" />
                    <div>
                      <p className="text-lg font-semibold">Total Sessions</p>
                      <p className="text-3xl font-bold">{behaviorData.userJourneys?.length || 0}</p>
                    </div>
                  </div>
                </div>

                <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
                  <div className="p-6 flex items-center">
                    <Eye size={40} className="mr-4" />
                    <div>
                      <p className="text-lg font-semibold">Product Views</p>
                      <p className="text-3xl font-bold">
                        {behaviorData.popularProducts?.reduce((sum, p) => sum + p.views, 0) || 0}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                  <div className="p-6 flex items-center">
                    <ShoppingCart size={40} className="mr-4" />
                    <div>
                      <p className="text-lg font-semibold">Cart Additions</p>
                      <p className="text-3xl font-bold">
                        {behaviorData.popularProducts?.reduce((sum, p) => sum + p.addToCarts, 0) || 0}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="card bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                  <div className="p-6 flex items-center">
                    <TrendingUp size={40} className="mr-4" />
                    <div>
                      <p className="text-lg font-semibold">Avg Conversion</p>
                      <p className="text-3xl font-bold">
                        {behaviorData.popularProducts?.length > 0 
                          ? (behaviorData.popularProducts.reduce((sum, p) => sum + p.conversionRate, 0) / behaviorData.popularProducts.length).toFixed(1)
                          : 0}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card p-6">
                  <h3 className="text-xl font-semibold mb-4">Conversion Funnel</h3>
                  <div className="h-[300px]">
                    <Bar data={conversionFunnelData} options={{ maintainAspectRatio: false }} />
                  </div>
                </div>

                <div className="card p-6">
                  <h3 className="text-xl font-semibold mb-4">Activity Patterns by Hour</h3>
                  <div className="h-[300px]">
                    <Bar data={activityPatternsData} options={{ maintainAspectRatio: false }} />
                  </div>
                </div>
              </div>

              {/* User Journeys Table */}
              <div className="card p-6">
                <h3 className="text-xl font-semibold mb-4">Recent User Journeys</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th>Session ID</th>
                        <th>User</th>
                        <th>Activities</th>
                        <th>Duration (min)</th>
                        <th>Start Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {behaviorData.userJourneys?.slice(0, 10).map((journey, index) => (
                        <tr key={index}>
                          <td className="font-mono text-sm">{journey._id.slice(-8)}</td>
                          <td className="font-mono text-sm">{journey.user.slice(-8)}</td>
                          <td>{journey.totalActivities}</td>
                          <td>{journey.sessionDuration.toFixed(1)}</td>
                          <td>{new Date(journey.startTime).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Customer Insights Tab */}
          {activeTab === 'insights' && advancedInsights && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card p-6">
                  <h3 className="text-xl font-semibold mb-4">Customer Segmentation</h3>
                  <div className="h-[300px]">
                    <Doughnut data={customerSegmentationData} options={{ maintainAspectRatio: false }} />
                  </div>
                </div>

                <div className="card p-6">
                  <h3 className="text-xl font-semibold mb-4">Abandonment Analysis</h3>
                  {advancedInsights.abandonmentAnalysis?.map((analysis, index) => (
                    <div key={index} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-blue-50 rounded">
                          <p className="text-sm text-blue-600">Total Sessions</p>
                          <p className="text-2xl font-bold text-blue-800">{analysis.totalSessions}</p>
                        </div>
                        <div className="p-3 bg-green-50 rounded">
                          <p className="text-sm text-green-600">Cart Additions</p>
                          <p className="text-2xl font-bold text-green-800">{analysis.cartAddSessions}</p>
                        </div>
                        <div className="p-3 bg-yellow-50 rounded">
                          <p className="text-sm text-yellow-600">Checkout Started</p>
                          <p className="text-2xl font-bold text-yellow-800">{analysis.checkoutStartSessions}</p>
                        </div>
                        <div className="p-3 bg-purple-50 rounded">
                          <p className="text-sm text-purple-600">Orders Placed</p>
                          <p className="text-2xl font-bold text-purple-800">{analysis.orderPlacedSessions}</p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <p className="text-sm text-gray-600">
                          Conversion Rate: {analysis.totalSessions > 0 
                            ? ((analysis.orderPlacedSessions / analysis.totalSessions) * 100).toFixed(1)
                            : 0}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card p-6">
                <h3 className="text-xl font-semibold mb-4">Customer Segment Details</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th>Segment</th>
                        <th>Customer Count</th>
                        <th>Avg Spent</th>
                        <th>Avg Orders</th>
                      </tr>
                    </thead>
                    <tbody>
                      {advancedInsights.customerSegmentation?.map((segment, index) => (
                        <tr key={index}>
                          <td className="font-medium">{segment._id}</td>
                          <td>{segment.count}</td>
                          <td>₹{segment.avgSpent?.toFixed(2) || 0}</td>
                          <td>{segment.avgOrders?.toFixed(1) || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Activity Patterns Tab */}
          {activeTab === 'patterns' && behaviorData && (
            <div className="space-y-6">
              <div className="card p-6">
                <h3 className="text-xl font-semibold mb-4">Hourly Activity Distribution</h3>
                <div className="h-[400px]">
                  <Bar data={activityPatternsData} options={{ maintainAspectRatio: false }} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card p-6">
                  <h3 className="text-lg font-semibold mb-4">Peak Activity Hours</h3>
                  <div className="space-y-3">
                    {Array.from({ length: 24 }, (_, hour) => {
                      const hourActivity = behaviorData.activityPatterns?.filter(p => p._id.hour === hour);
                      const totalCount = hourActivity?.reduce((sum, a) => sum + a.count, 0) || 0;
                      return { hour, count: totalCount };
                    })
                      .sort((a, b) => b.count - a.count)
                      .slice(0, 5)
                      .map((hour, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <span>{hour.hour}:00</span>
                          <span className="font-medium">{hour.count} activities</span>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="card p-6">
                  <h3 className="text-lg font-semibold mb-4">Most Popular Products</h3>
                  <div className="space-y-3">
                    {behaviorData.popularProducts?.slice(0, 5).map((product, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="font-mono text-sm">{product._id.slice(-8)}</span>
                        <span className="font-medium">{product.views} views</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card p-6">
                  <h3 className="text-lg font-semibold mb-4">Conversion Rates</h3>
                  <div className="space-y-3">
                    {behaviorData.popularProducts?.slice(0, 5).map((product, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="font-mono text-sm">{product._id.slice(-8)}</span>
                        <span className="font-medium">{product.conversionRate.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Engagement Tab */}
          {activeTab === 'engagement' && behaviorData && (
            <div className="space-y-6">
              <div className="card p-6">
                <h3 className="text-xl font-semibold mb-4">User Engagement Metrics</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th>User ID</th>
                        <th>Total Activities</th>
                        <th>Sessions</th>
                        <th>shops Visited</th>
                        <th>Avg Activities/Session</th>
                      </tr>
                    </thead>
                    <tbody>
                      {behaviorData.engagementMetrics?.slice(0, 20).map((metric, index) => (
                        <tr key={index}>
                          <td className="font-mono text-sm">{metric._id.slice(-8)}</td>
                          <td>{metric.totalActivities}</td>
                          <td>{metric.sessionCount}</td>
                          <td>{metric.shopCount}</td>
                          <td>{metric.avgActivitiesPerSession.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card p-6 text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {behaviorData.engagementMetrics?.length || 0}
                  </div>
                  <div className="text-sm text-gray-600">Active Users</div>
                </div>

                <div className="card p-6 text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {behaviorData.engagementMetrics?.reduce((sum, m) => sum + m.totalActivities, 0) || 0}
                  </div>
                  <div className="text-sm text-gray-600">Total Activities</div>
                </div>

                <div className="card p-6 text-center">
                  <div className="text-3xl font-bold text-purple-600 mb-2">
                    {behaviorData.engagementMetrics?.length > 0 
                      ? (behaviorData.engagementMetrics.reduce((sum, m) => sum + m.avgActivitiesPerSession, 0) / behaviorData.engagementMetrics.length).toFixed(1)
                      : 0}
                  </div>
                  <div className="text-sm text-gray-600">Avg Activities/Session</div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {!loading && !behaviorData && (
        <div className="text-center py-12">
          <Users size={48} className="text-[var(--muted-text)] mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-[var(--secondary-text)] mb-2">
            No Analytics Data Found
          </h2>
          <p className="text-[var(--muted-text)]">
            Try adjusting your filters to see student behavior analytics.
          </p>
        </div>
      )}
    </div>
  );
};

export default StudentAnalyticsPage;