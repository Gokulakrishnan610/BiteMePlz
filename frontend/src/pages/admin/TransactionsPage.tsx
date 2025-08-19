"use client"

import type React from "react"
import { useEffect, useState } from "react"
import api from "../../api"
import { Receipt, Download, Eye, RefreshCw, TrendingUp, TrendingDown, DollarSign, X } from "lucide-react"
import { toast } from "sonner"

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
  shop: {
    _id: string
    name: string
  }
  metadata: any
}

interface shop {
  id: string // Changed from _id
  name: string
}

// Normalize API responses for transactions
const toNumber = (v: any): number => {
  const n = typeof v === "number" ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

const normalizeTransaction = (t: any): Transaction => ({
  _id: t._id || t.id,
  type: t.type,
  amount: toNumber(t.amount),
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
        totalPrice: toNumber(t.order.totalPrice ?? t.order.total_price),
      }
    : (undefined as any),
  shop: t.shop
    ? {
        _id: t.shop._id || t.shop.id || "",
        name: t.shop.name || "",
      }
    : (undefined as any),
  metadata: t.metadata,
})

const extractTransactions = (data: any): Transaction[] => {
  const list = Array.isArray(data) ? data : data?.results || data?.transactions || []
  return (list as any[]).map(normalizeTransaction)
}

