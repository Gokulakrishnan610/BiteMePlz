import React, { useState } from 'react';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useAdminShop } from '../../context/AdminShopContext';
import { QrCode, CheckCircle, XCircle, AlertCircle, RefreshCw, Building } from 'lucide-react';
import toast from 'react-hot-toast';
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

  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderDto | null>(null);
  const [loading, setLoading] = useState(false);

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
        toast.error('Invalid QR code. Could not find order ID.');
        return;
      }
      setScanning(false);
      await verifyOrder(orderId);
    }
  };

  const handleError = (err: any) => {
    console.error('QR Scan Error:', err);
    toast.error('Failed to scan QR code');
  };

  const verifyOrder = async (orderId: string) => {
    try {
      setLoading(true);
      const { data } = await api.get(`/api/orders/${encodeURIComponent(orderId)}/scan_qr/`);

      // Enforce shop scope when admin is in shop mode
      if (isAdminShopMode && data?.shop?.id && data.shop.id !== selectedShop!.id) {
        toast.error(`This order belongs to a different shop (${data.shop?.name || 'Unknown'}).`);
        setOrder(null);
        return;
      }

      setOrder(data as OrderDto);
      toast.success('Order loaded');
    } catch (err: any) {
      console.error('Error verifying order:', err);
      toast.error(err?.response?.data?.error || 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkItemBought = async (productId: string) => {
    if (!order) return;

    if (order.is_verified) {
      toast.error('Cannot modify items for a verified order');
      return;
    }

    try {
      const { data } = await api.patch(`/api/orders/${order.id}/mark_item_bought/`, {
        item_ids: [productId]
      });
      setOrder(data as OrderDto);
      toast.success('Item marked as bought');
    } catch (error: any) {
      console.error('Error marking item as bought:', error);
      toast.error(error.response?.data?.message || 'Failed to mark item as bought');
    }
  };

	const handleVerifyOrder = async () => {
    if (!order) return;
    // Enforce shop scope before verifying
    if (isAdminShopMode && order.shop.id !== selectedShop!.id) {
      toast.error('You can only verify orders for your own shop.');
      return;
    }
    try {
			const payload: any = {};
			if (isAdminShopMode && selectedShop) {
				payload.selected_shop_id = selectedShop.id;
			}
			const { data } = await api.put(`/api/orders/${order.id}/verify/`, payload);
      setOrder(data as OrderDto);
      toast.success('Order verified successfully');
    } catch (error: any) {
      console.error('Error verifying order:', error);
      toast.error(error.response?.data?.message || 'Failed to verify order');
    }
  };

  const printReceipt = () => {
    if (!order) return;

    const receiptWindow = window.open('', '_blank');
    if (!receiptWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Order Receipt</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 400px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .item { margin-bottom: 10px; padding: 5px 0; border-bottom: 1px dashed #ccc; }
            .total { text-align: right; font-weight: bold; font-size: 18px; border-top: 2px solid #333; padding-top: 10px; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Campus Kiosk</h1>
            <h2>Order Receipt</h2>
            <p><strong>Order #${order.order_id}</strong></p>
            <p>${order.created_at ? new Date(order.created_at).toLocaleString() : 'N/A'}</p>
          </div>
          <div class="items">
            <h3>Items Purchased:</h3>
            ${(order.order_items || []).map(item => `
              <div class="item">
                <div style="display:flex;justify-content:space-between">
                  <span>${item.name || 'Unknown Item'} × ${item.quantity || 0}</span>
                  <span>₹${(parseFloat(String(item.price || 0)) * (item.quantity || 0)).toFixed(2)}</span>
                </div>
              </div>
            `).join('')}
          </div>
          <div class="total">
            <p>Total Amount: ₹${parseFloat(String(order.total_price || 0)).toFixed(2)}</p>
          </div>
          <div class="footer">
            <p>Thank you for your purchase!</p>
            <p>Verified at: ${new Date().toLocaleString()}</p>
          </div>
        </body>
      </html>
    `;

    receiptWindow.document.write(html);
    receiptWindow.document.close();
    setTimeout(() => receiptWindow.print(), 250);
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
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Verify Order</h1>

      {isAdminShopMode && (
        <div className="mb-4 p-3 rounded-lg bg-purple-50 border border-purple-200 flex items-center text-sm text-purple-800">
          <Building size={16} className="mr-2" />
          <span>Admin Shop Mode: {selectedShop!.name}</span>
        </div>
      )}

      <div className="card">
        <div className="p-6">
          <div className="flex items-center mb-6">
            <QrCode size={24} className="text-[var(--primary)] mr-2" />
            <h2 className="text-xl font-semibold">Verify Order</h2>
          </div>

          {!order ? (
            <>
              <form onSubmit={(e) => { e.preventDefault(); if (result && result.trim()) { const oid = extractOrderId(result.trim()); if (!oid) { toast.error('Invalid QR data.'); } else { verifyOrder(oid); } } }} className="space-y-6">
                <div>
                  {scanning ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium">Scan QR Code</h3>
                        <button type="button" onClick={() => setScanning(false)} className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">
                          <XCircle size={20} />
                        </button>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <QRScanner onScanSuccess={handleScan} onScanError={handleError} />
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start">
                          <AlertCircle className="text-blue-600 mr-2 mt-0.5 flex-shrink-0" size={16} />
                          <div className="text-sm text-blue-800">
                            <p className="font-medium mb-1">Camera Tips:</p>
                            <ul className="list-disc list-inside space-y-1">
                              <li>Ensure good lighting</li>
                              <li>Hold the device steady</li>
                              <li>Position QR code within the frame</li>
                              <li>Try switching cameras if available</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <button type="button" onClick={() => setScanning(true)} className="w-full btn-primary flex items-center justify-center">
                        <RefreshCw size={20} className="mr-2" />
                        Start Camera Scanner
                      </button>
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300" /></div>
                        <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">or</span></div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">QR Code Data</label>
                        <textarea value={result || ''} onChange={(e) => setResult(e.target.value)} className="input" rows={4} placeholder="Paste QR code data here..." />
                      </div>
                    </div>
                  )}
                </div>

                <button type="submit" disabled={loading || !result || scanning} className="w-full btn-primary">
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></span>
                      Loading...
                    </span>
                  ) : (
                    'Load Order Details'
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="space-y-6">
              <div className="bg-blue-50 text-blue-700 p-4 rounded-lg flex items-center">
                <CheckCircle className="mr-2" size={20} />
                <p className="font-medium">Order details loaded successfully. You can now mark items as bought.</p>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Order Details</h3>
                <div className="space-y-2">
                  <p><strong>Customer:</strong> {order.user?.name || 'N/A'}</p>
                  <p><strong>Roll Number:</strong> {order.user?.roll_no || 'N/A'}</p>
                  <p><strong>Shop:</strong> {order.shop?.name || 'N/A'}</p>
                  <p><strong>Order ID:</strong> #{order.order_id}</p>
                  <p><strong>Date:</strong> {order.created_at ? new Date(order.created_at).toLocaleString() : 'N/A'}</p>
                  <p><strong>Status:</strong>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${order.is_verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {order.is_verified ? 'Verified' : 'Pending'}
                    </span>
                  </p>
                </div>

                <div className="mt-4">
                  <h4 className="font-semibold mb-2">Items</h4>

                  {items && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between text-sm">
                        <span>Total Items: {items.length}</span>
                        <span>Bought: {boughtItems.length}</span>
                        <span>Remaining: {remainingItems.length}</span>
                      </div>
						{items.length > 0 && remainingItems.length === 0 && (
                        <div className="mt-2 p-2 bg-green-100 text-green-800 rounded-md text-center">
                          <CheckCircle className="inline-block mr-1" size={16} />
                          All items have been collected!
                        </div>
                      )}
                    </div>
                  )}

                  {remainingItems.length > 0 && (
                    <div className="mb-4">
                      <h5 className="font-medium text-gray-700 mb-2">Items to Collect:</h5>
                      <div className="space-y-2">
                        {remainingItems.map((item, index) => (
                          <div key={index} className="flex justify-between items-center p-3 rounded-lg border bg-white border-gray-200">
                            <div className="flex items-center space-x-3">
                              <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
                              <div>
                                <span className="font-medium text-gray-900">{item.name || 'Unknown Item'} × {item.quantity || 0}</span>
                                <p className="text-sm text-gray-500">₹{(parseFloat(String(item.price || 0)) * (item.quantity || 0)).toFixed(2)}</p>
                              </div>
                            </div>
                            {!order.is_verified && (
                              <button onClick={() => handleMarkItemBought(item.product_id)} className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors">
                                Mark as Bought
                              </button>
                            )}
                            {order.is_verified && <span className="text-gray-500 text-sm">Cannot modify verified order</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {boughtItems.length > 0 && (
                    <div className="mb-4">
                      <h5 className="font-medium text-gray-700 mb-2">Items Collected:</h5>
                      <div className="space-y-2">
                        {boughtItems.map((item, index) => (
                          <div key={index} className="flex justify-between items-center p-3 rounded-lg border bg-gray-50 border-gray-200">
                            <div className="flex items-center space-x-3">
                              <CheckCircle className="text-green-600" size={20} />
                              <div>
                                <span className="font-medium line-through text-gray-500">{item.name || 'Unknown Item'} × {item.quantity || 0}</span>
                                <p className="text-sm text-gray-500">₹{(parseFloat(String(item.price || 0)) * (item.quantity || 0)).toFixed(2)}</p>
                              </div>
                            </div>
                            <span className="text-green-600 text-sm font-medium">✓ Collected</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="border-t mt-4 pt-4 flex justify-between font-semibold">
                    <span>Total</span>
                    <span>₹{parseFloat(String(order.total_price || 0)).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="flex space-x-4">
                <button onClick={() => { setOrder(null); setResult(''); }} className="flex-1 btn-secondary">Scan Another Order</button>
					{!order.is_verified && items.length > 0 && remainingItems.length === 0 && (
						<button
							onClick={handleVerifyOrder}
							disabled={
								!order ||
								order.is_verified ||
								(isAdminShopMode && order.shop.id !== selectedShop?.id)
							}
							className="flex-1 btn-primary"
						>
							<CheckCircle size={20} className="inline-block mr-2" /> Verify Order
						</button>
					)}
                <button onClick={printReceipt} className="flex-1 btn-primary">
                  <RefreshCw size={20} className="inline-block mr-2" /> Print Receipt
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScanQRPage;