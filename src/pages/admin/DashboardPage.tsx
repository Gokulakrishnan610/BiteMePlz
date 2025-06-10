import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BarChart2, Users, Store, TrendingUp } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface DashboardStats {
  totalUsers: number;
  totalShops: number;
  totalOrders: number;
  recentOrders: Array<{
    _id: string;
    totalPrice: number;
    createdAt: string;
  }>;
}

const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real application, you would fetch this data from your API
    const mockStats = {
      totalUsers: 150,
      totalShops: 12,
      totalOrders: 450,
      recentOrders: Array.from({ length: 7 }, (_, i) => ({
        _id: `order-${i}`,
        totalPrice: Math.floor(Math.random() * 1000) + 500,
        createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString()
      }))
    };

    setStats(mockStats);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--primary)]"></div>
      </div>
    );
  }

  const chartData = {
    labels: stats?.recentOrders.map(order => 
      new Date(order.createdAt).toLocaleDateString()
    ).reverse(),
    datasets: [
      {
        label: 'Daily Sales',
        data: stats?.recentOrders.map(order => order.totalPrice).reverse(),
        fill: false,
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1
      }
    ]
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="p-6 flex items-center">
            <Users size={40} className="mr-4" />
            <div>
              <p className="text-lg font-semibold">Total Users</p>
              <p className="text-3xl font-bold">{stats?.totalUsers}</p>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="p-6 flex items-center">
            <Store size={40} className="mr-4" />
            <div>
              <p className="text-lg font-semibold">Active Shops</p>
              <p className="text-3xl font-bold">{stats?.totalShops}</p>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <div className="p-6 flex items-center">
            <TrendingUp size={40} className="mr-4" />
            <div>
              <p className="text-lg font-semibold">Total Orders</p>
              <p className="text-3xl font-bold">{stats?.totalOrders}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-4">Sales Overview</h2>
        <div className="h-[300px]">
          <Line data={chartData} options={{ maintainAspectRatio: false }} />
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;