
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api';
import { ArrowLeft, AlertCircle, QrCode, Trash2, Clock, Wallet } from 'lucide-react';
import QRCode from 'react-qr-code';
import toast from 'react-hot-toast';
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

function parseLocalDateTime(dateString: string | Date) {
  if (!dateString) return null;
  if (dateString instanceof Date) return dateString;
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
  // Removed unused timeLeft state (timer display not used)
  const [isQRExpired, setIsQRExpired] = useState(false);
  const [qrMeta, setQrMeta] = useState<any>(null);
  const [groupDetails, setGroupDetails] = useState<{
    combined_qr: string;
    total_price: string;
    shops: Array<{
      order_id: string;
      shop_id: string;
      shop_name: string;
      is_paid: boolean;
      is_verified: boolean;
      total_price: string;
      items: OrderItem[];
    }>;
  } | null>(null);

  useEffect(() => {
    const checkOrderExpiry = async () => {
      if (
        order?.is_paid &&
        !order.is_verified &&
        order.balance_amount > 0 &&
        order.status !== 'expired'
      ) {
        try {
          const expiryRes = await api.get(`/api/orders/check-expiry/${order._id}/`);
          if (expiryRes.data.balance !== undefined) {
            await refreshBalance();
          } else {
            await refreshBalance();
          }
          const { data } = await api.get(`/api/orders/${id}/`);
          setOrder(data);
          if (data.status === 'expired') {
            toast.success('Order expired. Amount refunded to wallet.');
          }
        } catch (error: any) {
          if (error?.response?.status !== 404) {
            // silent fail for background expiry check
          }
        }
      }
    };

    checkOrderExpiry();
  }, [id, order, refreshBalance]);

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
        // Parse QR payload for UI hints
        try {
          const meta = JSON.parse(data.qr_code || '{}');
          setQrMeta(meta && typeof meta === 'object' ? meta : null);
        } catch {
          setQrMeta(null);
        }
        // If multi-order, fetch grouped details to render all shops on this page
        try {
          const { data: gd } = await api.get(`/api/orders/${id}/group_details/`);
          if (gd && gd.shops) {
            setGroupDetails(gd);
          } else {
            setGroupDetails(null);
          }
        } catch {
          setGroupDetails(null);
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
    if (!order?.qr_valid_until) return;
    const checkAndSetExpiry = () => {
      const now = new Date().getTime();
      const validUntil = new Date(order.qr_valid_until).getTime();
      const difference = validUntil - now;
      if (difference <= 0) {
        setIsQRExpired(true);
      } else {
        setIsQRExpired(false);
      }
    };

    checkAndSetExpiry();
    const interval = setInterval(checkAndSetExpiry, 1000);
    return () => clearInterval(interval);
  }, [order]);

  useEffect(() => {
    if (order?.status === 'expired' && order.is_paid && !order.is_verified) {
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
      await api.delete(`/api/orders/${(order._id || order.id)}/`);
      toast.success('Order deleted successfully');
      navigate('/orders', { replace: true });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete order');
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
            {canDelete && (
              <Button onClick={handleDelete} disabled={deleting} variant="destructive" className="flex items-center">
                <Trash2 size={20} className="mr-2" />
                {deleting ? 'Deleting...' : 'Delete Order'}
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Order Header */}
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-2xl font-bold text-gray-900 mb-4">
                        {`Order #${((order._id || order.id || '').toString()).slice(-8)}`}
                      </CardTitle>
                      {(order.shop?.name || qrMeta?.shop_name) && (
                        <div className="mb-3 text-sm text-gray-700">
                          <span className="font-semibold">Shop:</span> {order.shop?.name || qrMeta?.shop_name}
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
                    {qrMeta?.type === 'multi_order' && groupDetails && (
                      <div className="mt-2 p-3 bg-blue-50 text-blue-800 rounded">
                        This QR contains multiple shop orders. All shops and items are shown below.
                      </div>
                    )}
                    {order.payment_result?.razorpay_payment_id && (
                      <p>Payment ID: {order.payment_result.razorpay_payment_id}</p>
                    )}
                    {order.payment_result?.method === 'balance' && <p>Payment Method: Wallet Balance</p>}
                  </div>
                </CardContent>
              </Card>

              {/* Order Items (Grouped if multi-order) */}
              {qrMeta?.type === 'multi_order' && groupDetails ? (
                <>
                  {groupDetails.shops.map((shop, sidx) => (
                    <Card key={sidx}>
                      <CardHeader>
                        <CardTitle className="text-xl font-semibold">{shop.shop_name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {shop.items.map((item, index) => (
                            <div key={index} className="flex items-center p-4 bg-gray-50 rounded-lg">
                              <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                                <img
                                  src={(item as any).image || 'https://images.pexels.com/photos/264636/pexels-photo-264636.jpeg'}
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
                                <p className="font-semibold text-gray-900">₹{item.quantity * (item as any).price}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-6 pt-6 border-t border-gray-200">
                          <div className="flex justify-between items-center">
                            <span className="text-lg font-semibold text-gray-900">Shop Total</span>
                            <span className="text-lg font-bold text-purple-600">₹{shop.total_price}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-xl font-semibold">Grand Total</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold text-gray-900">Total</span>
                        <span className="text-lg font-bold text-purple-600">₹{groupDetails.total_price}</span>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
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
              )}
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
                          {qrMeta?.type === 'multi_order' && groupDetails ? (
                            groupDetails.shops.map((shop, sidx) => (
                              <div key={sidx} className="space-y-1">
                                {shop.items.map((it, idx) => (
                                  <p key={`${sidx}-${idx}`} className="font-medium text-gray-900">
                                    <span className="text-gray-500 mr-1">{shop.shop_name} —</span>
                                    {it.name}
                                    <span className="text-gray-600"> × {it.quantity}</span>
                                  </p>
                                ))}
                              </div>
                            ))
                          ) : (
                            order.order_items.map((it, idx) => {
                              const shopLabel = (it as any).shop_name || order.shop?.name || qrMeta?.shop_name;
                              return (
                                <p key={idx} className="font-medium text-gray-900">
                                  {shopLabel && <span className="text-gray-500 mr-1">{shopLabel} —</span>}
                                  {it.name}
                                  <span className="text-gray-600"> × {it.quantity}</span>
                                </p>
                              );
                            })
                          )}
                        </div>
                      </div>

                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Amount Paid</p>
                        <p className="font-medium text-gray-900">₹{qrMeta?.type === 'multi_order' && groupDetails ? groupDetails.total_price : order.total_price}</p>
                      </div>

                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">QR Code Valid Until</p>
                        <div className="flex items-center">
                          <Clock size={16} className="mr-2 text-gray-500" />
                          <p className={`font-medium ${isQRExpired ? 'text-red-600' : 'text-gray-900'}`}>
                            {isQRExpired ? 'Expired' : formatISTTime(order.qr_valid_until ?? order.expires_at ?? null)}
                          </p>
                        </div>
                      </div>

                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Balance Remaining</p>
                        <div className="flex items-center">
                          <Wallet size={16} className="mr-2 text-gray-500" />
                          <p className="font-medium text-gray-900">₹{order.balance_amount}</p>
                        </div>
                      </div>

                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Current Wallet Balance</p>
                        <div className="flex items-center">
                          <Wallet size={16} className="mr-2 text-gray-500" />
                          <p className="font-medium text-gray-900">₹{balance}</p>
                        </div>
                      </div>

                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Current Time</p>
                        <p className="font-medium text-gray-900">{formatISTTime(new Date())}</p>
                      </div>

                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Final Validity</p>
                        <p className="font-medium text-gray-900">{formatISTTime(order?.final_validity ?? null)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* QR Code */}
                {order.qr_code && !isQRExpired && !order.is_verified && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center">
                        <QrCode size={24} className="text-purple-600 mr-2" />
                        <CardTitle className="text-xl font-semibold">Verification QR</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-white p-6 rounded-lg border-2 border-gray-200 flex justify-center">
                        <QRCode value={order.qr_code} size={200} />
                      </div>
                      <p className="text-sm text-gray-600 mt-4 text-center">
                        Show this QR code to the shop staff to verify your purchase
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* QR Expired Message */}
                {isQRExpired && !order.is_verified && (
                  <Card className="border-red-200 bg-red-50">
                    <CardContent className="p-6">
                      <div className="flex items-center mb-2">
                        <AlertCircle className="text-red-600 mr-2" size={20} />
                        <p className="font-semibold text-red-800">QR Code Expired</p>
                      </div>
                      <p className="text-red-700 text-sm">
                        QR code has expired. You can still use your balance until{' '}
                        {parseLocalDateTime(order.final_validity)?.toLocaleString() || 'Not Set'}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsPage;
