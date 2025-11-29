"use client"

import type React from "react"
import { useEffect, useState } from "react"
import api from "../../api"
import { Activity, Download, Eye, RefreshCw, Search, User, X } from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import { toast } from "sonner"
import Loader from "../../components/Loader"

interface StudentLog {
  _id: string
  user: {
    _id: string
    name: string
    email: string
    rollNo: string
  }
  action: string
  description: string
  shop: {
    _id: string
    name: string
  } | null
  order: {
    _id: string
    order_id: string
  } | null
  product: {
    _id: string
    name: string
  } | null
  metadata: any
  ip_address: string
  user_agent: string
  created_at: string
}

const StudentLogsPage: React.FC = () => {
  const { user } = useAuth()
  const [logs, setLogs] = useState<StudentLog[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState<StudentLog | null>(null)
  const [filters, setFilters] = useState({
    action: "",
    shop_id: "",
    start_date: "",
    end_date: "",
    search: "",
    page: 1,
    limit: 50,
  })
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
    hasNext: false,
    hasPrev: false,
  })

  const actionLabels: Record<string, string> = {
    login: "Login",
    logout: "Logout",
    view_shops: "View Shops",
    view_products: "View Products",
    add_to_cart: "Add to Cart",
    remove_from_cart: "Remove from Cart",
    place_order: "Place Order",
    view_order: "View Order",
    cancel_order: "Cancel Order",
    add_balance: "Add Balance",
    view_profile: "View Profile",
    update_profile: "Update Profile",
    view_transactions: "View Transactions",
    other: "Other",
  }

  useEffect(() => {
    fetchLogs()
  }, [filters])

  const fetchLogs = async () => {
    try {
      setLoading(true)

      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString())
      })

      const { data } = await api.get(`/api/student-logs/?${params}`)
      setLogs(data.results || [])
      setPagination({
        currentPage: data.currentPage || 1,
        totalPages: data.totalPages || 1,
        total: data.total || 0,
        hasNext: data.hasNext || false,
        hasPrev: data.hasPrev || false,
      })

      setLoading(false)
    } catch (error) {
      toast.error("Failed to fetch student logs")
      setLoading(false)
    }
  }

  const exportLogs = () => {
    try {
      const csvData: string[][] = []

      // Header
      csvData.push(["STUDENT ACTIVITY LOGS REPORT"])
      csvData.push(["Generated On", new Date().toLocaleString()])
      csvData.push(["Date Range", `${filters.start_date || "All"} to ${filters.end_date || "All"}`])
      csvData.push([""])

      // Column headers
      csvData.push(["Date & Time", "Student Name", "Roll No", "Action", "Description", "Shop", "IP Address"])

      // Data rows
      logs.forEach((log) => {
        csvData.push([
          new Date(log.created_at).toLocaleString(),
          log.user.name,
          log.user.rollNo || "-",
          actionLabels[log.action] || log.action,
          log.description || "-",
          log.shop?.name || "-",
          log.ip_address || "-",
        ])
      })

      // Convert to CSV string
      const csvContent = csvData.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")

      // Create and download file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `student-activity-logs-${new Date().toISOString().split("T")[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)

      toast.success("Report exported successfully")
    } catch (error) {
      toast.error("Failed to export report")
    }
  }

  if (loading && logs.length === 0) {
    return <Loader />
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Student & Staff Activity Logs</h1>
        <div className="flex flex-col sm:flex-row gap-2">
          <button onClick={fetchLogs} className="btn-secondary flex items-center justify-center">
            <RefreshCw size={20} className="mr-2" />
            Refresh
          </button>
          <button onClick={exportLogs} className="btn-primary flex items-center justify-center">
            <Download size={20} className="mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
            <select
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value, page: 1 })}
              className="input w-full"
            >
              <option value="">All Actions</option>
              {Object.entries(actionLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => setFilters({ ...filters, start_date: e.target.value, page: 1 })}
              className="input w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => setFilters({ ...filters, end_date: e.target.value, page: 1 })}
              className="input w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
                placeholder="Name, Roll No..."
                className="input w-full pl-10"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4">
          <div className="flex items-center">
            <Activity size={32} className="mr-3" />
            <div>
              <p className="text-sm font-semibold">Total Logs</p>
              <p className="text-2xl font-bold">{pagination.total}</p>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white p-4">
          <div className="flex items-center">
            <User size={32} className="mr-3" />
            <div>
              <p className="text-sm font-semibold">Unique Students</p>
              <p className="text-2xl font-bold">{new Set(logs.map((l) => l.user._id)).size}</p>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white p-4">
          <div className="flex items-center">
            <Activity size={32} className="mr-3" />
            <div>
              <p className="text-sm font-semibold">Showing</p>
              <p className="text-2xl font-bold">{logs.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="card">
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-4 px-4 font-semibold text-gray-900">Date & Time</th>
                <th className="text-left py-4 px-4 font-semibold text-gray-900">Student</th>
                <th className="text-left py-4 px-4 font-semibold text-gray-900">Action</th>
                <th className="text-left py-4 px-4 font-semibold text-gray-900">Description</th>
                <th className="text-left py-4 px-4 font-semibold text-gray-900">Shop</th>
                <th className="text-left py-4 px-4 font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log._id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-4 text-sm text-gray-600">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="py-4 px-4">
                    <div>
                      <div className="font-medium text-gray-900">{log.user.name}</div>
                      <div className="text-sm text-gray-500">{log.user.rollNo}</div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {actionLabels[log.action] || log.action}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-600">
                    {log.description ? (log.description.length > 50 ? log.description.substring(0, 50) + "..." : log.description) : "-"}
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-600">{log.shop?.name || "-"}</td>
                  <td className="py-4 px-4">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden space-y-4 p-4">
          {logs.map((log) => (
            <div key={log._id} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-gray-900">{log.user.name}</div>
                  <div className="text-sm text-gray-500">{log.user.rollNo}</div>
                </div>
                <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {actionLabels[log.action] || log.action}
                </span>
              </div>

              <div className="text-sm text-gray-600">
                <div>{new Date(log.created_at).toLocaleString()}</div>
                {log.description && <div className="mt-1">{log.description}</div>}
                {log.shop && <div className="mt-1">Shop: {log.shop.name}</div>}
              </div>

              <button
                onClick={() => setSelectedLog(log)}
                className="w-full px-3 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors text-sm font-medium"
              >
                View Details
              </button>
            </div>
          ))}
        </div>

        {logs.length === 0 && (
          <div className="text-center py-12 px-4">
            <Activity size={48} className="text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-600 mb-2">No Logs Found</h2>
            <p className="text-gray-500">No student activity logs match your filters.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <button
            onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
            disabled={!pagination.hasPrev}
            className="btn-secondary disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-gray-700">
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          <button
            onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
            disabled={!pagination.hasNext}
            className="btn-secondary disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Log Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Log Details</h2>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Student</label>
                  <p className="text-lg font-semibold text-gray-900">{selectedLog.user.name}</p>
                  <p className="text-sm text-gray-600">{selectedLog.user.email}</p>
                  <p className="text-sm text-gray-600">Roll No: {selectedLog.user.rollNo}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500">Action</label>
                  <p className="text-lg text-gray-900">{actionLabels[selectedLog.action] || selectedLog.action}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500">Date & Time</label>
                  <p className="text-lg text-gray-900">{new Date(selectedLog.created_at).toLocaleString()}</p>
                </div>

                {selectedLog.description && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Description</label>
                    <p className="text-lg text-gray-900">{selectedLog.description}</p>
                  </div>
                )}

                {selectedLog.shop && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Shop</label>
                    <p className="text-lg text-gray-900">{selectedLog.shop.name}</p>
                  </div>
                )}

                {selectedLog.order && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Order</label>
                    <p className="text-lg text-gray-900">#{selectedLog.order.order_id}</p>
                  </div>
                )}

                {selectedLog.product && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Product</label>
                    <p className="text-lg text-gray-900">{selectedLog.product.name}</p>
                  </div>
                )}

                {selectedLog.ip_address && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">IP Address</label>
                    <p className="text-lg text-gray-900">{selectedLog.ip_address}</p>
                  </div>
                )}

                {selectedLog.user_agent && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">User Agent</label>
                    <p className="text-sm text-gray-900 break-all">{selectedLog.user_agent}</p>
                  </div>
                )}

                {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Additional Data</label>
                    <pre className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md overflow-x-auto">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
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

export default StudentLogsPage
