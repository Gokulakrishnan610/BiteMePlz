
import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api';
import { ArrowLeft, AlertCircle, Trash2, Wallet } from 'lucide-react';
// import { toast } from 'sonner';
import { useWallet } from '../../context/WalletContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import Navbar from '../../components/Navbar';

interface OrderItem {
  name: string;
  quantity: number;
  image: string;
  price: number;
}

interface Order {
  _id: string;
  id?: string;
  createdAt: string;
  created_at?: string;
  order_id?: string;
  total_price: number;
  is_paid: boolean;
  is_verified: boolean;
  order_items: OrderItem[];
  qr_code: string;
  qr_valid_until: string;
  balance_amount: number;
  final_validity: string;
  status: 'pending' | 'completed' | 'expired';
  payment_result?: {
    razorpay_payment_id?: string;
    method?: string;
    status: string;
  };
  expires_at?: string;
  shop?: { name?: string };
}

// All requests should go through the shared axios client `api` which is preconfigured

// (removed unused parseLocalDateTime helper)

const OrderDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { balance, refreshBalance } = useWallet();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [billHtml, setBillHtml] = useState<string | null>(null);
  const [billOpen, setBillOpen] = useState<boolean>(false);

  // Realtime: connect to the order's shop group and update when verified
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    // Require order to be loaded to know shopId; connect when order fetched
    const shopId = (order?.shop as any)?.id || (order?.shop as any)?._id
    const currentOrderId = (order?._id || (order as any)?.id)?.toString?.()
    if (!shopId || !currentOrderId) {
      // Cleanup if previously open
      if (wsRef.current) {
        try { wsRef.current.close() } catch {}
        wsRef.current = null
      }
      return
    }

    // Build URL
    const loc = window.location
    const wsProto = loc.protocol === 'https:' ? 'wss' : 'ws'
    const wsUrl = import.meta.env.PROD
      ? `wss://rec-kiosk.onrender.com/ws/orders/?shop_id=${shopId}`
      : `${wsProto}://${loc.hostname}:8000/ws/orders/?shop_id=${shopId}`

    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data?.type === 'order_verification' && String(data.shop_id) === String(shopId)) {
            const incomingDbId: string | undefined = (data.order_data?.id || data.order_data?._id || data.order_id)?.toString?.()
            const incomingCode: string | undefined = (data.order_data?.order_id || data.order_code || data.order_id)?.toString?.()
            const currentCode: string | undefined = (order?.order_id || (order as any)?.order_id)?.toString?.()
            const dbIdMatch = incomingDbId && currentOrderId && String(incomingDbId) === String(currentOrderId)
            const codeMatch = incomingCode && currentCode && String(incomingCode) === String(currentCode)
            if (dbIdMatch || codeMatch) {
              setOrder((prev) => {
                if (!prev) return prev
                return {
                  ...prev,
                  is_verified: Boolean(data.order_data?.is_verified ?? true),
                  status: data.order_data?.status || 'completed',
                }
              })
            }
          }
        } catch {}
      }

      ws.onclose = () => {
        wsRef.current = null
      }
    } catch {}

    return () => {
      if (wsRef.current) {
        try { wsRef.current.close() } catch {}
        wsRef.current = null
      }
    }
  }, [order?.shop, order?._id])

  // Removed periodic expiry check in this view to reduce warnings and background load

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const { data } = await api.get(`/api/orders/${id}/`);
        // Normalize fields to satisfy UI expectations
        const normalized: Order = {
          ...data,
          _id: (data._id || data.id)?.toString?.() || '',
          createdAt: data.createdAt || data.created_at || data.created_at?.toString?.() || '',
        };
        setOrder(normalized);
        // QR removed: do not parse qr_code
        // setQrMeta(null);
        // If multi-order, fetch grouped details to render all shops on this page
        try {
          const { data: gd } = await api.get(`/api/orders/${id}/group_details/`);
          if (gd && gd.shops) {
            // setGroupDetails(gd);
          } else {
            // setGroupDetails(null);
          }
        } catch {
          // setGroupDetails(null);
        }
        setLoading(false);
      } catch (err) {
        setError('Failed to load order details');
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id]);

  useEffect(() => {
    // QR removed: no expiry tracking
    // setIsQRExpired(false);
  }, [order]);

  useEffect(() => {
    if (order?.status === 'expired' && order.is_paid && !order.is_verified) {
      // toast removed
      refreshBalance();
    }
  }, [order, refreshBalance]);

  const handleDelete = async () => {
    if (!order || !window.confirm('Are you sure you want to delete this order?')) {
      return;
    }
    try {
      setDeleting(true);
      await api.delete(`/api/orders/${(order._id || order.id)}/`);
      // toast removed
      navigate('/orders', { replace: true });
    } catch (error: any) {
      // toast removed
      setDeleting(false);
    }
  };

  const handleCancelPending = async () => {
    if (!order || !window.confirm('Are you sure you want to cancel this pending order? This action cannot be undone.')) {
      return;
    }
    try {
      setDeleting(true);
      // For pending Razorpay orders, use the cancel endpoint
      if (order.payment_result?.method === 'razorpay' && order.payment_result?.razorpay_order_id) {
        await api.post('/api/orders/cancel-razorpay/', {
          razorpay_order_id: order.payment_result.razorpay_order_id
        });
      } else {
        // For other pending orders, just delete
        await api.delete(`/api/orders/${(order._id || order.id)}/`);
      }
      // toast removed
      navigate('/orders', { replace: true });
    } catch (error: any) {
      // toast removed
      setDeleting(false);
    }
  };

  // Removed unused formatTime helper

  const formatISTTime = (date: Date | string | null) => {
    if (!date) return 'Not Set';
    const d = new Date(date);
    return d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  };

  const canDelete = order?.is_verified || order?.status === 'expired';
  const isPending = !order?.is_paid && order?.status === 'pending';

  // UPDATED LOADING STATE
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-32 md:pt-40">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // UPDATED ERROR STATE
  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-32 md:pt-40">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex items-center justify-center h-64">
              <Card className="max-w-md w-full">
                <CardContent className="p-8 text-center">
                  <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
                  <p className="text-red-600 mb-4 text-lg">{error}</p>
                  <Button onClick={() => navigate('/orders', { replace: true })} className="bg-purple-600 hover:bg-purple-700">Back to Orders</Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // COMPLETELY NEW RETURN JSX
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="pt-20 md:pt-24">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <button onClick={() => navigate('/orders', { replace: true })} className="flex items-center text-purple-600 hover:text-purple-700 transition-colors">
              <ArrowLeft size={20} className="mr-2" />
              <span className="font-medium">Back to Orders</span>
            </button>
            <div className="flex gap-2">
              {isPending && (
                <Button onClick={handleCancelPending} disabled={deleting} variant="destructive" className="flex items-center">
                  <Trash2 size={20} className="mr-2" />
                  {deleting ? 'Cancelling...' : 'Cancel Order'}
                </Button>
              )}
              {canDelete && !isPending && (
                <Button onClick={handleDelete} disabled={deleting} variant="destructive" className="flex items-center">
                  <Trash2 size={20} className="mr-2" />
                  {deleting ? 'Deleting...' : 'Delete Order'}
                </Button>
              )}
              {order.is_paid && (
                <Button
                  onClick={async () => {
                    try {
                      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
                      const { data } = await api.get(`/api/orders/${order._id}/bill/`, { params: { tz }, headers: { 'X-Timezone': tz } })
                      setBillHtml(data.html || '')
                      setBillOpen(true)
                    } catch {}
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Bill
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Order Header */}
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-wide mb-4">
                        {order.order_id ? `Order #${order.order_id}` : `Order #${((order._id || order.id || '').toString()).slice(-8)}`}
                      </CardTitle>
                      {order.shop?.name && (
                        <div className="mb-3 text-sm text-gray-700">
                          <span className="font-semibold">Shop:</span> {order.shop?.name}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2 mb-4">
                        <Badge
                          variant={order.is_paid ? "default" : "destructive"}
                          className={order.is_paid ? "bg-green-600 hover:bg-green-700" : ""}
                        >
                          {order.is_paid ? 'Paid' : 'Pending'}
                        </Badge>
                        <Badge
                          variant={order.is_verified ? "default" : "secondary"}
                          className={
                            order.is_verified ? "bg-green-600 hover:bg-green-700" : "bg-yellow-500 hover:bg-yellow-600"
                          }
                        >
                          {order.is_verified ? 'Verified' : 'Not Verified'}
                        </Badge>
                        <Badge
                          variant={
                            order.status === 'completed'
                              ? "default"
                              : order.status === 'expired'
                                ? "destructive"
                                : "secondary"
                          }
                          className={
                            order.status === 'completed'
                              ? "bg-green-600 hover:bg-green-700"
                              : order.status === 'expired'
                                ? ""
                                : "bg-yellow-500 hover:bg-yellow-600"
                          }
                        >
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>Placed on {new Date(order.createdAt || (order as any).created_at).toLocaleString()}</p>
                    {/* QR removed */}
                    {order.payment_result?.razorpay_payment_id && (
                      <p>Payment ID: {order.payment_result.razorpay_payment_id}</p>
                    )}
                    {order.payment_result?.method === 'balance' && <p>Payment Method: Wallet Balance</p>}
                  </div>
                </CardContent>
              </Card>

              {/* Pending Order Warning */}
              {isPending && (
                <div className="bg-orange-50 border-l-4 border-orange-500 text-orange-800 p-4 rounded">
                  <div className="flex items-start">
                    <AlertCircle className="mr-3 mt-0.5 flex-shrink-0" size={20} />
                    <div>
                      <strong className="font-semibold">Payment Pending</strong>
                      <p className="mt-1 text-sm">
                        This order is awaiting payment completion. If you did not complete the payment or the payment failed, 
                        you can cancel this order using the "Cancel Order" button above. The order will be automatically 
                        removed after 10 minutes if payment is not completed.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Order Items (Grouped if multi-order) */}
              {
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl font-semibold">Order Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {order.order_items.map((item, index) => (
                        <div key={index} className="flex items-center p-4 bg-gray-50 rounded-lg">
                          <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                            <img
                              src={item.image || 'https://images.pexels.com/photos/264636/pexels-photo-264636.jpeg'}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="ml-4 flex-1">
                            <h3 className="font-semibold text-gray-900">{item.name}</h3>
                            <p className="text-sm text-gray-600">
                              {item.quantity} x ₹{item.price}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">₹{item.quantity * item.price}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold text-gray-900">Total</span>
                        <span className="text-lg font-bold text-purple-600">₹{order.total_price}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              }
                {order.status === 'expired' && !order.is_verified && (
                  <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded mb-4">
                    <strong>Refund Policy:</strong><br/>
                    <span>
                      <ul className="list-disc pl-5 mt-1">
                        <li>If you paid using <b>wallet balance</b> and your order expired without being verified, your amount is refunded automatically to your wallet.</li>
                        <li>If you paid using <b>Razorpay</b> or other payment gateways and your order expired, <b>the amount is <u>not</u> refunded</b>.</li>
                        <li>If your order was verified, no refund is processed for any payment method.</li>
                      </ul>
                    </span>
                  </div>
                )}
            </div>

            {/* Sidebar */}
            {order.is_paid && (
              <div className="lg:col-span-1 space-y-6">
                {/* Order Status */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl font-semibold">Order Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Items Purchased</p>
                        <div className="space-y-1">
                          {order.order_items.map((it, idx) => (
                            <p key={idx} className="font-medium text-gray-900">
                              {it.name}
                              <span className="text-gray-600"> × {it.quantity}</span>
                            </p>
                          ))}
                        </div>
                      </div>

                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Amount Paid</p>
                        <p className="font-medium text-gray-900">₹{order.total_price}</p>
                      </div>

                      {/* QR removed */}

                      

                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Current Wallet Balance</p>
                        <div className="flex items-center">
                          <Wallet size={16} className="mr-2 text-gray-500" />
                          <p className="font-medium text-gray-900">₹{Number(balance || 0).toFixed(2)}</p>
                        </div>
                      </div>

                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Current Time</p>
                        <p className="font-medium text-gray-900">{formatISTTime(new Date())}</p>
                      </div>

                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Valid Until</p>
                        <p className="font-medium text-gray-900">{formatISTTime(order.expires_at || order.qr_valid_until || null)}</p>
                      </div>

                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Final Validity</p>
                        <p className="font-medium text-gray-900">{formatISTTime(order.final_validity || order.shop?.final_validity_time || order.expires_at || null)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* QR removed: show after-payment instructions */}
                {order.is_paid && !order.is_verified && (
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center mb-2">
                        <AlertCircle className="text-purple-600 mr-2" size={20} />
                        <p className="font-semibold text-gray-900">Order Placed</p>
                      </div>
                      <p className="text-gray-700 text-sm">
                        Present your order ID at the counter for fulfillment. No QR required.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {billOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white w-[95vw] max-w-3xl max-h-[85vh] rounded-lg shadow-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-semibold text-gray-900">Bill</h3>
              <button onClick={() => setBillOpen(false)} className="text-gray-600 hover:text-gray-900">Close</button>
            </div>
            <div className="overflow-auto" style={{maxHeight: '70vh'}}>
              <div dangerouslySetInnerHTML={{ __html: billHtml || '' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetailsPage;
