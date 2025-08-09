import React, { useEffect, useState } from 'react';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Package, ShoppingBag, TrendingUp, AlertCircle, Power, Clock, QrCode, ArrowLeft } from 'lucide-react';
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

interface shop {
  id: string;
  _id?: string;
  name: string;
  location: string;
  description?: string;
  image?: string;
  shop_admin_id?: string;
  is_active: boolean;
  is_open: boolean;
  final_validity_time: string;
  next_opening_time: string;
  qr_validity_minutes: number;
}

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [shop, setshop] = useState<shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [final_validity, setfinal_validity] = useState('17:00');
  const [updating, setUpdating] = useState(false);
  const [qrValidityMinutes, setQrValidityMinutes] = useState('20');
  const [updatingQR, setUpdatingQR] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!user?.shop) {
  
          setError('No shop associated with this account');
          setLoading(false);
          return;
        }
        
        
        
        const shopRes = await api.get(`/api/shops/${user.shop}/`);
        
        // Fetch analytics from backend endpoint
        const analyticsRes = await api.get(`/api/shops/${user.shop}/analytics/`);
        setAnalytics(analyticsRes.data);
        setshop(shopRes.data);
        
        // Handle final validity time
        if (shopRes.data.final_validity_time) {
          const d = new Date(shopRes.data.final_validity_time);
          setfinal_validity(
            d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
          );
        } else {
          setfinal_validity('17:00');
        }
        
        // Handle QR validity minutes
        if (shopRes.data.qr_validity_minutes) {
          setQrValidityMinutes(shopRes.data.qr_validity_minutes.toString());
        } else {
          setQrValidityMinutes('20');
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching shop data:', err);
        setError('Failed to load data');
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleToggleshop = async () => {
    if (!user?.shop) return;
    try {
      setClosing(true);
              const { data } = await api.post(`/api/shops/${user.shop}/toggle/`);
      setshop(data);
      toast.success(data.is_open ? 'Shop opened' : 'Shop closed');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to toggle shop status');
    } finally {
      setClosing(false);
    }
  };

  const updatefinal_validity = async () => {
    try {
      if (!user?.shop || !shop) return;
      setUpdating(true);
      // Get current date
      const now = new Date();
      const [hh, mm] = final_validity.split(":");
      // Create a new date for the validity time
      const validityDate = new Date();
      validityDate.setHours(Number(hh), Number(mm), 0, 0);
      // If the time is earlier than current time, set it for tomorrow
      if (validityDate <= now) {
        validityDate.setDate(validityDate.getDate() + 1);
      }
      // Send all required fields
      const { data } = await api.put(`/api/shops/${user.shop}/`, {
        name: shop.name,
        location: shop.location,
        shop_admin_id: user._id,
        final_validity_time: validityDate.toISOString(),
        next_opening_time: shop.next_opening_time,
        qr_validity_minutes: shop.qr_validity_minutes,
        // The following fields are commented out because they do not exist on the 'shop' type.
        // description: shop.description || "",
        // image: shop.image || "",
        // is_active: shop.is_active !== undefined ? shop.is_active : true,
        // is_open: shop.is_open !== undefined ? shop.is_open : true,
      });
      // Update local state with the new time
      setfinal_validity(
        data.final_validity_time
          ? new Date(data.final_validity_time).toLocaleTimeString("en-US", {
              hour12: false,
              hour: "2-digit",
              minute: "2-digit",
            })
          : "17:00"
      );
      setshop(data);
      toast.success("Final validity time updated successfully");
    } catch (error: any) {
      toast.error(error?.message || "Failed to update final validity time");
    } finally {
      setUpdating(false);
    }
  };

  const updateQRValidity = async () => {
    try {
      if (!user?.shop || !shop) return;
      const minutes = parseInt(qrValidityMinutes);
      if (isNaN(minutes) || minutes < 1 || minutes > 60) {
        throw new Error("QR validity must be between 1 and 60 minutes");
      }
      setUpdatingQR(true);
      // Send all required fields
      const { data } = await api.put(`/api/shops/${user.shop}/`, {
        name: shop.name,
        location: shop.location,
        shop_admin_id: user._id,
        final_validity_time: shop.final_validity_time,
        next_opening_time: shop.next_opening_time,
        qr_validity_minutes: minutes,
        description: shop.description || "",
        image: shop.image || "",
        is_active: shop.is_active !== undefined ? shop.is_active : true,
        is_open: shop.is_open !== undefined ? shop.is_open : true,
      });
      setshop(data);
      setQrValidityMinutes(data.qr_validity_minutes.toString());
      toast.success("QR validity time updated successfully");
    } catch (error: any) {
      toast.error(error?.message || "Failed to update QR validity time");
    } finally {
      setUpdatingQR(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
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
        <div className="flex items-center mb-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200 mr-2"
            title="Go to Home"
          >
            <ArrowLeft size={20} className="text-gray-700 dark:text-gray-300" />
          </button>
          <h1 className="text-2xl font-bold">Shop Admin Dashboard</h1>
        </div>
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          {/* Final Validity Time Control */}
          <div className="card p-4 flex items-center gap-3 min-w-[280px]">
            <Clock size={20} className="text-[var(--accent-purple)] flex-shrink-0" />
            <div className="flex-1">
              <label className="form-label text-xs mb-1 block">Final Validity Time</label>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={final_validity}
                  onChange={(e) => setfinal_validity(e.target.value)}
                  className="form-control text-sm py-1 px-2 min-w-[100px]"
                />
                <button
                  onClick={updatefinal_validity}
                  disabled={updating}
                  className="btn-primary py-1 px-3 text-sm whitespace-nowrap"
                >
                  {updating ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>

          {/* QR Validity Control */}
          <div className="card p-4 flex items-center gap-3 min-w-[250px]">
            <QrCode size={20} className="text-[var(--accent-purple)] flex-shrink-0" />
            <div className="flex-1">
              <label className="form-label text-xs mb-1 block">QR Validity (minutes)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={qrValidityMinutes}
                  onChange={(e) => setQrValidityMinutes(e.target.value)}
                  min="1"
                  max="60"
                  className="form-control text-sm py-1 px-2 w-16"
                />
                <button
                  onClick={updateQRValidity}
                  disabled={updatingQR}
                  className="btn-primary py-1 px-3 text-sm whitespace-nowrap"
                >
                  {updatingQR ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>

          {/* shop Toggle */}
          <button
            onClick={handleToggleshop}
            disabled={closing}
            className={`card p-4 flex items-center gap-3 transition-all duration-200 hover:scale-105 ${
              shop?.is_open 
                ? 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700' 
                : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700'
            }`}
          >
            <Power size={20} />
            <span className="font-medium">
              {closing ? (shop?.is_open ? 'Closing...' : 'Opening...') : (shop?.is_open ? 'Close shop' : 'Open shop')}
            </span>
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
          <h2 className="text-xl font-semibold mb-4 text-[var(--primary-text)]">Monthly Sales</h2>
          <div className="h-[300px]">
            <Line data={salesData} options={{ maintainAspectRatio: false }} />
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4 text-[var(--primary-text)]">Top Products</h2>
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
        <div className="card-header">
          <h3 className="text-xl font-semibold text-[var(--primary-text)]">Daily Order Statistics</h3>
        </div>
        <div className="card-body">
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="card">
          <div className="card-header">
            <h3 className="text-xl font-semibold text-[var(--primary-text)]">Monthly Revenue</h3>
          </div>
          <div className="card-body">
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
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="text-xl font-semibold text-[var(--primary-text)]">Top Selling Products</h3>
          </div>
          <div className="card-body">
            <div className="enhanced-table">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left">Product</th>
                    <th className="text-right">Units Sold</th>
                    <th className="text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics?.topProducts.map((product, index) => (
                    <tr key={index}>
                      <td className="font-medium text-[var(--primary-text)]">{product.name}</td>
                      <td className="text-right text-[var(--secondary-text)]">{product.totalSold}</td>
                      <td className="text-right text-[var(--accent-purple)] font-medium">₹{product.totalRevenue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;