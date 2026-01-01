import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { BarChart3, DollarSign, Users, Clock, FileText } from 'lucide-react';
import api from '../utils/api';

export function ReportingPage() {
  const [activeTab, setActiveTab] = useState('financial');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [dateRange, setDateRange] = useState({
    start_date: new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
  });

  const [financialData, setFinancialData] = useState(null);
  const [enrollmentData, setEnrollmentData] = useState(null);
  const [staffingData, setStaffingData] = useState(null);
  const [attendanceMode, setAttendanceMode] = useState('summary');
  const [attendanceStartDate, setAttendanceStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  });
  const [attendanceEndDate, setAttendanceEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [attendanceSummary, setAttendanceSummary] = useState([]);
  const [attendanceDetailed, setAttendanceDetailed] = useState([]);

  const handleRunReport = useCallback(async () => {
    setError('');
    setLoading(true);

    try {
      if (activeTab === 'financial') {
        const [revenue, outstanding, aging, payments] = await Promise.all([
          api.get('/reports/financial/revenue', { params: dateRange }),
          api.get('/reports/financial/outstanding'),
          api.get('/reports/financial/aging'),
          api.get('/reports/financial/payment-history', { params: dateRange }),
        ]);
        setFinancialData({
          revenue: revenue.data.revenue || [],
          outstanding: outstanding.data.outstanding || [],
          aging: aging.data.aging || [],
          payments: payments.data.payments || [],
        });
      }

      if (activeTab === 'enrollment') {
        const [summary, trends, waitlist] = await Promise.all([
          api.get('/reports/enrollment/summary'),
          api.get('/reports/enrollment/trends'),
          api.get('/reports/enrollment/waitlist'),
        ]);
        setEnrollmentData({
          summary: summary.data.summary || [],
          trends: trends.data.trends || [],
          waitlist: waitlist.data.waitlist || [],
        });
      }

      if (activeTab === 'staffing') {
        const [hours, payroll, coverage] = await Promise.all([
          api.get('/reports/staffing/hours', { params: dateRange }),
          api.get('/reports/staffing/payroll'),
          api.get('/reports/staffing/coverage', { params: dateRange }),
        ]);
        setStaffingData({
          hours: hours.data.hours || [],
          payroll: payroll.data.payroll || [],
          coverage: coverage.data.coverage || [],
        });
      }

      if (activeTab === 'attendance') {
        if (attendanceMode === 'summary') {
          const response = await api.get('/attendance/report', {
            params: {
              start_date: attendanceStartDate,
              end_date: attendanceEndDate,
            },
          });
          setAttendanceSummary(response.data.report || []);
          setAttendanceDetailed([]);
        } else {
          const response = await api.get('/attendance', {
            params: {
              start_date: attendanceStartDate,
              end_date: attendanceEndDate,
            },
          });
          setAttendanceDetailed(response.data.attendance || []);
          setAttendanceSummary([]);
        }
      }
    } catch (err) {
      console.error('Report load error:', err);
      setError(err.response?.data?.error || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [activeTab, attendanceEndDate, attendanceMode, attendanceStartDate, dateRange]);

  useEffect(() => {
    if (activeTab !== 'attendance') {
      handleRunReport();
    }
  }, [activeTab, dateRange, handleRunReport]);

  return (
    <Layout title="Reporting" subtitle="Analytics and insights">
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={() => setActiveTab('financial')}
          className={`px-4 py-2 rounded-xl text-sm font-bold ${activeTab === 'financial' ? 'bg-[#FF9B85] text-white' : 'bg-[#FFF8F3] text-[#E07A5F]'}`}
        >
          Financial
        </button>
        <button
          onClick={() => setActiveTab('enrollment')}
          className={`px-4 py-2 rounded-xl text-sm font-bold ${activeTab === 'enrollment' ? 'bg-[#FF9B85] text-white' : 'bg-[#FFF8F3] text-[#E07A5F]'}`}
        >
          Enrollment
        </button>
        <button
          onClick={() => setActiveTab('staffing')}
          className={`px-4 py-2 rounded-xl text-sm font-bold ${activeTab === 'staffing' ? 'bg-[#FF9B85] text-white' : 'bg-[#FFF8F3] text-[#E07A5F]'}`}
        >
          Staffing
        </button>
        <button
          onClick={() => setActiveTab('attendance')}
          className={`px-4 py-2 rounded-xl text-sm font-bold ${activeTab === 'attendance' ? 'bg-[#FF9B85] text-white' : 'bg-[#FFF8F3] text-[#E07A5F]'}`}
        >
          Attendance
        </button>
      </div>

      {activeTab !== 'attendance' && (
        <div className="bg-white rounded-3xl p-6 shadow-[0_4px_20px_-4px_rgba(255,229,217,0.5)] border border-[#FFE5D9]/30 mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider font-quicksand mb-2">Start Date</label>
              <input
                type="date"
                value={dateRange.start_date}
                onChange={(e) => setDateRange({ ...dateRange, start_date: e.target.value })}
                className="px-4 py-2 rounded-2xl border border-[#FFE5D9] bg-white text-stone-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider font-quicksand mb-2">End Date</label>
              <input
                type="date"
                value={dateRange.end_date}
                onChange={(e) => setDateRange({ ...dateRange, end_date: e.target.value })}
                className="px-4 py-2 rounded-2xl border border-[#FFE5D9] bg-white text-stone-600"
              />
            </div>
            <button
              onClick={handleRunReport}
              className="px-4 py-2 rounded-xl bg-[#FF9B85] text-white font-bold shadow-lg shadow-[#FF9B85]/30 hover:bg-[#E07A5F] transition-all"
            >
              Run Report
            </button>
          </div>
        </div>
      )}

      {activeTab === 'attendance' && (
        <div className="bg-white rounded-3xl p-6 shadow-[0_4px_20px_-4px_rgba(255,229,217,0.5)] border border-[#FFE5D9]/30 mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider font-quicksand mb-2">Start Date</label>
              <input
                type="date"
                value={attendanceStartDate}
                onChange={(e) => setAttendanceStartDate(e.target.value)}
                className="px-4 py-2 rounded-2xl border border-[#FFE5D9] bg-white text-stone-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider font-quicksand mb-2">End Date</label>
              <input
                type="date"
                value={attendanceEndDate}
                onChange={(e) => setAttendanceEndDate(e.target.value)}
                className="px-4 py-2 rounded-2xl border border-[#FFE5D9] bg-white text-stone-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider font-quicksand mb-2">Report Type</label>
              <select
                value={attendanceMode}
                onChange={(e) => setAttendanceMode(e.target.value)}
                className="px-4 py-2 rounded-2xl border border-[#FFE5D9] bg-white text-stone-600"
              >
                <option value="summary">Summary by Child</option>
                <option value="detailed">Detailed Log</option>
              </select>
            </div>
            <button
              onClick={handleRunReport}
              className="px-4 py-2 rounded-xl bg-[#FF9B85] text-white font-bold shadow-lg shadow-[#FF9B85]/30 hover:bg-[#E07A5F] transition-all"
            >
              Run Report
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center h-48">
          <div className="text-stone-500">Loading...</div>
        </div>
      )}

      {!loading && activeTab === 'financial' && financialData && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_-4px_rgba(255,229,217,0.5)] border border-[#FFE5D9]/30">
            <h3 className="font-quicksand font-bold text-xl text-stone-800 flex items-center gap-2 mb-4">
              <DollarSign size={22} className="text-[#FF9B85]" /> Revenue
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#FFF8F3]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Period</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Payments</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Total</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Average</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FFE5D9]/30">
                  {financialData.revenue.map((row, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-3 text-sm text-stone-600">{row.period}</td>
                      <td className="px-4 py-3 text-sm text-stone-600">{row.payment_count}</td>
                      <td className="px-4 py-3 text-sm text-stone-600">${parseFloat(row.total_revenue || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-stone-600">${parseFloat(row.avg_payment || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_-4px_rgba(255,229,217,0.5)] border border-[#FFE5D9]/30">
            <h3 className="font-quicksand font-bold text-xl text-stone-800 flex items-center gap-2 mb-4">
              <FileText size={22} className="text-[#FF9B85]" /> Outstanding Balances
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#FFF8F3]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Parent</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Phone</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Invoices</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Total Outstanding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FFE5D9]/30">
                  {financialData.outstanding.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3 text-sm text-stone-600">{row.parent_name}</td>
                      <td className="px-4 py-3 text-sm text-stone-600">{row.email}</td>
                      <td className="px-4 py-3 text-sm text-stone-600">{row.phone}</td>
                      <td className="px-4 py-3 text-sm text-stone-600">{row.invoice_count}</td>
                      <td className="px-4 py-3 text-sm text-stone-600">${parseFloat(row.total_outstanding || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_-4px_rgba(255,229,217,0.5)] border border-[#FFE5D9]/30">
            <h3 className="font-quicksand font-bold text-xl text-stone-800 flex items-center gap-2 mb-4">
              <BarChart3 size={22} className="text-[#FF9B85]" /> Invoice Aging
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#FFF8F3]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Parent</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Invoice</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Due Date</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Balance</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Days Overdue</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Bucket</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FFE5D9]/30">
                  {financialData.aging.map((row, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-3 text-sm text-stone-600">{row.parent_name}</td>
                      <td className="px-4 py-3 text-sm text-stone-600">{row.invoice_number}</td>
                      <td className="px-4 py-3 text-sm text-stone-600">{new Date(row.due_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-sm text-stone-600">${parseFloat(row.balance_due || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-stone-600">{row.days_overdue}</td>
                      <td className="px-4 py-3 text-sm text-stone-600">{row.aging_bucket}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {!loading && activeTab === 'enrollment' && enrollmentData && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_-4px_rgba(255,229,217,0.5)] border border-[#FFE5D9]/30">
            <h3 className="font-quicksand font-bold text-xl text-stone-800 flex items-center gap-2 mb-4">
              <Users size={22} className="text-[#FF9B85]" /> Enrollment Summary
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#FFF8F3]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Count</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Avg Monthly Rate</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Total Monthly Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FFE5D9]/30">
                  {enrollmentData.summary.map((row, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-3 text-sm text-stone-600">{row.status}</td>
                      <td className="px-4 py-3 text-sm text-stone-600">{row.count}</td>
                      <td className="px-4 py-3 text-sm text-stone-600">${parseFloat(row.avg_monthly_rate || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-stone-600">${parseFloat(row.total_monthly_revenue || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_-4px_rgba(255,229,217,0.5)] border border-[#FFE5D9]/30">
            <h3 className="font-quicksand font-bold text-xl text-stone-800 flex items-center gap-2 mb-4">
              <BarChart3 size={22} className="text-[#FF9B85]" /> Enrollment Trends
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#FFF8F3]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Month</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">New Enrollments</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FFE5D9]/30">
                  {enrollmentData.trends.map((row, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-3 text-sm text-stone-600">{row.month}</td>
                      <td className="px-4 py-3 text-sm text-stone-600">{row.status}</td>
                      <td className="px-4 py-3 text-sm text-stone-600">{row.new_enrollments}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_-4px_rgba(255,229,217,0.5)] border border-[#FFE5D9]/30">
            <h3 className="font-quicksand font-bold text-xl text-stone-800 flex items-center gap-2 mb-4">
              <Clock size={22} className="text-[#FF9B85]" /> Waitlist
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#FFF8F3]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Priority</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Child</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">DOB</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Waitlist Date</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Parent</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Phone</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Email</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FFE5D9]/30">
                  {enrollmentData.waitlist.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3 text-sm text-stone-600">{row.waitlist_priority || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-stone-600">{row.child_name}</td>
                      <td className="px-4 py-3 text-sm text-stone-600">{new Date(row.date_of_birth).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-sm text-stone-600">{new Date(row.waitlist_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-sm text-stone-600">{row.parent_name}</td>
                      <td className="px-4 py-3 text-sm text-stone-600">{row.phone}</td>
                      <td className="px-4 py-3 text-sm text-stone-600">{row.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {!loading && activeTab === 'staffing' && staffingData && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_-4px_rgba(255,229,217,0.5)] border border-[#FFE5D9]/30">
            <h3 className="font-quicksand font-bold text-xl text-stone-800 flex items-center gap-2 mb-4">
              <Clock size={22} className="text-[#FF9B85]" /> Hours Worked
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#FFF8F3]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Educator</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Hourly Rate</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Total Hours</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Total Cost</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Entries</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FFE5D9]/30">
                  {staffingData.hours.map((row) => (
                    <tr key={row.educator_id}>
                      <td className="px-4 py-3 text-sm text-stone-600">{row.educator_name}</td>
                      <td className="px-4 py-3 text-sm text-stone-600">${parseFloat(row.hourly_rate || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-stone-600">{parseFloat(row.total_hours || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-stone-600">${parseFloat(row.total_cost || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-stone-600">{row.entry_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_-4px_rgba(255,229,217,0.5)] border border-[#FFE5D9]/30">
            <h3 className="font-quicksand font-bold text-xl text-stone-800 flex items-center gap-2 mb-4">
              <FileText size={22} className="text-[#FF9B85]" /> Payroll Summary
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#FFF8F3]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Pay Period</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Educators</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Total Hours</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Total Gross Pay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FFE5D9]/30">
                  {staffingData.payroll.map((row) => (
                    <tr key={row.pay_period_id}>
                      <td className="px-4 py-3 text-sm text-stone-600">
                        {new Date(row.start_date).toLocaleDateString()} - {new Date(row.end_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-stone-600">{row.period_status}</td>
                      <td className="px-4 py-3 text-sm text-stone-600">{row.educator_count || 0}</td>
                      <td className="px-4 py-3 text-sm text-stone-600">{parseFloat(row.total_hours || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-stone-600">${parseFloat(row.total_gross_pay || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_-4px_rgba(255,229,217,0.5)] border border-[#FFE5D9]/30">
            <h3 className="font-quicksand font-bold text-xl text-stone-800 flex items-center gap-2 mb-4">
              <BarChart3 size={22} className="text-[#FF9B85]" /> Schedule Coverage
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#FFF8F3]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Scheduled</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Total Hours</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Confirmed</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Pending</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FFE5D9]/30">
                  {staffingData.coverage.map((row, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-3 text-sm text-stone-600">{new Date(row.schedule_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-sm text-stone-600">{row.scheduled_educators}</td>
                      <td className="px-4 py-3 text-sm text-stone-600">{parseFloat(row.total_scheduled_hours || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-stone-600">{row.confirmed_count}</td>
                      <td className="px-4 py-3 text-sm text-stone-600">{row.pending_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {!loading && activeTab === 'attendance' && (
        <div className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_-4px_rgba(255,229,217,0.5)] border border-[#FFE5D9]/30">
          <h3 className="font-quicksand font-bold text-xl text-stone-800 flex items-center gap-2 mb-4">
            <Clock size={22} className="text-[#FF9B85]" /> Attendance Report
          </h3>

          {attendanceMode === 'summary' ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#FFF8F3]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Child</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Total Days</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Present</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Absent</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Sick</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Vacation</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FFE5D9]/30">
                  {attendanceSummary.map((row) => (
                    <tr key={row.child_id}>
                      <td className="px-4 py-3 text-sm text-stone-600">{row.child_name}</td>
                      <td className="px-4 py-3 text-sm text-stone-600">{row.total_days}</td>
                      <td className="px-4 py-3 text-sm text-stone-600">{row.present_days}</td>
                      <td className="px-4 py-3 text-sm text-stone-600">{row.absent_days}</td>
                      <td className="px-4 py-3 text-sm text-stone-600">{row.sick_days}</td>
                      <td className="px-4 py-3 text-sm text-stone-600">{row.vacation_days}</td>
                      <td className="px-4 py-3 text-sm text-stone-600">{row.attendance_rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#FFF8F3]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Child</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Check In</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Check Out</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Dropped Off By</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Picked Up By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FFE5D9]/30">
                  {attendanceDetailed.map((row, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-3 text-sm text-stone-600">{new Date(row.attendance_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-sm text-stone-600">{row.child_name}</td>
                      <td className="px-4 py-3 text-sm text-stone-600">{row.status || '-'}</td>
                      <td className="px-4 py-3 text-sm text-stone-600">{row.check_in_time || '-'}</td>
                      <td className="px-4 py-3 text-sm text-stone-600">{row.check_out_time || '-'}</td>
                      <td className="px-4 py-3 text-sm text-stone-600">{row.parent_dropped_off || '-'}</td>
                      <td className="px-4 py-3 text-sm text-stone-600">{row.parent_picked_up || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}
