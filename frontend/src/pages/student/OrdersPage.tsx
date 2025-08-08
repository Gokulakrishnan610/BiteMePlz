"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import api from "../../api"
import { Package, AlertCircle, Trash2, ArrowLeft, Clock, CheckCircle, XCircle } from "lucide-react"
import QRCode from "react-qr-code"
import toast from "react-hot-toast"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Badge } from "../../components/ui/badge"
import { Button } from "../../components/ui/button"
import Navbar from "../../components/Navbar"

interface Order {
  _id: string
  order_id: string
  createdAt: string
  total_price: number
  is_paid: boolean
  is_verified: boolean
  status: "pending" | "completed" | "expired"
  order_items: Array<{
    name: string
    quantity: number
    image: string
    price: number
  }>
  qr_code?: string
  qr_valid_until?: string
  payment_result?: any
}

const OrdersPage: React.FC = () => {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // cleaned up unused processing/payment states

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      const { data } = await api.get("/api/orders/myorders")
      setOrders(data)
      setLoading(false)
    } catch (err) {
      setError("Failed to load orders")
      setLoading(false)
    }
  }

  // removed old Razorpay continue-payment/cancel handlers (handled during checkout)

  const handleDelete = async (order_id: string) => {
    if (!window.confirm("Are you sure you want to delete this order?")) {
      return
    }
    try {
      await api.delete(`/api/orders/${order_id}/`)
      toast.success("Order deleted successfully")
      setOrders(orders.filter((order) => order._id !== order_id))
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete order")
    }
  }

  const getStatusBadge = (status: string, isVerified: boolean, isPaid?: boolean) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-600 hover:bg-green-700 text-white">
            <CheckCircle size={12} className="mr-1" />
            Completed
          </Badge>
        )
      case "expired":
        return (
          <Badge variant="destructive">
            <XCircle size={12} className="mr-1" />
            Expired
          </Badge>
        )
      default:
        if (isPaid && !isVerified) {
          return (
            <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">
              <Clock size={12} className="mr-1" />
              Awaiting Verification
            </Badge>
          )
        }
        return (
          <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">
            <Clock size={12} className="mr-1" />
            Pending
          </Badge>
        )
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-20 md:pt-32">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-20 md:pt-32">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex items-center justify-center h-64">
              <Card className="max-w-md w-full">
                <CardContent className="p-8 text-center">
                  <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
                  <p className="text-red-600 mb-4 text-lg">{error}</p>
                  <Button onClick={() => window.location.reload()} className="bg-purple-600 hover:bg-purple-700">
                    Retry
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-20 md:pt-32">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex items-center mb-8">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center text-purple-600 hover:text-purple-700 transition-colors mr-4"
              >
                <ArrowLeft size={20} className="mr-2" />
                <span className="font-medium">Back</span>
              </button>
              <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
            </div>

            <div className="text-center py-20">
              <Card className="max-w-md mx-auto">
                <CardContent className="p-12 text-center">
                  <div className="w-24 h-24 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-6">
                    <Package size={48} className="text-purple-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">No Orders Found</h2>
                  <p className="text-gray-600 mb-8">
                    You haven't placed any orders yet. Start shopping to see your orders here!
                  </p>
                  <Link to="/">
                    <Button className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3">
                      <Package size={20} className="mr-2" />
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="pt-20 md:pt-32">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center mb-8">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center text-purple-600 hover:text-purple-700 transition-colors mr-4"
            >
              <ArrowLeft size={20} className="mr-2" />
              <span className="font-medium">Back</span>
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
              <p className="text-gray-600 mt-1">
                {orders.length} order{orders.length !== 1 ? "s" : ""} found
              </p>
            </div>
          </div>

          {/* Orders Grid */}
          <div className="space-y-6">
            {orders.map((order) => (
              <Card key={order._id} className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
                <CardHeader className="bg-purple-600 text-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-white text-lg">Order #{order.order_id}</CardTitle>
                      <p className="text-white/80 text-sm">
                        {new Date(order.createdAt).toLocaleDateString("en-IN", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold text-xl">₹{order.total_price}</p>
                      <div className="flex gap-2 mt-2 justify-end">
                        {getStatusBadge(order.status, order.is_verified, order.is_paid)}
                        {order.is_verified && (
                          <Badge className="bg-green-600 hover:bg-green-700 text-white">
                            <CheckCircle size={12} className="mr-1" />
                            Verified
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-6">
                  {/* Order Items */}
                  <div className="space-y-4 mb-6">
                    <h3 className="font-semibold text-gray-900 mb-3">Order Items</h3>
                    {order.order_items.map((item, index) => (
                      <div key={index} className="flex items-center p-3 bg-gray-50 rounded-lg">
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                          <img
                            src={item.image || "https://images.pexels.com/photos/264636/pexels-photo-264636.jpeg"}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="ml-4 flex-1">
                          <h4 className="font-medium text-gray-900">{item.name}</h4>
                          <p className="text-sm text-gray-600">
                            {item.quantity} x ₹{item.price} = ₹{item.quantity * item.price}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Inline QR display for paid, unverified, active orders */}
                  {order.is_paid && !order.is_verified && order.status !== "expired" && order.qr_code && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                      <h4 className="font-semibold text-gray-900 mb-2">Verification QR</h4>
                      <div className="bg-white p-4 rounded-lg border flex justify-center">
                        <QRCode value={order.qr_code} size={160} />
                      </div>
                      {order.qr_valid_until && (
                        <p className="text-xs text-gray-500 mt-2 text-center">
                          Valid until {new Date(order.qr_valid_until).toLocaleString("en-IN")}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Link to details when verified */}
                  {order.status === "completed" && order.is_verified && (
                      <Link to={`/order/${order._id}`} className="flex-1">
                        <Button
                          variant="outline"
                          className="w-full border-purple-600 text-purple-600 hover:bg-purple-50 bg-transparent"
                        >
                          <Package size={16} className="mr-2" />
                          View Order Details
                        </Button>
                      </Link>
                    )}

                    {order.status === "expired" && (
                      <Button
                        onClick={() => handleDelete(order._id)}
                        variant="outline"
                        className="border-red-200 text-red-600 hover:bg-red-50 bg-transparent"
                      >
                        <Trash2 size={16} className="mr-2" />
                        Delete Order
                      </Button>
                    )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick Actions */}
          <Card className="mt-8">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Need something else?</h3>
                  <p className="text-gray-600 text-sm">Continue shopping or check your profile</p>
                </div>
                <div className="flex gap-3">
                  <Link to="/">
                    <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                      <Package size={16} className="mr-2" />
                      Continue Shopping
                    </Button>
                  </Link>
                  <Link to="/profile">
                    <Button
                      variant="outline"
                      className="border-purple-600 text-purple-600 hover:bg-purple-50 bg-transparent"
                    >
                      View Profile
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default OrdersPage