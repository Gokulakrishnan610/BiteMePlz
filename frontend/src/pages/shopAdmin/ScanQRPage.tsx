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

  const [scanning, setScanning] = useState(true); // Start with camera open
  const [result, setResult] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [wsRef, setWsRef] = useState<WebSocket | null>(null);

  // WebSocket connection for real-time order updates
  useEffect(() => {
    console.log('WebSocket useEffect triggered');
    console.log('selectedShop:', selectedShop);
    console.log('selectedShop?.id:', selectedShop?.id);
    console.log('user:', user);
    console.log('user?.shop:', user?.shop);
    
    // Determine the shop ID to use for WebSocket connection
    let shopId: string | null = null;
    
    if (isAdminShopMode) {
      // Admin in shop mode - use selected shop
      shopId = selectedShop?.id || null;
      console.log('Admin shop mode - using selectedShop.id:', shopId);
    } else if (user?.role === 'shopAdmin') {
      // Shop admin - use their assigned shop
      shopId = user.shop || null;
      console.log('Shop admin mode - using user.shop:', shopId);
    }
    
    if (!shopId) {
      console.log('No shop ID available, skipping WebSocket connection');
      console.log('isAdminShopMode:', isAdminShopMode);
      console.log('user?.role:', user?.role);
      return;
    }

    const wsUrl = import.meta.env.PROD
      ? `wss://rec-kiosk.onrender.com/ws/orders/?shop_id=${shopId}`
      : `ws://localhost:8000/ws/orders/?shop_id=${shopId}`;

    console.log('🔗 Connecting to WebSocket for order updates:', wsUrl);
    console.log('🏪 Shop ID for WebSocket:', shopId);
    console.log('🌍 Environment:', import.meta.env.PROD ? 'PRODUCTION' : 'DEVELOPMENT');
    
    // Validate URL before connecting
    try {
      new URL(wsUrl);
    } catch (error) {
      console.error('❌ Invalid WebSocket URL:', wsUrl, error);
      return;
    }
    
    const ws = new WebSocket(wsUrl);
    
    // Add connection timeout
    const connectionTimeout = setTimeout(() => {
      if (ws.readyState === WebSocket.CONNECTING) {
        console.error('⏰ WebSocket connection timeout after 10 seconds');
        ws.close();
      }
    }, 10000);
    setWsRef(ws);

    ws.onopen = () => {
      console.log('✅ WebSocket connected for order updates');
      console.log('🔧 WebSocket readyState:', ws.readyState);
      console.log('🔗 WebSocket URL:', wsUrl);
      clearTimeout(connectionTimeout); // Clear the connection timeout
      setWsConnected(true);
      
      // Send a test message to verify connection
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          const testMessage = {
            type: 'test', 
            message: 'WebSocket connection test',
            shop_id: shopId,
            timestamp: new Date().toISOString()
          };
          console.log('📤 Sending test message:', testMessage);
          ws.send(JSON.stringify(testMessage));
        } else {
          console.log('❌ WebSocket not ready, readyState:', ws.readyState);
        }
      }, 1000);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket message received:', data);
        
        if (data.type === 'order_verification' && data.shop_id === shopId) {
          console.log('Order verification update received:', data);
          console.log('Current order ID:', order?.id);
          console.log('Message order ID:', data.order_id);
          console.log('Shop ID match:', data.shop_id === shopId);
          
          // Update the current order if it matches (convert both to strings for comparison)
          if (order && String(order.id) === String(data.order_id)) {
            console.log('Updating order with real-time data:', data.order_data);
            console.log('Previous order state:', {
              is_verified: order.is_verified,
              status: order.status,
              verified_at: order.verified_at
            });
            console.log('New order state:', {
              is_verified: data.order_data.is_verified,
              status: data.order_data.status,
              verified_at: data.order_data.verified_at
            });
            
            setOrder(data.order_data as OrderDto);
            // Clear success message since we got the real-time update
            setSuccessMessage(null);
            console.log('Order updated via WebSocket successfully');
          } else {
            console.log('Order ID mismatch or no current order');
            console.log('Order ID comparison:', {
              currentOrderId: order?.id,
              messageOrderId: data.order_id,
              currentOrderIdType: typeof order?.id,
              messageOrderIdType: typeof data.order_id,
              stringComparison: String(order?.id) === String(data.order_id),
              hasCurrentOrder: !!order
            });
          }
        } else if (data.type === 'connection_established') {
          console.log('WebSocket connection confirmed:', data.message);
          console.log('Connection shop_id:', data.shop_id);
          console.log('Expected shop_id:', shopId);
        } else if (data.type === 'message_received') {
          console.log('Echo message received:', data.message);
        } else if (data.type === 'test') {
          console.log('Test message received:', data.message);
        } else {
          console.log('Other WebSocket message type:', data.type);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      console.error('🔗 WebSocket URL attempted:', wsUrl);
      console.error('🏪 Shop ID:', shopId);
      console.error('🌍 Environment:', import.meta.env.PROD ? 'PRODUCTION' : 'DEVELOPMENT');
      console.error('🔧 WebSocket readyState:', ws.readyState);
      
      // Log additional error details if available
      if (error instanceof Event) {
        console.error('📋 Error event details:', {
          type: error.type,
          target: error.target,
          isTrusted: error.isTrusted
        });
      }
      
      setWsConnected(false);
    };

    ws.onclose = (event) => {
      console.log('WebSocket connection closed:', event.code, event.reason);
      setWsConnected(false);
      
      // Only reconnect if the component is still mounted and shop is still selected
      // Don't reconnect if it was a normal closure (code 1000)
      if (event.code !== 1000) {
        setTimeout(() => {
          if (shopId) {
            console.log('Attempting to reconnect WebSocket...');
            // The useEffect will handle reconnection since shopId is still valid
          }
        }, 5000);
      }
    };

    return () => {
      console.log('🧹 Cleaning up WebSocket connection');
      clearTimeout(connectionTimeout); // Clear timeout on cleanup
      if (ws.readyState === WebSocket.OPEN) {
        ws.close(1000, 'Component unmounting');
      }
      setWsRef(null);
    };
  }, [selectedShop?.id, user?.shop, isAdminShopMode, user?.role]); // Updated dependencies

  // Stop camera when component unmounts or user navigates away
  useEffect(() => {
    return () => {
      setScanning(false);
    };
  }, []);

  // Debug logging for scanning state changes
  useEffect(() => {
    console.log('Scanning state changed:', scanning);
  }, [scanning]);

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
      setLoading(true);
      const payload: any = {};
      if (isAdminShopMode && selectedShop) {
        payload.selected_shop_id = selectedShop.id;
      }
      
      console.log('Sending verification request for order:', order.id);
      const { data } = await api.put(`/api/orders/${order.id}/verify/`, payload);
      console.log('Verification API response:', data);
      
      // Update order with API response
      setOrder(data as OrderDto);
      setError(''); // Clear any previous errors
      setSuccessMessage('Order verified successfully!');

      // Wait for WebSocket update, then reset after delay
      // The WebSocket update will clear the success message if it arrives
      setTimeout(() => {
        setOrder(null);
        setResult('');
        setScanning(true);
        setResetKey((prev) => prev + 1);
        setSuccessMessage(null);
        setError(''); // Clear any errors
      }, 1500);
    } catch (error: any) {
      console.error('Error verifying order:', error);
      setError(error.response?.data?.message || 'Failed to verify order');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    console.log('Closing camera...');
    setOrder(null);
    setResult('');
    setScanning(false);
    setError('');
    setSuccessMessage(null);
    setResetKey((prev) => prev + 1); // Reset QR scanner
  };

  const handleOpenCamera = () => {
    console.log('Opening camera...');
    setScanning(true);
    setResetKey((prev) => prev + 1);
    setError(''); // Clear any errors
    setSuccessMessage(null); // Clear any success messages
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
      {/* WebSocket Connection Status */}
      <div className="bg-blue-50 border-b border-blue-200 p-2 flex-shrink-0">
        <div className="max-w-2xl mx-auto flex items-center justify-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-xs text-blue-700">
            {wsConnected ? 'Real-time updates active' : 'Connecting to real-time updates...'}
          </span>
          {wsConnected && (
            <button
              onClick={() => {
                if (wsRef) {
                  wsRef.send(JSON.stringify({ type: 'test', message: 'Hello WebSocket!' }));
                }
              }}
              className="ml-2 px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
            >
              Test WS
            </button>
          )}
        </div>
      </div>

      {/* Success Message Display */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 p-3 flex-shrink-0">
          <div className="max-w-2xl mx-auto">
            <p className="text-green-800 text-sm text-center flex items-center justify-center">
              <CheckCircle className="inline-block mr-2" size={16} />
              {successMessage}
            </p>
          </div>
        </div>
      )}

      {/* Main Content - Fixed height, no page scrolling */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Section - Camera Scanner (Only show when scanning, fixed) */}
        {scanning && (
          <div className="bg-white p-4 flex-shrink-0">
            <div className="min-h-[300px] max-h-[400px]">
              <QRScanner 
                key={resetKey} 
                autoStart={true} 
                onScanSuccess={handleScan} 
                onScanError={handleError} 
              />
              {/* Fallback message if camera doesn't load */}
              <div className="mt-2 text-center text-sm text-gray-500">
                Camera is active - point at a QR code to scan
              </div>
            </div>
          </div>
        )}
        
        {/* Debug info - remove this in production */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-yellow-50 border-b border-yellow-200 p-2 flex-shrink-0">
            <div className="max-w-2xl mx-auto text-xs text-yellow-800">
              Debug: scanning={scanning.toString()}, order={order ? 'exists' : 'none'}, resetKey={resetKey}
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