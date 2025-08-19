"use client"

import type React from "react"
import { useEffect, useState } from "react"
import api from "../../api"
import { ShoppingBag, AlertCircle, Calendar, X, ArrowUpDown } from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import { useAdminShop } from "../../context/AdminShopContext"
import { toast } from "sonner"
import Loader from "../../components/Loader"

interface Order {
  _id: string
  order_id: string
  user: {
    name: string
    email: string
    rollNo: string
  }
  items: Array<{
    product: {
      name: string
      price: number
    }
    quantity: number
  }>
  totalPrice: number
  status: string
  payment_status: string
  created_at: string
  shop: {
    name: string
  }
}

type SortField = "date" | "total" | "status"
type SortOrder = "asc" | "desc"

const OrdersPage: React.FC = () => {
  const { user } = useAuth()
  const { selectedShop } = useAdminShop()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortField, setSortField] = useState<SortField>("date")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [filter, setFilter] = useState("all")

  // Determine the effective shop ID
  const effectiveShopId = user?.role === "admin" && selectedShop ? selectedShop.id : user?.shop

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        if (!effectiveShopId) {
          setLoading(false)
          return
        }

        const { data }: { data: any } = await api.get(`/api/orders/shop/?shop_id=${effectiveShopId}`)
        // Transform backend data to match frontend format
        const transformedOrders = (data.results || data).map((order: any) => ({
          _id: order._id,
          order_id: order.order_id,
          user: order.user,
          items: order.order_items || [],
          totalPrice: order.total_price,
          status: order.is_verified ? "verified" : "pending",
          payment_status: order.is_paid ? "paid" : "pending",
          created_at: order.createdAt,
          shop: { name: "Current Shop" }, // Placeholder since we're in shop context
        }))
        setOrders(transformedOrders)
        setLoading(false)
      } catch (err) {
        console.error("Error fetching orders:", err)
        toast.error("Failed to fetch orders")
        setLoading(false)
      }
    }

    fetchOrders()
  }, [effectiveShopId])

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("desc")
    }
  }

  const handleDateFilter = (date: string) => {
    setSelectedDate(date)
  }

  const clearDateFilter = () => {
    setSelectedDate("")
  }

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      await api.put(`/api/orders/${orderId}/`, { status })
      setOrders((prev) => prev.map((order) => (order._id === orderId ? { ...order, status } : order)))
      toast.success(`Order ${status}`)
    } catch (error) {
      console.error("Error updating order status:", error)
      toast.error("Failed to update order status")
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "text-yellow-600 bg-yellow-100"
      case "verified":
        return "text-green-600 bg-green-100"
      case "expired":
        return "text-red-600 bg-red-100"
      default:
        return "text-gray-600 bg-gray-100"
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "text-green-600 bg-green-100"
      case "pending":
        return "text-yellow-600 bg-yellow-100"
      case "failed":
        return "text-red-600 bg-red-100"
      default:
        return "text-gray-600 bg-gray-100"
    }
  }

  const filteredOrders = selectedDate
    ? orders.filter((order) => {
        const orderDate = new Date(order.created_at).toLocaleDateString()
        const filterDate = new Date(selectedDate).toLocaleDateString()
        return orderDate === filterDate
      })
    : orders

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    let comparison = 0
    switch (sortField) {
      case "date":
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        break
      case "total":
        comparison = a.totalPrice - b.totalPrice
        break
      case "status":
        const statusA = `${a.payment_status === "paid" ? "1" : "0"}${a.status === "verified" ? "1" : "0"}`
        const statusB = `${b.payment_status === "paid" ? "1" : "0"}${b.status === "verified" ? "1" : "0"}`
        comparison = statusA.localeCompare(statusB)
        break
    }
    return sortOrder === "asc" ? comparison : -comparison
  })

  if (loading) {
    return <Loader />
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertCircle className="mx-auto text-[var(--error)] mb-4" size={48} />
          <p className="text-[var(--error)]">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <h1 className="text-xl sm:text-2xl font-bold">Orders</h1>
        <div className="flex items-center gap-2 bg-black border border-purple-500 rounded-lg p-2 sm:p-3 shadow-sm w-full sm:w-auto">
          <Calendar size={18} className="text-purple-400 flex-shrink-0" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => handleDateFilter(e.target.value)}
            className="bg-black text-white border-none focus:ring-purple-500 p-0 text-sm sm:text-base flex-1 sm:flex-initial"
          />
          {selectedDate && (
            <button onClick={clearDateFilter} className="text-gray-400 hover:text-white flex-shrink-0">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left p-3 font-semibold">Order ID</th>
                <th className="text-left p-3 font-semibold">Customer</th>
                <th className="text-left p-3 font-semibold">Items</th>
                <th
                  className={`text-left p-3 font-semibold cursor-pointer transition hover:bg-purple-100 ${
                    sortField === "total" ? "bg-purple-100 text-purple-800" : ""
                  }`}
                  onClick={() => handleSort("total")}
                >
                  <div className="flex items-center">
                    Total
                    <ArrowUpDown size={16} className="ml-1 text-purple-700" />
                  </div>
                </th>
                <th
                  className={`text-left p-3 font-semibold cursor-pointer transition hover:bg-purple-100 ${
                    sortField === "status" ? "bg-purple-100 text-purple-800" : ""
                  }`}
                  onClick={() => handleSort("status")}
                >
                  <div className="flex items-center">
                    Status
                    <ArrowUpDown size={16} className="ml-1 text-purple-700" />
                  </div>
                </th>
                <th
                  className={`text-left p-3 font-semibold cursor-pointer transition hover:bg-purple-100 ${
                    sortField === "date" ? "bg-purple-100 text-purple-800" : ""
                  }`}
                  onClick={() => handleSort("date")}
                >
                  <div className="flex items-center">
                    Date
                    <ArrowUpDown size={16} className="ml-1 text-purple-700" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedOrders.map((order) => (
                <tr key={order._id} className="border-t hover:bg-gray-50">
                  <td className="p-3 font-medium">#{order.order_id.slice(-8)}</td>
                  <td className="p-3">
                    <div>
                      <p className="font-medium">{order.user.name}</p>
                      <p className="text-sm text-gray-500">{order.user.email}</p>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="space-y-1">
                      {order.items.map((item, index) => (
                        <p key={index} className="text-sm">
                          {item.quantity || 0}x {item.product?.name || "Unknown Product"}
                        </p>
                      ))}
                    </div>
                  </td>
                  <td className="p-3 font-medium">₹{order.totalPrice}</td>
                  <td className="p-3">
                    <div className="flex flex-col gap-1">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          order.payment_status === "paid"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {order.payment_status === "paid" ? "Paid" : "Pending"}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          order.status === "verified" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {order.status === "verified" ? "Verified" : "Not Verified"}
                      </span>
                    </div>
                  </td>
                  <td className="p-3 text-sm">{new Date(order.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="lg:hidden space-y-4">
          <div className="flex flex-wrap gap-2 p-4 bg-gray-50 rounded-lg">
            <button
              onClick={() => handleSort("date")}
              className={`flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition ${
                sortField === "date" ? "bg-purple-600 text-white" : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              Date <ArrowUpDown size={14} />
            </button>
            <button
              onClick={() => handleSort("total")}
              className={`flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition ${
                sortField === "total" ? "bg-purple-600 text-white" : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              Total <ArrowUpDown size={14} />
            </button>
            <button
              onClick={() => handleSort("status")}
              className={`flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition ${
                sortField === "status" ? "bg-purple-600 text-white" : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              Status <ArrowUpDown size={14} />
            </button>
          </div>

          {sortedOrders.map((order) => (
            <div key={order._id} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-lg">#{order.order_id.slice(-8)}</p>
                  <p className="text-sm text-gray-500">{new Date(order.created_at).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">₹{order.totalPrice}</p>
                </div>
              </div>

              <div className="border-t pt-3">
                <p className="font-medium text-gray-900">{order.user.name}</p>
                <p className="text-sm text-gray-600">{order.user.email}</p>
              </div>

              <div className="border-t pt-3">
                <p className="font-medium text-gray-900 mb-2">Items:</p>
                <div className="space-y-1">
                  {order.items.map((item, index) => (
                    <p key={index} className="text-sm text-gray-700">
                      {item.quantity || 0}x {item.product?.name || "Unknown Product"}
                    </p>
                  ))}
                </div>
              </div>

              <div className="border-t pt-3">
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      order.payment_status === "paid" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {order.payment_status === "paid" ? "Paid" : "Payment Pending"}
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      order.status === "verified" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {order.status === "verified" ? "Verified" : "Not Verified"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {orders.length === 0 && (
          <div className="text-center py-8 sm:py-12 px-4">
            <ShoppingBag size={40} className="text-gray-400 mx-auto mb-4 sm:mb-6" />
            <h2 className="text-lg sm:text-xl font-semibold text-gray-600 mb-2">No Orders Yet</h2>
            <p className="text-sm sm:text-base text-gray-500">Orders will appear here once customers make purchases.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default OrdersPage
