"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import api from "../../api"
import { User, AlertCircle, ArrowLeft, Mail, Shield, Wallet, Calendar, CreditCard, MapPin, Clock } from "lucide-react"
// Charts
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import { Card, CardContent } from "../../components/ui/card"
import { Badge } from "../../components/ui/badge"
import { Button } from "../../components/ui/button"
import Navbar from "../../components/Navbar"

interface UserProfile {
  _id: string
  name: string
  email: string
  role: string
  balance?: number
  createdAt?: string
}

// Minimal order shape for spending analytics
interface MinimalOrderForSpending {
  _id: string
  createdAt?: string
  created_at?: string
  total_price?: number
  totalPrice?: number
  is_paid?: boolean
  isPaid?: boolean
  shop?: { name?: string }
  order_items?: Array<{
    name?: string
    price?: number | string
    quantity?: number
    shop_name?: string
  }>
}

interface SpendingDetails {
  totalSpent: number
  ordersCount: number
  averageOrderValue: number
  last7Days: number
  last30Days: number
  byShop: Array<{ shop: string; amount: number }>
  topItems: Array<{ item: string; qty: number; amount: number }>
  perDay?: Array<{ date: string; amount: number; orders: number }>
  medianOrderValue?: number
  minOrderValue?: number
  maxOrderValue?: number
  hourOfDay?: Array<{ hour: number; count: number; amount: number }>
  dayOfWeek?: Array<{ day: number; count: number; amount: number }>
}

const ProfilePage: React.FC = () => {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [spending, setSpending] = useState<{ total: number; thisMonth: number }>({ total: 0, thisMonth: 0 })
  const [spendingDetails, setSpendingDetails] = useState<SpendingDetails>({
    totalSpent: 0,
    ordersCount: 0,
    averageOrderValue: 0,
    last7Days: 0,
    last30Days: 0,
    byShop: [],
    topItems: [],
    perDay: [],
    medianOrderValue: 0,
    minOrderValue: 0,
    maxOrderValue: 0,
    hourOfDay: [],
    dayOfWeek: [],
  })
  const [paidOrders, setPaidOrders] = useState<MinimalOrderForSpending[]>([])
  const [timeFilter, setTimeFilter] = useState<'all' | 'lastMonth'>('all')

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const timeoutPromise = new Promise(resolve => setTimeout(resolve, 300))
        const profilePromise = api.get("/api/users/profile")
        const [_, { data }] = await Promise.all([timeoutPromise, profilePromise])
        setProfile(data)
        setLoading(false)
      } catch (err) {
        console.error("Failed to load profile:", err)
        setError("Failed to load profile")
        setLoading(false)
      }
    }

    fetchProfile()
  }, [])

  useEffect(() => {
    const fetchSpending = async () => {
      try {
        const { data } = await api.get<MinimalOrderForSpending[]>("/api/orders/myorders")
        const orders = Array.isArray(data) ? data : []

        const getPaid = (o: MinimalOrderForSpending) => Boolean(o.is_paid ?? o.isPaid)
        const getAmount = (o: MinimalOrderForSpending) => Number(o.total_price ?? o.totalPrice ?? 0)
        const getDate = (o: MinimalOrderForSpending) => new Date((o.createdAt ?? o.created_at) as string)

        const paid = orders.filter(getPaid)
        setPaidOrders(paid)

        // Also compute headline summary (Total + This Month) independent of filter
        const totalAll = paid.reduce((sum, o) => sum + getAmount(o), 0)
        const now = new Date()
        const currentMonth = now.getMonth()
        const currentYear = now.getFullYear()
        const thisMonthTotal = paid.reduce((sum, o) => {
          const d = getDate(o)
          if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
            return sum + getAmount(o)
          }
          return sum
        }, 0)
        setSpending({ total: totalAll, thisMonth: thisMonthTotal })
      } catch (err) {
        console.warn("Failed to load spending analytics", err)
        setPaidOrders([])
        setSpending({ total: 0, thisMonth: 0 })
        setSpendingDetails({
          totalSpent: 0,
          ordersCount: 0,
          averageOrderValue: 0,
          last7Days: 0,
          last30Days: 0,
          byShop: [],
          topItems: [],
          perDay: [],
          medianOrderValue: 0,
          minOrderValue: 0,
          maxOrderValue: 0,
          hourOfDay: [],
          dayOfWeek: [],
        })
      }
    }

    fetchSpending()
  }, [])

  // Recompute analytics whenever the filter or source orders change
  useEffect(() => {
    const computeAnalytics = (source: MinimalOrderForSpending[], range: 'all' | 'lastMonth') => {
      const getAmount = (o: MinimalOrderForSpending) => Number(o.total_price ?? o.totalPrice ?? 0)
      const getDate = (o: MinimalOrderForSpending) => new Date((o.createdAt ?? o.created_at) as string)

      let filtered = source
      if (range === 'lastMonth') {
        const now = new Date()
        const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const lastOfPrevMonth = new Date(firstOfThisMonth.getTime() - 1)
        const firstOfPrevMonth = new Date(lastOfPrevMonth.getFullYear(), lastOfPrevMonth.getMonth(), 1)
        filtered = source.filter((o) => {
          const d = getDate(o)
          return d >= firstOfPrevMonth && d <= lastOfPrevMonth
        })
      }

      const total = filtered.reduce((sum, o) => sum + getAmount(o), 0)
      const ordersCount = filtered.length
      const averageOrderValue = ordersCount > 0 ? total / ordersCount : 0

      const now = new Date()
      const msInDay = 24 * 60 * 60 * 1000
      const last7DaysThreshold = new Date(now.getTime() - 7 * msInDay)
      const last30DaysThreshold = new Date(now.getTime() - 30 * msInDay)

      const last7Days = filtered
        .filter((o) => getDate(o) >= last7DaysThreshold)
        .reduce((sum, o) => sum + getAmount(o), 0)

      const last30Days = filtered
        .filter((o) => getDate(o) >= last30DaysThreshold)
        .reduce((sum, o) => sum + getAmount(o), 0)

      const byShopMap = new Map<string, number>()
      for (const o of filtered) {
        const shopName = o.shop?.name || o.order_items?.[0]?.shop_name || "Unknown"
        const prev = byShopMap.get(shopName) || 0
        byShopMap.set(shopName, prev + getAmount(o))
      }
      const byShop = Array.from(byShopMap.entries())
        .map(([shop, amount]) => ({ shop, amount }))
        .sort((a, b) => b.amount - a.amount)

      const itemAgg = new Map<string, { qty: number; amount: number }>()
      const values: number[] = []
      for (const o of filtered) {
        const amount = getAmount(o)
        values.push(amount)
        for (const it of o.order_items || []) {
          const key = it.name || "Unknown"
          const priceNum = Number(it.price ?? 0)
          const qtyNum = Number(it.quantity ?? 0)
          const prev = itemAgg.get(key) || { qty: 0, amount: 0 }
          itemAgg.set(key, { qty: prev.qty + qtyNum, amount: prev.amount + priceNum * qtyNum })
        }
      }
      const topItems = Array.from(itemAgg.entries())
        .map(([item, v]) => ({ item, qty: v.qty, amount: v.amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5)

      const perDayMap = new Map<string, { amount: number; orders: number }>()
      const cutoff30 = new Date(now.getTime() - 30 * msInDay)
      for (const o of filtered) {
        const d = getDate(o)
        if (isNaN(d.getTime()) || d < cutoff30) continue
        const key = d.toISOString().slice(0, 10)
        const prev = perDayMap.get(key) || { amount: 0, orders: 0 }
        perDayMap.set(key, { amount: prev.amount + getAmount(o), orders: prev.orders + 1 })
      }
      const perDay = Array.from(perDayMap.entries())
        .map(([date, v]) => ({ date, amount: v.amount, orders: v.orders }))
        .sort((a, b) => (a.date < b.date ? 1 : -1))

      // Median / min / max order value
      let medianOrderValue = 0, minOrderValue = 0, maxOrderValue = 0
      if (values.length > 0) {
        const sorted = [...values].sort((a, b) => a - b)
        const mid = Math.floor(sorted.length / 2)
        medianOrderValue = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
        minOrderValue = sorted[0]
        maxOrderValue = sorted[sorted.length - 1]
      }

      // Hour of day and Day of week distributions
      const hourAgg = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0, amount: 0 }))
      const dayAgg = Array.from({ length: 7 }, (_, d) => ({ day: d, count: 0, amount: 0 }))
      for (const o of filtered) {
        const d = getDate(o)
        const h = d.getHours()
        const wd = d.getDay()
        hourAgg[h].count += 1
        hourAgg[h].amount += getAmount(o)
        dayAgg[wd].count += 1
        dayAgg[wd].amount += getAmount(o)
      }

      setSpendingDetails({
        totalSpent: total,
        ordersCount,
        averageOrderValue,
        last7Days,
        last30Days,
        byShop,
        topItems,
        perDay,
        medianOrderValue,
        minOrderValue,
        maxOrderValue,
        hourOfDay: hourAgg,
        dayOfWeek: dayAgg,
      })
    }

    computeAnalytics(paidOrders, timeFilter)
  }, [paidOrders, timeFilter])

  const SkeletonLoader = () => (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="bg-white shadow-sm border-b pt-20 md:pt-32">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
            <div>
              <div className="w-32 h-6 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="w-48 h-4 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  if (loading) return <SkeletonLoader />

  if (error || !profile) {
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Header */}
      <div className="bg-white shadow-sm  pt-20 md:pt-32">
  <div className="px-4 sm:px-8 md:px-20 lg:px-52 py-5">
    <div className="flex flex-row items-center gap-3 mb-8 flex-wrap">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-purple-600 hover:text-purple-700 transition-colors"
      >
        <ArrowLeft size={20} className="mr-2" />
        <span className="font-medium">Back</span>
      </button>

      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm">Manage your profile and preferences</p>
      </div>
    </div>
  </div>
</div>


      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Profile Section */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-3 sm:space-y-0">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm mx-auto sm:mx-0">
                  <User size={28} className="text-white" />
                </div>
                <div className="text-center sm:text-left">
                  <h2 className="text-2xl font-bold text-white">{profile.name}</h2>
                  <p className="text-purple-100">{profile.email}</p>
                  <div className="mt-2">
                    <Badge className="bg-white/20 text-white border-0 capitalize">{profile.role}</Badge>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <Mail size={20} className="text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium text-gray-900">{profile.email}</p>
                    </div>
                  </div>

                  {profile.createdAt && (
                    <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <Calendar size={20} className="text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Member since</p>
                        <p className="font-medium text-gray-900">
                          {new Date(profile.createdAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <Shield size={20} className="text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Account status</p>
                      <p className="font-medium text-gray-900">Active</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Mail size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Email verification</p>
                      <p className="font-medium text-gray-900">Verified</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Wallet Balance Card */}
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <div className="p-6 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row items-center sm:items-start sm:space-x-3 mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Wallet size={24} className="text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Wallet Balance</h3>
                  <p className="text-gray-500 text-sm">Available for payments</p>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl p-6 text-white">
                <div className="text-center">
                  <p className="text-purple-100 text-sm mb-2">Current Balance</p>
                  <p className="text-4xl font-bold">₹{profile.balance || 0}</p>
                  <p className="text-purple-100 text-sm mt-2">Use for quick payments</p>
                </div>
              </div>
              {/* Embedded Spending Summary */}
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Spending</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-gray-50">
                    <p className="text-sm text-gray-500 mb-1">Total Spent</p>
                    <p className="text-2xl font-bold text-gray-900">₹{spending.total.toFixed(2)}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-gray-50">
                    <p className="text-sm text-gray-500 mb-1">This Month</p>
                    <p className="text-2xl font-bold text-gray-900">₹{spending.thisMonth.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          

          {/* Detailed Spending Card */}
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden lg:col-span-3">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Spending</h3>
              <div className="mb-4">
                <label className="text-sm text-gray-600 mr-2">Time range:</label>
                <select
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value as 'all' | 'lastMonth')}
                  className="border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="all">All time</option>
                  <option value="lastMonth">Last month</option>
                </select>
              </div>
              {/* Key stats */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
                <div className="p-4 rounded-xl bg-gray-50">
                  <p className="text-sm text-gray-500 mb-1">Orders</p>
                  <p className="text-2xl font-bold text-gray-900">{spendingDetails.ordersCount}</p>
                </div>
                <div className="p-4 rounded-xl bg-gray-50">
                  <p className="text-sm text-gray-500 mb-1">Avg Spent</p>
                  <p className="text-2xl font-bold text-gray-900">₹{spendingDetails.averageOrderValue.toFixed(2)}</p>
                </div>

                <div className="p-4 rounded-xl bg-gray-50">
                  <p className="text-sm text-gray-500 mb-1">Last 7 Days</p>
                  <p className="text-2xl font-bold text-gray-900">₹{spendingDetails.last7Days.toFixed(2)}</p>
                </div>
                <div className="p-4 rounded-xl bg-gray-50">
                  <p className="text-sm text-gray-500 mb-1">Last 30 Days</p>
                  <p className="text-2xl font-bold text-gray-900">₹{spendingDetails.last30Days.toFixed(2)}</p>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="h-64 border rounded-xl p-3">
                  <p className="text-sm text-gray-600 mb-2">Daily spend (last 30 days)</p>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={[...(spendingDetails.perDay || [])].slice().reverse()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(d: string) =>
                          new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                        }
                      />
                      <YAxis />
                      <Tooltip
                        formatter={(v: any) => [`₹${Number(v).toFixed(2)}`, 'Amount']}
                        labelFormatter={(d: any) => new Date(d).toLocaleDateString()}
                      />
                      <Line type="monotone" dataKey="amount" stroke="#7c3aed" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="h-64 border rounded-xl p-3">
                  <p className="text-sm text-gray-600 mb-2">Top items share</p>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={spendingDetails.topItems} dataKey="amount" nameKey="item" outerRadius={80} label>
                        {spendingDetails.topItems.map((_, idx) => (
                          <Cell key={`cell-${idx}`} fill={["#7c3aed", "#6366f1", "#22c55e", "#f59e0b", "#ef4444"][idx % 5]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any, _n: any, e: any) => [`₹${Number(v).toFixed(2)}`, (e && e.payload && e.payload.item) || 'Item']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Per day (last 30 days) */}
              <div className="mt-6">
                <h4 className="text-md font-semibold text-gray-900 mb-2">Per day (last 30 days)</h4>
                {spendingDetails.perDay && spendingDetails.perDay.length > 0 ? (
                  <ul className="divide-y divide-gray-100 border rounded-xl">
                    {spendingDetails.perDay.slice(0, 14).map((d) => (
                      <li key={d.date} className="flex items-center justify-between p-3">
                        <div className="text-gray-700">
                          <p className="font-medium">{new Date(d.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
                          <p className="text-xs text-gray-500">Orders: {d.orders}</p>
                        </div>
                        <span className="font-medium text-gray-900">₹{d.amount.toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">No data yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Button
                  onClick={() => navigate("/orders", { replace: true })}
                  variant="outline"
                  className="h-16 border-gray-200 hover:border-purple-300 hover:bg-purple-50 text-gray-700 hover:text-purple-700 transition-all duration-200"
                >
                  <div className="flex items-center space-x-3 justify-start w-full">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <Clock size={20} className="text-purple-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">My Orders</p>
                      <p className="text-sm text-gray-500">View order history</p>
                    </div>
                  </div>
                </Button>
                
                <Button
                  onClick={() => navigate("/cart")}
                  variant="outline"
                  className="h-16 border-gray-200 hover:border-purple-300 hover:bg-purple-50 text-gray-700 hover:text-purple-700 transition-all duration-200"
                >
                  <div className="flex items-center space-x-3 justify-start w-full">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <CreditCard size={20} className="text-purple-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Shopping Cart</p>
                      <p className="text-sm text-gray-500">View cart items</p>
                    </div>
                  </div>
                </Button>

                <Button
                  onClick={() => navigate("/")}
                  className="h-16 bg-purple-600 hover:bg-purple-700 text-white transition-all duration-200 sm:col-span-2"
                >
                  <div className="flex items-center space-x-3 justify-start w-full">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      <MapPin size={20} className="text-white" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Continue Shopping</p>
                      <p className="text-sm text-purple-100">Browse restaurants and shops</p>
                    </div>
                  </div>
                </Button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

export default ProfilePage