import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  Activity, 
  Filter, 
  Download, 
  Eye, 
  Calendar,
  RefreshCw,
  Clock,
  User,
  Settings,
  Power,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ShopLog {
  _id: string;
  action: string;
  description: string;
  createdAt: string;
  performedBy: {
    name: string;
    email: string;
    role: string;
  };
  shop: {
    name: string;
  };
  previousState: any;
  newState: any;
  metadata: any;
  ipAddress?: string;
}

interface Shop {
  _id: string;
  name: string;
}

const ShopLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<ShopLog[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<ShopLog | null>(null);
  const [filters, setFilters] = useState({
    shop: '',
    action: '',
    startDate: '',
    endDate: '',
    performedBy: '',
    page: 1,
    limit: 50
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0
  });

  const actionLabels: Record<string, string> = {
    shop_opened: 'Shop Opened',
    shop_closed: 'Shop Closed',
    validity_updated: 'Validity Updated',
    qr_validity_updated: 'QR Validity Updated',
    shop_created: 'Shop Created',
    shop_activated: 'Shop Activated',
    shop_deactivated: 'Shop Deactivated',
    manual_close: 'Manual Close',
    auto_close: 'Auto Close',
    final_validity_expired: 'Final Validity Expired',
    settings_updated: 'Settings Updated'
  };

  const actionColors: Record<string, string> = {
    shop_opened: 'badge-success',
    shop_closed: 'badge-warning',
    validity_updated: 'badge-info',
    qr_validity_updated: 'badge-info',
    shop_created: 'badge-success',
    shop_activated: 'badge-success',
    shop_deactivated: 'badge-error',
    manual_close: 'badge-warning',
    auto_close: 'badge-error',
    final_validity_expired: 'badge-error',
    settings_updated: 'badge-primary'
  };

  useEffect(() => {
    fetchShops();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  const fetchShops = async () => {
    try {
      const { data } = await axios.get('/api/shops');
      setShops(data);
    } catch (error) {
      toast.error('Failed to fetch shops');
    }
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString());
      });

      const { data } = await axios.get(`/api/shop-logs/all?${params}`);
      setLogs(data.logs || []);
      setPagination({
        currentPage: data.currentPage || 1,
        totalPages: data.totalPages || 1,
        total: data.total || 0
      });
      
      setLoading(false);
    } catch (error) {
      toast.error('Failed to fetch shop logs');
      setLoading(false);
    }
  };

  const handleLogClick = (log: ShopLog) => {
    setSelectedLog(log);
  };

  const exportLogs = async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && key !== 'page') params.append(key, value.toString());
      });
      params.append('limit', '1000'); // Export more records

      const { data } = await axios.get(`/api/shop-logs/all?${params}`);
      
      const csvData = [];
      
      // Header
      csvData.push(['SHOP ACTIVITY LOGS REPORT']);
      csvData.push(['Generated On', new Date().toLocaleString()]);
      csvData.push(['Date Range', `${filters.startDate || 'All'} to ${filters.endDate || 'All'}`]);
      csvData.push(['']);

      // Logs
      csvData.push(['Date', 'Shop', 'Action', 'Performed By', 'Description', 'IP Address']);
      
      data.logs.forEach((log: ShopLog) => {
        csvData.push([
          new Date(log.createdAt).toLocaleString(),
          log.shop?.name || 'Unknown',
          actionLabels[log.action] || log.action,
          log.performedBy?.name || 'Unknown',
          `"${log.description}"`,
          log.ipAddress || 'N/A'
        ]);
      });

      const csvContent = csvData.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shop-activity-logs-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Shop activity logs exported successfully');
    } catch (err) {
      toast.error('Failed to export logs');
    }
  };

  const resetFilters = () => {
    setFilters({
      shop: '',
      action: '',
      startDate: '',
      endDate: '',
      performedBy: '',
      page: 1,
      limit: 50
    });
  };

  const handlePageChange = (page: number) => {
    setFilters({ ...filters, page });
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'shop_opened':
      case 'shop_closed':
        return <Power size={16} />;
      case 'validity_updated':
      case 'qr_validity_updated':
        return <Clock size={16} />;
      case 'settings_updated':
        return <Settings size={16} />;
      default:
        return <Activity size={16} />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Shop Activity Logs</h1>
        <div className="flex gap-2">
          <button
            onClick={fetchLogs}
            className="btn-secondary flex items-center"
          >
            <RefreshCw size={20} className="mr-2" />
            Refresh
          </button>
          <button
            onClick={exportLogs}
            className="btn-primary flex items-center"
          >
            <Download size={20} className="mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-[var(--secondary-text)] mb-1">
              Shop
            </label>
            <select
              value={filters.shop}
              onChange={(e) => setFilters({ ...filters, shop: e.target.value, page: 1 })}
              className="input"
            >
              <option value="">All Shops</option>
              {shops.map((shop) => (
                <option key={shop._id} value={shop._id}>
                  {shop.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--secondary-text)] mb-1">
              Action
            </label>
            <select
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value, page: 1 })}
              className="input"
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
            <label className="block text-sm font-medium text-[var(--secondary-text)] mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value, page: 1 })}
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--secondary-text)] mb-1">
              End Date
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value, page: 1 })}
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--secondary-text)] mb-1">
              Performed By
            </label>
            <input
              type="text"
              value={filters.performedBy}
              onChange={(e) => setFilters({ ...filters, performedBy: e.target.value, page: 1 })}
              placeholder="Search by name..."
              className="input"
            />
          </div>

          <button
            onClick={resetFilters}
            className="btn-secondary"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--accent-purple)]"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Shop</th>
                    <th>Action</th>
                    <th>Performed By</th>
                    <th>Description</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log._id}>
                      <td>
                        <div className="flex items-center">
                          <Calendar size={16} className="mr-2 text-[var(--muted-text)]" />
                          <div>
                            <div className="font-medium">
                              {new Date(log.createdAt).toLocaleDateString()}
                            </div>
                            <div className="text-sm text-[var(--muted-text)]">
                              {new Date(log.createdAt).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="font-medium">{log.shop?.name || 'Unknown'}</td>
                      <td>
                        <span className={`badge ${actionColors[log.action] || 'badge-secondary'} flex items-center w-fit`}>
                          {getActionIcon(log.action)}
                          <span className="ml-1">{actionLabels[log.action] || log.action}</span>
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center">
                          <User size={16} className="mr-2 text-[var(--muted-text)]" />
                          <div>
                            <div className="font-medium">{log.performedBy?.name || 'Unknown'}</div>
                            <div className="text-sm text-[var(--muted-text)] capitalize">
                              {log.performedBy?.role || 'Unknown'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="max-w-xs truncate">{log.description}</td>
                      <td>
                        <button
                          onClick={() => handleLogClick(log)}
                          className="p-2 text-[var(--accent-purple)] hover:bg-[var(--hover-bg)] hover:text-[var(--accent-violet)] rounded transition-all duration-200"
                        >
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-between items-center p-4 border-t border-[var(--border-color)]">
                <div className="text-sm text-[var(--secondary-text)]">
                  Showing {((pagination.currentPage - 1) * filters.limit) + 1} to {Math.min(pagination.currentPage * filters.limit, pagination.total)} of {pagination.total} logs
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={pagination.currentPage === 1}
                    className="btn-secondary px-3 py-1 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1 bg-[var(--card-bg)] rounded border border-[var(--border-color)]">
                    {pagination.currentPage} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={pagination.currentPage === pagination.totalPages}
                    className="btn-secondary px-3 py-1 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {!loading && logs.length === 0 && (
          <div className="text-center py-12">
            <Activity size={48} className="text-[var(--muted-text)] mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-[var(--secondary-text)] mb-2">
              No Activity Logs Found
            </h2>
            <p className="text-[var(--muted-text)]">
              Try adjusting your filters to see more results.
            </p>
          </div>
        )}
      </div>

      {/* Log Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--card-bg)] rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-[var(--border-color)]">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-[var(--primary-text)]">Activity Log Details</h3>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-[var(--muted-text)] hover:text-[var(--accent-purple)] transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--secondary-text)]">Shop</label>
                    <p className="mt-1 text-[var(--primary-text)]">{selectedLog.shop?.name || 'Unknown'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--secondary-text)]">Action</label>
                    <div className="mt-1">
                      <span className={`badge ${actionColors[selectedLog.action] || 'badge-secondary'} flex items-center w-fit`}>
                        {getActionIcon(selectedLog.action)}
                        <span className="ml-1">{actionLabels[selectedLog.action] || selectedLog.action}</span>
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--secondary-text)]">Performed By</label>
                    <div className="mt-1">
                      <p className="text-[var(--primary-text)]">{selectedLog.performedBy?.name || 'Unknown'}</p>
                      <p className="text-sm text-[var(--muted-text)]">{selectedLog.performedBy?.email || 'Unknown'}</p>
                      <p className="text-sm text-[var(--muted-text)] capitalize">{selectedLog.performedBy?.role || 'Unknown'}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--secondary-text)]">Date & Time</label>
                    <p className="mt-1 text-[var(--primary-text)]">{new Date(selectedLog.createdAt).toLocaleString()}</p>
                  </div>

                  {selectedLog.ipAddress && (
                    <div>
                      <label className="block text-sm font-medium text-[var(--secondary-text)]">IP Address</label>
                      <p className="mt-1 text-[var(--primary-text)] font-mono">{selectedLog.ipAddress}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--secondary-text)]">Description</label>
                    <p className="mt-1 text-[var(--primary-text)]">{selectedLog.description}</p>
                  </div>

                  {selectedLog.previousState && Object.keys(selectedLog.previousState).length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-[var(--secondary-text)]">Previous State</label>
                      <pre className="mt-1 text-sm bg-[var(--hover-bg)] p-3 rounded overflow-x-auto text-[var(--primary-text)]">
                        {JSON.stringify(selectedLog.previousState, null, 2)}
                      </pre>
                    </div>
                  )}

                  {selectedLog.newState && Object.keys(selectedLog.newState).length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-[var(--secondary-text)]">New State</label>
                      <pre className="mt-1 text-sm bg-[var(--hover-bg)] p-3 rounded overflow-x-auto text-[var(--primary-text)]">
                        {JSON.stringify(selectedLog.newState, null, 2)}
                      </pre>
                    </div>
                  )}

                  {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-[var(--secondary-text)]">Additional Information</label>
                      <pre className="mt-1 text-sm bg-[var(--hover-bg)] p-3 rounded overflow-x-auto text-[var(--primary-text)]">
                        {JSON.stringify(selectedLog.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopLogsPage;