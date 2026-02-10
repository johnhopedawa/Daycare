import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Bookmark,
  CheckCircle2,
  Clock,
  DollarSign,
  Download,
  FileText,
  Filter,
  Layers,
  Printer,
  Save,
  Users,
  X,
} from 'lucide-react';
import { Layout } from '../components/Layout';
import api from '../utils/api';

const PRESET_STORAGE_KEY = 'daycare.reportPresets';

const toInputDate = (value) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .split('T')[0];
};

const formatDate = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString();
};

const formatCurrency = (value) => `$${parseFloat(value || 0).toFixed(2)}`;

const buildDateRange = (daysBack) => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - daysBack);
  return { start_date: toInputDate(start), end_date: toInputDate(end) };
};

const buildMonthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return { start_date: toInputDate(start), end_date: toInputDate(now) };
};

const quickRanges = [
  { label: 'Last 30 days', getRange: () => buildDateRange(30) },
  { label: 'Last 90 days', getRange: () => buildDateRange(90) },
  {
    label: 'YTD',
    getRange: () => ({
      start_date: toInputDate(new Date(new Date().getFullYear(), 0, 1)),
      end_date: toInputDate(new Date()),
    }),
  },
  { label: 'Last 12 months', getRange: () => buildDateRange(365) },
];
const escapeCsvValue = (value) => {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

const downloadCsv = (filename, columns, rows) => {
  if (!rows || rows.length === 0) {
    return false;
  }
  const header = columns.map((col) => escapeCsvValue(col.label)).join(',');
  const lines = rows.map((row) =>
    columns
      .map((col) => {
        const rawValue = col.value ? col.value(row) : row[col.key];
        return escapeCsvValue(rawValue);
      })
      .join(',')
  );
  const csv = [header, ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
  return true;
};

const SectionCard = ({
  title,
  description,
  icon: Icon,
  actionLabel,
  onAction,
  actionDisabled,
  meta,
  children,
}) => (
  <div className="themed-surface p-6 rounded-3xl">
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div>
        <h3 className="font-quicksand font-bold text-xl text-stone-800 flex items-center gap-2">
          <Icon size={22} style={{ color: 'var(--primary)' }} /> {title}
        </h3>
        {description ? (
          <p className="text-sm text-stone-500 mt-1">{description}</p>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        {meta ? <span className="text-xs text-stone-500">{meta}</span> : null}
        {actionLabel ? (
          <button
            type="button"
            onClick={onAction}
            disabled={actionDisabled}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
              actionDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'
            }`}
            style={{
              backgroundColor: 'var(--surface)',
              borderColor: 'var(--border)',
              color: 'var(--primary-dark)',
            }}
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
    {children}
  </div>
);

export function ReportingPage() {
  const initialDateRange = useMemo(() => buildDateRange(90), []);
  const [activeCategory, setActiveCategory] = useState('financial');
  const [filters, setFilters] = useState({
    financial: {
      dateRange: initialDateRange,
      groupBy: 'month',
      sections: {
        revenue: true,
        outstanding: true,
        aging: true,
        payments: false,
      },
    },
    enrollment: {
      sections: {
        summary: true,
        trends: true,
        waitlist: true,
      },
    },
    staffing: {
      dateRange: initialDateRange,
      sections: {
        hours: true,
        payroll: true,
        coverage: true,
      },
    },
    attendance: {
      dateRange: buildMonthRange(),
      mode: 'summary',
    },
  });

  const [data, setData] = useState({
    financial: {
      revenue: [],
      outstanding: [],
      aging: [],
      payments: [],
    },
    enrollment: {
      summary: [],
      trends: [],
      waitlist: [],
    },
    staffing: {
      hours: [],
      payroll: [],
      coverage: [],
    },
    attendance: {
      summary: [],
      detailed: [],
    },
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [presetName, setPresetName] = useState('');
  const [presets, setPresets] = useState([]);
  const [presetFeedback, setPresetFeedback] = useState('');

  const activeFilters = filters[activeCategory];

  const selectedSections = useMemo(() => {
    const categoryFilters = filters[activeCategory];
    if (!categoryFilters || !categoryFilters.sections) return [];
    return Object.entries(categoryFilters.sections)
      .filter(([, enabled]) => enabled)
      .map(([key]) => key);
  }, [activeCategory, filters]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(PRESET_STORAGE_KEY) || '[]');
      if (Array.isArray(stored)) {
        setPresets(stored);
      }
    } catch (err) {
      // ignore preset load errors
    }
  }, []);

  const persistPresets = (nextPresets) => {
    setPresets(nextPresets);
    try {
      localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(nextPresets));
    } catch (err) {
      // ignore storage errors
    }
  };

  const handleSavePreset = () => {
    const name = presetName.trim();
    if (!name) {
      setPresetFeedback('Name this view to save it.');
      return;
    }
    const payload = {
      id: Date.now(),
      name,
      category: activeCategory,
      filters: filters[activeCategory],
      createdAt: new Date().toISOString(),
    };
    const nextPresets = [
      payload,
      ...presets.filter((item) => item.name.toLowerCase() !== name.toLowerCase()),
    ];
    persistPresets(nextPresets);
    setPresetName('');
    setPresetFeedback(`Saved "${name}"`);
  };

  const handleApplyPreset = (preset) => {
    if (!preset) return;
    setActiveCategory(preset.category);
    setFilters((prev) => ({
      ...prev,
      [preset.category]: preset.filters,
    }));
    setPresetFeedback(`Loaded "${preset.name}"`);
  };

  const handleDeletePreset = (presetId) => {
    const nextPresets = presets.filter((item) => item.id !== presetId);
    persistPresets(nextPresets);
  };
  const handleRunReport = useCallback(async () => {
    setError('');
    setLoading(true);

    try {
      if (activeCategory === 'financial') {
        const { dateRange, groupBy, sections } = filters.financial;
        const nextData = { revenue: [], outstanding: [], aging: [], payments: [] };

        if (sections.revenue) {
          const revenue = await api.get('/reports/financial/revenue', {
            params: { ...dateRange, group_by: groupBy },
          });
          nextData.revenue = revenue.data.revenue || [];
        }
        if (sections.outstanding) {
          const outstanding = await api.get('/reports/financial/outstanding');
          nextData.outstanding = outstanding.data.outstanding || [];
        }
        if (sections.aging) {
          const aging = await api.get('/reports/financial/aging');
          nextData.aging = aging.data.aging || [];
        }
        if (sections.payments) {
          const payments = await api.get('/reports/financial/payment-history', {
            params: dateRange,
          });
          nextData.payments = payments.data.payments || [];
        }

        setData((prev) => ({ ...prev, financial: nextData }));
      }

      if (activeCategory === 'enrollment') {
        const { sections } = filters.enrollment;
        const nextData = { summary: [], trends: [], waitlist: [] };

        if (sections.summary) {
          const summary = await api.get('/reports/enrollment/summary');
          nextData.summary = summary.data.summary || [];
        }
        if (sections.trends) {
          const trends = await api.get('/reports/enrollment/trends');
          nextData.trends = trends.data.trends || [];
        }
        if (sections.waitlist) {
          const waitlist = await api.get('/reports/enrollment/waitlist');
          nextData.waitlist = waitlist.data.waitlist || [];
        }

        setData((prev) => ({ ...prev, enrollment: nextData }));
      }

      if (activeCategory === 'staffing') {
        const { dateRange, sections } = filters.staffing;
        const nextData = { hours: [], payroll: [], coverage: [] };

        if (sections.hours) {
          const hours = await api.get('/reports/staffing/hours', { params: dateRange });
          nextData.hours = hours.data.hours || [];
        }
        if (sections.payroll) {
          const payroll = await api.get('/reports/staffing/payroll');
          nextData.payroll = payroll.data.payroll || [];
        }
        if (sections.coverage) {
          const coverage = await api.get('/reports/staffing/coverage', { params: dateRange });
          nextData.coverage = coverage.data.coverage || [];
        }

        setData((prev) => ({ ...prev, staffing: nextData }));
      }

      if (activeCategory === 'attendance') {
        const { dateRange, mode } = filters.attendance;
        if (mode === 'summary') {
          const response = await api.get('/attendance/report', {
            params: {
              start_date: dateRange.start_date,
              end_date: dateRange.end_date,
            },
          });
          setData((prev) => ({
            ...prev,
            attendance: {
              summary: response.data.report || [],
              detailed: [],
            },
          }));
        } else {
          const response = await api.get('/attendance', {
            params: {
              start_date: dateRange.start_date,
              end_date: dateRange.end_date,
            },
          });
          setData((prev) => ({
            ...prev,
            attendance: {
              summary: [],
              detailed: response.data.attendance || [],
            },
          }));
        }
      }
    } catch (err) {
      console.error('Report load error:', err);
      setError(err.response?.data?.error || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [activeCategory, filters]);

  useEffect(() => {
    handleRunReport();
  }, [activeCategory, handleRunReport]);

  const activeData = data[activeCategory];
  const handleExportAll = () => {
    const dateStamp = toInputDate(new Date());
    let exported = false;

    if (activeCategory === 'financial') {
      if (selectedSections.includes('revenue')) {
        exported =
          downloadCsv(
            `report-financial-revenue-${dateStamp}.csv`,
            [
              { label: 'Period', key: 'period' },
              { label: 'Payments', key: 'payment_count' },
              { label: 'Total Revenue', key: 'total_revenue' },
              { label: 'Average Payment', key: 'avg_payment' },
            ],
            activeData.revenue
          ) || exported;
      }
      if (selectedSections.includes('outstanding')) {
        exported =
          downloadCsv(
            `report-financial-outstanding-${dateStamp}.csv`,
            [
              { label: 'Parent', key: 'parent_name' },
              { label: 'Email', key: 'email' },
              { label: 'Phone', key: 'phone' },
              { label: 'Invoices', key: 'invoice_count' },
              { label: 'Total Outstanding', key: 'total_outstanding' },
            ],
            activeData.outstanding
          ) || exported;
      }
      if (selectedSections.includes('aging')) {
        exported =
          downloadCsv(
            `report-financial-aging-${dateStamp}.csv`,
            [
              { label: 'Parent', key: 'parent_name' },
              { label: 'Invoice', key: 'invoice_number' },
              { label: 'Invoice Date', key: 'invoice_date' },
              { label: 'Due Date', key: 'due_date' },
              { label: 'Balance', key: 'balance_due' },
              { label: 'Days Overdue', key: 'days_overdue' },
              { label: 'Bucket', key: 'aging_bucket' },
            ],
            activeData.aging
          ) || exported;
      }
      if (selectedSections.includes('payments')) {
        exported =
          downloadCsv(
            `report-financial-payments-${dateStamp}.csv`,
            [
              { label: 'Payment Date', key: 'payment_date' },
              { label: 'Amount', key: 'amount' },
              { label: 'Payment Method', key: 'payment_method' },
              { label: 'Parent', key: 'parent_name' },
              { label: 'Invoice', key: 'invoice_number' },
              { label: 'Recorded By', key: 'recorded_by' },
            ],
            activeData.payments
          ) || exported;
      }
    }

    if (activeCategory === 'enrollment') {
      if (selectedSections.includes('summary')) {
        exported =
          downloadCsv(
            `report-enrollment-summary-${dateStamp}.csv`,
            [
              { label: 'Status', key: 'status' },
              { label: 'Count', key: 'count' },
              { label: 'Average Monthly Rate', key: 'avg_monthly_rate' },
              { label: 'Total Monthly Revenue', key: 'total_monthly_revenue' },
            ],
            activeData.summary
          ) || exported;
      }
      if (selectedSections.includes('trends')) {
        exported =
          downloadCsv(
            `report-enrollment-trends-${dateStamp}.csv`,
            [
              { label: 'Month', key: 'month' },
              { label: 'Status', key: 'status' },
              { label: 'New Enrollments', key: 'new_enrollments' },
            ],
            activeData.trends
          ) || exported;
      }
      if (selectedSections.includes('waitlist')) {
        exported =
          downloadCsv(
            `report-enrollment-waitlist-${dateStamp}.csv`,
            [
              { label: 'Priority', key: 'waitlist_priority' },
              { label: 'Child', key: 'child_name' },
              { label: 'DOB', key: 'date_of_birth' },
              { label: 'Waitlist Date', key: 'waitlist_date' },
              { label: 'Parent', key: 'parent_name' },
              { label: 'Phone', key: 'phone' },
              { label: 'Email', key: 'email' },
            ],
            activeData.waitlist
          ) || exported;
      }
    }
    if (activeCategory === 'staffing') {
      if (selectedSections.includes('hours')) {
        exported =
          downloadCsv(
            `report-staffing-hours-${dateStamp}.csv`,
            [
              { label: 'Educator', key: 'educator_name' },
              { label: 'Hourly Rate', key: 'hourly_rate' },
              { label: 'Total Hours', key: 'total_hours' },
              { label: 'Total Cost', key: 'total_cost' },
              { label: 'Entries', key: 'entry_count' },
            ],
            activeData.hours
          ) || exported;
      }
      if (selectedSections.includes('payroll')) {
        exported =
          downloadCsv(
            `report-staffing-payroll-${dateStamp}.csv`,
            [
              { label: 'Pay Period Start', key: 'start_date' },
              { label: 'Pay Period End', key: 'end_date' },
              { label: 'Status', key: 'period_status' },
              { label: 'Educators', key: 'educator_count' },
              { label: 'Total Hours', key: 'total_hours' },
              { label: 'Total Gross Pay', key: 'total_gross_pay' },
            ],
            activeData.payroll
          ) || exported;
      }
      if (selectedSections.includes('coverage')) {
        exported =
          downloadCsv(
            `report-staffing-coverage-${dateStamp}.csv`,
            [
              { label: 'Date', key: 'shift_date' },
              { label: 'Scheduled', key: 'scheduled_educators' },
              { label: 'Total Hours', key: 'total_scheduled_hours' },
              { label: 'Confirmed', key: 'confirmed_count' },
              { label: 'Pending', key: 'pending_count' },
            ],
            activeData.coverage
          ) || exported;
      }
    }

    if (activeCategory === 'attendance') {
      if (filters.attendance.mode === 'summary') {
        exported =
          downloadCsv(
            `report-attendance-summary-${dateStamp}.csv`,
            [
              { label: 'Child', key: 'child_name' },
              { label: 'Total Days', key: 'total_days' },
              { label: 'Present', key: 'present_days' },
              { label: 'Absent', key: 'absent_days' },
              { label: 'Sick', key: 'sick_days' },
              { label: 'Vacation', key: 'vacation_days' },
              { label: 'Attendance Rate', key: 'attendance_rate' },
            ],
            activeData.summary
          ) || exported;
      } else {
        exported =
          downloadCsv(
            `report-attendance-detailed-${dateStamp}.csv`,
            [
              { label: 'Date', key: 'attendance_date' },
              { label: 'Child', key: 'child_name' },
              { label: 'Status', key: 'status' },
              { label: 'Check In', key: 'check_in_time' },
              { label: 'Check Out', key: 'check_out_time' },
              { label: 'Dropped Off By', key: 'parent_dropped_off' },
              { label: 'Picked Up By', key: 'parent_picked_up' },
            ],
            activeData.detailed
          ) || exported;
      }
    }

    if (!exported) {
      setError('No data available to export. Run a report first.');
    }
  };

  const categoryConfig = {
    financial: {
      label: 'Financial',
      description: 'Track revenue, balances, and payment history.',
      icon: DollarSign,
    },
    enrollment: {
      label: 'Enrollment',
      description: 'Monitor capacity, trends, and waitlists.',
      icon: Users,
    },
    staffing: {
      label: 'Staffing',
      description: 'Review educator hours, payroll, and coverage.',
      icon: Clock,
    },
    attendance: {
      label: 'Attendance',
      description: 'Audit daily attendance and child check-ins.',
      icon: BarChart3,
    },
  };

  return (
    <Layout title="Report Builder" subtitle="Build, preview, and export audit-ready reports">
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="space-y-6">
          <div className="themed-surface p-4 rounded-3xl">
            <div className="flex items-center gap-2 mb-4">
              <Layers size={18} style={{ color: 'var(--primary)' }} />
              <p className="text-sm font-bold text-stone-700">Report Categories</p>
            </div>
            <div className="space-y-2">
              {Object.entries(categoryConfig).map(([key, config]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveCategory(key)}
                  className={`w-full text-left px-3 py-3 rounded-2xl border transition-all ${
                    activeCategory === key ? 'shadow-md' : ''
                  }`}
                  style={
                    activeCategory === key
                      ? {
                          backgroundColor: 'var(--primary)',
                          borderColor: 'var(--primary)',
                          color: 'var(--on-primary)',
                        }
                      : {
                          backgroundColor: 'var(--surface)',
                          borderColor: 'var(--border)',
                          color: 'var(--text)',
                        }
                  }
                >
                  <div className="flex items-center gap-2">
                    <config.icon size={18} />
                    <p className="text-sm font-bold">{config.label}</p>
                  </div>
                  <p
                    className={`text-xs mt-1 ${
                      activeCategory === key ? 'text-white/80' : 'text-stone-500'
                    }`}
                  >
                    {config.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="themed-surface p-4 rounded-3xl">
            <div className="flex items-center gap-2 mb-4">
              <Bookmark size={16} style={{ color: 'var(--primary)' }} />
              <p className="text-sm font-bold text-stone-700">Saved Views</p>
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <input
                  type="text"
                  value={presetName}
                  onChange={(event) => setPresetName(event.target.value)}
                  placeholder="Name this view"
                  className="w-full px-3 py-2 rounded-2xl border text-sm"
                  style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
                />
                <button
                  type="button"
                  onClick={handleSavePreset}
                  className="w-full px-3 py-2 rounded-2xl text-sm font-bold text-white"
                  style={{ backgroundColor: 'var(--primary)' }}
                >
                  <Save size={14} className="inline-block mr-2" />
                  Save current view
                </button>
                {presetFeedback ? <p className="text-xs text-stone-500">{presetFeedback}</p> : null}
              </div>

              {presets.length === 0 ? (
                <p className="text-xs text-stone-500">No saved views yet.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto soft-scrollbar pr-1">
                  {presets.map((preset) => (
                    <div
                      key={preset.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleApplyPreset(preset)}
                      onKeyDown={(event) => {
                        if (event.currentTarget !== event.target) return;
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          handleApplyPreset(preset);
                        }
                      }}
                      className="rounded-2xl border px-3 py-2 flex items-start justify-between gap-2 cursor-pointer"
                      style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
                    >
                      <div>
                        <p className="text-sm font-semibold text-stone-700">{preset.name}</p>
                        <p className="text-[11px] text-stone-500">
                          {categoryConfig[preset.category]?.label || 'Report'} - {formatDate(preset.createdAt)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDeletePreset(preset.id);
                        }}
                        className="self-center p-1.5 rounded-lg border text-xs"
                        style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
                        title="Delete view"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </aside>

        <section className="space-y-6">
          <div className="themed-surface p-6 rounded-3xl">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-xl font-bold text-stone-800 font-quicksand">
                  {categoryConfig[activeCategory]?.label} report workspace
                </h3>
                <p className="text-sm text-stone-500">
                  Choose the sections you need, apply filters, then export for audits.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleRunReport}
                  className="px-4 py-2 rounded-xl text-sm font-bold text-white"
                  style={{ backgroundColor: 'var(--primary)' }}
                >
                  Run report
                </button>
                <button
                  type="button"
                  onClick={handleExportAll}
                  className="px-4 py-2 rounded-xl text-sm font-bold border"
                  style={{
                    backgroundColor: 'var(--surface)',
                    borderColor: 'var(--border)',
                    color: 'var(--primary-dark)',
                  }}
                >
                  <Download size={14} className="inline-block mr-2" />
                  Export CSV
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl text-sm font-bold border"
                  style={{
                    backgroundColor: 'var(--surface)',
                    borderColor: 'var(--border)',
                    color: 'var(--primary-dark)',
                  }}
                >
                  <Printer size={14} className="inline-block mr-2" />
                  Print / Save PDF
                </button>
              </div>
            </div>
            {(activeCategory === 'financial' ||
              activeCategory === 'staffing' ||
              activeCategory === 'attendance') && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-stone-500">
                  <Filter size={14} />
                  Date Range
                </div>
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider font-quicksand mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={activeFilters.dateRange?.start_date || ''}
                      onChange={(event) =>
                        setFilters((prev) => ({
                          ...prev,
                          [activeCategory]: {
                            ...prev[activeCategory],
                            dateRange: {
                              ...prev[activeCategory].dateRange,
                              start_date: event.target.value,
                            },
                          },
                        }))
                      }
                      className="px-4 py-2 rounded-2xl border themed-border bg-white text-stone-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider font-quicksand mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={activeFilters.dateRange?.end_date || ''}
                      onChange={(event) =>
                        setFilters((prev) => ({
                          ...prev,
                          [activeCategory]: {
                            ...prev[activeCategory],
                            dateRange: {
                              ...prev[activeCategory].dateRange,
                              end_date: event.target.value,
                            },
                          },
                        }))
                      }
                      className="px-4 py-2 rounded-2xl border themed-border bg-white text-stone-600"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {quickRanges.map((range) => (
                      <button
                        key={range.label}
                        type="button"
                        onClick={() =>
                          setFilters((prev) => ({
                            ...prev,
                            [activeCategory]: {
                              ...prev[activeCategory],
                              dateRange: range.getRange(),
                            },
                          }))
                        }
                        className="px-3 py-2 rounded-xl text-xs font-semibold border"
                        style={{
                          backgroundColor: 'var(--surface)',
                          borderColor: 'var(--border)',
                          color: 'var(--muted)',
                        }}
                      >
                        {range.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeCategory === 'financial' && (
              <div className="mb-6 grid gap-4 md:grid-cols-[1fr_1fr]">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider font-quicksand mb-2">
                    Revenue Grouping
                  </label>
                  <select
                    value={filters.financial.groupBy}
                    onChange={(event) =>
                      setFilters((prev) => ({
                        ...prev,
                        financial: {
                          ...prev.financial,
                          groupBy: event.target.value,
                        },
                      }))
                    }
                    className="px-4 py-2 rounded-2xl border themed-border bg-white text-stone-600 w-full"
                  >
                    <option value="day">Daily</option>
                    <option value="week">Weekly</option>
                    <option value="month">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider font-quicksand mb-2">
                    Sections to include
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(filters.financial.sections).map(([key, enabled]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() =>
                          setFilters((prev) => ({
                            ...prev,
                            financial: {
                              ...prev.financial,
                              sections: {
                                ...prev.financial.sections,
                                [key]: !enabled,
                              },
                            },
                          }))
                        }
                        className="px-3 py-2 rounded-xl text-xs font-semibold border"
                        style={
                          enabled
                            ? {
                                backgroundColor: 'var(--primary)',
                                borderColor: 'var(--primary)',
                                color: 'var(--on-primary)',
                              }
                            : {
                                backgroundColor: 'var(--surface)',
                                borderColor: 'var(--border)',
                                color: 'var(--muted)',
                              }
                        }
                      >
                        {key.replace(/\b\w/g, (letter) => letter.toUpperCase())}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeCategory === 'enrollment' && (
              <div className="mb-6">
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider font-quicksand mb-2">
                  Sections to include
                </label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(filters.enrollment.sections).map(([key, enabled]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() =>
                        setFilters((prev) => ({
                          ...prev,
                          enrollment: {
                            ...prev.enrollment,
                            sections: {
                              ...prev.enrollment.sections,
                              [key]: !enabled,
                            },
                          },
                        }))
                      }
                      className="px-3 py-2 rounded-xl text-xs font-semibold border"
                      style={
                        enabled
                          ? {
                              backgroundColor: 'var(--primary)',
                              borderColor: 'var(--primary)',
                              color: 'var(--on-primary)',
                            }
                          : {
                              backgroundColor: 'var(--surface)',
                              borderColor: 'var(--border)',
                              color: 'var(--muted)',
                            }
                      }
                    >
                      {key.replace(/\b\w/g, (letter) => letter.toUpperCase())}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {activeCategory === 'staffing' && (
              <div className="mb-6">
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider font-quicksand mb-2">
                  Sections to include
                </label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(filters.staffing.sections).map(([key, enabled]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() =>
                        setFilters((prev) => ({
                          ...prev,
                          staffing: {
                            ...prev.staffing,
                            sections: {
                              ...prev.staffing.sections,
                              [key]: !enabled,
                            },
                          },
                        }))
                      }
                      className="px-3 py-2 rounded-xl text-xs font-semibold border"
                      style={
                        enabled
                          ? {
                              backgroundColor: 'var(--primary)',
                              borderColor: 'var(--primary)',
                              color: 'var(--on-primary)',
                            }
                          : {
                              backgroundColor: 'var(--surface)',
                              borderColor: 'var(--border)',
                              color: 'var(--muted)',
                            }
                      }
                    >
                      {key.replace(/\b\w/g, (letter) => letter.toUpperCase())}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeCategory === 'attendance' && (
              <div className="mb-6 grid gap-4 md:grid-cols-[1fr_1fr]">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider font-quicksand mb-2">
                    Report Type
                  </label>
                  <select
                    value={filters.attendance.mode}
                    onChange={(event) =>
                      setFilters((prev) => ({
                        ...prev,
                        attendance: {
                          ...prev.attendance,
                          mode: event.target.value,
                        },
                      }))
                    }
                    className="px-4 py-2 rounded-2xl border themed-border bg-white text-stone-600 w-full"
                  >
                    <option value="summary">Summary by Child</option>
                    <option value="detailed">Detailed Log</option>
                  </select>
                </div>
                <div
                  className="rounded-2xl border p-3"
                  style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)' }}
                >
                  <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">
                    Current view
                  </p>
                  <p className="text-sm text-stone-600">
                    {filters.attendance.mode === 'summary'
                      ? 'Child summary with attendance rate.'
                      : 'Daily log with check-in/out.'}
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              {activeCategory === 'attendance' ? (
                <div className="flex items-center gap-2 text-xs text-stone-500">
                  <Clock size={14} />
                  {filters.attendance.mode === 'summary' ? 'Summary view' : 'Detailed view'}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-stone-500">
                  <CheckCircle2 size={14} />
                  {selectedSections.length > 0
                    ? `${selectedSections.length} section${
                        selectedSections.length > 1 ? 's' : ''
                      } selected`
                    : 'No sections selected'}
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-stone-500">
                <FileText size={14} />
                {activeFilters?.dateRange
                  ? `${activeFilters.dateRange.start_date} to ${activeFilters.dateRange.end_date}`
                  : 'All time'}
              </div>
            </div>
          </div>

          {error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="text-stone-500">Loading report data...</div>
            </div>
          ) : null}
          {!loading && activeCategory === 'financial' ? (
            <div className="space-y-6">
              {filters.financial.sections.revenue ? (
                <SectionCard
                  title="Revenue"
                  description="Payments collected over time."
                  icon={DollarSign}
                  actionLabel="Export CSV"
                  actionDisabled={activeData.revenue.length === 0}
                  onAction={() =>
                    downloadCsv(
                      `report-financial-revenue-${toInputDate(new Date())}.csv`,
                      [
                        { label: 'Period', key: 'period' },
                        { label: 'Payments', key: 'payment_count' },
                        { label: 'Total Revenue', key: 'total_revenue' },
                        { label: 'Average Payment', key: 'avg_payment' },
                      ],
                      activeData.revenue
                    )
                  }
                >
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead style={{ backgroundColor: 'var(--background)' }}>
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Period
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Payments
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Total
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Average
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y themed-border">
                        {activeData.revenue.map((row, idx) => (
                          <tr key={idx} className="themed-row">
                            <td className="px-4 py-3 text-sm text-stone-600">{row.period}</td>
                            <td className="px-4 py-3 text-sm text-stone-600">
                              {row.payment_count}
                            </td>
                            <td className="px-4 py-3 text-sm text-stone-600">
                              {formatCurrency(row.total_revenue)}
                            </td>
                            <td className="px-4 py-3 text-sm text-stone-600">
                              {formatCurrency(row.avg_payment)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {activeData.revenue.length === 0 ? (
                    <p className="text-sm text-stone-500 mt-3">
                      No revenue data yet. Run the report to refresh.
                    </p>
                  ) : null}
                </SectionCard>
              ) : null}
              {filters.financial.sections.outstanding ? (
                <SectionCard
                  title="Outstanding Balances"
                  description="Parents with unpaid invoice balances."
                  icon={FileText}
                  actionLabel="Export CSV"
                  actionDisabled={activeData.outstanding.length === 0}
                  onAction={() =>
                    downloadCsv(
                      `report-financial-outstanding-${toInputDate(new Date())}.csv`,
                      [
                        { label: 'Parent', key: 'parent_name' },
                        { label: 'Email', key: 'email' },
                        { label: 'Phone', key: 'phone' },
                        { label: 'Invoices', key: 'invoice_count' },
                        { label: 'Total Outstanding', key: 'total_outstanding' },
                      ],
                      activeData.outstanding
                    )
                  }
                >
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead style={{ backgroundColor: 'var(--background)' }}>
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Parent
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Phone
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Invoices
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Total Outstanding
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y themed-border">
                        {activeData.outstanding.map((row) => (
                          <tr key={row.id} className="themed-row">
                            <td className="px-4 py-3 text-sm text-stone-600">
                              {row.parent_name}
                            </td>
                            <td className="px-4 py-3 text-sm text-stone-600">{row.email}</td>
                            <td className="px-4 py-3 text-sm text-stone-600">{row.phone}</td>
                            <td className="px-4 py-3 text-sm text-stone-600">
                              {row.invoice_count}
                            </td>
                            <td className="px-4 py-3 text-sm text-stone-600">
                              {formatCurrency(row.total_outstanding)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {activeData.outstanding.length === 0 ? (
                    <p className="text-sm text-stone-500 mt-3">No outstanding balances found.</p>
                  ) : null}
                </SectionCard>
              ) : null}
              {filters.financial.sections.aging ? (
                <SectionCard
                  title="Invoice Aging"
                  description="Past-due invoices categorized by age."
                  icon={BarChart3}
                  actionLabel="Export CSV"
                  actionDisabled={activeData.aging.length === 0}
                  onAction={() =>
                    downloadCsv(
                      `report-financial-aging-${toInputDate(new Date())}.csv`,
                      [
                        { label: 'Parent', key: 'parent_name' },
                        { label: 'Invoice', key: 'invoice_number' },
                        { label: 'Invoice Date', key: 'invoice_date' },
                        { label: 'Due Date', key: 'due_date' },
                        { label: 'Balance', key: 'balance_due' },
                        { label: 'Days Overdue', key: 'days_overdue' },
                        { label: 'Bucket', key: 'aging_bucket' },
                      ],
                      activeData.aging
                    )
                  }
                >
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead style={{ backgroundColor: 'var(--background)' }}>
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Parent
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Invoice
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Due Date
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Balance
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Days Overdue
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Bucket
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y themed-border">
                        {activeData.aging.map((row, idx) => (
                          <tr key={idx} className="themed-row">
                            <td className="px-4 py-3 text-sm text-stone-600">
                              {row.parent_name}
                            </td>
                            <td className="px-4 py-3 text-sm text-stone-600">
                              {row.invoice_number}
                            </td>
                            <td className="px-4 py-3 text-sm text-stone-600">
                              {formatDate(row.due_date)}
                            </td>
                            <td className="px-4 py-3 text-sm text-stone-600">
                              {formatCurrency(row.balance_due)}
                            </td>
                            <td className="px-4 py-3 text-sm text-stone-600">
                              {row.days_overdue}
                            </td>
                            <td className="px-4 py-3 text-sm text-stone-600">
                              {row.aging_bucket}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {activeData.aging.length === 0 ? (
                    <p className="text-sm text-stone-500 mt-3">No aging balances found.</p>
                  ) : null}
                </SectionCard>
              ) : null}
              {filters.financial.sections.payments ? (
                <SectionCard
                  title="Payment History"
                  description="Recorded payments within the selected range."
                  icon={FileText}
                  actionLabel="Export CSV"
                  actionDisabled={activeData.payments.length === 0}
                  onAction={() =>
                    downloadCsv(
                      `report-financial-payments-${toInputDate(new Date())}.csv`,
                      [
                        { label: 'Payment Date', key: 'payment_date' },
                        { label: 'Amount', key: 'amount' },
                        { label: 'Payment Method', key: 'payment_method' },
                        { label: 'Parent', key: 'parent_name' },
                        { label: 'Invoice', key: 'invoice_number' },
                        { label: 'Recorded By', key: 'recorded_by' },
                      ],
                      activeData.payments
                    )
                  }
                >
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead style={{ backgroundColor: 'var(--background)' }}>
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Parent
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Invoice
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Method
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y themed-border">
                        {activeData.payments.map((row, idx) => (
                          <tr key={idx} className="themed-row">
                            <td className="px-4 py-3 text-sm text-stone-600">
                              {formatDate(row.payment_date)}
                            </td>
                            <td className="px-4 py-3 text-sm text-stone-600">
                              {row.parent_name}
                            </td>
                            <td className="px-4 py-3 text-sm text-stone-600">
                              {row.invoice_number || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-stone-600">
                              {formatCurrency(row.amount)}
                            </td>
                            <td className="px-4 py-3 text-sm text-stone-600">
                              {row.payment_method || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {activeData.payments.length === 0 ? (
                    <p className="text-sm text-stone-500 mt-3">
                      No payments found for the selected date range.
                    </p>
                  ) : null}
                </SectionCard>
              ) : null}

              {selectedSections.length === 0 ? (
                <div className="themed-surface p-6 rounded-3xl text-sm text-stone-500">
                  Select at least one financial section to preview results.
                </div>
              ) : null}
            </div>
          ) : null}
          {!loading && activeCategory === 'enrollment' ? (
            <div className="space-y-6">
              {filters.enrollment.sections.summary ? (
                <SectionCard
                  title="Enrollment Summary"
                  description="Current child counts by status."
                  icon={Users}
                  actionLabel="Export CSV"
                  actionDisabled={activeData.summary.length === 0}
                  onAction={() =>
                    downloadCsv(
                      `report-enrollment-summary-${toInputDate(new Date())}.csv`,
                      [
                        { label: 'Status', key: 'status' },
                        { label: 'Count', key: 'count' },
                        { label: 'Avg Monthly Rate', key: 'avg_monthly_rate' },
                        { label: 'Total Monthly Revenue', key: 'total_monthly_revenue' },
                      ],
                      activeData.summary
                    )
                  }
                >
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead style={{ backgroundColor: 'var(--background)' }}>
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Count
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Avg Monthly Rate
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Total Monthly Revenue
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y themed-border">
                        {activeData.summary.map((row, idx) => (
                          <tr key={idx} className="themed-row">
                            <td className="px-4 py-3 text-sm text-stone-600">{row.status}</td>
                            <td className="px-4 py-3 text-sm text-stone-600">{row.count}</td>
                            <td className="px-4 py-3 text-sm text-stone-600">
                              {formatCurrency(row.avg_monthly_rate)}
                            </td>
                            <td className="px-4 py-3 text-sm text-stone-600">
                              {formatCurrency(row.total_monthly_revenue)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </SectionCard>
              ) : null}

              {filters.enrollment.sections.trends ? (
                <SectionCard
                  title="Enrollment Trends"
                  description="New enrollments by month and status."
                  icon={BarChart3}
                  actionLabel="Export CSV"
                  actionDisabled={activeData.trends.length === 0}
                  onAction={() =>
                    downloadCsv(
                      `report-enrollment-trends-${toInputDate(new Date())}.csv`,
                      [
                        { label: 'Month', key: 'month' },
                        { label: 'Status', key: 'status' },
                        { label: 'New Enrollments', key: 'new_enrollments' },
                      ],
                      activeData.trends
                    )
                  }
                >
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead style={{ backgroundColor: 'var(--background)' }}>
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Month
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                            New Enrollments
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y themed-border">
                        {activeData.trends.map((row, idx) => (
                          <tr key={idx} className="themed-row">
                            <td className="px-4 py-3 text-sm text-stone-600">{row.month}</td>
                            <td className="px-4 py-3 text-sm text-stone-600">{row.status}</td>
                            <td className="px-4 py-3 text-sm text-stone-600">
                              {row.new_enrollments}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </SectionCard>
              ) : null}
              {filters.enrollment.sections.waitlist ? (
                <SectionCard
                  title="Waitlist"
                  description="Children waiting for enrollment."
                  icon={Clock}
                  actionLabel="Export CSV"
                  actionDisabled={activeData.waitlist.length === 0}
                  onAction={() =>
                    downloadCsv(
                      `report-enrollment-waitlist-${toInputDate(new Date())}.csv`,
                      [
                        { label: 'Priority', key: 'waitlist_priority' },
                        { label: 'Child', key: 'child_name' },
                        { label: 'DOB', key: 'date_of_birth' },
                        { label: 'Waitlist Date', key: 'waitlist_date' },
                        { label: 'Parent', key: 'parent_name' },
                        { label: 'Phone', key: 'phone' },
                        { label: 'Email', key: 'email' },
                      ],
                      activeData.waitlist
                    )
                  }
                >
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead style={{ backgroundColor: 'var(--background)' }}>
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Priority
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Child
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                            DOB
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Waitlist Date
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Parent
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Phone
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Email
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y themed-border">
                        {activeData.waitlist.map((row) => (
                          <tr key={row.id} className="themed-row">
                            <td className="px-4 py-3 text-sm text-stone-600">
                              {row.waitlist_priority || 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm text-stone-600">
                              {row.child_name}
                            </td>
                            <td className="px-4 py-3 text-sm text-stone-600">
                              {formatDate(row.date_of_birth)}
                            </td>
                            <td className="px-4 py-3 text-sm text-stone-600">
                              {formatDate(row.waitlist_date)}
                            </td>
                            <td className="px-4 py-3 text-sm text-stone-600">
                              {row.parent_name}
                            </td>
                            <td className="px-4 py-3 text-sm text-stone-600">{row.phone}</td>
                            <td className="px-4 py-3 text-sm text-stone-600">{row.email}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </SectionCard>
              ) : null}

              {selectedSections.length === 0 ? (
                <div className="themed-surface p-6 rounded-3xl text-sm text-stone-500">
                  Select at least one enrollment section to preview results.
                </div>
              ) : null}
            </div>
          ) : null}
          {!loading && activeCategory === 'staffing' ? (
            <div className="space-y-6">
              {filters.staffing.sections.hours ? (
                <SectionCard
                  title="Hours Worked"
                  description="Approved educator time entries."
                  icon={Clock}
                  actionLabel="Export CSV"
                  actionDisabled={activeData.hours.length === 0}
                  onAction={() =>
                    downloadCsv(
                      `report-staffing-hours-${toInputDate(new Date())}.csv`,
                      [
                        { label: 'Educator', key: 'educator_name' },
                        { label: 'Hourly Rate', key: 'hourly_rate' },
                        { label: 'Total Hours', key: 'total_hours' },
                        { label: 'Total Cost', key: 'total_cost' },
                        { label: 'Entries', key: 'entry_count' },
                      ],
                      activeData.hours
                    )
                  }
                >
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead style={{ backgroundColor: 'var(--background)' }}>
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Educator
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Hourly Rate
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Total Hours
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Total Cost
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Entries
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y themed-border">
                        {activeData.hours.map((row) => (
                          <tr key={row.educator_id} className="themed-row">
                            <td className="px-4 py-3 text-sm text-stone-600">
                              {row.educator_name}
                            </td>
                            <td className="px-4 py-3 text-sm text-stone-600">
                              {formatCurrency(row.hourly_rate)}
                            </td>
                            <td className="px-4 py-3 text-sm text-stone-600">
                              {parseFloat(row.total_hours || 0).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-sm text-stone-600">
                              {formatCurrency(row.total_cost)}
                            </td>
                            <td className="px-4 py-3 text-sm text-stone-600">
                              {row.entry_count}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </SectionCard>
              ) : null}

              {filters.staffing.sections.payroll ? (
                <SectionCard
                  title="Payroll Summary"
                  description="Pay period totals and educator counts."
                  icon={FileText}
                  actionLabel="Export CSV"
                  actionDisabled={activeData.payroll.length === 0}
                  onAction={() =>
                    downloadCsv(
                      `report-staffing-payroll-${toInputDate(new Date())}.csv`,
                      [
                        { label: 'Pay Period Start', key: 'start_date' },
                        { label: 'Pay Period End', key: 'end_date' },
                        { label: 'Status', key: 'period_status' },
                        { label: 'Educators', key: 'educator_count' },
                        { label: 'Total Hours', key: 'total_hours' },
                        { label: 'Total Gross Pay', key: 'total_gross_pay' },
                      ],
                      activeData.payroll
                    )
                  }
                >
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead style={{ backgroundColor: 'var(--background)' }}>
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Pay Period
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Educators
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Total Hours
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Total Gross Pay
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y themed-border">
                        {activeData.payroll.map((row) => (
                          <tr key={row.pay_period_id} className="themed-row">
                            <td className="px-4 py-3 text-sm text-stone-600">
                              {formatDate(row.start_date)} - {formatDate(row.end_date)}
                            </td>
                            <td className="px-4 py-3 text-sm text-stone-600">
                              {row.period_status}
                            </td>
                            <td className="px-4 py-3 text-sm text-stone-600">
                              {row.educator_count || 0}
                            </td>
                            <td className="px-4 py-3 text-sm text-stone-600">
                              {parseFloat(row.total_hours || 0).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-sm text-stone-600">
                              {formatCurrency(row.total_gross_pay)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </SectionCard>
              ) : null}
              {filters.staffing.sections.coverage ? (
                <SectionCard
                  title="Schedule Coverage"
                  description="Staffing coverage across scheduled shifts."
                  icon={BarChart3}
                  actionLabel="Export CSV"
                  actionDisabled={activeData.coverage.length === 0}
                  onAction={() =>
                    downloadCsv(
                      `report-staffing-coverage-${toInputDate(new Date())}.csv`,
                      [
                        { label: 'Date', key: 'shift_date' },
                        { label: 'Scheduled', key: 'scheduled_educators' },
                        { label: 'Total Hours', key: 'total_scheduled_hours' },
                        { label: 'Confirmed', key: 'confirmed_count' },
                        { label: 'Pending', key: 'pending_count' },
                      ],
                      activeData.coverage
                    )
                  }
                >
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead style={{ backgroundColor: 'var(--background)' }}>
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Scheduled
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Total Hours
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Confirmed
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Pending
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y themed-border">
                        {activeData.coverage.map((row, idx) => (
                          <tr key={idx} className="themed-row">
                            <td className="px-4 py-3 text-sm text-stone-600">
                              {formatDate(row.shift_date)}
                            </td>
                            <td className="px-4 py-3 text-sm text-stone-600">
                              {row.scheduled_educators}
                            </td>
                            <td className="px-4 py-3 text-sm text-stone-600">
                              {parseFloat(row.total_scheduled_hours || 0).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-sm text-stone-600">
                              {row.confirmed_count}
                            </td>
                            <td className="px-4 py-3 text-sm text-stone-600">
                              {row.pending_count}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </SectionCard>
              ) : null}

              {selectedSections.length === 0 ? (
                <div className="themed-surface p-6 rounded-3xl text-sm text-stone-500">
                  Select at least one staffing section to preview results.
                </div>
              ) : null}
            </div>
          ) : null}
          {!loading && activeCategory === 'attendance' ? (
            <div className="space-y-6">
              <SectionCard
                title={
                  filters.attendance.mode === 'summary'
                    ? 'Attendance Summary'
                    : 'Attendance Detailed Log'
                }
                description={
                  filters.attendance.mode === 'summary'
                    ? 'Child attendance totals and rates.'
                    : 'Daily log of check-ins and check-outs.'
                }
                icon={Clock}
                actionLabel="Export CSV"
                actionDisabled={
                  filters.attendance.mode === 'summary'
                    ? activeData.summary.length === 0
                    : activeData.detailed.length === 0
                }
                onAction={() =>
                  downloadCsv(
                    `report-attendance-${filters.attendance.mode}-${toInputDate(new Date())}.csv`,
                    filters.attendance.mode === 'summary'
                      ? [
                          { label: 'Child', key: 'child_name' },
                          { label: 'Total Days', key: 'total_days' },
                          { label: 'Present', key: 'present_days' },
                          { label: 'Absent', key: 'absent_days' },
                          { label: 'Sick', key: 'sick_days' },
                          { label: 'Vacation', key: 'vacation_days' },
                          { label: 'Attendance Rate', key: 'attendance_rate' },
                        ]
                      : [
                          { label: 'Date', key: 'attendance_date' },
                          { label: 'Child', key: 'child_name' },
                          { label: 'Status', key: 'status' },
                          { label: 'Check In', key: 'check_in_time' },
                          { label: 'Check Out', key: 'check_out_time' },
                          { label: 'Dropped Off By', key: 'parent_dropped_off' },
                          { label: 'Picked Up By', key: 'parent_picked_up' },
                        ],
                    filters.attendance.mode === 'summary'
                      ? activeData.summary
                      : activeData.detailed
                  )
                }
              >
                {filters.attendance.mode === 'summary' ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead style={{ backgroundColor: 'var(--background)' }}>
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Child
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Total Days
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Present
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Absent
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Sick
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Vacation
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Rate
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y themed-border">
                        {activeData.summary.map((row) => (
                          <tr key={row.child_id} className="themed-row">
                            <td className="px-4 py-3 text-sm text-stone-600">
                              {row.child_name}
                            </td>
                            <td className="px-4 py-3 text-sm text-stone-600">
                              {row.total_days}
                            </td>
                            <td className="px-4 py-3 text-sm text-stone-600">
                              {row.present_days}
                            </td>
                            <td className="px-4 py-3 text-sm text-stone-600">
                              {row.absent_days}
                            </td>
                            <td className="px-4 py-3 text-sm text-stone-600">
                              {row.sick_days}
                            </td>
                            <td className="px-4 py-3 text-sm text-stone-600">
                              {row.vacation_days}
                            </td>
                            <td className="px-4 py-3 text-sm text-stone-600">
                              {row.attendance_rate}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead style={{ backgroundColor: 'var(--background)' }}>
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Child
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Check In
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Check Out
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Dropped Off By
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Picked Up By
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y themed-border">
                        {activeData.detailed.map((row, idx) => (
                          <tr key={idx} className="themed-row">
                            <td className="px-4 py-3 text-sm text-stone-600">
                              {formatDate(row.attendance_date)}
                            </td>
                            <td className="px-4 py-3 text-sm text-stone-600">
                              {row.child_name}
                            </td>
                            <td className="px-4 py-3 text-sm text-stone-600">
                              {row.status || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-stone-600">
                              {row.check_in_time || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-stone-600">
                              {row.check_out_time || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-stone-600">
                              {row.parent_dropped_off || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-stone-600">
                              {row.parent_picked_up || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {(filters.attendance.mode === 'summary'
                  ? activeData.summary.length === 0
                  : activeData.detailed.length === 0) ? (
                  <p className="text-sm text-stone-500 mt-3">
                    No attendance data found for this range.
                  </p>
                ) : null}
              </SectionCard>
            </div>
          ) : null}
        </section>
      </div>
    </Layout>
  );
}

