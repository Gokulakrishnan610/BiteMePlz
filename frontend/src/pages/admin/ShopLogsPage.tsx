import React, { useEffect, useState } from 'react';
import api from '../../api';
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
import { toast } from 'sonner';

interface shopLog {
  id: string;
  action: string;
  details: any;
  created_at: string;
  performed_by: {
    name: string;
    email: string;
    role: string;
  };
  shop: {
    name: string;
  };
}

interface shop {
  _id: string;
  name: string;
}

const ShopLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<shopLog[]>([]);
  const [shops, setshops] = useState<shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<shopLog | null>(null);
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
    shop_opened: 'shop Opened',
    shop_closed: 'shop Closed',
    validity_updated: 'Validity Updated',
    qr_validity_updated: 'QR Validity Updated',
    shop_created: 'shop Created',
    shop_activated: 'shop Activated',
    shop_deactivated: 'shop Deactivated',
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
    fetchshops();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  const fetchshops = async () => {
    try {
      const all: shop[] = [];
      let page = 1;
      let next: string | null = `/api/shops/?page=${page}`;
      while (next) {
        const { data } = await api.get(next);
        const shopsData = data.results || data;
        if (Array.isArray(shopsData)) {
          all.push(...shopsData);
          next = data.next || null;
        } else {
          all.push(...shopsData);
          next = null;
        }
      }
      setshops(all);
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

      const { data } = await api.get(`/api/shop-logs/?${params}`);
      setLogs(data.results || data || []);
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

  const handleLogClick = (log: shopLog) => {
    setSelectedLog(log);
  };

  const exportLogs = async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && key !== 'page') params.append(key, value.toString());
      });
      params.append('limit', '1000'); // Export more records

      const { data } = await api.get(`/api/shop-logs/?${params}`);
      
      const csvData = [];
      
      // Header
      csvData.push(['shop ACTIVITY LOGS REPORT']);
      csvData.push(['Generated On', new Date().toLocaleString()]);
      csvData.push(['Date Range', `${filters.startDate || 'All'} to ${filters.endDate || 'All'}`]);
      csvData.push(['']);

      // Logs
      csvData.push(['Date', 'shop', 'Action', 'Performed By', 'Description', 'IP Address']);
      
      (data.results || data || []).forEach((log: shopLog) => {
        csvData.push([
          new Date(log.created_at).toLocaleString(),
          log.shop?.name || 'Unknown',
          actionLabels[log.action] || log.action,
          log.performed_by?.name || 'Unknown',
          `"${JSON.stringify(log.details)}"`,
          'N/A'
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
      toast.success('shop activity logs exported successfully');
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
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <h1 className="text-xl sm:text-2xl font-bold">Shop Activity Logs</h1>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={fetchLogs}
            className="btn-secondary flex items-center justify-center w-full sm:w-auto"
          >
            <RefreshCw size={20} className="mr-2" />
            <span className="hidden sm:inline">Refresh</span>
            <span className="sm:hidden">Refresh</span>
          </button>
          <button
            onClick={exportLogs}
            className="btn-primary flex items-center justify-center w-full sm:w-auto"
          >
            <Download size={20} className="mr-2" />
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">Export</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-3 sm:p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-[var(--secondary-text)] mb-1">
              shop
            </label>
            <select
              value={filters.shop}
              onChange={(e) => setFilters({ ...filters, shop: e.target.value, page: 1 })}
              className="input"
            >
              <option value="">All shops</option>
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
              <table className="w-full min-w-full">
                <thead>
                  <tr>
                    <th className="text-left py-2 px-2 text-sm">Date & Time</th>
                    <th className="text-left py-2 px-2 text-sm hidden md:table-cell">Shop</th>
                    <th className="text-left py-2 px-2 text-sm">Action</th>
                    <th className="text-left py-2 px-2 text-sm hidden lg:table-cell">Performed By</th>
                    <th className="text-left py-2 px-2 text-sm hidden xl:table-cell">Description</th>
                    <th className="text-left py-2 px-2 text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-[var(--border)]">
                      <td className="py-2 px-2">
                        <div className="flex items-center">
                          <Calendar size={16} className="mr-2 text-[var(--muted-text)] flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="font-medium text-sm">
                              {new Date(log.created_at).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-[var(--muted-text)]">
                              {new Date(log.created_at).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2 px-2 hidden md:table-cell text-sm font-medium">{log.shop?.name || 'Unknown'}</td>
                      <td className="py-2 px-2">
                        <span className={`badge ${actionColors[log.action] || 'badge-secondary'} flex items-center w-fit text-xs`}>
                          {getActionIcon(log.action)}
                          <span className="ml-1 truncate">{actionLabels[log.action] || log.action}</span>
                        </span>
                      </td>
                      <td className="py-2 px-2 hidden lg:table-cell">
                        <div className="flex items-center">
                          <User size={16} className="mr-2 text-[var(--muted-text)] flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="font-medium text-sm truncate">{log.performed_by?.name || 'Unknown'}</div>
                            <div className="text-xs text-[var(--muted-text)] capitalize truncate">
                              {log.performed_by?.role || 'Unknown'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2 px-2 hidden xl:table-cell text-sm max-w-xs truncate">{JSON.stringify(log.details)}</td>
                      <td className="py-2 px-2">
                        <button
                          onClick={() => handleLogClick(log)}
                          className="p-2 text-[var(--accent-purple)] hover:bg-[var(--hover-bg)] hover:text-[var(--accent-violet)] rounded transition-all duration-200"
                          title="View Details"
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
                    <label className="block text-sm font-medium text-[var(--secondary-text)]">shop</label>
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
                      <p className="text-[var(--primary-text)]">{selectedLog.performed_by?.name || 'Unknown'}</p>
                      <p className="text-sm text-[var(--muted-text)]">{selectedLog.performed_by?.email || 'Unknown'}</p>
                      <p className="text-sm text-[var(--muted-text)] capitalize">{selectedLog.performed_by?.role || 'Unknown'}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--secondary-text)]">Date & Time</label>
                    <p className="mt-1 text-[var(--primary-text)]">{new Date(selectedLog.created_at).toLocaleString()}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--secondary-text)]">Details</label>
                    <pre className="mt-1 text-sm bg-[var(--hover-bg)] p-3 rounded overflow-x-auto text-[var(--primary-text)]">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </div>
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