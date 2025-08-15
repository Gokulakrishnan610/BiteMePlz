import React, { useEffect, useState } from 'react';
import api from '../../api';
import { 
  DollarSign, 
  Download, 
  Calendar,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';

interface shop {
  id: string;
  name: string;
}

interface FinancialData {
  shopName: string;
  totalRevenue: number;
  totalTransactions: number;
  successfulPayments: number;
  refunds: number;
  netRevenue: number;
  averageOrderValue: number;
}

// Helpers to normalize API responses
const toNumber = (v: any): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

const normalizeTransaction = (t: any) => ({
  ...t,
  amount: toNumber(t?.amount),
  paymentMethod: t?.paymentMethod ?? t?.payment_method ?? '',
  createdAt: t?.createdAt ?? t?.created_at,
});

const extractTransactions = (data: any) => {
  const list = Array.isArray(data) ? data : data?.results || data?.transactions || [];
  return (list as any[]).map(normalizeTransaction);
};

const FinancialReportsPage: React.FC = () => {
  const [shops, setshops] = useState<shop[]>([]);
  const [financialData, setFinancialData] = useState<FinancialData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [totals, setTotals] = useState({
    totalRevenue: 0,
    totalRefunds: 0,
    netRevenue: 0,
    totalTransactions: 0
  });

  useEffect(() => {
    fetchshops();
  }, []);

  useEffect(() => {
    if (shops.length > 0) {
      fetchFinancialData();
    }
  }, [shops, dateRange]);

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

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      const financialReports: FinancialData[] = [];
      let totalRevenue = 0;
      let totalRefunds = 0;
      let totalTransactions = 0;

      for (const shop of shops) {
        try {
          if (!shop.id) {
            console.warn(`Shop ${shop.name} has no valid ID, skipping`);
            continue;
          }
          const params = new URLSearchParams({
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
            shop_id: shop.id,
          });

          const { data } = await api.get(`/api/transactions/shop/?${params}`);
          const transactions = extractTransactions(data);

          // Calculate financial metrics
          const payments = transactions.filter((t: any) => t.type === 'payment' && t.status === 'success');
          const refunds = transactions.filter((t: any) => t.type === 'refund');
          
          const shopRevenue = payments.reduce((sum: number, t: any) => sum + toNumber(t.amount), 0);
          const shopRefunds = refunds.reduce((sum: number, t: any) => sum + toNumber(t.amount), 0);
          const netRevenue = shopRevenue - shopRefunds;
          const averageOrderValue = payments.length > 0 ? shopRevenue / payments.length : 0;

          financialReports.push({
            shopName: shop.name,
            totalRevenue: shopRevenue,
            totalTransactions: transactions.length,
            successfulPayments: payments.length,
            refunds: shopRefunds,
            netRevenue,
            averageOrderValue,
          });

          totalRevenue += shopRevenue;
          totalRefunds += shopRefunds;
          totalTransactions += transactions.length;
        } catch (error) {
          console.error(`Failed to fetch financial data for shop ${shop.name}:`, error);
        }
      }

      setFinancialData(financialReports);
      setTotals({
        totalRevenue,
        totalRefunds,
        netRevenue: totalRevenue - totalRefunds,
        totalTransactions,
      });
      setLoading(false);
    } catch (error) {
      toast.error('Failed to fetch financial data');
      setLoading(false);
    }
  };

  const exportFinancialReport = () => {
    try {
      const csvContent = [
        ['shop Name', 'Total Revenue', 'Successful Payments', 'Refunds', 'Net Revenue', 'Average Order Value', 'Total Transactions'].join(','),
        ...financialData.map((data) => [
          data.shopName,
          data.totalRevenue.toFixed(2),
          data.successfulPayments,
          data.refunds.toFixed(2),
          data.netRevenue.toFixed(2),
          data.averageOrderValue.toFixed(2),
          data.totalTransactions
        ].join(',')),
        ['', '', '', '', '', '', ''], // Empty row
        ['TOTALS', totals.totalRevenue.toFixed(2), '', totals.totalRefunds.toFixed(2), totals.netRevenue.toFixed(2), '', totals.totalTransactions].join(',')
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financial-report-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Financial report exported successfully');
    } catch (error) {
      toast.error('Failed to export financial report');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <h1 className="text-xl sm:text-2xl font-bold">Financial Reports</h1>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={fetchFinancialData}
            className="btn-secondary flex items-center justify-center w-full sm:w-auto"
          >
            <RefreshCw size={20} className="mr-2" />
            <span className="hidden sm:inline">Refresh</span>
            <span className="sm:hidden">Refresh</span>
          </button>
          <button
            onClick={exportFinancialReport}
            className="btn-primary flex items-center justify-center w-full sm:w-auto"
          >
            <Download size={20} className="mr-2" />
            <span className="hidden sm:inline">Export Report</span>
            <span className="sm:hidden">Export</span>
          </button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="card p-3 sm:p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">
              End Date
            </label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="input"
            />
          </div>

          <div className="text-sm text-[var(--gray-600)]">
            <Calendar size={16} className="inline mr-1" />
            {Math.ceil((new Date(dateRange.endDate).getTime() - new Date(dateRange.startDate).getTime()) / (1000 * 60 * 60 * 24))} days selected
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="p-3 sm:p-4 lg:p-6 flex items-center">
            <DollarSign size={24} className="sm:hidden mr-2 sm:mr-4 flex-shrink-0" />
            <DollarSign size={40} className="hidden sm:block mr-4 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm sm:text-lg font-semibold truncate">Total Revenue</p>
              <p className="text-2xl sm:text-3xl font-bold">₹{totals.totalRevenue.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-red-500 to-red-600 text-white">
          <div className="p-3 sm:p-4 lg:p-6 flex items-center">
            <TrendingDown size={24} className="sm:hidden mr-2 sm:mr-4 flex-shrink-0" />
            <TrendingDown size={40} className="hidden sm:block mr-4 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm sm:text-lg font-semibold truncate">Total Refunds</p>
              <p className="text-2xl sm:text-3xl font-bold">₹{totals.totalRefunds.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="p-3 sm:p-4 lg:p-6 flex items-center">
            <TrendingUp size={24} className="sm:hidden mr-2 sm:mr-4 flex-shrink-0" />
            <TrendingUp size={40} className="hidden sm:block mr-4 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm sm:text-lg font-semibold truncate">Net Revenue</p>
              <p className="text-2xl sm:text-3xl font-bold">₹{totals.netRevenue.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <div className="p-3 sm:p-4 lg:p-6 flex items-center">
            <FileText size={24} className="sm:hidden mr-2 sm:mr-4 flex-shrink-0" />
            <FileText size={40} className="hidden sm:block mr-4 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm sm:text-lg font-semibold truncate">Total Transactions</p>
              <p className="text-2xl sm:text-3xl font-bold">{totals.totalTransactions}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Data Table */}
      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--primary)]"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th>shop Name</th>
                  <th>Total Revenue</th>
                  <th>Successful Payments</th>
                  <th>Refunds</th>
                  <th>Net Revenue</th>
                  <th>Avg Order Value</th>
                  <th>Total Transactions</th>
                </tr>
              </thead>
              <tbody>
                {financialData.map((data, index) => (
                  <tr key={index}>
                    <td className="font-medium">{data.shopName}</td>
                    <td className="text-green-600 font-medium">₹{data.totalRevenue.toFixed(2)}</td>
                    <td>{data.successfulPayments}</td>
                    <td className="text-red-600">₹{data.refunds.toFixed(2)}</td>
                    <td className={`font-medium ${data.netRevenue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ₹{data.netRevenue.toFixed(2)}
                    </td>
                    <td>₹{data.averageOrderValue.toFixed(2)}</td>
                    <td>{data.totalTransactions}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[var(--gray-100)] font-bold">
                  <td>TOTALS</td>
                  <td className="text-green-600">₹{totals.totalRevenue.toFixed(2)}</td>
                  <td>-</td>
                  <td className="text-red-600">₹{totals.totalRefunds.toFixed(2)}</td>
                  <td className={totals.netRevenue >= 0 ? 'text-green-600' : 'text-red-600'}>
                    ₹{totals.netRevenue.toFixed(2)}
                  </td>
                  <td>-</td>
                  <td>{totals.totalTransactions}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {!loading && financialData.length === 0 && (
          <div className="text-center py-12">
            <FileText size={48} className="text-[var(--gray-400)] mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-[var(--gray-600)] mb-2">
              No Financial Data Found
            </h2>
            <p className="text-[var(--gray-500)]">
              Try adjusting your date range to see financial reports.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinancialReportsPage;