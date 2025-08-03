import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Trash2, 
  ShoppingBag, 
  Timer, 
  AlertCircle, 
  X, 
  Wallet, 
  CreditCard, 
  Clock, 
  Plus, 
  Minus, 
  ArrowLeft,
  CheckCircle,
  Package,
  Shield,
  Zap
} from 'lucide-react';
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
  const { cartItems, removeFromCart, updateQuantity, clearCart, getTotalPrice, getItemsByShop, getShopIds } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [paymentInitiated, setPaymentInitiated] = useState(false);
  const [timeLeft, setTimeLeft] = useState(180); // 3 minutes in seconds
  const [currentorder_id, setCurrentorder_id] = useState<string | null>(null);
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [remainingBalance, setRemainingBalance] = useState(0);
  const [shopInfo, setshopInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{product: string, shop_id: string, name: string} | null>(null);

  useEffect(() => {
    // Fetch user's remaining balance
    const fetchData = async () => {
      try {
        const balanceRes = await axios.get('/api/users/profile');
        console.log('Balance response:', balanceRes.data);
        setRemainingBalance(balanceRes.data.balance || 0);
      } catch (error) {
        console.error('Failed to fetch balance:', error);
        setRemainingBalance(0);
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
  }, [user, timer]);

  // Check if shop is still accepting orders
  const isshopAcceptingOrders = () => {
    // For now, assume all shops are open since we don't have shopInfo
    // This can be updated later when shop info is properly fetched
    return true;
  };

  const getTimeUntilClosure = () => {
    // For now, return null since we don't have shopInfo
    // This can be updated later when shop info is properly fetched
    return null;
  };

  const handleQuantityChange = (productId: string, shop_id: string, newQuantity: number) => {
    console.log('Quantity change clicked:', { productId, shop_id, newQuantity });
    
    // Prevent negative quantities
    if (newQuantity <= 0) {
      console.log('Removing item from cart');
      removeFromCart(productId, shop_id);
      toast.success('Item removed from cart');
      return;
    }
    
    // Update quantity
    console.log('Updating quantity to:', newQuantity);
    updateQuantity(productId, shop_id, newQuantity);
  };

  const startPaymentTimer = () => {
    const newTimer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(newTimer);
          setPaymentInitiated(false);
          setCurrentorder_id(null);
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
    console.log('Balance payment attempt:', { remainingBalance, totalPrice: getTotalPrice() });
    
    if (remainingBalance < getTotalPrice()) {
      const shortfall = getTotalPrice() - remainingBalance;
      toast.error(`Insufficient balance. You need ₹${shortfall} more.`);
      return;
    }

    const shopIds = getShopIds();

    try {
      setIsLoading(true);
      setPaymentInitiated(true);
      
      // Use multi-shop endpoint if multiple shops, single shop endpoint if one shop
      const endpoint = shopIds.length > 1 ? '/api/orders/multi-shop' : '/api/orders';
      const requestData = shopIds.length > 1 ? {
        order_items: cartItems,
        totalPrice: getTotalPrice(),
        paymentMethod: 'balance'
      } : {
        order_items: cartItems,
        shop_id: shopIds[0],
        totalPrice: getTotalPrice(),
        paymentMethod: 'balance'
      };
      
      const orderResponse = await axios.post(endpoint, requestData);

      clearCart();
      toast.success('Payment successful! Your order has been placed.');
      
      // Navigate to first order for multi-shop orders
      if (shopIds.length > 1) {
        navigate(`/order/${orderResponse.data.orders[0]._id}`);
      } else {
        navigate(`/order/${orderResponse.data.order._id}`);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'Payment failed');
      setPaymentInitiated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const initiateRazorpayPayment = async () => {
    const shopIds = getShopIds();

    try {
      setIsLoading(true);
      setPaymentInitiated(true);
      
      // Use multi-shop endpoint if multiple shops, single shop endpoint if one shop
      const endpoint = shopIds.length > 1 ? '/api/orders/multi-shop' : '/api/orders';
      const requestData = shopIds.length > 1 ? {
        order_items: cartItems,
        totalPrice: getTotalPrice(),
        paymentMethod: 'razorpay'
      } : {
        order_items: cartItems,
        shop_id: shopIds[0],
        totalPrice: getTotalPrice(),
        paymentMethod: 'razorpay'
      };
      
      const orderResponse = await axios.post(endpoint, requestData);

      setCurrentorder_id(orderResponse.data.order._id);
      startPaymentTimer();

      const options = {
        key: orderResponse.data.razorpayKeyId,
        amount: getTotalPrice() * 100,
        currency: 'INR',
        name: 'Campus Kiosk',
        description: 'Payment for your order',
        order_id: orderResponse.data.razorpayorder_id,
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
            toast.success('Payment successful! Your order has been placed.');
            navigate(`/order/${orderResponse.data.order._id}`);
          } catch (error: any) {
            toast.error(error.response?.data?.message || 'Payment verification failed');
          } finally {
            setPaymentInitiated(false);
            setCurrentorder_id(null);
          }
        },
        modal: {
          ondismiss: async () => {
            if (timer) {
              clearInterval(timer);
            }
            setPaymentInitiated(false);
            
            if (currentorder_id) {
              try {
                await axios.put(`/api/orders/${currentorder_id}/cancel`);
                toast.error('Payment cancelled');
              } catch (error) {
                console.error('Error cancelling order:', error);
              }
              setCurrentorder_id(null);
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
        setCurrentorder_id(null);
        return;
      }

      const razorpay = new window.Razorpay(options);
      razorpay.open();

      // Close Razorpay window after 3 minutes
      setTimeout(() => {
        if (razorpay && typeof razorpay.close === 'function') {
          razorpay.close();
          if (currentorder_id) {
            axios.put(`/api/orders/${currentorder_id}/cancel`)
              .then(() => {
                toast.error('Payment time expired');
                setPaymentInitiated(false);
                setCurrentorder_id(null);
              })
              .catch(error => {
                console.error('Error cancelling order:', error);
              });
          }
        }
      }, 3 * 60 * 1000);

    } catch (error: any) {
      setPaymentInitiated(false);
      setCurrentorder_id(null);
      toast.error(error.response?.data?.message || error.message || 'Payment failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckout = () => {
    setShowDisclaimer(true);
  };

  const handleClearCart = () => {
    clearCart();
    toast.success('Cart cleared successfully');
  };

  const handleDeleteItem = (product: string, shop_id: string, name: string) => {
    console.log('Delete button clicked:', { product, shop_id, name });
    setItemToDelete({ product, shop_id, name });
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      console.log('Confirming delete for:', itemToDelete);
      removeFromCart(itemToDelete.product, itemToDelete.shop_id);
      toast.success(`${itemToDelete.name} removed from cart`);
      setShowDeleteConfirm(false);
      setItemToDelete(null);
    }
  };

  // Direct delete without confirmation (for testing)
  const handleDirectDelete = (product: string, shop_id: string, name: string) => {
    console.log('Direct delete clicked:', { product, shop_id, name });
    try {
      removeFromCart(product, shop_id);
      toast.success(`${name} removed from cart`);
    } catch (error) {
      console.error('Error removing item:', error);
      toast.error('Failed to remove item');
    }
  };



  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[var(--primary-bg)] via-[var(--secondary-bg)] to-[var(--primary-bg)]">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center mb-8">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center text-[var(--accent-purple)] hover:text-[var(--accent-violet)] transition-colors mr-4"
            >
              <ArrowLeft size={20} className="mr-2" />
              Back
            </button>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[var(--accent-purple)] to-[var(--accent-violet)] bg-clip-text text-transparent">
              Shopping Cart
            </h1>
          </div>
          
          <div className="text-center py-20">
            <div className="relative mb-8">
              <div className="w-32 h-32 mx-auto bg-gradient-to-br from-[var(--accent-purple)] to-[var(--accent-violet)] rounded-full flex items-center justify-center opacity-20">
                <ShoppingBag size={64} className="text-white" />
              </div>
              <div className="absolute inset-0 w-32 h-32 mx-auto bg-gradient-to-br from-[var(--accent-purple)] to-[var(--accent-violet)] rounded-full flex items-center justify-center animate-pulse opacity-10">
                <ShoppingBag size={64} className="text-white" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-[var(--primary-text)] mb-4">
              Your Cart is Empty
            </h2>
            <p className="text-[var(--secondary-text)] text-lg mb-8 max-w-md mx-auto">
              Looks like you haven't added any items to your cart yet. Start shopping to discover amazing products!
            </p>
            <Link 
              to="/" 
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-[var(--accent-purple)] to-[var(--accent-violet)] text-white font-semibold rounded-xl hover:from-[var(--accent-violet)] hover:to-[var(--accent-purple)] transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <ShoppingBag size={20} className="mr-2" />
              Start Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--primary-bg)] via-[var(--secondary-bg)] to-[var(--primary-bg)]">
      <div className="container mx-auto px-4 py-8">
                 {/* Header */}
         <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
           <div className="flex items-center">
             <button
               onClick={() => navigate(-1)}
               className="flex items-center text-[var(--accent-purple)] hover:text-[var(--accent-violet)] transition-colors mr-2 sm:mr-4"
             >
               <ArrowLeft size={18} className="mr-1 sm:mr-2 sm:w-5 sm:h-5" />
               <span className="text-sm sm:text-base">Back</span>
             </button>
             <div>
               <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[var(--accent-purple)] to-[var(--accent-violet)] bg-clip-text text-transparent">
                 Shopping Cart
               </h1>
               <p className="text-[var(--secondary-text)] mt-1 text-sm sm:text-base">
                 {totalItems} item{totalItems !== 1 ? 's' : ''} • {getShopIds().length} shop{getShopIds().length !== 1 ? 's' : ''}
               </p>
             </div>
           </div>
                     <div className="flex items-center space-x-2 sm:space-x-4">
             <button
               onClick={handleClearCart}
               className="flex items-center px-2 py-1 sm:px-4 sm:py-2 text-[var(--error)] hover:text-red-400 transition-colors text-sm sm:text-base"
               disabled={paymentInitiated}
             >
               <Trash2 size={14} className="mr-1 sm:mr-2 sm:w-4 sm:h-4" />
               <span className="hidden sm:inline">Clear Cart</span>
               <span className="sm:hidden">Clear</span>
             </button>
           </div>
        </div>

                 

                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
           {/* Cart Items */}
           <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {Object.entries(getItemsByShop()).map(([shop_id, shopData]) => (
              <div key={shop_id} className="bg-[var(--card-bg)] rounded-2xl border border-[var(--border-color)] overflow-hidden shadow-xl backdrop-blur-sm">
                                 {/* Shop Header */}
                 <div className="bg-gradient-to-r from-[var(--accent-purple)] to-[var(--accent-violet)] p-4 sm:p-6">
                   <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
                     <div className="flex items-center">
                       <div className="bg-white/20 p-1.5 sm:p-2 rounded-full mr-3 sm:mr-4">
                         <ShoppingBag className="text-white sm:w-5 sm:h-5" size={16} />
                       </div>
                       <div>
                         <h3 className="text-white font-semibold text-base sm:text-lg">{shopData.shop_name}</h3>
                         <p className="text-white/80 text-xs sm:text-sm">
                           {shopData.items.length} item{shopData.items.length !== 1 ? 's' : ''}
                         </p>
                       </div>
                     </div>
                     <div className="text-right">
                       <p className="text-white/80 text-xs sm:text-sm">Shop Total</p>
                       <p className="text-white font-bold text-base sm:text-lg">
                         ₹{shopData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)}
                       </p>
                     </div>
                   </div>
                 </div>
                
                                 {/* Items */}
                 <div className="p-4 sm:p-6">
                   {shopData.items.map((item, index) => (
                     <div key={`${item.product}-${item.shop_id}`} className={`flex flex-col sm:flex-row sm:items-center py-4 gap-4 sm:gap-0 ${index !== shopData.items.length - 1 ? 'border-b border-[var(--border-color)]' : ''}`}>
                       <div className="flex items-center sm:flex-row">
                         <div className="relative">
                           <img
                             src={item.image}
                             alt={item.name}
                             className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl border border-[var(--border-color)]"
                           />
                           {item.quantity > 1 && (
                             <div className="absolute -top-2 -right-2 bg-[var(--accent-purple)] text-white text-xs font-bold rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center">
                               {item.quantity}
                             </div>
                           )}
                         </div>
                         
                         <div className="flex-1 ml-4 sm:ml-6">
                           <h4 className="font-semibold text-[var(--primary-text)] text-base sm:text-lg mb-1">{item.name}</h4>
                           <p className="text-[var(--accent-purple)] font-semibold text-sm sm:text-base">₹{item.price}</p>
                           <p className="text-[var(--secondary-text)] text-xs sm:text-sm">Stock: {item.stock} available</p>
                         </div>
                       </div>
                       
                       <div className="flex items-center justify-between sm:justify-end space-x-3 sm:space-x-6 w-full sm:w-auto">
                                                 {/* Quantity Controls */}
                         <div className="flex items-center bg-[var(--secondary-bg)] rounded-xl border-2 border-[var(--border-color)] shadow-lg">
                           <button
                                                           onClick={() => {
                                console.log('Minus clicked for:', item.product, item.shop_id, 'Current quantity:', item.quantity);
                                console.log('Button disabled state:', { quantity: item.quantity, paymentInitiated });
                                const newQuantity = item.quantity - 1;
                                console.log('New quantity will be:', newQuantity);
                                handleQuantityChange(item.product, item.shop_id, newQuantity);
                              }}
                             className="p-2 sm:p-4 hover:bg-[var(--hover-bg)] transition-all duration-200 rounded-l-xl hover:scale-105 active:scale-95 cursor-pointer"
                             disabled={false}
                             title="Decrease quantity"
                           >
                             <Minus size={18} className="text-[var(--primary-text)] sm:w-6 sm:h-6" />
                           </button>
                           <span className="px-4 sm:px-8 py-2 sm:py-4 text-[var(--primary-text)] font-bold text-base sm:text-xl min-w-[3rem] sm:min-w-[5rem] text-center bg-[var(--card-bg)] border-x border-[var(--border-color)]">
                             {item.quantity}
                           </span>
                           <button
                                                           onClick={() => {
                                console.log('Plus clicked for:', item.product, item.shop_id, 'Current quantity:', item.quantity);
                                console.log('Button disabled state:', { stock: item.stock, paymentInitiated });
                                const newQuantity = item.quantity + 1;
                                console.log('New quantity will be:', newQuantity);
                                handleQuantityChange(item.product, item.shop_id, newQuantity);
                              }}
                             className="p-2 sm:p-4 hover:bg-[var(--hover-bg)] transition-all duration-200 rounded-r-xl hover:scale-105 active:scale-95 cursor-pointer"
                             disabled={false}
                             title="Increase quantity"
                           >
                             <Plus size={18} className="text-[var(--primary-text)] sm:w-6 sm:h-6" />
                           </button>
                         </div>
                         
                         <div className="text-right">
                           <p className="font-bold text-[var(--primary-text)] text-base sm:text-lg">₹{item.price * item.quantity}</p>
                         </div>
                         
                         {/* Delete Button */}
                         <button
                                                       onClick={() => {
                              console.log('Delete clicked for:', item.product, item.shop_id, item.name);
                              console.log('Delete button disabled state:', { paymentInitiated });
                              handleDirectDelete(item.product, item.shop_id, item.name);
                            }}
                           className="flex items-center justify-center w-10 h-10 sm:w-14 sm:h-14 bg-red-500/10 hover:bg-red-500/20 text-[var(--error)] hover:text-red-400 transition-all duration-300 rounded-xl cursor-pointer border-2 border-red-500/30 hover:border-red-500/50 hover:scale-105 shadow-lg active:scale-95"
                           disabled={false}
                           title="Remove item from cart"
                         >
                           <Trash2 size={18} className="sm:w-6 sm:h-6" />
                         </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

                     {/* Order Summary */}
           <div className="lg:col-span-1">
             <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--border-color)] p-4 sm:p-6 shadow-xl backdrop-blur-sm sticky top-8">
               <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-[var(--primary-text)] flex items-center">
                 <Package className="text-[var(--accent-purple)] mr-2 sm:mr-3 sm:w-6 sm:h-6" size={20} />
                 Order Summary
               </h2>
              
                             {/* Wallet Balance */}
               <div className="bg-gradient-to-r from-[var(--accent-purple)] to-[var(--accent-violet)] rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
                 <div className="flex items-center justify-between">
                   <div className="flex items-center">
                     <Wallet className="text-white mr-2 sm:mr-3 sm:w-5 sm:h-5" size={18} />
                     <span className="text-white font-medium text-sm sm:text-base">Wallet Balance</span>
                   </div>
                   <span className="text-white font-bold text-base sm:text-lg">₹{remainingBalance}</span>
                 </div>
                                   {remainingBalance === 0 ? (
                    <p className="text-white/80 text-xs sm:text-sm mt-2">
                      No balance available. Use Razorpay to pay.
                    </p>
                  ) : remainingBalance < getTotalPrice() && (
                    <p className="text-white/80 text-xs sm:text-sm mt-2">
                      Need ₹{getTotalPrice() - remainingBalance} more for balance payment
                    </p>
                  )}
               </div>

                             {/* Payment Timer */}
               {paymentInitiated && (
                 <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-xl flex items-center">
                   <Timer className="text-yellow-400 mr-2 sm:mr-3 sm:w-5 sm:h-5" size={18} />
                   <div>
                     <p className="text-yellow-400 font-semibold text-sm sm:text-base">
                       Complete payment within {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                     </p>
                     <p className="text-[var(--secondary-text)] text-xs sm:text-sm">Time remaining</p>
                   </div>
                 </div>
               )}
               
               {/* Price Breakdown */}
               <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                 <div className="flex justify-between text-[var(--secondary-text)] text-sm sm:text-base">
                   <span>Subtotal ({totalItems} items)</span>
                   <span>₹{getTotalPrice()}</span>
                 </div>
                 <div className="flex justify-between text-[var(--secondary-text)] text-sm sm:text-base">
                   <span>Delivery Fee</span>
                   <span className="text-[var(--success)]">Free</span>
                 </div>
                 <hr className="border-[var(--border-color)]" />
                 <div className="flex justify-between text-base sm:text-lg font-bold text-[var(--primary-text)]">
                   <span>Total</span>
                   <span className="text-[var(--accent-purple)]">₹{getTotalPrice()}</span>
                 </div>
               </div>

                             {/* Checkout Button */}
                                <button
                   onClick={handleCheckout}
                   disabled={paymentInitiated || isLoading}
                   className={`w-full py-3 sm:py-4 px-4 sm:px-6 rounded-xl font-semibold text-base sm:text-lg transition-all duration-300 transform hover:scale-105 ${
                     isLoading
                       ? 'bg-[var(--border-color)] text-[var(--muted-text)] cursor-not-allowed'
                       : 'bg-gradient-to-r from-[var(--accent-purple)] to-[var(--accent-violet)] text-white hover:from-[var(--accent-violet)] hover:to-[var(--accent-purple)] shadow-lg hover:shadow-xl'
                   }`}
                 >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Processing...
                    </div>
                  ) : paymentInitiated ? (
                    'Processing...'
                  ) : (
                    <div className="flex items-center justify-center">
                      <Zap className="mr-2" size={20} />
                      Proceed to Checkout
                    </div>
                  )}
                </button>

                             {/* Security Badge */}
               <div className="mt-4 sm:mt-6 flex items-center justify-center text-[var(--secondary-text)] text-xs sm:text-sm">
                 <Shield className="mr-1 sm:mr-2 sm:w-4 sm:h-4" size={14} />
                 Secure Payment • 100% Safe
               </div>
            </div>
          </div>
        </div>

        {/* Payment Options Modal */}
        {showPaymentOptions && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--card-bg)] rounded-2xl max-w-md w-full border border-[var(--border-color)] shadow-2xl">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold text-[var(--primary-text)]">Choose Payment Method</h3>
                  <button
                    onClick={() => setShowPaymentOptions(false)}
                    className="text-[var(--muted-text)] hover:text-[var(--primary-text)] transition-colors p-2 hover:bg-[var(--hover-bg)] rounded-lg"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-4">
                                     <button
                     onClick={handleBalancePayment}
                     disabled={remainingBalance < getTotalPrice() || isLoading}
                     className={`w-full p-6 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 ${
                       remainingBalance >= getTotalPrice() && !isLoading
                         ? 'border-[var(--accent-purple)] text-[var(--accent-purple)] hover:bg-[var(--accent-purple)] hover:text-white hover:shadow-lg'
                         : 'border-[var(--border-color)] text-[var(--muted-text)] cursor-not-allowed'
                     }`}
                   >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="bg-[var(--accent-purple)]/20 p-3 rounded-full mr-4">
                          <Wallet size={24} className="text-[var(--accent-purple)]" />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-lg">Use Balance</p>
                          <p className="text-sm text-[var(--secondary-text)]">Available: ₹{remainingBalance}</p>
                        </div>
                      </div>
                                             {remainingBalance === 0 ? (
                         <span className="text-sm text-[var(--error)] font-medium">No Balance</span>
                       ) : remainingBalance < getTotalPrice() && (
                         <span className="text-sm text-[var(--error)] font-medium">Insufficient</span>
                       )}
                    </div>
                  </button>

                                     <button
                     onClick={initiateRazorpayPayment}
                     disabled={isLoading}
                     className={`w-full p-6 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 ${
                       !isLoading
                         ? 'border-[var(--accent-purple)] text-[var(--accent-purple)] hover:bg-[var(--accent-purple)] hover:text-white hover:shadow-lg'
                         : 'border-[var(--border-color)] text-[var(--muted-text)] cursor-not-allowed'
                     }`}
                   >
                    <div className="flex items-center">
                      <div className="bg-[var(--accent-purple)]/20 p-3 rounded-full mr-4">
                        <CreditCard size={24} className="text-[var(--accent-purple)]" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-lg">Pay with Razorpay</p>
                        <p className="text-sm text-[var(--secondary-text)]">Credit/Debit Card, UPI, etc.</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Disclaimer Modal */}
        {showDisclaimer && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--card-bg)] rounded-2xl max-w-lg w-full border border-[var(--border-color)] shadow-2xl">
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center">
                    <div className="bg-[var(--accent-purple)]/20 p-3 rounded-full mr-4">
                      <AlertCircle className="text-[var(--accent-purple)]" size={24} />
                    </div>
                    <h3 className="text-2xl font-bold text-[var(--primary-text)]">Important Information</h3>
                  </div>
                  <button
                    onClick={() => setShowDisclaimer(false)}
                    className="text-[var(--muted-text)] hover:text-[var(--primary-text)] transition-colors p-2 hover:bg-[var(--hover-bg)] rounded-lg"
                  >
                    <X size={24} />
                  </button>
                </div>
                
                <div className="space-y-4 mb-6">
                  <p className="text-[var(--secondary-text)] text-lg">
                    Please note the following important points before proceeding with your payment:
                  </p>
                  <div className="space-y-3">
                    {getShopIds().length > 1 ? (
                      <>
                        <div className="flex items-start">
                          <CheckCircle className="text-[var(--success)] mr-3 mt-1 flex-shrink-0" size={16} />
                          <p className="text-[var(--secondary-text)]">You have items from {getShopIds().length} different shops</p>
                        </div>
                        <div className="flex items-start">
                          <CheckCircle className="text-[var(--success)] mr-3 mt-1 flex-shrink-0" size={16} />
                          <p className="text-[var(--secondary-text)]">After payment, you will receive separate QR codes for each shop</p>
                        </div>
                        <div className="flex items-start">
                          <CheckCircle className="text-[var(--success)] mr-3 mt-1 flex-shrink-0" size={16} />
                          <p className="text-[var(--secondary-text)]">Each QR code must be shown to the respective shop staff for verification</p>
                        </div>
                        <div className="flex items-start">
                          <CheckCircle className="text-[var(--success)] mr-3 mt-1 flex-shrink-0" size={16} />
                          <p className="text-[var(--secondary-text)]">QR codes are valid for 20 minutes each</p>
                        </div>
                        <div className="flex items-start">
                          <CheckCircle className="text-[var(--success)] mr-3 mt-1 flex-shrink-0" size={16} />
                          <p className="text-[var(--secondary-text)]">Orders are valid until each shop's closing time on the same day</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-start">
                          <CheckCircle className="text-[var(--success)] mr-3 mt-1 flex-shrink-0" size={16} />
                          <p className="text-[var(--secondary-text)]">After payment, you will receive a QR code valid for 20 minutes</p>
                        </div>
                        <div className="flex items-start">
                          <CheckCircle className="text-[var(--success)] mr-3 mt-1 flex-shrink-0" size={16} />
                          <p className="text-[var(--secondary-text)]">The QR code must be shown to shop staff for verification</p>
                        </div>
                        <div className="flex items-start">
                          <CheckCircle className="text-[var(--success)] mr-3 mt-1 flex-shrink-0" size={16} />
                          <p className="text-[var(--secondary-text)]">Orders are valid until the shop's closing time on the same day</p>
                        </div>
                      </>
                    )}
                    <div className="flex items-start">
                      <CheckCircle className="text-[var(--success)] mr-3 mt-1 flex-shrink-0" size={16} />
                      <p className="text-[var(--secondary-text)]">All wallet balances will be reset to zero at the end of the day</p>
                    </div>
                    <div className="flex items-start">
                      <CheckCircle className="text-[var(--success)] mr-3 mt-1 flex-shrink-0" size={16} />
                      <p className="text-[var(--secondary-text)]">Payment must be completed within 3 minutes</p>
                    </div>
                    
                  </div>
                </div>

                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => {
                      setShowDisclaimer(false);
                      setShowPaymentOptions(false);
                    }}
                    className="px-6 py-3 bg-[var(--secondary-bg)] text-[var(--primary-text)] rounded-xl hover:bg-[var(--hover-bg)] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setShowDisclaimer(false);
                      setShowPaymentOptions(true);
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-[var(--accent-purple)] to-[var(--accent-violet)] text-white rounded-xl hover:from-[var(--accent-violet)] hover:to-[var(--accent-purple)] transition-all duration-300 transform hover:scale-105"
                  >
                    Accept & Continue
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && itemToDelete && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--card-bg)] rounded-2xl max-w-md w-full border border-[var(--border-color)] shadow-2xl">
              <div className="p-6">
                <div className="flex items-center mb-6">
                  <div className="bg-red-500/20 p-3 rounded-full mr-4">
                    <Trash2 className="text-red-400" size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-[var(--primary-text)]">Remove Item</h3>
                </div>
                
                <p className="text-[var(--secondary-text)] mb-6">
                  Are you sure you want to remove <span className="font-semibold text-[var(--primary-text)]">"{itemToDelete.name}"</span> from your cart?
                </p>

                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setItemToDelete(null);
                    }}
                    className="px-6 py-3 bg-[var(--secondary-bg)] text-[var(--primary-text)] rounded-xl hover:bg-[var(--hover-bg)] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="px-6 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;