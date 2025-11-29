"use client"

import type React from "react"
import { useEffect, useState } from "react"
import api from "../../api"
import {
  Receipt,
  Download,
  Eye,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  DollarSign,
  X,
  BarChart3,
} from "lucide-react"
import { Line, Bar, Doughnut } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js"
import { useAuth } from "../../context/AuthContext"
import { useAdminShop } from "../../context/AdminShopContext"
import { toast } from "sonner"

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend)

interface Transaction {
  _id: string
  type: string
  amount: number
  status: string
  paymentMethod: string
  description: string
  createdAt: string
  user: {
    name: string
    email: string
    rollNo: string
  }
  order: {
    order_id: string
    totalPrice: number
  }
  metadata: any
}

interface RealTimeAnalytics {
  hourlyDistribution: Array<{
    hour: number
    count: number
    amount: number
  }>
  dailyTrends: Array<{
    date: string
    transactions: number
    revenue: number
  }>
  typeBreakdown: Array<{
    type: string
    count: number
    amount: number
    percentage: number
  }>
  paymentMethodStats: Array<{
    method: string
    count: number
    amount: number
    percentage: number
  }>
  topCustomers: Array<{
    name: string
    rollNo: string
    totalSpent: number
    transactionCount: number
  }>
}

// Normalize API responses (snake_case -> camelCase) and handle array/object payloads
const normalizeTransaction = (t: any): Transaction => ({
  _id: t._id || t.id,
  type: t.type,
  amount: typeof t.amount === "number" ? t.amount : Number(t.amount || 0),
  status: t.status,
  paymentMethod: t.paymentMethod ?? t.payment_method ?? "",
  description: t.description,
  createdAt: t.createdAt ?? t.created_at,
  user: {
    name: t.user?.name,
    email: t.user?.email,
    rollNo: t.user?.rollNo ?? t.user?.roll_no,
  },
  order: t.order
    ? {
        order_id: t.order.order_id,
        totalPrice:
          typeof t.order.totalPrice === "number"
            ? t.order.totalPrice
            : Number(t.order.total_price ?? t.order.totalPrice ?? 0),
      }
    : (undefined as any),
  metadata: t.metadata,
})

const extractTransactions = (data: any): Transaction[] => {
  const list = Array.isArray(data) ? data : data?.results || data?.transactions || []
  return (list as any[]).map(normalizeTransaction)
}

