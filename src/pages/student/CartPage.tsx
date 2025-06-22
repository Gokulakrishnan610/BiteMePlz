import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, ShoppingBag, Timer, AlertCircle, X, Wallet, CreditCard, Clock } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';

declare global {
  interface Window {
    Razorpay: any;
  }
}

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => {
      resolve(true);
    };
    script.onerror = () => {
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

const CartPage: React.FC = () => {
  const { cartItems, removeFromCart, updateQuantity, clearCart, getTotalPrice, shopId } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [paymentInitiated, setPaymentInitiated] = useState(false);
  const [timeLeft, setTimeLeft] = useState(180); // 3 minutes in seconds
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [remainingBalance, setRemainingBalance] = useState(0);
  const [shopInfo, setShopInfo] = useState<any>(null);

  useEffect(() => {
    // Fetch user's remaining balance and shop info
    const fetchData = async () => {
      try {
        const [balanceRes, shopRes] = await Promise.all([
          axios.get('/api/users/profile'),
          shopId ? axios.get(`/api/shops/${shopId}`) : Promise.resolve({ data: null })
        ]);
        setRemainingBalance(balanceRes.data.balance || 0);
        setShopInfo(shopRes.data);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };

    if (user) {
      fetchData();
    }

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [user, timer, shopId]);

  // Check if shop is still accepting orders
  const isShopAcceptingOrders = () => {
    if (!shopInfo) return false;
    
    const now = new Date();
    const finalValidity = new Date(shopInfo.finalValidityTime);
    
    return now < finalValidity && shopInfo.isOpen && shopInfo.isActive;
  };

  const getTimeUntilClosure = () => {
    if (!shopInfo) return null;
    
    const now = new Date();
    const finalValidity = new Date(shopInfo.finalValidityTime);
    const timeDiff = finalValidity.getTime() - now.getTime();
    
    if (timeDiff <= 0) return null;
    
    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    
    return { hours, minutes };
  };

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    updateQuantity(productId, newQuantity);
  };

  const startPaymentTimer = () => {
    const newTimer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(newTimer);
          setPaymentInitiated(false);
          setCurrentOrderId(null);
          toast.error('Payment time expired');
          navigate('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    setTimer(newTimer);
  };

  const handleBalancePayment = async () => {
    if (remainingBalance < getTotalPrice()) {
      toast.error('Insufficient balance');
      return;
    }

    if (!isShopAcceptingOrders()) {
      toast.error('Shop is no longer accepting orders');
      return;
    }

    try {
      setPaymentInitiated(true);
      
      const orderResponse = await axios.post('/api/orders', {
        orderItems: cartItems,
        shopId,
        totalPrice: getTotalPrice(),
        paymentMethod: 'balance'
      });

      clearCart();
      toast.success('Payment successful');
      navigate(`/order/${orderResponse.data.order._id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'Payment failed');
      setPaymentInitiated(false);
    }
  };

  const initiateRazorpayPayment = async () => {
    if (!isShopAcceptingOrders()) {
      toast.error('Shop is no longer accepting orders');
      return;
    }

    try {
      setPaymentInitiated(true);
      
      const orderResponse = await axios.post('/api/orders', {
        orderItems: cartItems,
        shopId,
        totalPrice: getTotalPrice(),
        paymentMethod: 'razorpay'
      });

      setCurrentOrderId(orderResponse.data.order._id);
      startPaymentTimer();

      const options = {
        key: orderResponse.data.razorpayKeyId,
        amount: getTotalPrice() * 100,
        currency: 'INR',
        name: 'Campus Kiosk',
        description: 'Payment for your order',
        order_id: orderResponse.data.razorpayOrderId,
        handler: async (response: any) => {
          try {
            if (timer) {
              clearInterval(timer);
            }
            
            await axios.put(`/api/orders/${orderResponse.data.order._id}/pay`, {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            });

            clearCart();
            toast.success('Payment successful');
            navigate(`/order/${orderResponse.data.order._id}`);
          } catch (error: any) {
            toast.error(error.response?.data?.message || 'Payment verification failed');
          } finally {
            setPaymentInitiated(false);
            setCurrentOrderId(null);
          }
        },
        modal: {
          ondismiss: async () => {
            if (timer) {
              clearInterval(timer);
            }
            setPaymentInitiated(false);
            
            if (currentOrderId) {
              try {
                await axios.put(`/api/orders/${currentOrderId}/cancel`);
                toast.error('Payment cancelled');
              } catch (error) {
                console.error('Error cancelling order:', error);
              }
              setCurrentOrderId(null);
            }
          }
        },
        prefill: {
          name: user?.name,
          email: user?.email,
        },
        theme: {
          color: '#a259ff',
        },
      };

      // Load Razorpay script before using it
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error('Failed to load Razorpay SDK. Please try again.');
        setPaymentInitiated(false);
        setCurrentOrderId(null);
        return;
      }

      const razorpay = new window.Razorpay(options);
      razorpay.open();

      // Close Razorpay window after 3 minutes
      setTimeout(() => {
        if (razorpay && typeof razorpay.close === 'function') {
          razorpay.close();
          if (currentOrderId) {
            axios.put(`/api/orders/${currentOrderId}/cancel`)
              .then(() => {
                toast.error('Payment time expired');
                setPaymentInitiated(false);
                setCurrentOrderId(null);
              })
              .catch(error => {
                console.error('Error cancelling order:', error);
              });
          }
        }
      }, 3 * 60 * 1000);

    } catch (error: any) {
      setPaymentInitiated(false);
      setCurrentOrderId(null);
      toast.error(error.response?.data?.message || error.message || 'Payment failed');
    }
  };

  const handleCheckout = () => {
    if (!isShopAcceptingOrders()) {
      toast.error('Shop is no longer accepting orders for today');
      return;
    }
    setShowDisclaimer(true);
  };

  if (cartItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <ShoppingBag size={48} className="text-[var(--muted-text)] mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-[var(--secondary-text)] mb-2">
            Your Cart is Empty
          </h2>
          <p className="text-[var(--muted-text)] mb-6">
            Add some items to your cart to continue shopping.
          </p>
          <Link to="/" className="btn-primary">
            Browse Shops
          </Link>
        </div>
      </div>
    );
  }

  const timeUntilClosure = getTimeUntilClosure();
  const shopClosed = !isShopAcceptingOrders();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

      {/* Shop Status Warning */}
      {shopInfo && (
        <div className="mb-6">
          {shopClosed ? (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center backdrop-blur-sm">
              <AlertCircle className="text-red-400 mr-3" size={24} />
              <div>
                <p className="text-red-400 font-medium">Shop is closed for orders</p>
                <p className="text-[var(--secondary-text)] text-sm">Orders are no longer being accepted for today.</p>
              </div>
            </div>
          ) : timeUntilClosure && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 flex items-center backdrop-blur-sm">
              <Clock className="text-yellow-400 mr-3" size={24} />
              <div>
                <p className="text-yellow-400 font-medium">
                  Shop closes in {timeUntilClosure.hours}h {timeUntilClosure.minutes}m
                </p>
                <p className="text-[var(--secondary-text)] text-sm">Complete your order before the shop closes.</p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {cartItems.map((item) => (
            <div key={item.product} className="card mb-4 p-4">
              <div className="flex items-center">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-20 h-20 object-cover rounded"
                />
                <div className="flex-1 ml-4">
                  <h3 className="font-semibold text-[var(--primary-text)]">{item.name}</h3>
                  <p className="text-[var(--secondary-text)]">₹{item.price}</p>
                  <div className="flex items-center mt-2">
                    <button
                      onClick={() => handleQuantityChange(item.product, item.quantity - 1)}
                      className="btn-secondary px-3 py-1"
                      disabled={item.quantity <= 1 || paymentInitiated || shopClosed}
                    >
                      -
                    </button>
                    <span className="mx-4 text-[var(--primary-text)]">{item.quantity}</span>
                    <button
                      onClick={() => handleQuantityChange(item.product, item.quantity + 1)}
                      className="btn-secondary px-3 py-1"
                      disabled={item.quantity >= item.stock || paymentInitiated || shopClosed}
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold mb-2 text-[var(--primary-text)]">₹{item.price * item.quantity}</p>
                  <button
                    onClick={() => removeFromCart(item.product)}
                    className="text-[var(--error)] hover:text-red-400 transition-colors"
                    disabled={paymentInitiated || shopClosed}
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-1">
          <div className="card p-6">
            <h2 className="text-xl font-semibold mb-4 text-[var(--primary-text)]">Order Summary</h2>
            
            <div className="flex items-center justify-between mb-4 p-3 bg-[var(--secondary-bg)] rounded-lg">
              <div className="flex items-center">
                <Wallet className="text-[var(--accent-purple)] mr-2" size={20} />
                <span className="text-[var(--secondary-text)]">Wallet Balance</span>
              </div>
              <span className="font-semibold text-[var(--primary-text)]">₹{remainingBalance}</span>
            </div>

            {paymentInitiated && (
              <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-center">
                <Timer className="text-yellow-400 mr-2" size={20} />
                <p className="text-yellow-400">
                  Complete payment within {Math.floor(timeLeft / 60)}:
                  {(timeLeft % 60).toString().padStart(2, '0')}
                </p>
              </div>
            )}
            
            <div className="flex justify-between mb-4 text-[var(--secondary-text)]">
              <span>Subtotal</span>
              <span>₹{getTotalPrice()}</span>
            </div>
            <hr className="my-4 border-[var(--border-color)]" />
            <div className="flex justify-between mb-6">
              <span className="font-semibold text-[var(--primary-text)]">Total</span>
              <span className="font-semibold text-[var(--primary-text)]">₹{getTotalPrice()}</span>
            </div>
            <button
              onClick={handleCheckout}
              disabled={paymentInitiated || shopClosed}
              className={`w-full btn-primary ${shopClosed ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {paymentInitiated ? 'Processing...' : shopClosed ? 'Shop Closed' : 'Proceed to Checkout'}
            </button>
          </div>
        </div>
      </div>

      {/* Payment Options Modal */}
      {showPaymentOptions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--card-bg)] rounded-lg max-w-md w-full border border-[var(--border-color)]">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-[var(--primary-text)]">Choose Payment Method</h3>
                <button
                  onClick={() => setShowPaymentOptions(false)}
                  className="text-[var(--muted-text)] hover:text-[var(--primary-text)] transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <button
                  onClick={handleBalancePayment}
                  disabled={remainingBalance < getTotalPrice() || shopClosed}
                  className={`w-full p-4 rounded-lg border transition-colors ${
                    remainingBalance >= getTotalPrice() && !shopClosed
                      ? 'border-[var(--accent-purple)] text-[var(--accent-purple)] hover:bg-[var(--accent-purple)] hover:text-white'
                      : 'border-[var(--border-color)] text-[var(--muted-text)] cursor-not-allowed'
                  } flex items-center justify-between`}
                >
                  <div className="flex items-center">
                    <Wallet size={24} className="mr-3" />
                    <div className="text-left">
                      <p className="font-medium">Use Balance</p>
                      <p className="text-sm text-[var(--muted-text)]">Available: ₹{remainingBalance}</p>
                    </div>
                  </div>
                  {remainingBalance < getTotalPrice() && (
                    <span className="text-sm text-[var(--error)]">Insufficient</span>
                  )}
                </button>

                <button
                  onClick={initiateRazorpayPayment}
                  disabled={shopClosed}
                  className={`w-full p-4 rounded-lg border transition-colors ${
                    !shopClosed
                      ? 'border-[var(--accent-purple)] text-[var(--accent-purple)] hover:bg-[var(--accent-purple)] hover:text-white'
                      : 'border-[var(--border-color)] text-[var(--muted-text)] cursor-not-allowed'
                  } flex items-center`}
                >
                  <CreditCard size={24} className="mr-3" />
                  <div className="text-left">
                    <p className="font-medium">Pay with Razorpay</p>
                    <p className="text-sm text-[var(--muted-text)]">Credit/Debit Card, UPI, etc.</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Disclaimer Modal */}
      {showDisclaimer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--card-bg)] rounded-lg max-w-lg w-full border border-[var(--border-color)]">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center">
                  <AlertCircle className="text-[var(--accent-purple)] mr-2" size={24} />
                  <h3 className="text-xl font-semibold text-[var(--primary-text)]">Important Information</h3>
                </div>
                <button
                  onClick={() => setShowDisclaimer(false)}
                  className="text-[var(--muted-text)] hover:text-[var(--primary-text)] transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="space-y-4 mb-6">
                <p className="text-[var(--secondary-text)]">
                  Please note the following important points before proceeding with your payment:
                </p>
                <ul className="list-disc list-inside space-y-2 text-[var(--secondary-text)]">
                  <li>After payment, you will receive a QR code valid for {shopInfo?.qrValidityMinutes || 20} minutes</li>
                  <li>The QR code must be shown to shop staff for verification</li>
                  <li>Orders are valid until the shop's closing time on the same day</li>
                  <li>All wallet balances will be reset to zero at the end of the day</li>
                  <li>Payment must be completed within 3 minutes</li>
                  {timeUntilClosure && (
                    <li className="text-yellow-400 font-medium">
                      Shop closes in {timeUntilClosure.hours}h {timeUntilClosure.minutes}m
                    </li>
                  )}
                </ul>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => {
                    setShowDisclaimer(false);
                    setShowPaymentOptions(false);
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowDisclaimer(false);
                    setShowPaymentOptions(true);
                  }}
                  className="btn-primary"
                >
                  Accept & Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;