const TransactionsPage: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [shops, setshops] = useState<shop[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [filters, setFilters] = useState({
    shop: "",
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

  useEffect(() => {
    fetchshops()
  }, [])

  useEffect(() => {
    fetchTransactions()
  }, [filters, shops])

  const fetchshops = async () => {
    try {
      const all: shop[] = []
      const page = 1
      let next: string | null = `/api/shops/?page=${page}`
      while (next) {
        const { data }: { data: any } = await api.get(next)
        const shopsData = data.results || data
        if (Array.isArray(shopsData)) {
          all.push(...shopsData)
          next = data.next || null
        } else {
          all.push(...shopsData)
          next = null
        }
      }
      setshops(all)
    } catch (error) {
      toast.error("Failed to fetch shops")
    }
  }

  const fetchTransactions = async () => {
    try {
      setLoading(true)

      // If a specific shop is selected, fetch transactions for that shop
      if (filters.shop) {
        const params = new URLSearchParams()
        Object.entries(filters).forEach(([key, value]) => {
          if (value && key !== "shop") params.append(key, value.toString())
        })

        const { data }: { data: any } = await api.get(`/api/transactions/shop/?shop_id=${filters.shop}&${params}`)
        const list = extractTransactions(data)
        setTransactions(list)

        // Calculate stats
        const totalTransactions = list.length || 0
        // Amount should include only successful payments
        const totalAmount =
          list
            .filter((t: Transaction) => t.type === "payment" && t.status === "success")
            .reduce((sum: number, t: Transaction) => sum + toNumber(t.amount), 0) || 0
        const successfulTransactions = list.filter((t: Transaction) => t.status === "success").length || 0
        const failedTransactions = list.filter((t: Transaction) => t.status === "failed").length || 0

        setStats({
          totalTransactions,
          totalAmount,
          successfulTransactions,
          failedTransactions,
        })
      } else {
        // When showing all shops, wait until shop list is loaded
        if (shops.length === 0) {
          setTransactions([])
          setStats({
            totalTransactions: 0,
            totalAmount: 0,
            successfulTransactions: 0,
            failedTransactions: 0,
          })
          setLoading(false)
          return
        }
        // Fetch transactions from all shops
        const allTransactions: Transaction[] = []

        for (const shop of shops) {
          try {
            if (!shop.id) {
              // Changed from _id
              console.warn(`Shop ${shop.name} has no valid ID, skipping`)
              continue
            }
            const params = new URLSearchParams()
            Object.entries(filters).forEach(([key, value]) => {
              if (value && key !== "shop") params.append(key, value.toString())
            })

            const { data }: { data: any } = await api.get(`/api/transactions/shop/?shop_id=${shop.id}&${params}`)
            const list = extractTransactions(data).map((t: any) => ({
              ...t,
              shop: { _id: shop.id, name: shop.name },
            }))
            allTransactions.push(...list)
          } catch (error) {
            console.error(`Failed to fetch transactions for shop ${shop.name}:`, error)
          }
        }

        // Sort by date (newest first)
        allTransactions.sort((a, b) => (new Date(a.createdAt).getTime() < new Date(b.createdAt).getTime() ? 1 : -1))

        setTransactions(allTransactions)

        // Calculate stats
        const totalTransactions = allTransactions.length
        // Amount should include only successful payments
        const totalAmount = allTransactions
          .filter((t) => t.type === "payment" && t.status === "success")
          .reduce((sum, t) => sum + toNumber(t.amount), 0)
        const successfulTransactions = allTransactions.filter((t) => t.status === "success").length
        const failedTransactions = allTransactions.filter((t) => t.status === "failed").length

        setStats({
          totalTransactions,
          totalAmount,
          successfulTransactions,
          failedTransactions,
        })
      }

      setLoading(false)
    } catch (error) {
      toast.error("Failed to fetch transactions")
      setLoading(false)
    }
  }

  const handleTransactionClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
  }

  const exportTransactions = async () => {
    try {
      // Convert to CSV
      const csvContent = [
        ["Date", "shop", "Type", "Amount", "Status", "Payment Method", "User", "Order ID", "Description"].join(","),
        ...transactions.map((t: Transaction) =>
          [
            new Date(t.createdAt).toLocaleString(),
            t.shop?.name || "Unknown",
            t.type,
            toNumber(t.amount).toFixed(2),
            t.status,
            t.paymentMethod || "",
            t.user.name,
            t.order?.order_id || "",
            `"${t.description}"`,
          ].join(","),
        ),
      ].join("\n")

      const blob = new Blob([csvContent], { type: "text/csv" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `all-transactions-${new Date().toISOString().split("T")[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      toast.error("Failed to export transactions")
    }
  }

  const resetFilters = () => {
    setFilters({
      shop: "",
      type: "",
      status: "",
      startDate: "",
      endDate: "",
      search: "",
      page: 1,
      limit: 50,
    })
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">All Transactions</h1>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <button
            onClick={fetchTransactions}
            className="btn-secondary flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors"
          >
            <RefreshCw size={18} />
            <span>Refresh</span>
          </button>
          <button
            onClick={exportTransactions}
            className="btn-primary flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors"
          >
            <Download size={18} />
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">Export</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl shadow-lg">
          <div className="p-4 sm:p-6 flex items-center gap-4">
            <div className="p-2 bg-white/20 rounded-lg">
              <Receipt size={24} className="sm:hidden" />
              <Receipt size={32} className="hidden sm:block" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm sm:text-base font-medium opacity-90">Total Transactions</p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold">{stats.totalTransactions}</p>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl shadow-lg">
          <div className="p-4 sm:p-6 flex items-center gap-4">
            <div className="p-2 bg-white/20 rounded-lg">
              <DollarSign size={24} className="sm:hidden" />
              <DollarSign size={32} className="hidden sm:block" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm sm:text-base font-medium opacity-90">Total Amount</p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold">₹{stats.totalAmount}</p>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-xl shadow-lg">
          <div className="p-4 sm:p-6 flex items-center gap-4">
            <div className="p-2 bg-white/20 rounded-lg">
              <TrendingUp size={24} className="sm:hidden" />
              <TrendingUp size={32} className="hidden sm:block" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm sm:text-base font-medium opacity-90">Successful</p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold">{stats.successfulTransactions}</p>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-red-500 to-red-600 text-white rounded-xl shadow-lg">
          <div className="p-4 sm:p-6 flex items-center gap-4">
            <div className="p-2 bg-white/20 rounded-lg">
              <TrendingDown size={24} className="sm:hidden" />
              <TrendingDown size={32} className="hidden sm:block" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm sm:text-base font-medium opacity-90">Failed</p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold">{stats.failedTransactions}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 sm:p-6 rounded-xl shadow-sm">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Shop</label>
              <select
                value={filters.shop}
                onChange={(e) => setFilters({ ...filters, shop: e.target.value, page: 1 })}
                className="input w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option key="all-shops" value="">
                  All shops
                </option>
                {shops.map((shop) => (
                  <option key={shop.id} value={shop.id}>
                    {shop.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Type</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value, page: 1 })}
                className="input w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option key="all-types" value="">
                  All Types
                </option>
                <option key="payment" value="payment">
                  Payment
                </option>
                <option key="refund" value="refund">
                  Refund
                </option>
                <option key="verification" value="verification">
                  Verification
                </option>
                <option key="expiry" value="expiry">
                  Expiry
                </option>
                <option key="cancellation" value="cancellation">
                  Cancellation
                </option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
                className="input w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option key="all-status" value="">
                  All Status
                </option>
                <option key="success" value="success">
                  Success
                </option>
                <option key="failed" value="failed">
                  Failed
                </option>
                <option key="pending" value="pending">
                  Pending
                </option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value, page: 1 })}
                className="input w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value, page: 1 })}
                className="input w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div className="flex items-end">
              <button onClick={resetFilters} className="btn-secondary w-full px-4 py-2 rounded-lg transition-colors">
                Reset Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions */}
      <div className="card rounded-xl shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {/* Mobile Card Layout */}
            <div className="block md:hidden">
              {transactions.length > 0 ? (
                <div className="divide-y divide-border">
                  {transactions.map((transaction) => (
                    <div key={transaction._id} className="p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                transaction.type === "payment"
                                  ? "bg-green-100 text-green-800"
                                  : transaction.type === "refund"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : transaction.type === "verification"
                                      ? "bg-blue-100 text-blue-800"
                                      : transaction.type === "expiry"
                                        ? "bg-red-100 text-red-800"
                                        : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                            </span>
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                transaction.status === "success"
                                  ? "bg-green-100 text-green-800"
                                  : transaction.status === "failed"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                            </span>
                          </div>
                          <p className="font-semibold text-foreground text-lg">₹{transaction.amount}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {transaction.shop?.name || "Unknown"}
                          </p>
                        </div>
                        <button
                          onClick={() => handleTransactionClick(transaction)}
                          className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors flex-shrink-0"
                        >
                          <Eye size={18} />
                        </button>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">User:</span>
                          <span className="text-foreground font-medium">{transaction.user.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Date:</span>
                          <span className="text-foreground">
                            {new Date(transaction.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {transaction.order?.order_id && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Order:</span>
                            <span className="text-foreground font-mono text-xs">{transaction.order.order_id}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 px-4">
                  <Receipt size={48} className="text-muted-foreground mx-auto mb-4" />
                  <h2 className="text-xl font-semibold text-foreground mb-2">No Transactions Found</h2>
                  <p className="text-muted-foreground">Try adjusting your filters to see more results.</p>
                </div>
              )}
            </div>

            {/* Desktop Table Layout */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Shop</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Amount</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden lg:table-cell">
                      Verified By
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">User</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden xl:table-cell">
                      Order
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction._id} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-4 text-muted-foreground text-sm">
                        {new Date(transaction.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-foreground font-medium">{transaction.shop?.name || "Unknown"}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            transaction.type === "payment"
                              ? "bg-green-100 text-green-800"
                              : transaction.type === "refund"
                                ? "bg-yellow-100 text-yellow-800"
                                : transaction.type === "verification"
                                  ? "bg-blue-100 text-blue-800"
                                  : transaction.type === "expiry"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-foreground font-semibold">₹{transaction.amount}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            transaction.status === "success"
                              ? "bg-green-100 text-green-800"
                              : transaction.status === "failed"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-sm hidden lg:table-cell">
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
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-foreground">{transaction.user.name}</p>
                          <p className="text-sm text-muted-foreground">{transaction.user.rollNo}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-sm hidden xl:table-cell">
                        {transaction.order?.order_id || "-"}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleTransactionClick(transaction)}
                          className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        >
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {transactions.length === 0 && (
                <div className="text-center py-12">
                  <Receipt size={48} className="text-muted-foreground mx-auto mb-4" />
                  <h2 className="text-xl font-semibold text-foreground mb-2">No Transactions Found</h2>
                  <p className="text-muted-foreground">Try adjusting your filters to see more results.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Transaction Details Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-border shadow-xl">
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl sm:text-2xl font-semibold text-foreground">Transaction Details</h3>
                <button
                  onClick={() => setSelectedTransaction(null)}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Shop</label>
                    <p className="text-foreground font-medium">{selectedTransaction.shop?.name || "Unknown"}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Type</label>
                    <p className="text-foreground font-medium">{selectedTransaction.type}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Amount</label>
                    <p className="text-foreground font-semibold text-lg">₹{selectedTransaction.amount}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Status</label>
                    <p className="text-foreground font-medium">{selectedTransaction.status}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Payment Method</label>
                    <p className="text-foreground">{selectedTransaction.paymentMethod || "-"}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Date</label>
                    <p className="text-foreground">{new Date(selectedTransaction.createdAt).toLocaleString()}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Description</label>
                  <p className="text-foreground">{selectedTransaction.description}</p>
                </div>

                {selectedTransaction.type === "verification" && selectedTransaction.metadata?.verified_by && (
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Verified By</label>
                    <p className="text-foreground">
                      {selectedTransaction.metadata.verified_by.name || "Unknown"}
                      {selectedTransaction.metadata.verified_by.role && (
                        <> ({selectedTransaction.metadata.verified_by.role})</>
                      )}
                      {selectedTransaction.metadata.verified_by.shop?.name && (
                        <> • {selectedTransaction.metadata.verified_by.shop.name}</>
                      )}
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">User</label>
                  <p className="text-foreground font-medium">
                    {selectedTransaction.user.name} ({selectedTransaction.user.rollNo})
                  </p>
                  <p className="text-sm text-muted-foreground">{selectedTransaction.user.email}</p>
                </div>

                {selectedTransaction.order && (
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Order</label>
                    <p className="text-foreground">
                      {selectedTransaction.order.order_id} - ₹{selectedTransaction.order.totalPrice}
                    </p>
                  </div>
                )}

                {selectedTransaction.metadata && Object.keys(selectedTransaction.metadata).length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Additional Details</label>
                    <pre className="text-sm bg-muted p-3 rounded-lg overflow-x-auto text-foreground border">
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

export default TransactionsPage
