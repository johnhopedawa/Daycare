import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import { formatTime12Hour } from '../utils/timeFormat';

const parseISODate = (value) => {
  if (!value) return new Date();
  const parts = value.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return new Date();
  return new Date(parts[0], parts[1] - 1, parts[2]);
};

const toISODate = (dateObj) => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getCalendarGrid = (monthDate) => {
  const firstOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  const startOffset = firstOfMonth.getDay();

  const grid = [];
  for (let i = 0; i < startOffset; i++) {
    grid.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    grid.push(new Date(monthDate.getFullYear(), monthDate.getMonth(), day));
  }
  while (grid.length % 7 !== 0) {
    grid.push(null);
  }
  return grid;
};

const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function AdminReports() {
  const [activeTab, setActiveTab] = useState('financial');
  const [financialData, setFinancialData] = useState(null);
  const [enrollmentData, setEnrollmentData] = useState(null);
  const [staffingData, setStaffingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    start_date: new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
  });

  // Attendance reports state
  const [attendanceStartDate, setAttendanceStartDate] = useState(() => {
    const now = new Date();
    return toISODate(new Date(now.getFullYear(), now.getMonth(), 1));
  });
  const [attendanceEndDate, setAttendanceEndDate] = useState(() => toISODate(new Date()));
  const [attendanceMode, setAttendanceMode] = useState('summary');
  const [summaryData, setSummaryData] = useState([]);
  const [detailedData, setDetailedData] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState(null);
  const [attendanceQuickRange, setAttendanceQuickRange] = useState('this_month');
  const [dateModalOpen, setDateModalOpen] = useState(false);
  const [dateModalTarget, setDateModalTarget] = useState('start');
  const [dateModalValue, setDateModalValue] = useState(attendanceStartDate);
  const [dateModalMonth, setDateModalMonth] = useState(() => parseISODate(attendanceStartDate));
  const attendancePrintableRef = useRef(null);

  const formatDisplayDate = (isoDate) => {
    if (!isoDate) return '--';
    const dateObj = parseISODate(isoDate);
    return dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const DateRangeCard = ({ label, value, onOpen }) => {
    const handleKeyDown = (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onOpen();
      }
    };

    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={handleKeyDown}
        style={{
          border: '1px solid #d9dee8',
          borderRadius: '10px',
          padding: '0.85rem 1rem',
          background: '#fff',
          minHeight: '74px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          boxShadow: '0 1px 3px rgba(15,23,42,0.08)',
          transition: 'border 0.2s ease, box-shadow 0.2s ease',
          cursor: 'pointer'
        }}
      >
        <span
          style={{
            fontSize: '0.7rem',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#7b8190',
            marginBottom: '0.25rem'
          }}
        >
          {label}
        </span>
        <span style={{ fontSize: '1rem', fontWeight: 600, color: '#253047' }}>
          {formatDisplayDate(value)}
        </span>
      </div>
    );
  };

  const ReportCardHeader = ({ title, subtitle, actions }) => (
    <div className="report-card-header">
      <div>
        <h2 className="report-card-title">{title}</h2>
        {subtitle && <p className="report-card-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="report-card-actions">{actions}</div>}
    </div>
  );

  useEffect(() => {
    loadReportData();
  }, [activeTab, dateRange]);

  const loadReportData = async () => {
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
          revenue: revenue.data.revenue,
          outstanding: outstanding.data.outstanding,
          aging: aging.data.aging,
          payments: payments.data.payments,
        });
      } else if (activeTab === 'enrollment') {
        const [summary, trends, waitlist] = await Promise.all([
          api.get('/reports/enrollment/summary'),
          api.get('/reports/enrollment/trends'),
          api.get('/reports/enrollment/waitlist'),
        ]);
        setEnrollmentData({
          summary: summary.data.summary,
          trends: trends.data.trends,
          waitlist: waitlist.data.waitlist,
        });
      } else if (activeTab === 'staffing') {
        const [hours, payroll, coverage] = await Promise.all([
          api.get('/reports/staffing/hours', { params: dateRange }),
          api.get('/reports/staffing/payroll'),
          api.get('/reports/staffing/coverage', { params: dateRange }),
        ]);
        setStaffingData({
          hours: hours.data.hours,
          payroll: payroll.data.payroll,
          coverage: coverage.data.coverage,
        });
      }
    } catch (error) {
      console.error('Load report error:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) return;

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).map(v => `"${v}"`).join(',')).join('\n');
    const csv = `${headers}\n${rows}`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Attendance report quick range setters
  const chipStyle = (isActive) => ({
    padding: '0.45rem 1rem',
    borderRadius: '999px',
    border: isActive ? '1px solid #2d6cdf' : '1px solid #d4d8e4',
    backgroundColor: isActive ? '#edf2ff' : '#f6f7fb',
    color: isActive ? '#1f3a8a' : '#4b5563',
    fontSize: '0.85rem',
    fontWeight: 600,
    boxShadow: isActive ? '0 1px 4px rgba(45,108,223,0.25)' : 'none',
    transition: 'all 0.15s ease',
    cursor: 'pointer'
  });

  const calendarDays = getCalendarGrid(dateModalMonth);
  const modalMonthLabel = dateModalMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });
  const todayIso = toISODate(new Date());

  const openDateModal = (target) => {
    const baseValue = target === 'start' ? attendanceStartDate : attendanceEndDate;
    const parsed = parseISODate(baseValue);
    setDateModalTarget(target);
    setDateModalValue(baseValue);
    setDateModalMonth(parsed);
    setDateModalOpen(true);
  };

  const handleDateModalSave = () => {
    if (!dateModalValue) return;
    if (dateModalTarget === 'start') {
      setAttendanceStartDate(dateModalValue);
    } else {
      setAttendanceEndDate(dateModalValue);
    }
    setAttendanceQuickRange('custom');
    setAttendanceError(null);
    setDateModalOpen(false);
  };

  const handleDateModalCancel = () => {
    setDateModalOpen(false);
  };

  const goToPreviousModalMonth = () => {
    setDateModalMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextModalMonth = () => {
    setDateModalMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const setAttendanceThisMonth = () => {
    const now = new Date();
    setAttendanceStartDate(toISODate(new Date(now.getFullYear(), now.getMonth(), 1)));
    setAttendanceEndDate(toISODate(new Date()));
    setAttendanceQuickRange('this_month');
    setAttendanceError(null);
  };

  const setAttendanceLastMonth = () => {
    const now = new Date();
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    setAttendanceStartDate(toISODate(firstDayLastMonth));
    setAttendanceEndDate(toISODate(lastDayLastMonth));
    setAttendanceQuickRange('last_month');
    setAttendanceError(null);
  };

  const setAttendanceThisYear = () => {
    const now = new Date();
    setAttendanceStartDate(toISODate(new Date(now.getFullYear(), 0, 1)));
    setAttendanceEndDate(toISODate(new Date()));
    setAttendanceQuickRange('this_year');
    setAttendanceError(null);
  };

  // Generate attendance report
  const handleGenerateReport = async () => {
    if (!attendanceStartDate || !attendanceEndDate) {
      setAttendanceError('Please select both start and end dates.');
      return;
    }

    if (parseISODate(attendanceStartDate) > parseISODate(attendanceEndDate)) {
      setAttendanceError('Start date must be before or equal to end date.');
      return;
    }

    setAttendanceLoading(true);
    setAttendanceError(null);

    try {
      if (attendanceMode === 'summary') {
        const response = await api.get('/attendance/report', {
          params: {
            start_date: attendanceStartDate,
            end_date: attendanceEndDate
          }
        });
        setSummaryData(response.data.report);
        setDetailedData([]);
      } else {
        const response = await api.get('/attendance', {
          params: {
            start_date: attendanceStartDate,
            end_date: attendanceEndDate
          }
        });
        setDetailedData(response.data.attendance);
        setSummaryData([]);
      }
    } catch (error) {
      console.error('Generate attendance report error:', error);
      setAttendanceError('Failed to load attendance report. Please try again.');
    } finally {
      setAttendanceLoading(false);
    }
  };

  const handleOpenPrintView = () => {
    if (!attendancePrintableRef.current) {
      alert('Nothing to print yet. Generate a report first.');
      return;
    }

    const printableContent = attendancePrintableRef.current.innerHTML;
    const printWindow = window.open('', '_blank');

    if (!printWindow) {
      alert('Please allow pop-ups to view the printable report.');
      return;
    }

    const styles = `
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
        margin: 2rem;
        color: #111827;
      }
      h1 {
        margin: 0 0 0.25rem 0;
        font-size: 1.5rem;
      }
      p {
        margin: 0 0 1rem 0;
        color: #4b5563;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 1rem;
      }
      table th,
      table td {
        border: 1px solid #d1d5db;
        padding: 0.6rem 0.75rem;
        text-align: left;
        font-size: 0.9rem;
      }
      table th {
        background: #f3f4f6;
      }
      .attendance-print-summary {
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 0.75rem 1rem;
        margin-bottom: 1rem;
        background: #f9fafb;
      }
      .attendance-print-summary strong {
        font-size: 0.85rem;
        color: #4b5563;
      }
      .attendance-print-summary div {
        margin-bottom: 0.25rem;
      }
      .badge {
        display: inline-block;
        padding: 0.2rem 0.6rem;
        border-radius: 12px;
        font-size: 0.8rem;
      }
      .badge-approved { background: #d4edda; color: #155724; }
      .badge-sent { background: #d1ecf1; color: #0c5460; }
      .badge-overdue { background: #f8d7da; color: #721c24; }
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Attendance Report</title>
          <meta charset="utf-8" />
          <style>${styles}</style>
        </head>
        <body>
          <h1>Attendance Report</h1>
          <p>${formatDisplayDate(attendanceStartDate)} – ${formatDisplayDate(attendanceEndDate)} (${attendanceMode === 'summary' ? 'Summary by Child' : 'Detailed Log'})</p>
          ${printableContent}
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="main-content">
      <h1>Reports & Analytics</h1>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <button
          onClick={() => setActiveTab('financial')}
          className={activeTab === 'financial' ? 'btn' : 'btn-secondary'}
        >
          Financial
        </button>
        <button
          onClick={() => setActiveTab('enrollment')}
          className={activeTab === 'enrollment' ? 'btn' : 'btn-secondary'}
        >
          Enrollment
        </button>
        <button
          onClick={() => setActiveTab('staffing')}
          className={activeTab === 'staffing' ? 'btn' : 'btn-secondary'}
        >
          Staffing
        </button>
        <button
          onClick={() => setActiveTab('attendance')}
          className={activeTab === 'attendance' ? 'btn' : 'btn-secondary'}
        >
          Attendance
        </button>
      </div>

      {activeTab !== 'attendance' && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3>Date Range</h3>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div>
              <label>Start Date:</label>
              <input
                type="date"
                value={dateRange.start_date}
                onChange={(e) => setDateRange({ ...dateRange, start_date: e.target.value })}
              />
            </div>
            <div>
              <label>End Date:</label>
              <input
                type="date"
                value={dateRange.end_date}
                onChange={(e) => setDateRange({ ...dateRange, end_date: e.target.value })}
              />
            </div>
          </div>
        </div>
      )}

      {loading && <div>Loading...</div>}

      {!loading && activeTab === 'financial' && financialData && (
        <>
          <div className="card">
            <ReportCardHeader
              title="Revenue by Month"
              subtitle="Payments collected across the selected range"
              actions={
                <button onClick={() => exportToCSV(financialData.revenue, 'revenue')} className="btn-sm secondary">
                  Export CSV
                </button>
              }
            />
            <table>
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Payment Count</th>
                  <th>Total Revenue</th>
                  <th>Avg Payment</th>
                </tr>
              </thead>
              <tbody>
                {financialData.revenue.map((row, idx) => (
                  <tr key={idx}>
                    <td>{row.period}</td>
                    <td>{row.payment_count}</td>
                    <td>${parseFloat(row.total_revenue || 0).toFixed(2)}</td>
                    <td>${parseFloat(row.avg_payment || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card">
            <ReportCardHeader
              title="Outstanding Balances"
              subtitle="Current parent receivables and oldest due dates"
              actions={
                <button onClick={() => exportToCSV(financialData.outstanding, 'outstanding')} className="btn-sm secondary">
                  Export CSV
                </button>
              }
            />
            <table>
              <thead>
                <tr>
                  <th>Parent Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Invoices</th>
                  <th>Total Outstanding</th>
                  <th>Oldest Due Date</th>
                </tr>
              </thead>
              <tbody>
                {financialData.outstanding.map((row) => (
                  <tr key={row.id}>
                    <td>{row.parent_name}</td>
                    <td>{row.email}</td>
                    <td>{row.phone}</td>
                    <td>{row.invoice_count}</td>
                    <td>${parseFloat(row.total_outstanding).toFixed(2)}</td>
                    <td>{new Date(row.oldest_due_date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card">
            <ReportCardHeader
              title="Invoice Aging"
              subtitle="Overdue invoices grouped by aging bucket"
              actions={
                <button onClick={() => exportToCSV(financialData.aging, 'aging')} className="btn-sm secondary">
                  Export CSV
                </button>
              }
            />
            <table>
              <thead>
                <tr>
                  <th>Parent Name</th>
                  <th>Invoice #</th>
                  <th>Invoice Date</th>
                  <th>Due Date</th>
                  <th>Balance</th>
                  <th>Days Overdue</th>
                  <th>Aging Bucket</th>
                </tr>
              </thead>
              <tbody>
                {financialData.aging.map((row, idx) => (
                  <tr key={idx}>
                    <td>{row.parent_name}</td>
                    <td>{row.invoice_number}</td>
                    <td>{new Date(row.invoice_date).toLocaleDateString()}</td>
                    <td>{new Date(row.due_date).toLocaleDateString()}</td>
                    <td>${parseFloat(row.balance_due).toFixed(2)}</td>
                    <td>{row.days_overdue}</td>
                    <td><span className={`badge badge-${row.days_overdue > 30 ? 'overdue' : 'sent'}`}>{row.aging_bucket}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!loading && activeTab === 'enrollment' && enrollmentData && (
        <>
          <div className="card">
            <ReportCardHeader
              title="Enrollment Summary"
              subtitle="Active, pending, and withdrawn enrollment counts"
              actions={
                <button onClick={() => exportToCSV(enrollmentData.summary, 'enrollment-summary')} className="btn-sm secondary">
                  Export CSV
                </button>
              }
            />
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Count</th>
                  <th>Avg Monthly Rate</th>
                  <th>Total Monthly Revenue</th>
                </tr>
              </thead>
              <tbody>
                {enrollmentData.summary.map((row, idx) => (
                  <tr key={idx}>
                    <td><span className={`badge badge-${row.status.toLowerCase()}`}>{row.status}</span></td>
                    <td>{row.count}</td>
                    <td>${parseFloat(row.avg_monthly_rate || 0).toFixed(2)}</td>
                    <td>${parseFloat(row.total_monthly_revenue || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card">
            <ReportCardHeader
              title="Waitlist"
              subtitle="Families waiting for placement"
              actions={
                <button onClick={() => exportToCSV(enrollmentData.waitlist, 'waitlist')} className="btn-sm secondary">
                  Export CSV
                </button>
              }
            />
            <table>
              <thead>
                <tr>
                  <th>Priority</th>
                  <th>Child Name</th>
                  <th>Date of Birth</th>
                  <th>Waitlist Date</th>
                  <th>Parent Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {enrollmentData.waitlist.map((row) => (
                  <tr key={row.id}>
                    <td>{row.waitlist_priority || 'N/A'}</td>
                    <td>{row.child_name}</td>
                    <td>{new Date(row.date_of_birth).toLocaleDateString()}</td>
                    <td>{new Date(row.waitlist_date).toLocaleDateString()}</td>
                    <td>{row.parent_name}</td>
                    <td>{row.phone}</td>
                    <td>{row.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!loading && activeTab === 'staffing' && staffingData && (
        <>
          <div className="card">
            <ReportCardHeader
              title="Hours Worked by Educator"
              subtitle="Approved log entries within the selected period"
              actions={
                <button onClick={() => exportToCSV(staffingData.hours, 'staffing-hours')} className="btn-sm secondary">
                  Export CSV
                </button>
              }
            />
            <table>
              <thead>
                <tr>
                  <th>Educator Name</th>
                  <th>Hourly Rate</th>
                  <th>Total Hours</th>
                  <th>Total Cost</th>
                  <th>Avg Hours/Day</th>
                  <th>Entry Count</th>
                </tr>
              </thead>
              <tbody>
                {staffingData.hours.map((row) => (
                  <tr key={row.educator_id}>
                    <td>{row.educator_name}</td>
                    <td>${parseFloat(row.hourly_rate || 0).toFixed(2)}</td>
                    <td>{parseFloat(row.total_hours || 0).toFixed(2)}</td>
                    <td>${parseFloat(row.total_cost || 0).toFixed(2)}</td>
                    <td>{parseFloat(row.avg_hours_per_day || 0).toFixed(2)}</td>
                    <td>{row.entry_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card">
            <ReportCardHeader
              title="Payroll Summary"
              subtitle="Gross pay and hours per pay period"
              actions={
                <button onClick={() => exportToCSV(staffingData.payroll, 'payroll')} className="btn-sm secondary">
                  Export CSV
                </button>
              }
            />
            <table>
              <thead>
                <tr>
                  <th>Pay Period</th>
                  <th>Status</th>
                  <th>Educators</th>
                  <th>Total Hours</th>
                  <th>Total Gross Pay</th>
                </tr>
              </thead>
              <tbody>
                {staffingData.payroll.map((row) => (
                  <tr key={row.pay_period_id}>
                    <td>{new Date(row.start_date).toLocaleDateString()} - {new Date(row.end_date).toLocaleDateString()}</td>
                    <td><span className={`badge badge-${row.period_status.toLowerCase()}`}>{row.period_status}</span></td>
                    <td>{row.educator_count || 0}</td>
                    <td>{parseFloat(row.total_hours || 0).toFixed(2)}</td>
                    <td>${parseFloat(row.total_gross_pay || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card">
            <ReportCardHeader
              title="Schedule Coverage"
              subtitle="Confirmed vs pending educator shifts"
              actions={
                <button onClick={() => exportToCSV(staffingData.coverage, 'coverage')} className="btn-sm secondary">
                  Export CSV
                </button>
              }
            />
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Scheduled Educators</th>
                  <th>Total Hours</th>
                  <th>Confirmed</th>
                  <th>Pending</th>
                </tr>
              </thead>
              <tbody>
                {staffingData.coverage.map((row, idx) => (
                  <tr key={idx}>
                    <td>{new Date(row.schedule_date).toLocaleDateString()}</td>
                    <td>{row.scheduled_educators}</td>
                    <td>{parseFloat(row.total_scheduled_hours || 0).toFixed(2)}</td>
                    <td>{row.confirmed_count}</td>
                    <td>{row.pending_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'attendance' && (
        <>
          <div className="card">
            <h2>Attendance Reports</h2>

            {attendanceError && (
              <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb', borderRadius: '4px' }}>
                {attendanceError}
              </div>
            )}

            <div className="attendance-controls" style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <DateRangeCard
                  label="Start Date"
                  value={attendanceStartDate}
                  onOpen={() => openDateModal('start')}
                />
                <DateRangeCard
                  label="End Date"
                  value={attendanceEndDate}
                  onOpen={() => openDateModal('end')}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', rowGap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: '#4b5563', fontSize: '0.88rem' }}>Range:</span>
                <button onClick={setAttendanceThisMonth} style={chipStyle(attendanceQuickRange === 'this_month')}>
                  This Month
                </button>
                <button onClick={setAttendanceLastMonth} style={chipStyle(attendanceQuickRange === 'last_month')}>
                  Last Month
                </button>
                <button onClick={setAttendanceThisYear} style={chipStyle(attendanceQuickRange === 'this_year')}>
                  This Year
                </button>
                <button
                  onClick={() => {
                    setAttendanceQuickRange('custom');
                    setAttendanceError(null);
                  }}
                  style={chipStyle(attendanceQuickRange === 'custom')}
                >
                  Custom
                </button>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', rowGap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: '#4b5563', fontSize: '0.88rem' }}>Report Type:</span>
                <button
                  onClick={() => setAttendanceMode('summary')}
                  style={chipStyle(attendanceMode === 'summary')}
                >
                  Summary by Child
                </button>
                <button
                  onClick={() => setAttendanceMode('detailed')}
                  style={chipStyle(attendanceMode === 'detailed')}
                >
                  Detailed Log
                </button>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={handleGenerateReport}
                  disabled={attendanceLoading}
                >
                  {attendanceLoading ? 'Loading...' : 'Generate Report'}
                </button>
                {(summaryData.length > 0 || detailedData.length > 0) && (
                  <button
                    onClick={handleOpenPrintView}
                    className="btn-sm secondary"
                    disabled={attendanceLoading}
                  >
                    Open Print View
                  </button>
                )}
              </div>

              {dateModalOpen && (
                <div
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1100
                  }}
                >
                  <div
                    className="card"
                    style={{
                      width: 'min(520px, 95vw)',
                      padding: '1.5rem',
                      borderRadius: '12px'
                    }}
                  >
                    <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>
                      Select {dateModalTarget === 'start' ? 'Start' : 'End'} Date
                    </h3>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '1rem'
                      }}
                    >
                      <button
                        type="button"
                        onClick={goToPreviousModalMonth}
                        className="btn-sm secondary"
                        style={{ padding: '0.45rem 0.9rem', fontSize: '0.9rem' }}
                      >
                        ‹
                      </button>
                      <span style={{ fontWeight: 600, fontSize: '1rem', color: '#1f2937' }}>{modalMonthLabel}</span>
                      <button
                        type="button"
                        onClick={goToNextModalMonth}
                        className="btn-sm secondary"
                        style={{ padding: '0.45rem 0.9rem', fontSize: '0.9rem' }}
                      >
                        ›
                      </button>
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                        gap: '0.4rem',
                        textAlign: 'center',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        color: '#6b7280',
                        marginBottom: '0.5rem'
                      }}
                    >
                      {weekdayLabels.map((day) => (
                        <div key={day}>{day}</div>
                      ))}
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                        gap: '0.4rem'
                      }}
                    >
                      {calendarDays.map((day, idx) => {
                        if (!day) {
                          return <div key={`empty-${idx}`} />;
                        }
                        const dayIso = toISODate(day);
                        const isSelected = dayIso === dateModalValue;
                        const isToday = dayIso === todayIso;
                        return (
                          <button
                            type="button"
                            key={dayIso}
                            onClick={() => setDateModalValue(dayIso)}
                            style={{
                              borderRadius: '10px',
                              border: isSelected ? '2px solid #2d6cdf' : '1px solid #e5e7eb',
                              background: isSelected ? '#edf2ff' : '#fff',
                              color: '#1f2937',
                              fontWeight: isToday ? 700 : 500,
                              boxShadow: isSelected ? '0 1px 6px rgba(45,108,223,0.25)' : 'none',
                              cursor: 'pointer',
                              fontSize: '1rem',
                              padding: '0.5rem 0',
                              minHeight: '2.6rem',
                              width: '100%'
                            }}
                          >
                            {day.getDate()}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex" style={{ gap: '0.75rem', marginTop: '1.25rem', justifyContent: 'flex-end' }}>
                      <button className="secondary" onClick={handleDateModalCancel}>
                        Cancel
                      </button>
                      <button onClick={handleDateModalSave}>
                        Apply Date
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div ref={attendancePrintableRef}>
              <div className="attendance-print-summary" style={{ marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '0.75rem 1rem', background: '#f9fafb' }}>
                <div style={{ minWidth: '200px' }}>
                  <strong>Report Range:</strong>
                  <div>{formatDisplayDate(attendanceStartDate)} – {formatDisplayDate(attendanceEndDate)}</div>
                </div>
                <div style={{ minWidth: '160px' }}>
                  <strong>Report Type:</strong>
                  <div>{attendanceMode === 'summary' ? 'Summary by Child' : 'Detailed Log'}</div>
                </div>
                <div style={{ minWidth: '200px' }}>
                  <strong>Generated:</strong>
                  <div>{new Date().toLocaleString()}</div>
                </div>
              </div>

              {attendanceLoading && (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                  Loading report...
                </div>
              )}

              {!attendanceLoading && attendanceMode === 'summary' && summaryData.length === 0 && !attendanceError && (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                  No attendance data for this period. Click "Generate Report" to view data.
                </div>
              )}

              {!attendanceLoading && attendanceMode === 'summary' && summaryData.length > 0 && (
                <div className="attendance-report-section">
                  <table>
                    <thead>
                      <tr>
                        <th>Child</th>
                        <th>Total Days</th>
                        <th>Present Days</th>
                        <th>Absent Days</th>
                        <th>Sick Days</th>
                        <th>Vacation Days</th>
                        <th>Attendance Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryData.map((row) => (
                        <tr key={row.child_id}>
                          <td>{row.child_name}</td>
                          <td>{row.total_days}</td>
                          <td>{row.present_days}</td>
                          <td>{row.absent_days}</td>
                          <td>{row.sick_days}</td>
                          <td>{row.vacation_days}</td>
                          <td>{row.attendance_rate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {!attendanceLoading && attendanceMode === 'detailed' && detailedData.length === 0 && !attendanceError && (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                  No attendance data for this period. Click "Generate Report" to view data.
                </div>
              )}

              {!attendanceLoading && attendanceMode === 'detailed' && detailedData.length > 0 && (
                <div className="attendance-report-section">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Child</th>
                        <th>Status</th>
                        <th>Check-In</th>
                        <th>Check-Out</th>
                        <th>Dropped Off By</th>
                        <th>Picked Up By</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailedData.map((row, idx) => (
                        <tr key={idx}>
                          <td>{new Date(row.attendance_date).toLocaleDateString()}</td>
                          <td>{row.child_name}</td>
                          <td>
                            {row.status === 'PRESENT' && <span className="badge badge-approved">Present</span>}
                            {row.status === 'ABSENT' && <span className="badge" style={{ backgroundColor: '#dc3545', color: 'white' }}>Absent</span>}
                            {row.status === 'SICK' && <span className="badge" style={{ backgroundColor: '#ff9800', color: 'white' }}>Sick</span>}
                            {row.status === 'VACATION' && <span className="badge" style={{ backgroundColor: '#9c27b0', color: 'white' }}>Vacation</span>}
                            {!row.status && <span className="badge" style={{ backgroundColor: '#999', color: 'white' }}>-</span>}
                          </td>
                          <td>{formatTime12Hour(row.check_in_time)}</td>
                          <td>{formatTime12Hour(row.check_out_time)}</td>
                          <td>{row.parent_dropped_off || '-'}</td>
                          <td>{row.parent_picked_up || '-'}</td>
                          <td>{row.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default AdminReports;
