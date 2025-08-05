import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';
import { Package, AlertCircle, CreditCard, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Loader from '../../components/Loader';

interface Order {
  _id: string;
  order_id: string;
  createdAt: string;
  total_price: number;
  is_paid: boolean;
  is_verified: boolean;
  status: 'pending' | 'completed' | 'expired';
  order_items: Array<{
    name: string;
    quantity: number;
    image: string;
    price: number;
  }>;
}

const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingOrder, setProcessingOrder] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data } = await api.get('/api/orders/myorders');
      setOrders(data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load orders');
      setLoading(false);
    }
  };

  const handlePayment = async (order_id: string, amount: number) => {
    try {
      setProcessingOrder(order_id);
              const { data } = await api.post(`/orders/${order_id}/pay`);
      
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID||"rzp_test_RVKFS8WX756Anx",
        amount: amount * 100,
        currency: 'INR',
        name: 'Campus Kiosk',
        description: 'Payment for your order',
        order_id: data.razorpayorder_id,
        handler: async (response: any) => {
          try {
            await api.put(`/orders/${order_id}/pay`, {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            });
            
            await fetchOrders();
            toast.success('Payment successful');
          } catch (error: any) {
            toast.error(error.response?.data?.message || 'Payment verification failed');
          }
        },
        modal: {
          ondismiss: () => {
            setProcessingOrder(null);
          }
        }
      };

      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to initiate payment');
      setProcessingOrder(null);
    }
  };

  const handleCancel = async (order_id: string) => {
    try {
      setProcessingOrder(order_id);
              await api.put(`/orders/${order_id}/cancel`);
      await fetchOrders();
      toast.success('Order cancelled successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to cancel order');
    } finally {
      setProcessingOrder(null);
    }
  };

  const handleDelete = async (order_id: string) => {
    if (!window.confirm('Are you sure you want to delete this order?')) {
      return;
    }

    try {
              await api.delete(`/orders/${order_id}`);
      toast.success('Order deleted successfully');
      setOrders(orders.filter(order => order._id !== order_id));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete order');
    }
  };

  if (loading) {
    return <Loader />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto text-[var(--error)] mb-4" size={48} />
          <p className="text-[var(--error)] mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <Package size={48} className="text-[var(--gray-400)] mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-[var(--gray-600)] mb-2">
            No Orders Found
          </h2>
          <p className="text-[var(--gray-500)] mb-6">
            You haven't placed any orders yet.
          </p>
          <Link to="/" className="btn-primary">
            Start shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">My Orders</h1>

      <div className="grid gap-6">
        {orders.map((order) => (
          <div
            key={order._id}
            className="card hover:shadow-lg transition-shadow duration-300"
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm text-[var(--gray-500)]">
                    Order #{order.order_id}
                  </p>
                  <p className="text-sm text-[var(--gray-500)]">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">₹{order.total_price}</p>
                  <div className="flex gap-2 mt-1">
                    <span className={`badge ${
                      order.status === 'completed' ? 'badge-success' : 
                      order.status === 'expired' ? 'badge-error' : 
                      'badge-warning'
                    }`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                    {order.is_verified && (
                      <span className="badge badge-success">Verified</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {order.order_items.map((item, index) => (
                  <div key={index} className="flex items-center">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                    <div className="ml-4">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-[var(--gray-500)]">
                        {item.quantity} x ₹{item.price}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex gap-4">
                {order.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handlePayment(order._id, order.total_price)}
                      disabled={processingOrder === order._id}
                      className="flex-1 btn-primary"
                    >
                      {processingOrder === order._id ? (
                        <span className="flex items-center justify-center">
                          <Loader size={16} className="mr-2" />
                          Processing...
                        </span>
                      ) : (
                        <>
                          <CreditCard size={20} className="inline-block mr-2" />
                          Continue Payment
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleCancel(order._id)}
                      disabled={processingOrder === order._id}
                      className="flex-1 btn-secondary"
                    >
                      {processingOrder === order._id ? 'Processing...' : 'Cancel Order'}
                    </button>
                  </>
                )}

                {order.status === 'completed' && !order.is_verified && (
                  <Link
                    to={`/order/${order._id}`}
                    className="flex-1 btn-primary block text-center"
                  >
                    View QR Code
                  </Link>
                )}

                {order.status === 'expired' && (
                  <button
                    onClick={() => handleDelete(order._id)}
                    className="flex items-center justify-center text-[var(--error)] hover:text-[var(--error-dark)]"
                  >
                    <Trash2 size={20} className="mr-2" />
                    Delete Order
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrdersPage;