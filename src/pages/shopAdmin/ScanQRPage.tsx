import React, { useState } from 'react';
import axios from 'axios';
import { QrCode, CheckCircle, CreditCard, Receipt, Camera, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { QrReader } from 'react-qr-reader';
import toast from 'react-hot-toast';

interface VerifiedOrder {
  _id: string;
  user: {
    name: string;
    rollNo: string;
  };
  orderItems: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  totalPrice: number;
  createdAt: string;
}

const ScanQRPage: React.FC = () => {
  const { user } = useAuth();
  const [verificationMethod, setVerificationMethod] = useState<'qr' | 'payment'>('qr');
  const [qrData, setQrData] = useState('');
  const [paymentId, setPaymentId] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifiedOrder, setVerifiedOrder] = useState<VerifiedOrder | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const handleScan = (result: { text: string } | null) => {
    if (result?.text) {
      try {
        // Validate that the decoded text is valid JSON
        JSON.parse(result.text);
        setQrData(result.text);
        setIsScanning(false);
      } catch (error) {
        toast.error('Invalid QR code format');
      }
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    setVerifiedOrder(null);

    try {
      if (verificationMethod === 'qr') {
        const parsedData = JSON.parse(qrData);
        const { data } = await axios.put(`/api/orders/${parsedData.orderId}/verify`, { qrData });
        setVerifiedOrder(data);
        toast.success('Order verified successfully');
      } else {
        const { data: orderData } = await axios.get(`/api/orders/payment/${paymentId}`);
        const { data } = await axios.put(`/api/orders/${orderData.orderId}/verify`, {
          qrData: JSON.stringify({
            orderId: orderData.orderId,
            paymentId: orderData.paymentId,
            signature: orderData.signature
          })
        });
        setVerifiedOrder(data);
        toast.success('Order verified successfully');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Verification failed');
    } finally {
      setVerifying(false);
      setQrData('');
      setPaymentId('');
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
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 20px; }
            .order-info { margin-bottom: 20px; }
            .items { margin-bottom: 20px; }
            .item { margin-bottom: 10px; }
            .total { text-align: right; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Order Receipt</h1>
            <p>Order #${verifiedOrder._id.slice(-8)}</p>
            <p>${new Date(verifiedOrder.createdAt).toLocaleString()}</p>
          </div>
          <div class="order-info">
            <p><strong>Customer Name:</strong> ${verifiedOrder.user.name}</p>
            <p><strong>Roll Number:</strong> ${verifiedOrder.user.rollNo}</p>
          </div>
          <div class="items">
            <h2>Items</h2>
            ${verifiedOrder.orderItems.map(item => `
              <div class="item">
                <p>${item.name} x ${item.quantity} @ ₹${item.price} = ₹${item.price * item.quantity}</p>
              </div>
            `).join('')}
          </div>
          <div class="total">
            <p>Total Amount: ₹${verifiedOrder.totalPrice}</p>
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
            {verificationMethod === 'qr' ? (
              <QrCode size={24} className="text-[var(--primary)] mr-2" />
            ) : (
              <CreditCard size={24} className="text-[var(--primary)] mr-2" />
            )}
            <h2 className="text-xl font-semibold">Verify Order</h2>
          </div>

          {!verifiedOrder ? (
            <>
              <div className="mb-6">
                <div className="flex space-x-4">
                  <button
                    onClick={() => setVerificationMethod('qr')}
                    className={`flex-1 py-2 px-4 rounded-lg ${
                      verificationMethod === 'qr'
                        ? 'bg-[var(--primary)] text-white'
                        : 'bg-[var(--gray-100)] text-[var(--gray-700)]'
                    }`}
                  >
                    <QrCode size={20} className="inline-block mr-2" />
                    QR Code
                  </button>
                  <button
                    onClick={() => setVerificationMethod('payment')}
                    className={`flex-1 py-2 px-4 rounded-lg ${
                      verificationMethod === 'payment'
                        ? 'bg-[var(--primary)] text-white'
                        : 'bg-[var(--gray-100)] text-[var(--gray-700)]'
                    }`}
                  >
                    <CreditCard size={20} className="inline-block mr-2" />
                    Payment ID
                  </button>
                </div>
              </div>

              <form onSubmit={handleVerify} className="space-y-6">
                {verificationMethod === 'qr' ? (
                  <div>
                    {isScanning ? (
                      <div className="space-y-4">
                        <div className="relative">
                          <QrReader
                            scanDelay={300}
                            constraints={{ facingMode: 'environment' }}
                            onResult={handleScan}
                            className="w-full"
                          />
                          <button
                            type="button"
                            onClick={() => setIsScanning(false)}
                            className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md"
                          >
                            <X className="text-[var(--error)]" size={24} />
                          </button>
                        </div>
                        <p className="text-center text-[var(--gray-600)]">
                          Position the QR code in front of your camera
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <button
                          type="button"
                          onClick={() => setIsScanning(true)}
                          className="w-full btn-primary flex items-center justify-center"
                        >
                          <Camera size={20} className="mr-2" />
                          Start Scanning
                        </button>
                        <div className="relative">
                          <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">
                            QR Code Data
                          </label>
                          <textarea
                            value={qrData}
                            onChange={(e) => setQrData(e.target.value)}
                            className="input"
                            rows={4}
                            placeholder="Or paste QR code data here..."
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">
                      Payment ID
                    </label>
                    <input
                      type="text"
                      value={paymentId}
                      onChange={(e) => setPaymentId(e.target.value)}
                      className="input"
                      placeholder="Enter Razorpay payment ID..."
                      required
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={verifying || (!qrData && !paymentId) || isScanning}
                  className="w-full btn-primary"
                >
                  {verifying ? (
                    <span className="flex items-center justify-center">
                      <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-purple-600 mr-2"></span>
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
                  <p><strong>Customer:</strong> {verifiedOrder.user.name}</p>
                  <p><strong>Roll Number:</strong> {verifiedOrder.user.rollNo}</p>
                  <p><strong>Order ID:</strong> #{verifiedOrder._id.slice(-8)}</p>
                  <p><strong>Date:</strong> {new Date(verifiedOrder.createdAt).toLocaleString()}</p>
                </div>

                <div className="mt-4">
                  <h4 className="font-semibold mb-2">Items</h4>
                  <div className="space-y-2">
                    {verifiedOrder.orderItems.map((item, index) => (
                      <div key={index} className="flex justify-between">
                        <span>{item.name} x {item.quantity}</span>
                        <span>₹{item.price * item.quantity}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t mt-2 pt-2 flex justify-between font-semibold">
                    <span>Total</span>
                    <span>₹{verifiedOrder.totalPrice}</span>
                  </div>
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={() => setVerifiedOrder(null)}
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