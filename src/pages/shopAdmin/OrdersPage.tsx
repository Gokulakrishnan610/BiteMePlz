import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ShoppingBag, AlertCircle, ArrowUpDown, Calendar, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import Loader from '../../components/Loader';

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  _id: string;
  user: {
    name: string;
    email: string;
  };
  orderItems: OrderItem[];
  totalPrice: number;
  isPaid: boolean;
  isVerified: boolean;
  createdAt: string;
}

type SortField = 'date' | 'total' | 'status';
type SortOrder = 'asc' | 'desc';

const OrdersPage: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedDate, setSelectedDate] = useState<string>('');

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const { data } = await axios.get(`/api/orders/shop/${user?.shop}`);
        setOrders(data);
        setLoading(false);
      } catch (err) {
        setError('Failed to load orders');
        setLoading(false);
      }
    };

    if (user?.shop) {
      fetchOrders();
    }
  }, [user]);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleDateFilter = (date: string) => {
    setSelectedDate(date);
  };

  const clearDateFilter = () => {
    setSelectedDate('');
  };

  const filteredOrders = selectedDate
    ? orders.filter(order => {
        const orderDate = new Date(order.createdAt).toLocaleDateString();
        const filterDate = new Date(selectedDate).toLocaleDateString();
        return orderDate === filterDate;
      })
    : orders;

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case 'date':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case 'total':
        comparison = a.totalPrice - b.totalPrice;
        break;
      case 'status':
        const statusA = `${a.isPaid ? '1' : '0'}${a.isVerified ? '1' : '0'}`;
        const statusB = `${b.isPaid ? '1' : '0'}${b.isVerified ? '1' : '0'}`;
        comparison = statusA.localeCompare(statusB);
        break;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  if (loading) {
    return <Loader />;
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold">Orders</h1>
        <div className="flex items-center gap-2 bg-black border border-purple-500 rounded-lg p-3 shadow-sm">
          <Calendar size={20} className="text-purple-400" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => handleDateFilter(e.target.value)}
            className="bg-black text-white border-none focus:ring-purple-500 p-0"
          />
          {selectedDate && (
            <button
              onClick={clearDateFilter}
              className="text-gray-400 hover:text-white"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Items</th>
                <th
                  className={`cursor-pointer transition hover:bg-purple-100 ${
                    sortField === 'total' ? 'bg-purple-100 font-semibold text-purple-800' : ''
                  }`}
                  onClick={() => handleSort('total')}
                >
                  <div className="flex items-center">
                    Total
                    <ArrowUpDown size={16} className="ml-1 text-purple-700" />
                  </div>
                </th>
                <th
                  className={`cursor-pointer transition hover:bg-purple-100 ${
                    sortField === 'status' ? 'bg-purple-100 font-semibold text-purple-800' : ''
                  }`}
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center">
                    Status
                    <ArrowUpDown size={16} className="ml-1 text-purple-700" />
                  </div>
                </th>
                <th
                  className={`cursor-pointer transition hover:bg-purple-100 ${
                    sortField === 'date' ? 'bg-purple-100 font-semibold text-purple-800' : ''
                  }`}
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center">
                    Date
                    <ArrowUpDown size={16} className="ml-1 text-purple-700" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedOrders.map((order) => (
                <tr key={order._id}>
                  <td className="font-medium">#{order._id.slice(-8)}</td>
                  <td>
                    <div>
                      <p className="font-medium">{order.user.name}</p>
                      <p className="text-sm text-[var(--gray-500)]">{order.user.email}</p>
                    </div>
                  </td>
                  <td>
                    <div className="space-y-1">
                      {order.orderItems.map((item, index) => (
                        <p key={index} className="text-sm">
                          {item.quantity}x {item.name}
                        </p>
                      ))}
                    </div>
                  </td>
                  <td className="font-medium">₹{order.totalPrice}</td>
                  <td>
                    <div className="space-y-1">
                      <span
                        className={`badge ${
                          order.isPaid ? 'badge-success' : 'badge-error'
                        }`}
                      >
                        {order.isPaid ? 'Paid' : 'Pending'}
                      </span>
                      <span
                        className={`badge ${
                          order.isVerified ? 'badge-success' : 'badge-warning'
                        }`}
                      >
                        {order.isVerified ? 'Verified' : 'Not Verified'}
                      </span>
                    </div>
                  </td>
                  <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {orders.length === 0 && (
          <div className="text-center py-12">
            <ShoppingBag size={48} className="text-[var(--gray-400)] mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-[var(--gray-600)] mb-2">
              No Orders Yet
            </h2>
            <p className="text-[var(--gray-500)]">
              Orders will appear here once customers make purchases.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersPage;
