"use client"

import type React from "react"
import { useEffect, useState } from "react"
import api from "../../api"
import { DollarSign, Download, Calendar, TrendingUp, TrendingDown, RefreshCw, FileText } from "lucide-react"
import { toast } from "sonner"

interface shop {
  id: string
  name: string
}

interface FinancialData {
  shopName: string
  totalRevenue: number
  totalTransactions: number
  successfulPayments: number
  refunds: number
  netRevenue: number
  averageOrderValue: number
}

// Helpers to normalize API responses
const toNumber = (v: any): number => {
  const n = typeof v === "number" ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

const normalizeTransaction = (t: any) => ({
  ...t,
  amount: toNumber(t?.amount),
  paymentMethod: t?.paymentMethod ?? t?.payment_method ?? "",
  createdAt: t?.createdAt ?? t?.created_at,
})

const extractTransactions = (data: any) => {
  const list = Array.isArray(data) ? data : data?.results || data?.transactions || []
  return (list as any[]).map(normalizeTransaction)
}

const FinancialReportsPage: React.FC = () => {
  const [shops, setshops] = useState<shop[]>([])
  const [financialData, setFinancialData] = useState<FinancialData[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  })
  const [totals, setTotals] = useState({
    totalRevenue: 0,
    totalRefunds: 0,
    netRevenue: 0,
    totalTransactions: 0,
  })

  useEffect(() => {
    fetchshops()
  }, [])

  useEffect(() => {
    if (shops.length > 0) {
      fetchFinancialData()
    }
  }, [shops, dateRange])

  const fetchshops = async () => {
    try {
      const all: shop[] = []
      const page = 1
      let next: string | null = `/api/shops/?page=${page}`
      while (next) {
        const { data } = await api.get(next)
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

  const fetchFinancialData = async () => {
    try {
      setLoading(true)
      const financialReports: FinancialData[] = []
      let totalRevenue = 0
      let totalRefunds = 0
      let totalTransactions = 0

      for (const shop of shops) {
        try {
          if (!shop.id) {
            console.warn(`Shop ${shop.name} has no valid ID, skipping`)
            continue
          }
          const params = new URLSearchParams({
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
            shop_id: shop.id,
          })

          const { data } = await api.get(`/api/transactions/shop/?${params}`)
          const transactions = extractTransactions(data)

          // Calculate financial metrics
          const payments = transactions.filter((t: any) => t.type === "payment" && t.status === "success")
          const refunds = transactions.filter((t: any) => t.type === "refund")

          const shopRevenue = payments.reduce((sum: number, t: any) => sum + toNumber(t.amount), 0)
          const shopRefunds = refunds.reduce((sum: number, t: any) => sum + toNumber(t.amount), 0)
          const netRevenue = shopRevenue - shopRefunds
          const averageOrderValue = payments.length > 0 ? shopRevenue / payments.length : 0

          financialReports.push({
            shopName: shop.name,
            totalRevenue: shopRevenue,
            totalTransactions: transactions.length,
            successfulPayments: payments.length,
            refunds: shopRefunds,
            netRevenue,
            averageOrderValue,
          })

          totalRevenue += shopRevenue
          totalRefunds += shopRefunds
          totalTransactions += transactions.length
        } catch (error) {
          console.error(`Failed to fetch financial data for shop ${shop.name}:`, error)
        }
      }

      setFinancialData(financialReports)
      setTotals({
        totalRevenue,
        totalRefunds,
        netRevenue: totalRevenue - totalRefunds,
        totalTransactions,
      })
      setLoading(false)
    } catch (error) {
      toast.error("Failed to fetch financial data")
      setLoading(false)
    }
  }

  const exportFinancialReport = () => {
    try {
      const csvContent = [
        [
          "shop Name",
          "Total Revenue",
          "Successful Payments",
          "Refunds",
          "Net Revenue",
          "Average Order Value",
          "Total Transactions",
        ].join(","),
        ...financialData.map((data) =>
          [
            data.shopName,
            data.totalRevenue.toFixed(2),
            data.successfulPayments,
            data.refunds.toFixed(2),
            data.netRevenue.toFixed(2),
            data.averageOrderValue.toFixed(2),
            data.totalTransactions,
          ].join(","),
        ),
        ["", "", "", "", "", "", ""], // Empty row
        [
          "TOTALS",
          totals.totalRevenue.toFixed(2),
          "",
          totals.totalRefunds.toFixed(2),
          totals.netRevenue.toFixed(2),
          "",
          totals.totalTransactions,
        ].join(","),
      ].join("\n")

      const blob = new Blob([csvContent], { type: "text/csv" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `financial-report-${dateRange.startDate}-to-${dateRange.endDate}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success("Financial report exported successfully")
    } catch (error) {
      toast.error("Failed to export financial report")
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:justify-between sm:items-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Financial Reports</h1>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <button
            onClick={fetchFinancialData}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
          <button
            onClick={exportFinancialReport}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Download size={18} />
            <span className="hidden sm:inline">Export Report</span>
            <span className="sm:hidden">Export</span>
          </button>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-muted-foreground">Start Date</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-muted-foreground">End Date</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground sm:col-span-2 lg:col-span-1">
            <Calendar size={16} />
            <span>
              {Math.ceil(
                (new Date(dateRange.endDate).getTime() - new Date(dateRange.startDate).getTime()) /
                  (1000 * 60 * 60 * 24),
              )}{" "}
              days selected
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg overflow-hidden">
          <div className="p-4 sm:p-6 flex items-center gap-4">
            <div className="p-2 bg-white/20 rounded-lg">
              <DollarSign size={24} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium opacity-90 truncate">Total Revenue</p>
              <p className="text-xl sm:text-2xl font-bold">₹{totals.totalRevenue.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-lg overflow-hidden">
          <div className="p-4 sm:p-6 flex items-center gap-4">
            <div className="p-2 bg-white/20 rounded-lg">
              <TrendingDown size={24} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium opacity-90 truncate">Total Refunds</p>
              <p className="text-xl sm:text-2xl font-bold">₹{totals.totalRefunds.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg overflow-hidden">
          <div className="p-4 sm:p-6 flex items-center gap-4">
            <div className="p-2 bg-white/20 rounded-lg">
              <TrendingUp size={24} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium opacity-90 truncate">Net Revenue</p>
              <p className="text-xl sm:text-2xl font-bold">₹{totals.netRevenue.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg overflow-hidden">
          <div className="p-4 sm:p-6 flex items-center gap-4">
            <div className="p-2 bg-white/20 rounded-lg">
              <FileText size={24} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium opacity-90 truncate">Total Transactions</p>
              <p className="text-xl sm:text-2xl font-bold">{totals.totalTransactions}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent"></div>
          </div>
        ) : (
          <>
            {/* Mobile Card Layout */}
            <div className="block lg:hidden">
              {financialData.length > 0 ? (
                <div className="divide-y divide-border">
                  {financialData.map((data, index) => (
                    <div key={index} className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-foreground truncate">{data.shopName}</h3>
                        <span
                          className={`text-sm font-medium px-2 py-1 rounded ${
                            data.netRevenue >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                          }`}
                        >
                          Net: ₹{data.netRevenue.toFixed(2)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Revenue:</span>
                          <div className="font-medium text-green-600">₹{data.totalRevenue.toFixed(2)}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Refunds:</span>
                          <div className="font-medium text-red-600">₹{data.refunds.toFixed(2)}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Payments:</span>
                          <div className="font-medium">{data.successfulPayments}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Avg Order:</span>
                          <div className="font-medium">₹{data.averageOrderValue.toFixed(2)}</div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-border">
                        <span className="text-muted-foreground text-sm">Total Transactions: </span>
                        <span className="font-medium">{data.totalTransactions}</span>
                      </div>
                    </div>
                  ))}

                  {/* Mobile Totals */}
                  <div className="p-4 bg-muted/50">
                    <h3 className="font-bold text-foreground mb-3">TOTALS</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Total Revenue:</span>
                        <div className="font-bold text-green-600">₹{totals.totalRevenue.toFixed(2)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total Refunds:</span>
                        <div className="font-bold text-red-600">₹{totals.totalRefunds.toFixed(2)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Net Revenue:</span>
                        <div className={`font-bold ${totals.netRevenue >= 0 ? "text-green-600" : "text-red-600"}`}>
                          ₹{totals.netRevenue.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Transactions:</span>
                        <div className="font-bold">{totals.totalTransactions}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Desktop Table Layout */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Shop Name</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Total Revenue</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                      Successful Payments
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Refunds</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Net Revenue</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Avg Order Value</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                      Total Transactions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {financialData.map((data, index) => (
                    <tr key={index} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{data.shopName}</td>
                      <td className="px-4 py-3 text-right text-green-600 font-medium">
                        ₹{data.totalRevenue.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right">{data.successfulPayments}</td>
                      <td className="px-4 py-3 text-right text-red-600">₹{data.refunds.toFixed(2)}</td>
                      <td
                        className={`px-4 py-3 text-right font-medium ${data.netRevenue >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        ₹{data.netRevenue.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right">₹{data.averageOrderValue.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">{data.totalTransactions}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted/50">
                  <tr className="font-bold">
                    <td className="px-4 py-3 text-foreground">TOTALS</td>
                    <td className="px-4 py-3 text-right text-green-600">₹{totals.totalRevenue.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">-</td>
                    <td className="px-4 py-3 text-right text-red-600">₹{totals.totalRefunds.toFixed(2)}</td>
                    <td
                      className={`px-4 py-3 text-right ${totals.netRevenue >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      ₹{totals.netRevenue.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right">-</td>
                    <td className="px-4 py-3 text-right">{totals.totalTransactions}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}

        {!loading && financialData.length === 0 && (
          <div className="text-center py-12 px-4">
            <div className="p-3 bg-muted rounded-full w-fit mx-auto mb-4">
              <FileText size={32} className="text-muted-foreground" />
            </div>
            <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-2">No Financial Data Found</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Try adjusting your date range to see financial reports for your shops.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default FinancialReportsPage
