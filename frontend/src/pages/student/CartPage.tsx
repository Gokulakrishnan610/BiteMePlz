"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  Trash2,
  ShoppingBag,
  Timer,
  AlertCircle,
  X,
  Wallet,
  CreditCard,
  Plus,
  Minus,
  ArrowLeft,
  CheckCircle,
  Package,
  Shield,
  Zap,
} from "lucide-react"
import { useCart } from "../../context/CartContext"
import { useAuth } from "../../context/AuthContext"
import api from "../../api"
import toast from "react-hot-toast"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Badge } from "../../components/ui/badge"
import { Button } from "../../components/ui/button"
import Navbar from "../../components/Navbar"

declare global {
  interface Window {
    Razorpay: any
  }
}

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true)
      return
    }
    const script = document.createElement("script")
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.onload = () => {
      resolve(true)
    }
    script.onerror = () => {
      resolve(false)
    }
    document.body.appendChild(script)
  })
}

const CartPage: React.FC = () => {
  const { cartItems, removeFromCart, updateQuantity, clearCart, getTotalPrice, getItemsByShop, getShopIds } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [paymentInitiated, setPaymentInitiated] = useState(false)
  const [timeLeft, setTimeLeft] = useState(180) // 3 minutes in seconds
  const [currentorder_id, setCurrentorder_id] = useState<string | null>(null)
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null)
  const [showDisclaimer, setShowDisclaimer] = useState(false)
  const [showPaymentOptions, setShowPaymentOptions] = useState(false)
  const [remainingBalance, setRemainingBalance] = useState(0)
  const [shopInfo, setshopInfo] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<{ product: string; shop_id: string; name: string } | null>(null)

  useEffect(() => {
    // Fetch user's remaining balance
    const fetchData = async () => {
      try {
        const balanceRes = await api.get("/api/users/profile")
        setRemainingBalance(balanceRes.data.balance || 0)
      } catch (error) {
        console.error("Failed to fetch balance:", error)
        setRemainingBalance(0)
      }
    }
    if (user) {
      fetchData()
    }
    return () => {
      if (timer) {
        clearInterval(timer)
      }
    }
  }, [user, timer])

  const isshopAcceptingOrders = () => {
    return true
  }

  const getTimeUntilClosure = () => {
    return null
  }

  const handleQuantityChange = (productId: string, shop_id: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId, shop_id)
      toast.success("Item removed from cart")
      return
    }
    updateQuantity(productId, shop_id, newQuantity)
  }

  const startPaymentTimer = () => {
    const newTimer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(newTimer)
          setPaymentInitiated(false)
          setCurrentorder_id(null)
          toast.error("Payment time expired")
          navigate("/")
          return 0
        }
        return prev - 1
      })
    }, 1000)
    setTimer(newTimer)
  }

  const handleBalancePayment = async () => {
    if (remainingBalance < getTotalPrice()) {
      const shortfall = getTotalPrice() - remainingBalance
      toast.error(`Insufficient balance. You need ₹${shortfall} more.`)
      return
    }
    const shopIds = getShopIds()
    try {
      setIsLoading(true)
      setPaymentInitiated(true)

      const endpoint = shopIds.length > 1 ? "/api/orders/multi-shop/" : "/api/orders/"
      const requestData =
        shopIds.length > 1
          ? {
              order_items: cartItems.map((item) => ({
                product_id: item.product_id,
                quantity: item.quantity,
                shop_id: item.shop_id,
                shop_name: item.shop_name,
              })),
              total_price: getTotalPrice(),
              paymentMethod: "balance",
            }
          : {
              order_items: cartItems.map((item) => ({
                product_id: item.product_id,
                quantity: item.quantity,
                shop_id: item.shop_id,
                shop_name: item.shop_name,
              })),
              shop_id: shopIds[0],
              total_price: getTotalPrice(),
              paymentMethod: "balance",
            }

      console.log("Sending order creation data:", requestData)
      const orderResponse = await api.post(endpoint, requestData)
      clearCart()
      toast.success("Payment successful! Your order has been placed.")

      if (shopIds.length > 1) {
        navigate(`/order/${orderResponse.data.orders[0]._id}`)
      } else {
        navigate(`/order/${orderResponse.data.order._id}`)
      }
    } catch (error: any) {
      console.error("Balance payment error:", error)
      toast.error(error.response?.data?.message || error.message || "Payment failed")
      setPaymentInitiated(false)
    } finally {
      setIsLoading(false)
    }
  }

  const initiateRazorpayPayment = async () => {
    const shopIds = getShopIds()
    try {
      setIsLoading(true)
      setPaymentInitiated(true)

      const endpoint = shopIds.length > 1 ? "/api/orders/multi-shop/" : "/api/orders/"
      const requestData =
        shopIds.length > 1
          ? {
              order_items: cartItems.map((item) => ({
                product_id: item.product,
                quantity: item.quantity,
                shop_id: item.shop_id,
                shop_name: item.shop_name,
              })),
              totalPrice: getTotalPrice(),
              paymentMethod: "razorpay",
            }
          : {
              order_items: cartItems,
              shop_id: shopIds[0],
              totalPrice: getTotalPrice(),
              paymentMethod: "razorpay",
            }

      const orderResponse = await api.post(endpoint, requestData)
      
      // Handle different response structures for single vs multi-shop orders
      const orderId = shopIds.length > 1 ? orderResponse.data.orders[0]._id : orderResponse.data.order._id
      setCurrentorder_id(orderId)
      startPaymentTimer()
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || orderResponse.data.razorpayKeyId,
        amount: getTotalPrice() * 100,
        currency: "INR",
        name: "Campus Kiosk",
        description: "Payment for your order",
        order_id: orderResponse.data.razorpay_order_id,
        handler: async (response: any) => {
          try {
            if (timer) {
              clearInterval(timer)
            }

            await api.put(`/orders/${orderId}/pay`, {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            })
            clearCart()
            toast.success("Payment successful! Your order has been placed.")
            navigate(`/order/${orderId}`)
          } catch (error: any) {
            toast.error(error.response?.data?.message || "Payment verification failed")
          } finally {
            setPaymentInitiated(false)
            setCurrentorder_id(null)
          }
        },
        modal: {
          ondismiss: async () => {
            if (timer) {
              clearInterval(timer)
            }
            setPaymentInitiated(false)

            if (currentorder_id) {
              try {
                await api.put(`/orders/${currentorder_id}/cancel`)
                toast.error("Payment cancelled")
              } catch (error) {
                console.error("Error cancelling order:", error)
              }
              setCurrentorder_id(null)
            }
          },
        },
        prefill: {
          name: user?.name,
          email: user?.email,
        },
        theme: {
          color: "#6a1b9a",
        },
      }

      const loaded = await loadRazorpayScript()
      if (!loaded) {
        toast.error("Failed to load Razorpay SDK. Please try again.")
        setPaymentInitiated(false)
        setCurrentorder_id(null)
        return
      }
      const razorpay = new window.Razorpay(options)
      razorpay.open()

      setTimeout(
        () => {
          if (razorpay && typeof razorpay.close === "function") {
            razorpay.close()
            if (currentorder_id) {
              api
                .put(`/orders/${currentorder_id}/cancel`)
                .then(() => {
                  toast.error("Payment time expired")
                  setPaymentInitiated(false)
                  setCurrentorder_id(null)
                })
                .catch((error) => {
                  console.error("Error cancelling order:", error)
                })
            }
          }
        },
        3 * 60 * 1000,
      )
    } catch (error: any) {
      console.error("Payment error:", error)
      console.log("Full error object:", error)
      setPaymentInitiated(false)
      setCurrentorder_id(null)
      toast.error(error.response?.data?.message || error.message || "Payment failed")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCheckout = () => {
    setShowDisclaimer(true)
  }

  const handleClearCart = () => {
    clearCart()
    toast.success("Cart cleared successfully")
  }

  const handleDeleteItem = (product: string, shop_id: string, name: string) => {
    setItemToDelete({ product, shop_id, name })
    setShowDeleteConfirm(true)
  }

  const confirmDelete = () => {
    if (itemToDelete) {
      removeFromCart(itemToDelete.product, itemToDelete.shop_id)
      toast.success(`${itemToDelete.name} removed from cart`)
      setShowDeleteConfirm(false)
      setItemToDelete(null)
    }
  }

  const handleDirectDelete = (product: string, shop_id: string, name: string) => {
    try {
      removeFromCart(product, shop_id)
      toast.success(`${name} removed from cart`)
    } catch (error) {
      console.error("Error removing item:", error)
      toast.error("Failed to remove item")
    }
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-20 md:pt-24">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex items-center mb-8">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center text-purple-600 hover:text-purple-700 transition-colors mr-4"
              >
                <ArrowLeft size={20} className="mr-2" />
                <span className="font-medium">Back</span>
              </button>
              <h1 className="text-3xl font-bold text-gray-900">Shopping Cart</h1>
            </div>

            <div className="text-center py-20">
              <Card className="max-w-md mx-auto">
                <CardContent className="p-12 text-center">
                  <div className="w-24 h-24 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-6">
                    <ShoppingBag size={48} className="text-purple-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Cart is Empty</h2>
                  <p className="text-gray-600 mb-8">
                    Looks like you haven't added any items to your cart yet. Start shopping to discover amazing
                    products!
                  </p>
                  <Link to="/">
                    <Button className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3">
                      <ShoppingBag size={20} className="mr-2" />
                      Start Shopping
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="pt-20 md:pt-32">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
            <div className="flex items-center">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center text-purple-600 hover:text-purple-700 transition-colors mr-4"
              >
                <ArrowLeft size={20} className="mr-2" />
                <span className="font-medium">Back</span>
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Shopping Cart</h1>
                <p className="text-gray-600 mt-1">
                  {totalItems} item{totalItems !== 1 ? "s" : ""} • {getShopIds().length} shop
                  {getShopIds().length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            <Button
              onClick={handleClearCart}
              variant="outline"
              disabled={paymentInitiated}
              className="flex items-center text-red-600 border-red-200 hover:bg-red-50 bg-transparent"
            >
              <Trash2 size={16} className="mr-2" />
              Clear Cart
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-6">
              {Object.entries(getItemsByShop()).map(([shop_id, shopData]) => (
                <Card key={shop_id} className="overflow-hidden">
                  {/* Shop Header */}
                  <CardHeader className="bg-purple-600 text-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="bg-white/20 p-2 rounded-full mr-3">
                          <ShoppingBag className="text-white" size={20} />
                        </div>
                        <div>
                          <CardTitle className="text-white text-lg">{shopData.shop_name}</CardTitle>
                          <p className="text-white/80 text-sm">
                            {shopData.items.length} item{shopData.items.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white/80 text-sm">Shop Total</p>
                        <p className="text-white font-bold text-lg">
                          ₹{shopData.items.reduce((sum, item) => sum + item.price * item.quantity, 0)}
                        </p>
                      </div>
                    </div>
                  </CardHeader>

                  {/* Items */}
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {shopData.items.map((item, index) => (
                        <div
                          key={`${item.product}-${item.shop_id}`}
                          className={`flex items-center justify-between py-6 h-32 ${index !== shopData.items.length - 1 ? "border-b border-gray-200" : ""}`}
                        >
                          <div className="flex items-center flex-1 min-w-0">
                            <div className="relative flex-shrink-0">
                              <img
                                src={item.image || "https://images.pexels.com/photos/264636/pexels-photo-264636.jpeg"}
                                alt={item.name}
                                className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                                onError={(e) => {
                                  e.currentTarget.src = "https://images.pexels.com/photos/264636/pexels-photo-264636.jpeg"
                                }}
                              />
                              {item.quantity > 1 && (
                                <Badge className="absolute -top-2 -right-2 bg-purple-600 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center p-0">
                                  {item.quantity}
                                </Badge>
                              )}
                            </div>

                            <div className="ml-4 flex-1 min-w-0">
                              <h4 className="font-semibold text-gray-900 text-base truncate">{item.name}</h4>
                              <p className="text-purple-600 font-semibold text-lg">₹{item.price}</p>
                              <p className="text-gray-500 text-sm">Stock: {item.stock} available</p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-4 flex-shrink-0">
                            {/* Quantity Controls */}
                            <div className="flex items-center bg-gray-100 rounded-lg border border-gray-200">
                              <button
                                onClick={() => {
                                  const newQuantity = item.quantity - 1
                                  handleQuantityChange(item.product, item.shop_id, newQuantity)
                                }}
                                className="p-2 hover:bg-gray-200 transition-colors rounded-l-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Decrease quantity"
                                disabled={item.quantity <= 1}
                              >
                                <Minus size={16} className="text-gray-600" />
                              </button>
                              <span className="px-4 py-2 text-gray-900 font-semibold min-w-[3rem] text-center bg-white border-x border-gray-200">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => {
                                  const newQuantity = item.quantity + 1
                                  handleQuantityChange(item.product, item.shop_id, newQuantity)
                                }}
                                className="p-2 hover:bg-gray-200 transition-colors rounded-r-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Increase quantity"
                                disabled={item.quantity >= item.stock}
                              >
                                <Plus size={16} className="text-gray-600" />
                              </button>
                            </div>

                            <div className="text-right min-w-[80px]">
                              <p className="font-bold text-gray-900 text-lg">₹{item.price * item.quantity}</p>
                            </div>

                            {/* Delete Button */}
                            <Button
                              onClick={() => handleDirectDelete(item.product, item.shop_id, item.name)}
                              variant="outline"
                              size="sm"
                              className="text-red-600 border-red-200 hover:bg-red-50 flex-shrink-0"
                              title="Remove item from cart"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-8">
                <CardHeader>
                  <CardTitle className="flex items-center text-xl">
                    <Package className="text-purple-600 mr-3" size={24} />
                    Order Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Wallet Balance */}
                  <div className="bg-purple-600 rounded-lg p-4 text-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Wallet className="mr-3" size={20} />
                        <span className="font-medium">Wallet Balance</span>
                      </div>
                      <span className="font-bold text-lg">₹{remainingBalance}</span>
                    </div>
                    {remainingBalance === 0 ? (
                      <p className="text-white/80 text-sm mt-2">No balance available. Use Razorpay to pay.</p>
                    ) : (
                      remainingBalance < getTotalPrice() && (
                        <p className="text-white/80 text-sm mt-2">
                          Need ₹{getTotalPrice() - remainingBalance} more for balance payment
                        </p>
                      )
                    )}
                  </div>

                  {/* Payment Timer */}
                  {paymentInitiated && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center">
                      <Timer className="text-yellow-600 mr-3" size={20} />
                      <div>
                        <p className="text-yellow-800 font-semibold">
                          Complete payment within {Math.floor(timeLeft / 60)}:
                          {(timeLeft % 60).toString().padStart(2, "0")}
                        </p>
                        <p className="text-yellow-600 text-sm">Time remaining</p>
                      </div>
                    </div>
                  )}

                  {/* Price Breakdown */}
                  <div className="space-y-3">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal ({totalItems} items)</span>
                      <span>₹{getTotalPrice()}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Delivery Fee</span>
                      <span className="text-green-600 font-medium">Free</span>
                    </div>
                    <hr className="border-gray-200" />
                    <div className="flex justify-between text-lg font-bold text-gray-900">
                      <span>Total</span>
                      <span className="text-purple-600">₹{getTotalPrice()}</span>
                    </div>
                  </div>

                  {/* Checkout Button */}
                  <Button
                    onClick={handleCheckout}
                    disabled={paymentInitiated || isLoading}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 text-lg"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Processing...
                      </div>
                    ) : paymentInitiated ? (
                      "Processing..."
                    ) : (
                      <div className="flex items-center justify-center">
                        <Zap className="mr-2" size={20} />
                        Proceed to Checkout
                      </div>
                    )}
                  </Button>

                  {/* Security Badge */}
                  <div className="flex items-center justify-center text-gray-500 text-sm">
                    <Shield className="mr-2" size={16} />
                    Secure Payment • 100% Safe
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Payment Options Modal */}
          {showPaymentOptions && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <Card className="max-w-md w-full">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-2xl">Choose Payment Method</CardTitle>
                    <Button onClick={() => setShowPaymentOptions(false)} variant="ghost" size="sm" className="p-2">
                      <X size={20} />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    onClick={handleBalancePayment}
                    disabled={remainingBalance < getTotalPrice() || isLoading}
                    variant="outline"
                    className={`w-full p-6 h-auto ${
                      remainingBalance >= getTotalPrice() && !isLoading
                        ? "border-purple-600 text-purple-600 hover:bg-purple-50"
                        : "opacity-50 cursor-not-allowed"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center">
                        <div className="bg-purple-100 p-3 rounded-full mr-4">
                          <Wallet size={24} className="text-purple-600" />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-lg">Use Balance</p>
                          <p className="text-sm text-gray-600">Available: ₹{remainingBalance}</p>
                        </div>
                      </div>
                      {remainingBalance === 0 ? (
                        <Badge variant="destructive" className="text-xs">
                          No Balance
                        </Badge>
                      ) : (
                        remainingBalance < getTotalPrice() && (
                          <Badge variant="destructive" className="text-xs">
                            Insufficient
                          </Badge>
                        )
                      )}
                    </div>
                  </Button>

                  <Button
                    onClick={initiateRazorpayPayment}
                    disabled={isLoading}
                    variant="outline"
                    className="w-full p-6 h-auto border-purple-600 text-purple-600 hover:bg-purple-50 bg-transparent"
                  >
                    <div className="flex items-center">
                      <div className="bg-purple-100 p-3 rounded-full mr-4">
                        <CreditCard size={24} className="text-purple-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-lg">Pay with Razorpay</p>
                        <p className="text-sm text-gray-600">Credit/Debit Card, UPI, etc.</p>
                      </div>
                    </div>
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Disclaimer Modal */}
          {showDisclaimer && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <Card className="max-w-lg w-full">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center">
                      <div className="bg-purple-100 p-3 rounded-full mr-4">
                        <AlertCircle className="text-purple-600" size={24} />
                      </div>
                      <CardTitle className="text-2xl">Important Information</CardTitle>
                    </div>
                    <Button onClick={() => setShowDisclaimer(false)} variant="ghost" size="sm" className="p-2">
                      <X size={20} />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-gray-600 text-lg">
                    Please note the following important points before proceeding with your payment:
                  </p>
                  <div className="space-y-3">
                    {getShopIds().length > 1 ? (
                      <>
                        <div className="flex items-start">
                          <CheckCircle className="text-green-600 mr-3 mt-1 flex-shrink-0" size={16} />
                          <p className="text-gray-600">You have items from {getShopIds().length} different shops</p>
                        </div>
                        <div className="flex items-start">
                          <CheckCircle className="text-green-600 mr-3 mt-1 flex-shrink-0" size={16} />
                          <p className="text-gray-600">
                            After payment, you will receive separate QR codes for each shop
                          </p>
                        </div>
                        <div className="flex items-start">
                          <CheckCircle className="text-green-600 mr-3 mt-1 flex-shrink-0" size={16} />
                          <p className="text-gray-600">
                            Each QR code must be shown to the respective shop staff for verification
                          </p>
                        </div>
                        <div className="flex items-start">
                          <CheckCircle className="text-green-600 mr-3 mt-1 flex-shrink-0" size={16} />
                          <p className="text-gray-600">QR codes are valid for 20 minutes each</p>
                        </div>
                        <div className="flex items-start">
                          <CheckCircle className="text-green-600 mr-3 mt-1 flex-shrink-0" size={16} />
                          <p className="text-gray-600">
                            Orders are valid until each shop's closing time on the same day
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-start">
                          <CheckCircle className="text-green-600 mr-3 mt-1 flex-shrink-0" size={16} />
                          <p className="text-gray-600">
                            After payment, you will receive a QR code valid for 20 minutes
                          </p>
                        </div>
                        <div className="flex items-start">
                          <CheckCircle className="text-green-600 mr-3 mt-1 flex-shrink-0" size={16} />
                          <p className="text-gray-600">The QR code must be shown to shop staff for verification</p>
                        </div>
                        <div className="flex items-start">
                          <CheckCircle className="text-green-600 mr-3 mt-1 flex-shrink-0" size={16} />
                          <p className="text-gray-600">
                            Orders are valid until the shop's closing time on the same day
                          </p>
                        </div>
                      </>
                    )}
                    <div className="flex items-start">
                      <CheckCircle className="text-green-600 mr-3 mt-1 flex-shrink-0" size={16} />
                      <p className="text-gray-600">All wallet balances will be reset to zero at the end of the day</p>
                    </div>
                    <div className="flex items-start">
                      <CheckCircle className="text-green-600 mr-3 mt-1 flex-shrink-0" size={16} />
                      <p className="text-gray-600">Payment must be completed within 3 minutes</p>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-4">
                    <Button
                      onClick={() => {
                        setShowDisclaimer(false)
                        setShowPaymentOptions(false)
                      }}
                      variant="outline"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        setShowDisclaimer(false)
                        setShowPaymentOptions(true)
                      }}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      Accept & Continue
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && itemToDelete && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <Card className="max-w-md w-full">
                <CardHeader>
                  <div className="flex items-center">
                    <div className="bg-red-100 p-3 rounded-full mr-4">
                      <Trash2 className="text-red-600" size={24} />
                    </div>
                    <CardTitle className="text-xl">Remove Item</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-gray-600">
                    Are you sure you want to remove{" "}
                    <span className="font-semibold text-gray-900">"{itemToDelete.name}"</span> from your cart?
                  </p>
                  <div className="flex justify-end space-x-4">
                    <Button
                      onClick={() => {
                        setShowDeleteConfirm(false)
                        setItemToDelete(null)
                      }}
                      variant="outline"
                    >
                      Cancel
                    </Button>
                    <Button onClick={confirmDelete} variant="destructive">
                      Remove
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CartPage
