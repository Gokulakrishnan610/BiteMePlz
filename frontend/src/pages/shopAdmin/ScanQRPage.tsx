import React, { useState } from 'react';
import api from '../../api';
import { QrCode, CheckCircle, Receipt, Camera, X, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import QRScanner from '../../components/QRScanner';
import toast from 'react-hot-toast';

interface VerifiedOrder {
  id: string;
  order_id: string;
  user: {
    name: string;
    roll_no: string;
  };
  order_items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  total_price: number;
  created_at: string;
}

const ScanQRPage: React.FC = () => {
  const { user } = useAuth();
  const [qrData, setQrData] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifiedOrder, setVerifiedOrder] = useState<VerifiedOrder | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  const handleScanSuccess = (decodedText: string) => {
    try {
      // Validate that the decoded text is valid JSON
      JSON.parse(decodedText);
      setQrData(decodedText);
      setShowScanner(false);
      toast.success('QR code scanned successfully');
    } catch (error) {
      toast.error('Invalid QR code format');
    }
  };

  const handleScanError = (error: string) => {
    console.error('QR scan error:', error);
    // Don't show toast for every scan error as it would be too noisy
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    setVerifiedOrder(null);

    try {
      if (!qrData) {
        throw new Error('Please scan or enter QR code data');
      }
      
      const parsedData = JSON.parse(qrData);
      const { data } = await api.put(`/api/orders/${parsedData.order_id}/verify/`, { qrData });
      setVerifiedOrder(data);
      toast.success('Order verified successfully');
    } catch (error: any) {
      console.error('Verification error:', error);
      toast.error(error.response?.data?.message || error.message || 'Verification failed');
    } finally {
      setVerifying(false);
      setQrData('');
    }
  };

  const printReceipt = () => {
    if (!verifiedOrder) return;

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
            <p><strong>Order #${verifiedOrder.id ? verifiedOrder.id.slice(-8) : verifiedOrder.order_id}</strong></p>
            <p>${verifiedOrder.created_at ? new Date(verifiedOrder.created_at).toLocaleString() : 'N/A'}</p>
          </div>
          <div class="order-info">
            <p><strong>Customer:</strong> ${verifiedOrder.user?.name || 'N/A'}</p>
            <p><strong>Roll Number:</strong> ${verifiedOrder.user?.roll_no || 'N/A'}</p>
          </div>
          <div class="items">
            <h3>Items Purchased:</h3>
            ${verifiedOrder.order_items ? verifiedOrder.order_items.map(item => `
              <div class="item">
                <div style="display: flex; justify-content: space-between;">
                  <span>${item.name || 'Unknown Item'}</span>
                  <span>₹${item.price || 0}</span>
                </div>
                <div style="font-size: 12px; color: #666;">
                  Quantity: ${item.quantity || 0} × ₹${item.price || 0} = ₹${(item.price || 0) * (item.quantity || 0)}
                </div>
              </div>
            `).join('') : '<p>No items found</p>'}
          </div>
          <div class="total">
            <p>Total Amount: ₹${verifiedOrder.total_price || 0}</p>
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

          {!verifiedOrder ? (
            <>
              <form onSubmit={handleVerify} className="space-y-6">
                <div>
                  {showScanner ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium">Scan QR Code</h3>
                        <button
                          type="button"
                          onClick={() => setShowScanner(false)}
                          className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
                        >
                          <X size={20} />
                        </button>
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg p-4">
                        <QRScanner
                          onScanSuccess={handleScanSuccess}
                          onScanError={handleScanError}
                        />
                      </div>
                      
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start">
                          <AlertTriangle className="text-blue-600 mr-2 mt-0.5 flex-shrink-0" size={16} />
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
                        onClick={() => setShowScanner(true)}
                        className="w-full btn-primary flex items-center justify-center"
                      >
                        <Camera size={20} className="mr-2" />
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
                          value={qrData}
                          onChange={(e) => setQrData(e.target.value)}
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
                  disabled={verifying || !qrData || showScanner}
                  className="w-full btn-primary"
                >
                  {verifying ? (
                    <span className="flex items-center justify-center">
                      <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></span>
                      Verifying...
                    </span>
                  ) : (
                    'Verify Order'
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="space-y-6">
              <div className="bg-green-50 text-green-700 p-4 rounded-lg flex items-center">
                <CheckCircle className="mr-2" size={20} />
                <p className="font-medium">Order verified successfully</p>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Order Details</h3>
                <div className="space-y-2">
                  <p><strong>Customer:</strong> {verifiedOrder.user?.name || 'N/A'}</p>
                  <p><strong>Roll Number:</strong> {verifiedOrder.user?.roll_no || 'N/A'}</p>
                  <p><strong>Order ID:</strong> #{verifiedOrder.id ? verifiedOrder.id.slice(-8) : verifiedOrder.order_id}</p>
                  <p><strong>Date:</strong> {verifiedOrder.created_at ? new Date(verifiedOrder.created_at).toLocaleString() : 'N/A'}</p>
                </div>

                <div className="mt-4">
                  <h4 className="font-semibold mb-2">Items</h4>
                  <div className="space-y-2">
                    {verifiedOrder.order_items && verifiedOrder.order_items.map((item, index) => (
                      <div key={index} className="flex justify-between">
                        <span>{item.name || 'Unknown Item'} x {item.quantity || 0}</span>
                        <span>₹{(item.price || 0) * (item.quantity || 0)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t mt-2 pt-2 flex justify-between font-semibold">
                    <span>Total</span>
                    <span>₹{verifiedOrder.total_price || 0}</span>
                  </div>
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={() => {
                    setVerifiedOrder(null);
                    setQrData('');
                  }}
                  className="flex-1 btn-secondary"
                >
                  Verify Another Order
                </button>
                <button
                  onClick={printReceipt}
                  className="flex-1 btn-primary"
                >
                  <Receipt size={20} className="inline-block mr-2" />
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