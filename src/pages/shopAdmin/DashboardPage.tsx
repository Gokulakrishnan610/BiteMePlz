import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Package, ShoppingBag, TrendingUp, AlertCircle, Power, Clock, QrCode } from 'lucide-react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import toast from 'react-hot-toast';
import { ResponsiveContainer, BarChart as RechartsBarChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Legend as RechartsLegend, Bar as RechartsBar } from 'recharts';
import { useNavigate } from 'react-router-dom';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

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

interface Shop {
  _id: string;
  isOpen: boolean;
  finalValidity: string;
  qrValidityMinutes: number;
}

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [finalValidity, setFinalValidity] = useState('17:00');
  const [updating, setUpdating] = useState(false);
  const [qrValidityMinutes, setQrValidityMinutes] = useState('20');
  const [updatingQR, setUpdatingQR] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!user?.shop) return;
        
        const [analyticsRes, shopRes] = await Promise.all([
          axios.get(`/api/shops/${user.shop}/analytics`),
          axios.get(`/api/shops/${user.shop}`)
        ]);
        setAnalytics(analyticsRes.data);
        setShop(shopRes.data);
        setFinalValidity(shopRes.data.finalValidityTime
          ? (() => {
              const d = new Date(shopRes.data.finalValidityTime);
              // Convert to IST by adding 5.5 hours
              d.setHours(d.getHours() + 5.5);
              return d.toISOString().substring(11, 16);
            })()
          : '17:00');
        setQrValidityMinutes(shopRes.data.qrValidityMinutes.toString());
        setLoading(false);
      } catch (err) {
        setError('Failed to load data');
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleToggleShop = async () => {
    if (!user?.shop) return;
    try {
      setClosing(true);
      const { data } = await axios.post(`/api/shops/${user.shop}/toggle`);
      setShop(data.shop);
      toast.success(data.message);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to toggle shop status');
    } finally {
      setClosing(false);
    }
  };

  const updateFinalValidity = async () => {
    try {
      if (!user?.shop) return;
      setUpdating(true);
      
      // Get current date
      const now = new Date();
      const [hh, mm] = finalValidity.split(':');
      
      // Create a new date for the validity time
      const validityDate = new Date();
      validityDate.setHours(Number(hh), Number(mm), 0, 0);
      
      // If the time is earlier than current time, set it to tomorrow
      if (validityDate <= now) {
        validityDate.setDate(validityDate.getDate() + 1);
      }
      
      const { data } = await axios.put(`/api/shops/${user.shop}`, {
        finalValidityTime: validityDate.toISOString()
      });
      
      // Update local state with the new time
      setFinalValidity(data.finalValidityTime
        ? new Date(data.finalValidityTime).toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit'
          })
        : '17:00');
      
      setShop(data);
      toast.success('Final validity time updated successfully');
    } catch (error) {
      toast.error('Failed to update final validity time');
    } finally {
      setUpdating(false);
    }
  };

  const updateQRValidity = async () => {
    try {
      if (!user?.shop) return;
      
      const minutes = parseInt(qrValidityMinutes);
      if (isNaN(minutes) || minutes < 1 || minutes > 60) {
        throw new Error('QR validity must be between 1 and 60 minutes');
      }

      setUpdatingQR(true);
      const { data } = await axios.put(`/api/shops/${user.shop}`, {
        qrValidityMinutes: minutes
      });
      setShop(data);
      setQrValidityMinutes(data.qrValidityMinutes.toString());
      toast.success('QR validity time updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update QR validity time');
    } finally {
      setUpdatingQR(false);
    }
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

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertCircle className="mx-auto text-[var(--error)] mb-4" size={48} />
          <p className="text-[var(--error)]">{error}</p>
        </div>
      </div>
    );
  }

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const salesData = {
    labels: analytics?.monthlySales.map(sale => `${monthNames[sale._id.month - 1]} ${sale._id.year}`) || [],
    datasets: [
      {
        label: 'Monthly Sales',
        data: analytics?.monthlySales.map(sale => sale.total) || [],
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
        fill: false
      }
    ]
  };

  const topProductsData = {
    labels: analytics?.topProducts.map(product => product.name) || [],
    datasets: [
      {
        label: 'Units Sold',
        data: analytics?.topProducts.map(product => product.totalSold) || [],
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        borderColor: 'rgb(75, 192, 192)',
        borderWidth: 1
      }
    ]
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-white rounded-lg p-3 shadow-sm flex-1 md:flex-initial">
            <Clock size={20} className="text-[var(--primary)]" />
            <input
              type="time"
              value={finalValidity}
              onChange={(e) => setFinalValidity(e.target.value)}
              className="border-none focus:ring-0 p-0"
            />
            <button
              onClick={updateFinalValidity}
              disabled={updating}
              className="btn-primary py-1 px-3 text-sm"
            >
              {updating ? 'Saving...' : 'Save'}
            </button>
          </div>
          <div className="flex items-center gap-2 bg-white rounded-lg p-3 shadow-sm flex-1 md:flex-initial">
            <QrCode size={20} className="text-[var(--primary)]" />
            <input
              type="number"
              value={qrValidityMinutes}
              onChange={(e) => setQrValidityMinutes(e.target.value)}
              min="1"
              max="60"
              className="border-none focus:ring-0 p-0 w-16"
            />
            <span className="text-sm text-[var(--gray-600)]">min</span>
            <button
              onClick={updateQRValidity}
              disabled={updatingQR}
              className="btn-primary py-1 px-3 text-sm"
            >
              {updatingQR ? 'Saving...' : 'Save'}
            </button>
          </div>
          <button
            onClick={handleToggleShop}
            disabled={closing}
            className={`py-1 px-3 text-sm flex items-center gap-2 ${shop?.isOpen ? 'btn-error' : 'btn-success'}`}
          >
            <Power size={20} />
            {closing ? (shop?.isOpen ? 'Closing...' : 'Opening...') : (shop?.isOpen ? 'Close Shop' : 'Open Shop')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="p-6 flex items-center">
            <Package size={40} className="mr-4" />
            <div>
              <p className="text-lg font-semibold">Total Products</p>
              <p className="text-3xl font-bold">{analytics?.totalProducts || 0}</p>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="p-6 flex items-center">
            <ShoppingBag size={40} className="mr-4" />
            <div>
              <p className="text-lg font-semibold">Total Orders</p>
              <p className="text-3xl font-bold">{analytics?.orderStats.totalOrders || 0}</p>
              <p className="text-sm opacity-80">
                {analytics?.orderStats.totalPaidOrders || 0} Paid • {analytics?.orderStats.totalVerifiedOrders || 0} Verified
              </p>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <div className="p-6 flex items-center">
            <TrendingUp size={40} className="mr-4" />
            <div>
              <p className="text-lg font-semibold">Total Revenue</p>
              <p className="text-3xl font-bold">₹{analytics?.orderStats.totalRevenue || 0}</p>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-red-500 to-red-600 text-white">
          <div className="p-6 flex items-center">
            <AlertCircle size={40} className="mr-4" />
            <div>
              <p className="text-lg font-semibold">Expired Orders</p>
              <p className="text-3xl font-bold">{analytics?.orderStats.totalExpiredOrders || 0}</p>
              <p className="text-sm opacity-80">
                {analytics?.outOfStock || 0} Products Out of Stock
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4">Monthly Sales</h2>
          <div className="h-[300px]">
            <Line data={salesData} options={{ maintainAspectRatio: false }} />
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4">Top Products</h2>
          <div className="h-[300px]">
            <Bar 
              data={topProductsData} 
              options={{ 
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true
                  }
                }
              }} 
            />
          </div>
        </div>
      </div>

      <div className="card mt-6">
        <h3 className="text-xl font-semibold mb-4">Daily Order Statistics</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart data={analytics?.dailyStats || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="_id.date" 
                tickFormatter={(date: string) => new Date(date).toLocaleDateString('en-IN', { weekday: 'short' })}
              />
              <YAxis />
              <RechartsTooltip />
              <RechartsLegend />
              <RechartsBar dataKey="totalOrders" name="Total Orders" fill="#3B82F6" />
              <RechartsBar dataKey="paidOrders" name="Paid Orders" fill="#10B981" />
              <RechartsBar dataKey="verifiedOrders" name="Verified Orders" fill="#8B5CF6" />
              <RechartsBar dataKey="expiredOrders" name="Expired Orders" fill="#EF4444" />
            </RechartsBarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="card">
          <h3 className="text-xl font-semibold mb-4">Monthly Revenue</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={analytics?.monthlySales || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="_id.month" 
                  tickFormatter={(month: number) => new Date(2024, month - 1).toLocaleString('default', { month: 'short' })}
                />
                <YAxis />
                <RechartsTooltip />
                <RechartsLegend />
                <RechartsBar dataKey="total" name="Revenue" fill="#8B5CF6" />
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 className="text-xl font-semibold mb-4">Top Selling Products</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Units Sold</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analytics?.topProducts.map((product, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap">{product.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{product.totalSold}</td>
                    <td className="px-6 py-4 whitespace-nowrap">₹{product.totalRevenue}</td>
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