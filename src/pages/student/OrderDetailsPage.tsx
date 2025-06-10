import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, AlertCircle, QrCode, Trash2, Clock, Wallet } from 'lucide-react';
import QRCode from 'react-qr-code';
import toast from 'react-hot-toast';
import { useWallet } from '../../context/WalletContext';

interface OrderItem {
  name: string;
  quantity: number;
  image: string;
  price: number;
}

interface Order {
  _id: string;
  createdAt: string;
  totalPrice: number;
  isPaid: boolean;
  isVerified: boolean;
  orderItems: OrderItem[];
  qrCode: string;
  qrValidUntil: string;
  balanceAmount: number;
  finalValidity: string;
  status: 'pending' | 'completed' | 'expired';
  paymentResult: {
    razorpay_payment_id: string;
    status: string;
  };
}

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function parseLocalDateTime(dateString: string) {
  if (!dateString) return null;
  if (dateString instanceof Date) return dateString;
  // Remove milliseconds and timezone if present
  const cleanString = dateString.split('.')[0].replace('Z', '');
  const [datePart, timePart] = cleanString.split('T');
  if (!datePart || !timePart) return null;
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour = 0, minute = 0, second = 0] = timePart.split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute, second);
}

const OrderDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { balance, refreshBalance } = useWallet();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isQRExpired, setIsQRExpired] = useState(false);

  useEffect(() => {
    const checkOrderExpiry = async () => {
      if (
        order?.isPaid &&
        !order.isVerified &&
        order.balanceAmount > 0 &&
        order.status !== 'expired'
      ) {
        try {
          const expiryRes = await axios.get(`${baseURL}/api/orders/check-expiry/${order._id}`);
          if (expiryRes.data.balance !== undefined) {
            await refreshBalance();
          } else {
            await refreshBalance();
          }
          const { data } = await axios.get(`${baseURL}/api/orders/${id}`);
          setOrder(data);
          if (data.status === 'expired') {
            toast.success('Order expired. Amount refunded to wallet.');
          }
        } catch (error: any) {
          if (error?.response?.status !== 404) {
            console.error('Failed to check order expiry:', error);
          }
        }
      }
    };

    checkOrderExpiry();
  }, [id, order, refreshBalance]);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const { data } = await axios.get(`/api/orders/${id}`);
        setOrder(data);
        setLoading(false);
      } catch (err) {
        setError('Failed to load order details');
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id]);

  useEffect(() => {
    if (!order?.qrValidUntil) return;

    const checkAndSetExpiry = () => {
      const now = new Date().getTime();
      const validUntil = new Date(order.qrValidUntil).getTime();
      const difference = validUntil - now;

      if (difference <= 0) {
        setIsQRExpired(true);
        setTimeLeft(0);
      } else {
        setIsQRExpired(false);
        setTimeLeft(Math.floor(difference / 1000));
      }
    };

    // Initial check
    checkAndSetExpiry();

    const interval = setInterval(checkAndSetExpiry, 1000);

    return () => clearInterval(interval);
  }, [order]);

  useEffect(() => {
    if (order?.status === 'expired' && order.isPaid && !order.isVerified) {
      toast.success('Order expired. Amount refunded to wallet.');
      refreshBalance();
    }
  }, [order, refreshBalance]);

  const handleDelete = async () => {
    if (!order || !window.confirm('Are you sure you want to delete this order?')) {
      return;
    }

    try {
      setDeleting(true);
      await axios.delete(`/api/orders/${order._id}`);
      toast.success('Order deleted successfully');
      navigate('/orders');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete order');
      setDeleting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatISTTime = (date: Date | string | null) => {
    if (!date) return 'Not Set';
    const d = new Date(date);
    return d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  };

  const canDelete = order?.isVerified || order?.status === 'expired';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto text-[var(--error)] mb-4" size={48} />
          <p className="text-[var(--error)] mb-4">{error}</p>
          <Link to="/orders" className="btn-primary">
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <Link
          to="/orders"
          className="flex items-center text-[var(--primary)] hover:underline"
        >
          <ArrowLeft size={20} className="mr-2" />
          Back to Orders
        </Link>
        {canDelete && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="btn-error flex items-center"
          >
            <Trash2 size={20} className="mr-2" />
            {deleting ? 'Deleting...' : 'Delete Order'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="card mb-8">
            <div className="p-6">
              <h1 className="text-2xl font-bold mb-4">
                Order #{order._id.slice(-8)}
              </h1>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className={`badge ${
                  order.isPaid ? 'badge-success' : 'badge-error'
                }`}>
                  {order.isPaid ? 'Paid' : 'Pending'}
                </span>
                <span className={`badge ${
                  order.isVerified ? 'badge-success' : 'badge-warning'
                }`}>
                  {order.isVerified ? 'Verified' : 'Not Verified'}
                </span>
                <span className={`badge ${
                  order.status === 'completed' ? 'badge-success' : 
                  order.status === 'expired' ? 'badge-error' : 
                  'badge-warning'
                }`}>
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>
              </div>
              <p className="text-[var(--gray-600)]">
                Placed on {new Date(order.createdAt).toLocaleString()}
              </p>
              {order.paymentResult?.razorpay_payment_id && (
                <p className="text-[var(--gray-600)]">
                  Payment ID: {order.paymentResult.razorpay_payment_id}
                </p>
              )}
            </div>
          </div>

          <div className="card">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Order Items</h2>
              <div className="space-y-4">
                {order.orderItems.map((item, index) => (
                  <div key={index} className="flex items-center">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div className="ml-4 flex-1">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-[var(--gray-600)]">
                        {item.quantity} x ₹{item.price}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        ₹{item.quantity * item.price}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-6 border-t">
                <div className="flex justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="font-semibold">₹{order.totalPrice}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {order.isPaid && (
          <div className="lg:col-span-1">
            <div className="card mb-6">
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-4">Order Status</h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-[var(--gray-600)]">Item Purchased</p>
                    <p className="font-medium">{order.orderItems[0]?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--gray-600)]">Amount Paid</p>
                    <p className="font-medium">₹{order.totalPrice}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--gray-600)]">QR Code Valid Until</p>
                    <div className="flex items-center">
                      <Clock size={16} className="mr-2" />
                      <p className={`font-medium ${isQRExpired ? 'text-[var(--error)]' : ''}`}>
                        {isQRExpired ? 'Expired' : formatTime(timeLeft)}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--gray-600)]">Balance Remaining</p>
                    <div className="flex items-center">
                      <Wallet size={16} className="mr-2" />
                      <p className="font-medium">₹{order.balanceAmount}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--gray-600)]">Current Wallet Balance</p>
                    <div className="flex items-center">
                      <Wallet size={16} className="mr-2" />
                      <p className="font-medium">₹{balance}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--gray-600)]">Current Time</p>
                    <p className="font-medium">
                      {formatISTTime(new Date())}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--gray-600)]">Final Validity</p>
                    <p className="font-medium">
                      {formatISTTime(order?.finalValidity)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {order.qrCode && !isQRExpired && !order.isVerified && (
              <div className="card">
                <div className="p-6">
                  <div className="flex items-center mb-4">
                    <QrCode size={24} className="text-[var(--primary)] mr-2" />
                    <h2 className="text-xl font-semibold">Verification QR</h2>
                  </div>
                  <div className="bg-white p-4 rounded-lg flex justify-center">
                    <QRCode value={order.qrCode} size={200} />
                  </div>
                  <p className="text-sm text-[var(--gray-600)] mt-4 text-center">
                    Show this QR code to the shop staff to verify your purchase
                  </p>
                </div>
              </div>
            )}

            {isQRExpired && !order.isVerified && (
              <div className="card bg-[var(--error)] bg-opacity-10">
                <div className="p-6">
                  <p className="text-black text-center font-medium">
                    QR code has expired. You can still use your balance until {parseLocalDateTime(order.finalValidity).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderDetailsPage;