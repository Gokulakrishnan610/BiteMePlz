"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import api from "../../api"
import { User, AlertCircle, ArrowLeft, Wallet } from "lucide-react"
import {
  ResponsiveContainer,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import { Card, CardContent } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import Navbar from "../../components/Navbar"
import { useAuth } from "../../context/AuthContext"
import { useWallet } from "../../context/WalletContext"

interface UserProfile {
  _id: string
  name: string
  email: string
  role: string
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
}

const ProfilePage: React.FC = () => {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const { balance } = useWallet()
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
  })
  const [paidOrders, setPaidOrders] = useState<MinimalOrderForSpending[]>([])
  const [timeFilter] = useState<'all' | 'lastMonth'>('all')

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const timeoutPromise = new Promise(resolve => setTimeout(resolve, 300))
        const profilePromise = api.get("/api/users/profile/")
        const [_, { data }] = await Promise.all([timeoutPromise, profilePromise])
        setProfile(data)
        setLoading(false)
        
        // Log view profile for students/staff
        if (['student', 'staff'].includes(data.role)) {
          import('../../utils/studentLogger').then(({ logViewProfile }) => {
            logViewProfile()
          })
        }
      } catch (err) {
        console.error("Failed to load profile:", err)
        setError("Failed to load profile")
        setLoading(false)
      }
    }

    fetchProfile()
  }, [])

  // Load spending analytics
  useEffect(() => {
    const fetchSpending = async () => {
      try {
        const { data } = await api.get<any>("/api/orders/myorders")
        const maybeResults = (data as any)?.results
        const orders: MinimalOrderForSpending[] = Array.isArray(maybeResults)
          ? maybeResults
          : Array.isArray(data)
          ? (data as MinimalOrderForSpending[])
          : []

        const getPaid = (o: MinimalOrderForSpending) => Boolean(o.is_paid ?? o.isPaid)
        const getAmount = (o: MinimalOrderForSpending) => Number(o.total_price ?? o.totalPrice ?? 0)
        const getDate = (o: MinimalOrderForSpending) => new Date((o.createdAt ?? o.created_at) as string)

        const paid = orders.filter(getPaid)
        setPaidOrders(paid)

        const totalAll = paid.reduce((sum: number, o: MinimalOrderForSpending) => sum + getAmount(o), 0)
        const now = new Date()
        const currentMonth = now.getMonth()
        const currentYear = now.getFullYear()
        const thisMonthTotal = paid.reduce((sum: number, o: MinimalOrderForSpending) => {
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
        })
      }
    }
    fetchSpending()
  }, [])

  useEffect(() => {
    const compute = (source: MinimalOrderForSpending[], range: 'all' | 'lastMonth') => {
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
      const itemAgg = new Map<string, { qty: number; amount: number }>()
      const values: number[] = []
      for (const o of filtered) {
        const amount = getAmount(o)
        values.push(amount)
        const shopName = o.shop?.name || o.order_items?.[0]?.shop_name || "Unknown"
        byShopMap.set(shopName, (byShopMap.get(shopName) || 0) + amount)
        for (const it of o.order_items || []) {
          const key = it.name || "Unknown"
          const priceNum = Number(it.price ?? 0)
          const qtyNum = Number(it.quantity ?? 0)
          const prev = itemAgg.get(key) || { qty: 0, amount: 0 }
          itemAgg.set(key, { qty: prev.qty + qtyNum, amount: prev.amount + priceNum * qtyNum })
        }
      }
      const byShop = Array.from(byShopMap.entries())
        .map(([shop, amount]) => ({ shop, amount }))
        .sort((a, b) => b.amount - a.amount)
      const topItems = Array.from(itemAgg.entries())
        .map(([item, v]) => ({ item, qty: v.qty, amount: v.amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5)

      // Per-day for last 30 days
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

      let medianOrderValue = 0, minOrderValue = 0, maxOrderValue = 0
      if (values.length > 0) {
        const sorted = [...values].sort((a, b) => a - b)
        const mid = Math.floor(sorted.length / 2)
        medianOrderValue = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
        minOrderValue = sorted[0]
        maxOrderValue = sorted[sorted.length - 1]
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
      })
    }
    compute(paidOrders, timeFilter)
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
    <div className="min-h-screen bg-gray-50 flex flex-col pb-24">
      <Navbar />

      {/* Header */}
      <div className="bg-white shadow-sm pt-20 md:pt-32">
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

      {/* Minimal shadcn card with Name, Email, Role */}
      <div className="max-w-3xl mx-auto w-full px-4 py-8 flex-1">
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-10 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm mx-auto mb-3">
              <User size={28} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">{profile.name}</h2>
          </div>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Name</p>
                <p className="font-medium text-gray-900 break-words">{profile.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Email</p>
                <p className="font-medium text-gray-900 break-words">{profile.email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Role</p>
                <p className="font-medium text-gray-900 capitalize">{profile.role}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats: Wallet + Spending Summary */}
      <div className="max-w-7xl mx-auto px-4 py-4 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                  <p className="text-4xl font-bold">₹{(Number(balance) || 0).toFixed(2)}</p>
                  <p className="text-purple-100 text-sm mt-2">Use for quick payments</p>
                </div>
              </div>
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Spending</h4>
                <details className="bg-gray-50 rounded-xl group">
                  <summary className="p-4 cursor-pointer list-none flex items-center justify-between">
                    <span className="text-sm text-gray-500">Total Spent</span>
                    <span className="text-2xl font-bold text-gray-900">₹{spending.total.toFixed(2)}</span>
                  </summary>
                  <div className="px-4 pb-4">
                    <div className="p-3 rounded-lg bg-white border">
                      <p className="text-sm text-gray-500 mb-1">This Month</p>
                      <p className="text-xl font-semibold text-gray-900">₹{spending.thisMonth.toFixed(2)}</p>
                    </div>
                  </div>
                </details>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden lg:col-span-2">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top items share</h3>
              <div className="h-64 border rounded-xl p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={spendingDetails.topItems} dataKey="amount" nameKey="item" outerRadius={90}>
                      {spendingDetails.topItems.map((_, idx) => (
                        <Cell key={`cell-${idx}`} fill={["#7c3aed", "#6366f1", "#22c55e", "#f59e0b", "#ef4444"][idx % 5]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any, _n: any, e: any) => [`₹${Number(v).toFixed(2)}`, (e && e.payload && e.payload.item) || 'Item']} />
                    <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed bottom logout button */}
      <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-6 pt-4 bg-white/90 backdrop-blur border-t">
        <Button
          onClick={() => {
            logout()
            if (user?.role === 'admin') {
              navigate('/kisok-ac-back-office/login', { replace: true })
            } else if (user?.role === 'shopAdmin') {
              navigate('/kisok-sp-back-office/login', { replace: true })
            } else if (user?.role === 'parent') {
              navigate('/parent-login', { replace: true })
            } else {
              navigate('/login', { replace: true })
            }
          }}
          variant="destructive"
          className="w-full h-12 bg-red-600 hover:bg-red-700 text-white rounded-xl"
        >
          Logout
        </Button>
      </div>
    </div>
  )
}

export default ProfilePage