const TransactionsPage: React.FC = () => {
  const { user } = useAuth()
  const { selectedShop } = useAdminShop()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [analytics, setAnalytics] = useState<RealTimeAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [activeTab, setActiveTab] = useState<"transactions" | "analytics">("transactions")
  const [filters, setFilters] = useState({
    type: "",
    status: "",
    startDate: "",
    endDate: "",
    search: "",
    page: 1,
    limit: 50,
  })
  const [stats, setStats] = useState({
    totalTransactions: 0,
    totalAmount: 0,
    successfulTransactions: 0,
    failedTransactions: 0,
  })
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
  })

  // Determine the effective shop ID
  const effectiveShopId = user?.role === "admin" && selectedShop ? selectedShop.id : user?.shop

  useEffect(() => {
    if (effectiveShopId) {
      fetchTransactions()
      if (activeTab === "analytics") {
        generateRealTimeAnalytics()
      }
    }
  }, [effectiveShopId, filters, activeTab])

  const fetchTransactions = async () => {
    try {
      setLoading(true)

      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString())
      })

      const { data }: { data: any } = await api.get(`/api/transactions/shop/?shop_id=${effectiveShopId}&${params}`)
      const normalized = extractTransactions(data)
      setTransactions(normalized)
      setPagination({
        currentPage: (Array.isArray(data) ? 1 : data.currentPage) || 1,
        totalPages: (Array.isArray(data) ? 1 : data.totalPages) || 1,
        total: (Array.isArray(data) ? normalized.length : data.total) || normalized.length || 0,
      })

      // Calculate real stats from normalized data
      const totalTransactions = normalized.length
      // Amount should include only successful payments
      const totalAmount =
        normalized
          .filter((t: Transaction) => t.type === "payment" && t.status === "success")
          .reduce((sum: number, t: Transaction) => sum + t.amount, 0) || 0
      const successfulTransactions = normalized.filter((t: Transaction) => t.status === "success").length || 0
      const failedTransactions = normalized.filter((t: Transaction) => t.status === "failed").length || 0

      setStats({
        totalTransactions,
        totalAmount,
        successfulTransactions,
        failedTransactions,
      })

      setLoading(false)
    } catch (error) {
      toast.error("Failed to fetch transactions")
      setLoading(false)
    }
  }

  const generateRealTimeAnalytics = async () => {
    try {
      // Fetch all transactions for analytics (without pagination)
      const analyticsParams = new URLSearchParams()
      analyticsParams.append("limit", "1000") // Get more data for analytics
      if (filters.startDate) analyticsParams.append("startDate", filters.startDate)
      if (filters.endDate) analyticsParams.append("endDate", filters.endDate)

      const { data }: { data: any } = await api.get(
        `/api/transactions/shop/?shop_id=${effectiveShopId}&${analyticsParams}`,
      )
      const allTransactions = extractTransactions(data)

      // Generate hourly distribution from real data
      const hourlyDistribution = Array.from({ length: 24 }, (_, hour) => {
        const hourTransactions = allTransactions.filter((t: Transaction) => {
          const transactionHour = new Date(t.createdAt).getHours()
          return transactionHour === hour
        })

        return {
          hour,
          count: hourTransactions.length,
          amount: hourTransactions.reduce((sum: number, t: Transaction) => sum + t.amount, 0),
        }
      })

      // Generate daily trends from real data (last 7 days)
      const dailyTrends = Array.from({ length: 7 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateString = date.toISOString().split("T")[0]

        const dayTransactions = allTransactions.filter((t: Transaction) => {
          const transactionDate = new Date(t.createdAt).toISOString().split("T")[0]
          return transactionDate === dateString
        })

        return {
          date: dateString,
          transactions: dayTransactions.length,
          revenue: dayTransactions.reduce((sum: number, t: Transaction) => sum + t.amount, 0),
        }
      }).reverse()

      // Generate type breakdown from real data
      const typeGroups = allTransactions.reduce((acc: any, t: Transaction) => {
        if (!acc[t.type]) {
          acc[t.type] = { count: 0, amount: 0 }
        }
        acc[t.type].count++
        acc[t.type].amount += t.amount
        return acc
      }, {})

      const totalTransactions = allTransactions.length
      const typeBreakdown = Object.entries(typeGroups).map(([type, data]: [string, any]) => ({
        type,
        count: data.count,
        amount: data.amount,
        percentage: totalTransactions > 0 ? Math.round((data.count / totalTransactions) * 100) : 0,
      }))

      // Generate payment method stats from real data
      const paymentMethodGroups = allTransactions.reduce((acc: any, t: Transaction) => {
        const method = t.paymentMethod || "unknown"
        if (!acc[method]) {
          acc[method] = { count: 0, amount: 0 }
        }
        acc[method].count++
        acc[method].amount += t.amount
        return acc
      }, {})

      const paymentMethodStats = Object.entries(paymentMethodGroups).map(([method, data]: [string, any]) => ({
        method,
        count: data.count,
        amount: data.amount,
        percentage: totalTransactions > 0 ? Math.round((data.count / totalTransactions) * 100) : 0,
      }))

      // Generate top customers from real data
      const customerGroups = allTransactions.reduce((acc: any, t: Transaction) => {
        const key = `${t.user.name}-${t.user.rollNo}`
        if (!acc[key]) {
          acc[key] = {
            name: t.user.name,
            rollNo: t.user.rollNo,
            totalSpent: 0,
            transactionCount: 0,
          }
        }
        acc[key].totalSpent += t.amount
        acc[key].transactionCount++
        return acc
      }, {})

      const topCustomers = Object.values(customerGroups)
        .sort((a: any, b: any) => b.totalSpent - a.totalSpent)
        .slice(0, 10)

      const realTimeAnalytics: RealTimeAnalytics = {
        hourlyDistribution,
        dailyTrends,
        typeBreakdown,
        paymentMethodStats,
        topCustomers: topCustomers as any,
      }

      setAnalytics(realTimeAnalytics)
    } catch (error) {
      console.error("Failed to generate real-time analytics:", error)
      toast.error("Failed to generate analytics data")
    }
  }

  const handleTransactionClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
  }

  const exportTransactions = async () => {
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value && key !== "page") params.append(key, value.toString())
      })
      params.append("limit", "1000") // Export more records

      const { data }: { data: any } = await api.get(`/api/transactions/shop/?shop_id=${effectiveShopId}&${params}`)
      const list = extractTransactions(data)

      const csvData = [] as any[]

      // Header with shop info and date range
      csvData.push(["REAL-TIME TRANSACTION REPORT"])
      csvData.push(["shop ID", effectiveShopId || ""])
      csvData.push(["Generated On", new Date().toLocaleString()])
      csvData.push(["Date Range", `${filters.startDate || "All"} to ${filters.endDate || "All"}`])
      csvData.push([""])

      // Real-time summary statistics
      csvData.push(["REAL-TIME SUMMARY STATISTICS"])
      csvData.push(["Total Transactions", stats.totalTransactions])
      csvData.push(["Total Amount", `₹${stats.totalAmount.toFixed(2)}`])
      csvData.push(["Successful Transactions", stats.successfulTransactions])
      csvData.push(["Failed Transactions", stats.failedTransactions])
      csvData.push([""])

      // Transaction details
      csvData.push(["TRANSACTION DETAILS"])
      csvData.push([
        "Date",
        "Type",
        "Amount",
        "Status",
        "Payment Method",
        "User Name",
        "Roll No",
        "Order ID",
        "Description",
      ])

      list.forEach((t: Transaction) => {
        csvData.push([
          new Date(t.createdAt).toLocaleString(),
          t.type,
          t.amount,
          t.status,
          t.paymentMethod || "",
          t.user.name,
          t.user.rollNo,
          t.order?.order_id || "",
          `"${t.description}"`,
        ])
      })

      // Real-time analytics data
      if (analytics) {
        csvData.push([""])
        csvData.push(["REAL-TIME ANALYTICS DATA"])

        // Type breakdown
        csvData.push([""])
        csvData.push(["TRANSACTION TYPE BREAKDOWN"])
        csvData.push(["Type", "Count", "Amount", "Percentage"])
        analytics.typeBreakdown.forEach((type) => {
          csvData.push([type.type, type.count, `₹${type.amount.toFixed(2)}`, `${type.percentage}%`])
        })

        // Payment method stats
        csvData.push([""])
        csvData.push(["PAYMENT METHOD STATISTICS"])
        csvData.push(["Method", "Count", "Amount", "Percentage"])
        analytics.paymentMethodStats.forEach((method) => {
          csvData.push([method.method, method.count, `₹${method.amount.toFixed(2)}`, `${method.percentage}%`])
        })

        // Top customers
        csvData.push([""])
        csvData.push(["TOP CUSTOMERS (REAL-TIME)"])
        csvData.push(["Name", "Roll No", "Total Spent", "Transaction Count"])
        analytics.topCustomers.forEach((customer) => {
          csvData.push([
            customer.name,
            customer.rollNo,
            `₹${customer.totalSpent.toFixed(2)}`,
            customer.transactionCount,
          ])
        })

        // Hourly distribution
        csvData.push([""])
        csvData.push(["HOURLY DISTRIBUTION (REAL-TIME)"])
        csvData.push(["Hour", "Transaction Count", "Amount"])
        analytics.hourlyDistribution.forEach((hour) => {
          csvData.push([`${hour.hour}:00`, hour.count, `₹${hour.amount.toFixed(2)}`])
        })

        // Daily trends
        csvData.push([""])
        csvData.push(["DAILY TRENDS (REAL-TIME)"])
        csvData.push(["Date", "Transaction Count", "Revenue"])
        analytics.dailyTrends.forEach((day) => {
          csvData.push([day.date, day.transactions, `₹${day.revenue.toFixed(2)}`])
        })
      }

      const csvContent = csvData.map((row) => row.join(",")).join("\n")
      const blob = new Blob([csvContent], { type: "text/csv" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `shop-transactions-realtime-${new Date().toISOString().split("T")[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success("Real-time transaction report exported successfully")
    } catch (err) {
      toast.error("Failed to export transactions")
    }
  }

  const resetFilters = () => {
    setFilters({
      type: "",
      status: "",
      startDate: "",
      endDate: "",
      search: "",
      page: 1,
      limit: 50,
    })
  }

  const handlePageChange = (page: number) => {
    setFilters({ ...filters, page })
  }

  // Chart configurations using real data
  const hourlyChartData = {
    labels: analytics?.hourlyDistribution.map((h) => `${h.hour}:00`) || [],
    datasets: [
      {
        label: "Transaction Count",
        data: analytics?.hourlyDistribution.map((h) => h.count) || [],
        backgroundColor: "rgba(59, 130, 246, 0.8)",
        borderColor: "#3B82F6",
        borderWidth: 1,
      },
    ],
  }

  const dailyTrendsData = {
    labels: analytics?.dailyTrends.map((d) => new Date(d.date).toLocaleDateString()) || [],
    datasets: [
      {
        label: "Revenue (₹)",
        data: analytics?.dailyTrends.map((d) => d.revenue) || [],
        borderColor: "#10B981",
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        fill: true,
        tension: 0.4,
        yAxisID: "y",
      },
      {
        label: "Transaction Count",
        data: analytics?.dailyTrends.map((d) => d.transactions) || [],
        borderColor: "#3B82F6",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        fill: true,
        tension: 0.4,
        yAxisID: "y1",
      },
    ],
  }

  const typeBreakdownData = {
    labels: analytics?.typeBreakdown.map((t) => t.type.charAt(0).toUpperCase() + t.type.slice(1)) || [],
    datasets: [
      {
        data: analytics?.typeBreakdown.map((t) => t.percentage) || [],
        backgroundColor: ["#10B981", "#EF4444", "#8B5CF6", "#F59E0B", "#6B7280"],
        borderWidth: 2,
        borderColor: "#fff",
      },
    ],
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-xl sm:text-2xl font-bold">Real-time Transaction Management</h1>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => {
              fetchTransactions()
              if (activeTab === "analytics") {
                generateRealTimeAnalytics()
              }
            }}
            className="btn-secondary flex items-center justify-center"
          >
            <RefreshCw size={20} className="mr-2" />
            Refresh Data
          </button>
          <button onClick={exportTransactions} className="btn-primary flex items-center justify-center">
            <Download size={20} className="mr-2" />
            Export Real-time Report
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-[var(--border-color)]">
        <nav className="flex space-x-4 sm:space-x-8 overflow-x-auto">
          {[
            { id: "transactions", label: "Live Transactions", icon: Receipt },
            { id: "analytics", label: "Real-time Analytics", icon: BarChart3 },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === id
                  ? "border-[var(--accent-purple)] text-[var(--accent-purple)]"
                  : "border-transparent text-[var(--secondary-text)] hover:text-[var(--accent-purple)]"
              }`}
            >
              <Icon size={20} className="mr-2" />
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{label.split(" ")[0]}</span>
            </button>
          ))}
        </nav>
      </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                 <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
           <div className="p-4 flex items-center">
             <Receipt size={40} className="mr-3 flex-shrink-0" />
             <div>
               <p className="text-sm font-semibold">Total</p>
               <p className="text-2xl font-bold">{stats.totalTransactions}</p>
             </div>
           </div>
         </div>

         <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
           <div className="p-4 flex items-center">
             <DollarSign size={40} className="mr-3 flex-shrink-0" />
             <div>
               <p className="text-sm font-semibold">Amount</p>
               <p className="text-2xl font-bold">₹{stats.totalAmount.toFixed(0)}</p>
             </div>
           </div>
         </div>

         <div className="card bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
           <div className="p-4 flex items-center">
             <TrendingUp size={40} className="mr-3 flex-shrink-0" />
             <div>
               <p className="text-sm font-semibold">Success</p>
               <p className="text-2xl font-bold">{stats.successfulTransactions}</p>
             </div>
           </div>
         </div>

         <div className="card bg-gradient-to-br from-red-500 to-red-600 text-white">
           <div className="p-4 flex items-center">
             <TrendingDown size={40} className="mr-3 flex-shrink-0" />
             <div>
               <p className="text-sm font-semibold">Failed</p>
               <p className="text-2xl font-bold">{stats.failedTransactions}</p>
             </div>
           </div>
         </div>


      </div>

      {activeTab === "transactions" && (
        <>
                     <div className="card p-4 lg:p-6">
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6 items-end">
              <div>
                <label className="block text-sm font-medium text-[var(--secondary-text)] mb-1">Type</label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value, page: 1 })}
                  className="input w-full"
                >
                  <option value="">All Types</option>
                  <option value="payment">Payment</option>
                  <option value="refund">Refund</option>
                  <option value="verification">Verification</option>
                  <option value="expiry">Expiry</option>
                  <option value="cancellation">Cancellation</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--secondary-text)] mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
                  className="input w-full"
                >
                  <option value="">All Status</option>
                  <option value="success">Success</option>
                  <option value="failed">Failed</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--secondary-text)] mb-1">Start Date</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value, page: 1 })}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--secondary-text)] mb-1">End Date</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value, page: 1 })}
                  className="input w-full"
                />
              </div>

                             <div className="sm:col-span-2 lg:col-span-1 xl:col-span-1 flex flex-col sm:flex-row gap-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-[var(--secondary-text)] mb-1">Search User</label>
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
                    placeholder="Search by name or roll no..."
                    className="input w-full"
                  />
                </div>
                <button onClick={resetFilters} className="btn-secondary mt-auto whitespace-nowrap">
                  Reset Filters
                </button>
              </div>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="card">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--accent-purple)]"></div>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                                 <div className="hidden lg:block overflow-x-auto">
                   <table className="w-full">
                     <thead>
                       <tr className="border-b border-[var(--border-color)]">
                         <th className="text-left py-4 px-4 font-semibold text-sm">Date</th>
                         <th className="text-left py-4 px-4 font-semibold text-sm">Type</th>
                         <th className="text-left py-4 px-4 font-semibold text-sm">Amount</th>
                         <th className="text-left py-4 px-4 font-semibold text-sm">Status</th>
                         <th className="text-left py-4 px-4 font-semibold text-sm">Verified By</th>
                         <th className="text-left py-4 px-4 font-semibold text-sm">User</th>
                         <th className="text-left py-4 px-4 font-semibold text-sm">Order</th>
                         <th className="text-left py-4 px-4 font-semibold text-sm">Actions</th>
                       </tr>
                     </thead>
                    <tbody>
                                             {transactions.map((transaction) => (
                         <tr key={transaction._id} className="border-b border-[var(--border-color)] hover:bg-[var(--hover-bg)] transition-colors">
                           <td className="py-4 px-4 text-sm">{new Date(transaction.createdAt).toLocaleString()}</td>
                          <td>
                            <span
                              className={`badge ${
                                transaction.type === "payment"
                                  ? "badge-success"
                                  : transaction.type === "refund"
                                    ? "badge-warning"
                                    : transaction.type === "verification"
                                      ? "badge-primary"
                                      : transaction.type === "expiry"
                                        ? "badge-error"
                                        : "badge-secondary"
                              }`}
                            >
                              {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                            </span>
                          </td>
                                                     <td className="py-4 px-4 text-sm font-medium">₹{transaction.amount}</td>
                           <td className="py-4 px-4">
                             <span
                               className={`badge ${
                                 transaction.status === "success"
                                   ? "badge-success"
                                   : transaction.status === "failed"
                                     ? "badge-error"
                                     : "badge-warning"
                               }`}
                             >
                               {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                             </span>
                           </td>
                           <td className="py-4 px-4 text-[var(--secondary-text)] text-sm">
                            {transaction.type === "verification" && (transaction as any).metadata?.verified_by ? (
                              <>
                                {(transaction as any).metadata.verified_by.name || "Unknown"}
                                {(transaction as any).metadata.verified_by.role
                                  ? ` (${(transaction as any).metadata.verified_by.role})`
                                  : ""}
                                {(transaction as any).metadata.verified_by.shop?.name
                                  ? ` • ${(transaction as any).metadata.verified_by.shop.name}`
                                  : ""}
                              </>
                            ) : (
                              "-"
                            )}
                          </td>
                                                     <td className="py-4 px-4">
                             <div>
                               <p className="font-medium text-sm">{transaction.user?.name || "Unknown User"}</p>
                               <p className="text-xs text-[var(--muted-text)]">{transaction.user?.rollNo || "N/A"}</p>
                             </div>
                           </td>
                           <td className="py-4 px-4 text-sm">{transaction.order?.order_id || "-"}</td>
                           <td className="py-4 px-4">
                                                         <button
                               onClick={() => handleTransactionClick(transaction)}
                               className="p-2 text-[var(--accent-purple)] hover:bg-[var(--hover-bg)] hover:text-[var(--accent-violet)] rounded transition-all duration-200"
                             >
                               <Eye size={20} />
                             </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="lg:hidden space-y-3 sm:space-y-4 p-3 sm:p-4">
                  {transactions.map((transaction) => (
                    <div
                      key={transaction._id}
                      className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg p-3 sm:p-4 space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span
                              className={`badge text-xs ${
                                transaction.type === "payment"
                                  ? "badge-success"
                                  : transaction.type === "refund"
                                    ? "badge-warning"
                                    : transaction.type === "verification"
                                      ? "badge-primary"
                                      : transaction.type === "expiry"
                                        ? "badge-error"
                                        : "badge-secondary"
                              }`}
                            >
                              {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                            </span>
                            <span
                              className={`badge text-xs ${
                                transaction.status === "success"
                                  ? "badge-success"
                                  : transaction.status === "failed"
                                    ? "badge-error"
                                    : "badge-warning"
                              }`}
                            >
                              {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                            </span>
                          </div>
                          <p className="text-xl sm:text-2xl font-bold text-[var(--primary-text)]">
                            ₹{transaction.amount}
                          </p>
                        </div>
                        <button
                          onClick={() => handleTransactionClick(transaction)}
                          className="p-2 text-[var(--accent-purple)] hover:bg-[var(--hover-bg)] hover:text-[var(--accent-violet)] rounded transition-all duration-200 flex-shrink-0"
                        >
                          <Eye size={18} />
                        </button>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-start">
                          <span className="text-[var(--muted-text)]">User:</span>
                          <div className="text-right flex-1 ml-2">
                            <p className="font-medium">{transaction.user?.name || "Unknown User"}</p>
                            <p className="text-xs text-[var(--muted-text)]">{transaction.user?.rollNo || "N/A"}</p>
                          </div>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-[var(--muted-text)]">Date:</span>
                          <span className="text-right flex-1 ml-2">
                            {new Date(transaction.createdAt).toLocaleString()}
                          </span>
                        </div>

                        {transaction.order?.order_id && (
                          <div className="flex justify-between">
                            <span className="text-[var(--muted-text)]">Order:</span>
                            <span className="text-right flex-1 ml-2 font-mono">{transaction.order.order_id}</span>
                          </div>
                        )}

                        {transaction.type === "verification" && (transaction as any).metadata?.verified_by && (
                          <div className="flex justify-between items-start">
                            <span className="text-[var(--muted-text)]">Verified By:</span>
                            <div className="text-right flex-1 ml-2">
                              <p>{(transaction as any).metadata.verified_by.name || "Unknown"}</p>
                              {(transaction as any).metadata.verified_by.role && (
                                <p className="text-xs text-[var(--muted-text)]">
                                  {(transaction as any).metadata.verified_by.role}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                                 {pagination.totalPages > 1 && (
                   <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 lg:p-6 border-t border-[var(--border-color)]">
                     <div className="text-sm lg:text-base text-[var(--secondary-text)] text-center sm:text-left">
                       Showing {(pagination.currentPage - 1) * filters.limit + 1} to{" "}
                       {Math.min(pagination.currentPage * filters.limit, pagination.total)} of {pagination.total}{" "}
                       transactions
                     </div>
                     <div className="flex gap-3">
                       <button
                         onClick={() => handlePageChange(pagination.currentPage - 1)}
                         disabled={pagination.currentPage === 1}
                         className="btn-secondary px-4 py-2 text-sm lg:text-base disabled:opacity-50"
                       >
                         Previous
                       </button>
                       <span className="px-4 py-2 bg-[var(--card-bg)] rounded border border-[var(--border-color)] text-sm lg:text-base">
                         {pagination.currentPage} of {pagination.totalPages}
                       </span>
                       <button
                         onClick={() => handlePageChange(pagination.currentPage + 1)}
                         disabled={pagination.currentPage === pagination.totalPages}
                         className="btn-secondary px-4 py-2 text-sm lg:text-base disabled:opacity-50"
                       >
                         Next
                       </button>
                     </div>
                   </div>
                 )}
              </>
            )}

                         {!loading && transactions.length === 0 && (
               <div className="text-center py-16 lg:py-20">
                 <Receipt size={64} className="text-[var(--muted-text)] mx-auto mb-6" />
                 <h2 className="text-2xl lg:text-3xl font-semibold text-[var(--secondary-text)] mb-3">No Transactions Found</h2>
                 <p className="text-lg text-[var(--muted-text)]">Try adjusting your filters to see more results.</p>
               </div>
             )}
          </div>
        </>
      )}

             {activeTab === "analytics" && analytics && (
         <div className="space-y-6 lg:space-y-8">
           <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
             <div className="card p-6 lg:p-8">
               <h3 className="text-xl lg:text-2xl font-semibold mb-6">Real-time Hourly Distribution</h3>
               <div className="h-[300px] lg:h-[400px]">
                 <Bar data={hourlyChartData} options={{ maintainAspectRatio: false }} />
               </div>
             </div>

             <div className="card p-6 lg:p-8">
               <h3 className="text-xl lg:text-2xl font-semibold mb-6">Live Transaction Type Breakdown</h3>
               <div className="h-[300px] lg:h-[400px]">
                 <Doughnut data={typeBreakdownData} options={{ maintainAspectRatio: false }} />
               </div>
             </div>

             <div className="card p-6 lg:p-8 xl:col-span-2">
               <h3 className="text-xl lg:text-2xl font-semibold mb-6">Real-time Daily Trends (Last 7 Days)</h3>
               <div className="h-[400px] lg:h-[500px]">
                 <Line
                   data={dailyTrendsData}
                   options={{
                     maintainAspectRatio: false,
                     scales: {
                       y: {
                         type: "linear",
                         display: true,
                         position: "left",
                         title: {
                           display: true,
                           text: "Revenue (₹)",
                         },
                       },
                       y1: {
                         type: "linear",
                         display: true,
                         position: "right",
                         title: {
                           display: true,
                           text: "Transaction Count",
                         },
                         grid: {
                           drawOnChartArea: false,
                         },
                       },
                     },
                   }}
                 />
               </div>
             </div>
           </div>

                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
             <div className="card p-6 lg:p-8">
               <h3 className="text-lg lg:text-xl font-semibold mb-6">Top Customers (Real-time)</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left text-sm">Customer</th>
                      <th className="text-right text-sm">Spent</th>
                      <th className="text-right text-sm">Orders</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.topCustomers.slice(0, 10).map((customer, index) => (
                      <tr key={index}>
                        <td className="py-2">
                          <div>
                            <p className="font-medium text-sm">{customer.name}</p>
                            <p className="text-xs text-[var(--muted-text)]">{customer.rollNo}</p>
                          </div>
                        </td>
                        <td className="text-right font-medium text-green-600 text-sm">
                          ₹{customer.totalSpent.toFixed(2)}
                        </td>
                        <td className="text-right text-sm">{customer.transactionCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

                         <div className="card p-6 lg:p-8">
               <h3 className="text-lg lg:text-xl font-semibold mb-6">Payment Method Statistics (Live)</h3>
              <div className="space-y-3 sm:space-y-4">
                {analytics.paymentMethodStats.map((method, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-[var(--hover-bg)] rounded">
                    <div>
                      <p className="font-medium capitalize text-sm">{method.method}</p>
                      <p className="text-xs text-[var(--secondary-text)]">{method.count} transactions</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">₹{method.amount.toFixed(2)}</p>
                      <p className="text-xs text-[var(--secondary-text)]">{method.percentage}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

                     <div className="card p-6 lg:p-8">
             <h3 className="text-lg lg:text-xl font-semibold mb-6">Real-time Peak Hours Analysis</h3>
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
                             <div className="p-4 lg:p-6 bg-blue-50 rounded-lg">
                 <h4 className="font-medium text-blue-800 text-base lg:text-lg mb-2">Busiest Hour (Live)</h4>
                 <p className="text-2xl lg:text-3xl font-bold text-blue-600 mb-1">
                   {analytics.hourlyDistribution.reduce((max, hour) => (hour.count > max.count ? hour : max)).hour}:00
                 </p>
                 <p className="text-sm lg:text-base text-blue-600">
                   {analytics.hourlyDistribution.reduce((max, hour) => (hour.count > max.count ? hour : max)).count}{" "}
                   transactions
                 </p>
               </div>

               <div className="p-4 lg:p-6 bg-green-50 rounded-lg">
                 <h4 className="font-medium text-green-800 text-base lg:text-lg mb-2">Highest Revenue Hour (Live)</h4>
                 <p className="text-2xl lg:text-3xl font-bold text-green-600 mb-1">
                   {analytics.hourlyDistribution.reduce((max, hour) => (hour.amount > max.amount ? hour : max)).hour}:00
                 </p>
                 <p className="text-sm lg:text-base text-green-600">
                   ₹
                   {analytics.hourlyDistribution
                     .reduce((max, hour) => (hour.amount > max.amount ? hour : max))
                     .amount.toFixed(0)}
                 </p>
               </div>

               <div className="p-4 lg:p-6 bg-purple-50 rounded-lg">
                 <h4 className="font-medium text-purple-800 text-base lg:text-lg mb-2">Average per Hour (Live)</h4>
                 <p className="text-2xl lg:text-3xl font-bold text-purple-600 mb-1">
                   {(analytics.hourlyDistribution.reduce((sum, hour) => sum + hour.count, 0) / 24).toFixed(1)}
                 </p>
                 <p className="text-sm lg:text-base text-purple-600">transactions/hour</p>
               </div>
            </div>
          </div>
        </div>
      )}

             {selectedTransaction && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
           <div className="bg-[var(--card-bg)] rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-[var(--border-color)]">
             <div className="p-6 lg:p-8">
               <div className="flex justify-between items-center mb-6 lg:mb-8">
                 <h3 className="text-xl lg:text-2xl font-semibold text-[var(--primary-text)]">Transaction Details</h3>
                 <button
                   onClick={() => setSelectedTransaction(null)}
                   className="text-[var(--muted-text)] hover:text-[var(--accent-purple)] transition-colors p-2"
                 >
                   <X size={28} />
                 </button>
               </div>

                             <div className="space-y-6 lg:space-y-8">
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:gap-8">
                                     <div>
                     <label className="block text-base lg:text-lg font-medium text-[var(--secondary-text)] mb-2">Type</label>
                     <p className="text-lg lg:text-xl text-[var(--primary-text)] font-medium">{selectedTransaction.type}</p>
                   </div>
                   <div>
                     <label className="block text-base lg:text-lg font-medium text-[var(--secondary-text)] mb-2">Amount</label>
                     <p className="text-lg lg:text-xl text-[var(--primary-text)] font-medium">₹{selectedTransaction.amount}</p>
                   </div>
                   <div>
                     <label className="block text-base lg:text-lg font-medium text-[var(--secondary-text)] mb-2">Status</label>
                     <p className="text-lg lg:text-xl text-[var(--primary-text)] font-medium">{selectedTransaction.status}</p>
                   </div>
                   <div>
                     <label className="block text-base lg:text-lg font-medium text-[var(--secondary-text)] mb-2">Payment Method</label>
                     <p className="text-lg lg:text-xl text-[var(--primary-text)] font-medium">{selectedTransaction.paymentMethod || "-"}</p>
                   </div>
                   <div className="sm:col-span-2">
                     <label className="block text-base lg:text-lg font-medium text-[var(--secondary-text)] mb-2">Date</label>
                     <p className="text-lg lg:text-xl text-[var(--primary-text)] font-medium">
                       {new Date(selectedTransaction.createdAt).toLocaleString()}
                     </p>
                   </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--secondary-text)]">Description</label>
                  <p className="mt-1 text-[var(--primary-text)]">{selectedTransaction.description}</p>
                </div>

                {selectedTransaction.type === "verification" && (selectedTransaction as any).metadata?.verified_by && (
                  <div>
                    <label className="block text-sm font-medium text-[var(--secondary-text)]">Verified By</label>
                    <p className="mt-1 text-[var(--primary-text)]">
                      {(selectedTransaction as any).metadata.verified_by.name || "Unknown"}
                      {(selectedTransaction as any).metadata.verified_by.role && (
                        <> ({(selectedTransaction as any).metadata.verified_by.role})</>
                      )}
                      {(selectedTransaction as any).metadata.verified_by.shop?.name && (
                        <> • {(selectedTransaction as any).metadata.verified_by.shop.name}</>
                      )}
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-[var(--secondary-text)]">User</label>
                  <p className="mt-1 text-[var(--primary-text)]">
                    {selectedTransaction.user.name} ({selectedTransaction.user.rollNo})
                  </p>
                  <p className="text-sm text-[var(--muted-text)]">{selectedTransaction.user.email}</p>
                </div>

                {selectedTransaction.order && (
                  <div>
                    <label className="block text-sm font-medium text-[var(--secondary-text)]">Order</label>
                    <p className="mt-1 text-[var(--primary-text)]">
                      {selectedTransaction.order.order_id} - ₹{selectedTransaction.order.totalPrice}
                    </p>
                  </div>
                )}

                {selectedTransaction.metadata && Object.keys(selectedTransaction.metadata).length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-[var(--secondary-text)]">Additional Details</label>
                    <pre className="mt-1 text-sm bg-[var(--hover-bg)] p-3 rounded overflow-x-auto text-[var(--primary-text)]">
                      {JSON.stringify(selectedTransaction.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TransactionsPage;