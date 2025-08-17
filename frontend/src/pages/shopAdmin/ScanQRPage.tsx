import React, { useState, useEffect } from 'react';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useAdminShop } from '../../context/AdminShopContext';
import { QrCode, CheckCircle, XCircle, AlertCircle, RefreshCw, Building, Camera } from 'lucide-react';
import QRScanner from '../../components/QRScanner';

interface OrderItemDto {
  product_id: string;
  name: string;
  image?: string;
  price: string | number;
  quantity: number;
  shop_id: string;
  shop_name: string;
  is_bought: boolean;
}

interface OrderDto {
  id: string;
  order_id: string;
  user: {
    name: string;
    email: string;
    roll_no: string;
  };
  shop: { id: string; name: string };
  order_items: OrderItemDto[];
  total_price: number | string;
  payment_result: any;
  is_paid: boolean;
  paid_at?: string;
  qr_code?: string;
  qr_valid_until?: string;
  balance_amount?: number | string;
  held_amount?: number | string;
  final_validity?: string;
  is_verified: boolean;
  verified_at?: string;
  status: string;
  expires_at: string;
  created_at: string;
}

const ScanQRPage: React.FC = () => {
  const { user } = useAuth();
  const { selectedShop } = useAdminShop();
  const isAdminShopMode = user?.role === 'admin' && !!selectedShop;

  const [scanning, setScanning] = useState(true); // Always start scanning
  const [result, setResult] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Stop camera when component unmounts or user navigates away
  useEffect(() => {
    return () => {
      setScanning(false);
    };
  }, []);

  const extractOrderId = (raw: string): string | null => {
    if (!raw) return null;
    const text = raw.trim();

    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object') {
        // If this is a multi-shop QR payload, try to pick the sub-order for the current shop context
        const orders = Array.isArray(parsed.orders) ? parsed.orders : [];
        const targetShopId = (isAdminShopMode ? selectedShop?.id : (typeof user?.shop === 'string' ? user?.shop : undefined)) || null;
        if (orders.length > 0) {
          if (targetShopId) {
            const match = orders.find((o: any) => String(o?.shop_id) === String(targetShopId));
            if (match?.order_id) return String(match.order_id);
          }
          // Fallback to first available order_id in the list
          if (orders[0]?.order_id) return String(orders[0].order_id);
        }
        if (parsed.order_id) {
          return String(parsed.order_id);
        }
        // Otherwise walk nested structures to find an order_id
        const candidates: string[] = [];
        const collect = (node: any) => {
          if (!node) return;
          if (Array.isArray(node)) node.forEach(collect);
          else if (typeof node === 'object') {
            if (node.order_id) candidates.push(String(node.order_id));
            Object.values(node).forEach(collect);
          }
        };
        collect(parsed);
        if (candidates.length > 0) return candidates[0];
      }
    } catch {}

    const m = text.match(/"order_id"\s*:\s*"([^"]+)"/);
    if (m && m[1]) return m[1];

    const looksLikeId = /^[A-Za-z0-9_-]{6,64}$/;
    if (looksLikeId.test(text)) return text;

    return null;
  };

  const handleScan = async (decodedText: string) => {
    if (decodedText) {
      setResult(decodedText);
      const orderId = extractOrderId(decodedText);
      if (!orderId) {
        // Remove toast, just set error state
        setError('Invalid QR code. Could not find order ID.');
        return;
      }
      // Close camera after successful scan
      setScanning(false);
      await verifyOrder(orderId);
    }
  };

  const handleError = (err: any) => {
    console.error('QR Scan Error:', err);
    const errorMessage = err?.message || err || 'Failed to scan QR code';
    setError(errorMessage);
  };

  const verifyOrder = async (orderId: string) => {
    try {
      setLoading(true);
      const { data } = await api.get(`/api/orders/${encodeURIComponent(orderId)}/scan_qr/`);

      // Enforce shop scope when admin is in shop mode
      if (isAdminShopMode && data?.shop?.id && data.shop.id !== selectedShop!.id) {
        setError(`This order belongs to a different shop (${data.shop?.name || 'Unknown'}).`);
        setOrder(null);
        return;
      }

      setOrder(data as OrderDto);
      setError(''); // Clear any previous errors
    } catch (err: any) {
      console.error('Error verifying order:', err);
      setError(err?.response?.data?.error || 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkItemBought = async (productId: string) => {
    if (!order) return;

    if (order.is_verified) {
      setError('Cannot modify items for a verified order');
      return;
    }

    try {
      const { data } = await api.patch(`/api/orders/${order.id}/mark_item_bought/`, {
        item_ids: [productId]
      });
      setOrder(data as OrderDto);
      setError(''); // Clear any previous errors
    } catch (error: any) {
      console.error('Error marking item as bought:', error);
      setError(error.response?.data?.message || 'Failed to mark item as bought');
    }
  };

  const handleVerifyOrder = async () => {
    if (!order) return;
    // Enforce shop scope before verifying
    if (isAdminShopMode && order.shop.id !== selectedShop!.id) {
      setError('You can only verify orders for your own shop.');
      return;
    }
    try {
      const payload: any = {};
      if (isAdminShopMode && selectedShop) {
        payload.selected_shop_id = selectedShop.id;
      }
      const { data } = await api.put(`/api/orders/${order.id}/verify/`, payload);
      setOrder(data as OrderDto);
      setError(''); // Clear any previous errors

      // Auto-reset and reopen scanner
      setOrder(null);
      setResult('');
      setScanning(true);
      setResetKey((prev) => prev + 1);
    } catch (error: any) {
      console.error('Error verifying order:', error);
      setError(error.response?.data?.message || 'Failed to verify order');
    }
  };

  const handleClose = () => {
    setOrder(null);
    setResult('');
    setScanning(false);
    setError('');
  };

  const handleOpenCamera = () => {
    setScanning(true);
    setResetKey((prev) => prev + 1);
  };

  // Only show items for the current shop (admin-shop-mode uses selected shop, otherwise use order's shop)
  const currentShopId = isAdminShopMode ? selectedShop?.id : order?.shop?.id;
  const items: OrderItemDto[] = order?.order_items
    ? (currentShopId
      ? order.order_items.filter(item => String(item.shop_id) === String(currentShopId))
      : order.order_items)
    : [];
  const remainingItems = items.filter(item => !item.is_bought);
  const boughtItems = items.filter(item => item.is_bought);

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Main Content - Fixed height, no page scrolling */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Section - Camera Scanner (Only show when scanning, fixed) */}
        {scanning && (
          <div className="bg-white p-4 flex-shrink-0">
            <div className="h-48">
              <QRScanner 
                key={resetKey} 
                autoStart={true} 
                onScanSuccess={handleScan} 
                onScanError={handleError} 
              />
            </div>
          </div>
        )}

        {/* Top Section - CLOSE Button (Show after scan, fixed) */}
        {order && (
          <div className="bg-white border-b border-gray-200 p-4 flex-shrink-0">
            <div className="max-w-2xl mx-auto">
              <button 
                onClick={handleClose}
                className="w-full btn-secondary py-3 text-base font-medium"
              >
                CLOSE
              </button>
            </div>
          </div>
        )}

        {/* Camera Closed State - Show when not scanning and no order */}
        {!scanning && !order && (
          <div className="bg-white p-8 flex-shrink-0">
            <div className="max-w-2xl mx-auto text-center">
              <div className="mb-6">
                <Camera className="mx-auto h-16 w-16 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Camera is Closed</h3>
              <p className="text-gray-600 mb-6">Click the button below to open the camera and scan a new QR code.</p>
              <button 
                onClick={handleOpenCamera}
                className="w-full btn-primary py-3 text-base font-medium"
              >
                OPEN CAMERA
              </button>
            </div>
          </div>
        )}

        {/* Error Display (Fixed) */}
        {error && (
          <div className="bg-red-50 border border-red-200 p-3 flex-shrink-0">
            <div className="max-w-2xl mx-auto">
              <p className="text-red-800 text-sm text-center">{error}</p>
            </div>
          </div>
        )}

        {/* Middle Section - Order Details (Only show after scanning, scrollable) */}
        {order && (
          <div className="bg-white border-t border-gray-200 flex-1 min-h-0 overflow-hidden">
            <div className="max-w-2xl mx-auto h-full">
              {/* Entire Order Details - Scrollable */}
              <div className="h-full overflow-y-auto">
                {/* Order Header */}
                <div className="p-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold mb-3">Order Details</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">Customer:</span>
                      <p className="text-gray-900">{order.user?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Roll Number:</span>
                      <p className="text-gray-900">{order.user?.roll_no || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Order ID:</span>
                      <p className="text-gray-900">#{order.order_id}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Status:</span>
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${order.is_verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {order.is_verified ? 'Verified' : 'Pending'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Items Summary */}
                {items && (
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex justify-between text-sm mb-2">
                      <span>Total Items: {items.length}</span>
                      <span>Bought: {boughtItems.length}</span>
                      <span>Remaining: {remainingItems.length}</span>
                    </div>
                    {items.length > 0 && remainingItems.length === 0 && (
                      <div className="p-2 bg-green-100 text-green-800 rounded-md text-center text-sm">
                        <CheckCircle className="inline-block mr-1" size={16} />
                        All items have been collected!
                      </div>
                    )}
                  </div>
                )}

                {/* Remaining Items */}
                {remainingItems.length > 0 && (
                  <div className="p-4 border-b border-gray-100">
                    <h3 className="font-medium mb-3 text-gray-800">Items to Collect:</h3>
                    <div className="space-y-3">
                      {remainingItems.map((item, index) => (
                        <div key={index} className="flex justify-between items-center p-3 rounded-lg border bg-white border-gray-200">
                          <div className="flex items-center space-x-3">
                            <div className="w-4 h-4 border-2 border-gray-300 rounded-full"></div>
                            <div>
                              <span className="font-medium text-gray-900 text-sm">{item.name || 'Unknown Item'} × {item.quantity || 0}</span>
                              <p className="text-xs text-gray-500">₹{(parseFloat(String(item.price || 0)) * (item.quantity || 0)).toFixed(2)}</p>
                            </div>
                          </div>
                          {!order.is_verified && (
                            <button 
                              onClick={() => handleMarkItemBought(item.product_id)} 
                              className="px-3 py-1 bg-green-600 text-white text-xs rounded-full hover:bg-green-700 transition-colors font-medium"
                            >
                              Given
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bought Items */}
                {boughtItems.length > 0 && (
                  <div className="p-4">
                    <h3 className="font-medium mb-3 text-gray-800">Collected Items:</h3>
                    <div className="space-y-3">
                      {boughtItems.map((item, index) => (
                        <div key={index} className="flex justify-between items-center p-3 rounded-lg border bg-gray-50 border-gray-200">
                          <div className="flex items-center space-x-3">
                            <CheckCircle className="text-green-600" size={16} />
                            <div>
                              <span className="font-medium line-through text-gray-500 text-sm">{item.name || 'Unknown Item'} × {item.quantity || 0}</span>
                              <p className="text-xs text-gray-500">₹{(parseFloat(String(item.price || 0)) * (item.quantity || 0)).toFixed(2)}</p>
                            </div>
                          </div>
                          <span className="text-green-600 text-xs font-medium bg-green-100 px-2 py-1 rounded-full">✓ Given</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Total */}
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total Amount:</span>
                    <span>₹{parseFloat(String(order.total_price || 0)).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Section - Verify Order Button (Show after scanning, fixed) */}
        {order && (
          <div className="bg-white border-t border-gray-200 p-4 flex-shrink-0">
            <div className="max-w-2xl mx-auto">
              <button
                onClick={handleVerifyOrder}
                disabled={loading || order.is_verified || items.length === 0 || remainingItems.length > 0}
                className="w-full btn-primary py-3 text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                VERIFY ORDER
              </button>
            </div>
          </div>
        )}

        {/* Loading State (Fixed) */}
        {loading && (
          <div className="bg-white border-t border-gray-200 p-4 flex-shrink-0">
            <div className="max-w-2xl mx-auto text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)] mx-auto mb-2"></div>
              <p className="text-gray-600">Loading order details...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScanQRPage;