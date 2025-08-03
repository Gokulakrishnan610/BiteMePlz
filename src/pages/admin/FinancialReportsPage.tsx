import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  DollarSign, 
  Download, 
  Calendar,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  FileText
} from 'lucide-react';
import toast from 'react-hot-toast';

interface shop {
  _id: string;
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
      const { data } = await axios.get('/api/shops');
      setshops(data);
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
          const params = new URLSearchParams({
            startDate: dateRange.startDate,
            endDate: dateRange.endDate
          });

          const { data } = await axios.get(`/api/transactions/shop/${shop._id}?${params}`);
          const transactions = data.transactions || [];

          // Calculate financial metrics
          const payments = transactions.filter((t: any) => t.type === 'payment' && t.status === 'success');
          const refunds = transactions.filter((t: any) => t.type === 'refund');
          
          const shopRevenue = payments.reduce((sum: number, t: any) => sum + t.amount, 0);
          const shopRefunds = refunds.reduce((sum: number, t: any) => sum + t.amount, 0);
          const netRevenue = shopRevenue - shopRefunds;
          const averageOrderValue = payments.length > 0 ? shopRevenue / payments.length : 0;

          financialReports.push({
            shopName: shop.name,
            totalRevenue: shopRevenue,
            totalTransactions: transactions.length,
            successfulPayments: payments.length,
            refunds: shopRefunds,
            netRevenue,
            averageOrderValue
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
        totalTransactions
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Financial Reports</h1>
        <div className="flex gap-2">
          <button
            onClick={fetchFinancialData}
            className="btn-secondary flex items-center"
          >
            <RefreshCw size={20} className="mr-2" />
            Refresh
          </button>
          <button
            onClick={exportFinancialReport}
            className="btn-primary flex items-center"
          >
            <Download size={20} className="mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="p-6 flex items-center">
            <DollarSign size={40} className="mr-4" />
            <div>
              <p className="text-lg font-semibold">Total Revenue</p>
              <p className="text-3xl font-bold">₹{totals.totalRevenue.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-red-500 to-red-600 text-white">
          <div className="p-6 flex items-center">
            <TrendingDown size={40} className="mr-4" />
            <div>
              <p className="text-lg font-semibold">Total Refunds</p>
              <p className="text-3xl font-bold">₹{totals.totalRefunds.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="p-6 flex items-center">
            <TrendingUp size={40} className="mr-4" />
            <div>
              <p className="text-lg font-semibold">Net Revenue</p>
              <p className="text-3xl font-bold">₹{totals.netRevenue.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <div className="p-6 flex items-center">
            <FileText size={40} className="mr-4" />
            <div>
              <p className="text-lg font-semibold">Total Transactions</p>
              <p className="text-3xl font-bold">{totals.totalTransactions}</p>
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