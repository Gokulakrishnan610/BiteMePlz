import React, { useState, useEffect } from 'react';
import { QrReader } from 'react-qr-reader';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useAdminShop } from '../../context/AdminShopContext';
import { QrCode, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

interface Order {
  _id: string;
  order_id: string;
  user: {
    name: string;
    email: string;
    rollNo: string;
  };
  items: Array<{
    product: {
      name: string;
      price: number;
    };
    quantity: number;
  }>;
  totalPrice: number;
  status: string;
  payment_status: string;
  created_at: string;
}

const ScanQRPage: React.FC = () => {
  const { user } = useAuth();
  const { selectedShop } = useAdminShop();
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine the effective shop ID
  const effectiveShopId = user?.role === 'admin' && selectedShop ? selectedShop.id : user?.shop;

  const handleScan = async (data: any) => {
    if (data) {
      setResult(data);
      setScanning(false);
      await verifyOrder(data);
    }
  };

  const handleError = (err: any) => {
    console.error('QR Scan Error:', err);
    setError('Failed to scan QR code');
  };

  const verifyOrder = async (orderId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data } = await api.get(`/api/orders/${orderId}/scan_qr/`);
      setOrder(data);
      toast.success('Order verified successfully!');
    } catch (err: any) {
      console.error('Error verifying order:', err);
      setError(err?.response?.data?.error || 'Failed to verify order');
      toast.error('Failed to verify order');
    } finally {
      setLoading(false);
    }
  };

  const resetScan = () => {
    setResult(null);
    setOrder(null);
    setError(null);
    setScanning(true);
  };

  const handleMarkItemBought = async (productId: string) => {
    if (!order) return;

    // Check if order is already verified
    if (order.status === 'verified') {
      toast.error('Cannot modify items for a verified order');
      return;
    }

    try {
      const { data } = await api.patch(`/api/orders/${order._id}/mark_item_bought/`, {
        item_ids: [productId]
      });
      
      // Update the local state with the new data
      setOrder(data);
      toast.success('Item marked as bought');
    } catch (error: any) {
      console.error('Error marking item as bought:', error);
      toast.error(error.response?.data?.message || 'Failed to mark item as bought');
    }
  };

  const handleVerifyOrder = async () => {
    if (!order) return;

    try {
      const { data } = await api.put(`/api/orders/${order._id}/verify/`, {});
      setOrder(data);
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
            body { 
              font-family: Arial, sans-serif; 
              padding: 20px; 
              max-width: 400px; 
              margin: 0 auto;
            }
            .header { 
              text-align: center; 
              margin-bottom: 20px; 
              border-bottom: 2px solid #333;
              padding-bottom: 10px;
            }
            .order-info { 
              margin-bottom: 20px; 
            }
            .items { 
              margin-bottom: 20px; 
            }
            .item { 
              margin-bottom: 10px; 
              padding: 5px 0;
              border-bottom: 1px dashed #ccc;
            }
            .total { 
              text-align: right; 
              font-weight: bold; 
              font-size: 18px;
              border-top: 2px solid #333;
              padding-top: 10px;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              font-size: 12px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Campus Kiosk</h1>
            <h2>Order Receipt</h2>
            <p><strong>Order #${order._id ? order._id.slice(-8) : order.order_id}</strong></p>
            <p>${order.created_at ? new Date(order.created_at).toLocaleString() : 'N/A'}</p>
          </div>
          <div class="order-info">
            <p><strong>Customer:</strong> ${order.user?.name || 'N/A'}</p>
            <p><strong>Roll Number:</strong> ${order.user?.rollNo || 'N/A'}</p>
          </div>
          <div class="items">
            <h3>Items Purchased:</h3>
            ${order.items ? order.items.map(item => `
              <div class="item">
                <div style="display: flex; justify-content: space-between;">
                  <span>${item.product.name || 'Unknown Item'}</span>
                  <span>₹${item.product.price || 0}</span>
                </div>
                <div style="font-size: 12px; color: #666;">
                  Quantity: ${item.quantity || 0} × ₹${item.product.price || 0} = ₹${(item.product.price || 0) * (item.quantity || 0)}
                </div>
              </div>
            `).join('') : '<p>No items found</p>'}
          </div>
          <div class="total">
            <p>Total Amount: ₹${order.totalPrice || 0}</p>
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
    setTimeout(() => {
      receiptWindow.print();
    }, 250);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Verify Order</h1>

      <div className="card">
        <div className="p-6">
          <div className="flex items-center mb-6">
            <QrCode size={24} className="text-[var(--primary)] mr-2" />
            <h2 className="text-xl font-semibold">Verify Order</h2>
          </div>

          {!order ? (
            <>
              <form onSubmit={(e) => { e.preventDefault(); resetScan(); }} className="space-y-6">
                <div>
                  {scanning ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium">Scan QR Code</h3>
                        <button
                          type="button"
                          onClick={() => setScanning(false)}
                          className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
                        >
                          <XCircle size={20} />
                        </button>
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg p-4">
                        <QrReader
                          onResult={handleScan}
                          onError={handleError}
                          facingMode="environment" // Use environment camera
                          className="w-full h-auto"
                        />
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
                      <button
                        type="button"
                        onClick={() => setScanning(true)}
                        className="w-full btn-primary flex items-center justify-center"
                      >
                        <RefreshCw size={20} className="mr-2" />
                        Start Camera Scanner
                      </button>
                      
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-gray-300" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                          <span className="px-2 bg-white text-gray-500">or</span>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">
                          QR Code Data
                        </label>
                        <textarea
                          value={result || ''}
                          onChange={(e) => setResult(e.target.value)}
                          className="input"
                          rows={4}
                          placeholder="Paste QR code data here..."
                        />
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !result || scanning}
                  className="w-full btn-primary"
                >
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
                  <p><strong>Roll Number:</strong> {order.user?.rollNo || 'N/A'}</p>
                  <p><strong>Order ID:</strong> #{order._id ? order._id.slice(-8) : order.order_id}</p>
                  <p><strong>Date:</strong> {order.created_at ? new Date(order.created_at).toLocaleString() : 'N/A'}</p>
                  <p><strong>Status:</strong> 
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                      order.status === 'verified' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {order.status === 'verified' ? 'Verified' : 'Pending'}
                    </span>
                  </p>
                </div>

                <div className="mt-4">
                  <h4 className="font-semibold mb-2">Items</h4>
                  
                  {/* Summary */}
                  {order.items && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between text-sm">
                        <span>Total Items: {order.items.length}</span>
                        <span>Bought: {order.items.filter(item => item.quantity > 0).length}</span>
                        <span>Remaining: {order.items.filter(item => item.quantity > 0).length}</span>
                      </div>
                      {order.items.filter(item => item.quantity > 0).length === order.items.length && (
                        <div className="mt-2 p-2 bg-green-100 text-green-800 rounded-md text-center">
                          <CheckCircle className="inline-block mr-1" size={16} />
                          All items have been collected!
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    {order.items && order.items.map((item, index) => (
                      <div key={index} className={`flex justify-between items-center p-3 rounded-lg border ${
                        item.quantity > 0 ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-200'
                      }`}>
                        <div className="flex items-center space-x-3">
                          {item.quantity > 0 ? (
                            <CheckCircle className="text-green-600" size={20} />
                          ) : (
                            <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
                          )}
                          <div>
                            <span className={`font-medium ${item.quantity > 0 ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                              {item.product.name || 'Unknown Item'} x {item.quantity || 0}
                            </span>
                            <p className="text-sm text-gray-500">₹{(item.product.price || 0) * (item.quantity || 0)}</p>
                          </div>
                        </div>
                        {item.quantity > 0 && order.status !== 'verified' && (
                          <button
                            onClick={() => handleMarkItemBought(item.product._id)}
                            className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
                          >
                            Mark as Bought
                          </button>
                        )}
                        {item.quantity > 0 && order.status === 'verified' && (
                          <span className="text-gray-500 text-sm">Cannot modify verified order</span>
                        )}
                        {item.quantity > 0 && (
                          <span className="text-green-600 text-sm font-medium">✓ Bought</span>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="border-t mt-4 pt-4 flex justify-between font-semibold">
                    <span>Total</span>
                    <span>₹{order.totalPrice || 0}</span>
                  </div>
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={() => {
                    setOrder(null);
                    setResult('');
                  }}
                  className="flex-1 btn-secondary"
                >
                  Scan Another Order
                </button>
                {!order.status === 'verified' && (
                  <button
                    onClick={handleVerifyOrder}
                    className="flex-1 btn-primary"
                  >
                    <CheckCircle size={20} className="inline-block mr-2" />
                    Verify Order
                  </button>
                )}
                <button
                  onClick={printReceipt}
                  className="flex-1 btn-primary"
                >
                  <RefreshCw size={20} className="inline-block mr-2" />
                  Print Receipt
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