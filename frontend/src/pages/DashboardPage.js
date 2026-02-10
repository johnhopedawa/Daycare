import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { MetricCard } from '../components/DashboardWidgets';
import { BaseModal } from '../components/modals/BaseModal';
import { AddChildModal } from '../components/modals/AddChildModal';
import { SendMessageModal } from '../components/modals/SendMessageModal';
import { CreateEventModal } from '../components/modals/CreateEventModal';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import {
  AlertTriangle,
  BarChart3,
  Briefcase,
  CalendarCheck,
  Check,
  ClipboardCheck,
  ClipboardList,
  LogIn,
  Mail,
  PieChart,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
  Wallet
} from 'lucide-react';

const ABSENT_STATUSES = new Set(['ABSENT', 'SICK', 'VACATION']);
const DEFAULT_RATIO = { kids: 4, staff: 1 };
const RATIO_STORAGE_KEY = 'dashboard.staffRatio';
const DEFAULT_REPORTING_YEAR = new Date().getFullYear();
const CHART_HEIGHT = 140;
const PIE_COLORS = ['var(--card-1)', 'var(--card-2)', 'var(--card-3)', 'var(--card-4)'];
const REQUEST_BATCH_WINDOW_MS = 10 * 60 * 1000;
const HOURS_PER_DAY = 8;

const formatDate = (value) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().split('T')[0];
};

const formatCurrency = (value) => `$${Number(value || 0).toFixed(2)}`;

const parseAmount = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeCategoryName = (value) => {
  if (!value) {
    return '';
  }
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((word) => (
      word ? `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}` : ''
    ))
    .join(' ');
};

const getStoredRatio = () => {
  if (typeof window === 'undefined') {
    return DEFAULT_RATIO;
  }
  try {
    const raw = window.localStorage.getItem(RATIO_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_RATIO;
    }
    const parsed = JSON.parse(raw);
    const kids = Number.parseFloat(parsed?.kids);
    const staff = Number.parseFloat(parsed?.staff);
    if (!Number.isFinite(kids) || kids <= 0 || !Number.isFinite(staff) || staff <= 0) {
      return DEFAULT_RATIO;
    }
    return { kids, staff };
  } catch (error) {
    return DEFAULT_RATIO;
  }
};

const formatTime = (value) => {
  if (!value) return '';
  const [hours, minutes] = value.split(':');
  const hour = parseInt(hours, 10);
  if (Number.isNaN(hour)) return value;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

const normalizeDateKey = (value) => {
  if (!value) return null;
  const raw = String(value);
  if (raw.includes('T')) {
    return raw.split('T')[0];
  }
  if (raw.length === 10 && raw[4] === '-' && raw[7] === '-') {
    return raw;
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateKey = (dateKey) => {
  const [year, month, day] = String(dateKey || '').split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const calculateDays = (startKey, endKey) => {
  const start = parseDateKey(startKey);
  const end = parseDateKey(endKey);
  if (!start || !end) return 0;
  const diff = Math.floor((end - start) / (1000 * 60 * 60 * 24));
  return diff >= 0 ? diff + 1 : 0;
};

const getHoursForRequest = (request) => {
  if (request.hours !== null && request.hours !== undefined && request.hours !== '') {
    const parsed = parseFloat(request.hours);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const startKey = normalizeDateKey(request.start_date);
  const endKey = normalizeDateKey(request.end_date);
  return calculateDays(startKey, endKey) * HOURS_PER_DAY;
};

const groupRequests = (requests) => {
  const sorted = [...requests].sort((a, b) => {
    const aStart = normalizeDateKey(a.start_date) || '';
    const bStart = normalizeDateKey(b.start_date) || '';
    if (aStart !== bStart) return aStart.localeCompare(bStart);
    const aCreated = new Date(a.created_at || 0).getTime();
    const bCreated = new Date(b.created_at || 0).getTime();
    return aCreated - bCreated;
  });

  const groups = [];
  sorted.forEach((request) => {
    const startKey = normalizeDateKey(request.start_date);
    const endKey = normalizeDateKey(request.end_date);
    if (!startKey || !endKey) return;

    const createdAt = new Date(request.created_at || 0).getTime();
    const groupKey = [
      request.user_id,
      request.request_type,
      request.status,
      request.hours ?? '',
      request.reason ?? '',
    ].join('|');
    const isSingleDay = startKey === endKey;

    const last = groups[groups.length - 1];
    const canMerge =
      last &&
      last.key === groupKey &&
      last.isSingleDay &&
      isSingleDay &&
      Math.abs(createdAt - last.lastCreatedAt) <= REQUEST_BATCH_WINDOW_MS;

    if (canMerge) {
      const lastEnd = parseDateKey(last.endKey);
      const nextStart = parseDateKey(startKey);
      const isConsecutive =
        lastEnd && nextStart && (nextStart - lastEnd) / (1000 * 60 * 60 * 24) === 1;
      if (isConsecutive) {
        last.endKey = endKey;
        last.ids.push(request.id);
        last.lastCreatedAt = createdAt;
        last.totalHours += getHoursForRequest(request);
        last.count += 1;
        return;
      }
    }

    groups.push({
      key: groupKey,
      ids: [request.id],
      startKey,
      endKey,
      request_type: request.request_type,
      status: request.status,
      first_name: request.first_name,
      last_name: request.last_name,
      hours: request.hours,
      reason: request.reason,
      lastCreatedAt: createdAt,
      isSingleDay,
      totalHours: getHoursForRequest(request),
      count: 1,
    });
  });

  return groups;
};

const PANEL_STYLE = {
  backgroundColor: 'var(--surface)',
  borderColor: 'var(--border)',
  boxShadow: 'var(--panel-shadow)',
  backgroundImage: 'linear-gradient(180deg, rgba(var(--accent-rgb), 0.14) 0%, rgba(255, 255, 255, 0) 42%)',
  borderRadius: 'var(--panel-radius)',
  padding: 'var(--panel-padding)',
};

const HERO_PANEL_STYLE = {
  ...PANEL_STYLE,
  borderTopColor: 'var(--primary)',
  borderTopWidth: '2px',
};

const ROW_STYLE = {
  backgroundColor: 'var(--bubble-bg)',
  borderColor: 'var(--bubble-border)',
  boxShadow: 'var(--panel-shadow-soft)',
};

const OUTLINE_STYLE = {
  borderColor: 'var(--border)',
};

const FINANCE_TILE_STYLE = {
  backgroundColor: 'var(--surface)',
  borderColor: 'var(--border)',
  boxShadow: 'var(--panel-shadow-soft)',
};

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [events, setEvents] = useState([]);
  const [financeTransactions, setFinanceTransactions] = useState([]);
  const [financeLoading, setFinanceLoading] = useState(false);
  const [financeError, setFinanceError] = useState('');
  const [timeOffRequests, setTimeOffRequests] = useState([]);
  const [timeOffLoading, setTimeOffLoading] = useState(false);
  const [activeTimeOffUserId, setActiveTimeOffUserId] = useState(null);
  const [rejectingBatch, setRejectingBatch] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [compliance, setCompliance] = useState({
    in_compliance: true,
    kids_present: 0,
    staff_scheduled: 0,
    required_staff: 0,
    ratio: { kids: DEFAULT_RATIO.kids, staff: DEFAULT_RATIO.staff, kids_per_staff: DEFAULT_RATIO.kids / DEFAULT_RATIO.staff },
  });
  const [complianceLoading, setComplianceLoading] = useState(false);
  const [ratio, setRatio] = useState(() => getStoredRatio());
  const [ratioDraft, setRatioDraft] = useState(() => getStoredRatio());
  const [ratioOpen, setRatioOpen] = useState(false);
  const [ratioError, setRatioError] = useState('');
  const [pendingTasks, setPendingTasks] = useState(0);
  const [pendingNotifications, setPendingNotifications] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingOpen, setPendingOpen] = useState(false);
  const [isMessageOpen, setIsMessageOpen] = useState(false);
  const [isAddChildOpen, setIsAddChildOpen] = useState(false);
  const [isEventOpen, setIsEventOpen] = useState(false);
  const today = useMemo(() => formatDate(new Date()), []);
  const reportingYear = useMemo(() => DEFAULT_REPORTING_YEAR, []);
  const financeRange = useMemo(() => ({
    start: `${reportingYear}-01-01`,
    end: `${reportingYear}-12-31`,
  }), [reportingYear]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setFinanceLoading(true);
    setComplianceLoading(true);
    setTimeOffLoading(true);
    setFinanceError('');
    try {
      const results = await Promise.allSettled([
        api.get('/children?status=ACTIVE'),
        api.get(`/attendance?start_date=${today}&end_date=${today}`),
        api.get(`/schedules/admin/schedules?from=${today}&to=${today}`),
        api.get('/notifications/unread-count'),
        api.get('/invoices'),
        api.get('/events', { params: { from: today, limit: 3 } }),
        api.get('/attendance/compliance', {
          params: {
            date: today,
            ratio_kids: ratio.kids,
            ratio_staff: ratio.staff,
          },
        }),
        api.get('/business-expenses', {
          params: {
            start: financeRange.start,
            end: financeRange.end,
            limit: 1000,
          },
        }),
        api.get('/time-off-requests', { params: { status: 'ALL' } }),
      ]);

      const [
        childrenRes,
        attendanceRes,
        schedulesRes,
        notificationsRes,
        invoicesRes,
        eventsRes,
        complianceRes,
        financeRes,
        timeOffRes,
      ] = results;

      setChildren(childrenRes.status === 'fulfilled' ? (childrenRes.value.data.children || []) : []);
      setAttendance(attendanceRes.status === 'fulfilled' ? (attendanceRes.value.data.attendance || []) : []);
      setSchedules(schedulesRes.status === 'fulfilled' ? (schedulesRes.value.data.schedules || []) : []);
      setInvoices(invoicesRes.status === 'fulfilled' ? (invoicesRes.value.data.invoices || []) : []);
      setPendingTasks(notificationsRes.status === 'fulfilled' ? (notificationsRes.value.data.count || 0) : 0);
      setEvents(eventsRes.status === 'fulfilled' ? (eventsRes.value.data.events || []) : []);

      if (complianceRes.status === 'fulfilled') {
        setCompliance(complianceRes.value.data);
      } else {
        const attendanceRows = attendanceRes.status === 'fulfilled'
          ? (attendanceRes.value.data.attendance || [])
          : [];
        const presentCount = attendanceRows.filter((record) => {
          const status = (record.status || '').toUpperCase();
          if (ABSENT_STATUSES.has(status)) {
            return false;
          }
          return Boolean(record.check_in_time || record.check_out_time || ['PRESENT', 'LATE'].includes(status));
        }).length;
        const acceptedStaff = new Set(
          (schedulesRes.status === 'fulfilled' ? (schedulesRes.value.data.schedules || []) : [])
            .filter((schedule) => schedule.status === 'ACCEPTED')
            .map((schedule) => schedule.user_id)
        );
        const staffScheduled = acceptedStaff.size;
        const kidsPerStaff = ratio.kids / ratio.staff;
        const requiredStaff = kidsPerStaff > 0 ? Math.ceil(presentCount / kidsPerStaff) : 0;
        setCompliance({
          date: today,
          ratio: {
            kids: ratio.kids,
            staff: ratio.staff,
            kids_per_staff: kidsPerStaff,
          },
          kids_present: presentCount,
          staff_scheduled: staffScheduled,
          required_staff: requiredStaff,
          in_compliance: staffScheduled >= requiredStaff,
        });
      }

      if (financeRes.status === 'fulfilled') {
        const payload = financeRes.value.data || {};
        setFinanceTransactions(payload.transactions || payload.expenses || []);
      } else {
        setFinanceError('Finance snapshot unavailable.');
        setFinanceTransactions([]);
      }

      if (timeOffRes.status === 'fulfilled') {
        setTimeOffRequests(timeOffRes.value.data.requests || []);
      } else {
        setTimeOffRequests([]);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
      setFinanceLoading(false);
      setComplianceLoading(false);
      setTimeOffLoading(false);
    }
  };

  const summary = useMemo(() => {
    const presentRecords = attendance.filter((record) => {
      const status = (record.status || '').toUpperCase();
      if (ABSENT_STATUSES.has(status)) {
        return false;
      }
      return Boolean(record.check_in_time || record.check_out_time || ['PRESENT', 'LATE'].includes(status));
    });

    const acceptedStaff = new Set(
      schedules
        .filter((schedule) => schedule.status === 'ACCEPTED')
        .map((schedule) => schedule.user_id)
    );

    const overdueInvoices = invoices.filter((invoice) => invoice.status === 'OVERDUE');
    const dueToday = invoices.filter((invoice) => {
      const status = invoice.status || '';
      const dueDate = formatDate(invoice.due_date);
      return ['SENT', 'PARTIAL'].includes(status) && dueDate === today;
    });

    return {
      expectedCount: children.length,
      presentCount: presentRecords.length,
      staffScheduled: acceptedStaff.size,
      overdueCount: overdueInvoices.length,
      dueTodayCount: dueToday.length,
    };
  }, [attendance, children, invoices, schedules, today]);

  const formatRequestType = (type) => {
    const value = String(type || '').toUpperCase();
    if (value === 'SICK') return 'Sick';
    if (value === 'VACATION') return 'Vacation';
    if (value === 'UNPAID') return 'Unpaid';
    return value || 'Time Off';
  };

  const formatRequestRange = (startKey, endKey) => {
    if (!startKey || !endKey) return '';
    if (startKey === endKey) {
      return new Date(startKey).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
    const start = new Date(startKey);
    const end = new Date(endKey);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return `${startKey} - ${endKey}`;
    }
    const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
    if (sameMonth) {
      return `${start.toLocaleDateString('en-US', { month: 'long' })} ${start.getDate()} - ${end.getDate()}, ${start.getFullYear()}`;
    }
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  const requestStatusTone = (status) => {
    const value = String(status || '').toUpperCase();
    if (value === 'APPROVED') return 'var(--success)';
    if (value === 'REJECTED') return 'var(--danger)';
    return 'var(--primary-dark)';
  };

  const formatRequestStatus = (status) => {
    const value = String(status || '').toUpperCase();
    if (value === 'APPROVED') return 'Approved';
    if (value === 'REJECTED') return 'Rejected';
    if (value === 'PENDING') return 'Pending approval';
    return value || 'Status';
  };

  const timeOffSummary = useMemo(() => {
    const sorted = [...timeOffRequests].sort((a, b) => {
      const aPending = String(a.status || '').toUpperCase() === 'PENDING';
      const bPending = String(b.status || '').toUpperCase() === 'PENDING';
      if (aPending !== bPending) {
        return aPending ? -1 : 1;
      }
      return new Date(b.created_at || b.start_date || 0) - new Date(a.created_at || a.start_date || 0);
    });
    return {
      total: sorted.length,
      visible: sorted.slice(0, 2),
    };
  }, [timeOffRequests]);

  const upcomingEvents = useMemo(() => ({
    total: events.length,
    visible: events.slice(0, 2),
  }), [events]);

  const educatorSummaries = useMemo(() => {
    const map = new Map();
    timeOffRequests.forEach((request) => {
      const key = String(request.user_id);
      if (!map.has(key)) {
        map.set(key, {
          user_id: request.user_id,
          first_name: request.first_name,
          last_name: request.last_name,
          approvedHours: 0,
          pendingHours: 0,
          approvedCount: 0,
          pendingCount: 0,
          requests: [],
        });
      }
      const entry = map.get(key);
      const status = String(request.status || '').toUpperCase();
      const hours = getHoursForRequest(request);
      if (status === 'APPROVED') {
        entry.approvedHours += hours;
        entry.approvedCount += 1;
      } else if (status === 'PENDING') {
        entry.pendingHours += hours;
        entry.pendingCount += 1;
      }
      entry.requests.push(request);
    });
    return Array.from(map.values());
  }, [timeOffRequests]);

  const activeTimeOffEducator = useMemo(
    () => educatorSummaries.find((educator) => String(educator.user_id) === String(activeTimeOffUserId)) || null,
    [educatorSummaries, activeTimeOffUserId]
  );

  const activeGroups = useMemo(() => {
    if (!activeTimeOffEducator) return { approved: [], pending: [], rejected: [] };
    const approved = [];
    const pending = [];
    const rejected = [];
    const grouped = groupRequests(activeTimeOffEducator.requests);
    grouped.forEach((group) => {
      const status = String(group.status || '').toUpperCase();
      if (status === 'APPROVED') approved.push(group);
      if (status === 'PENDING') pending.push(group);
      if (status === 'REJECTED') rejected.push(group);
    });
    return { approved, pending, rejected };
  }, [activeTimeOffEducator]);

  const refreshTimeOffRequests = async () => {
    try {
      setTimeOffLoading(true);
      const response = await api.get('/time-off-requests', { params: { status: 'ALL' } });
      setTimeOffRequests(response.data.requests || []);
    } catch (error) {
      console.error('Failed to load time off requests:', error);
      setTimeOffRequests([]);
    } finally {
      setTimeOffLoading(false);
    }
  };

  const handleApproveBatch = async (ids) => {
    if (!ids || ids.length === 0) return;
    try {
      await Promise.all(ids.map((id) => api.post(`/time-off-requests/${id}/approve`)));
      await refreshTimeOffRequests();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to approve request(s)');
    }
  };

  const handleRejectBatch = async () => {
    if (!rejectingBatch) return;
    try {
      await Promise.all(
        rejectingBatch.ids.map((id) =>
          api.post(`/time-off-requests/${id}/reject`, {
            reason: rejectReason || null,
          })
        )
      );
      setRejectingBatch(null);
      setRejectReason('');
      await refreshTimeOffRequests();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to reject request(s)');
    }
  };

  const openTimeOffDetails = (request) => {
    if (!request?.user_id) {
      return;
    }
    setActiveTimeOffUserId(request.user_id);
  };

  const financeTransactionsYear = useMemo(() => (
    financeTransactions.filter((txn) => {
      const dateKey = txn.transaction_date;
      if (!dateKey) {
        return false;
      }
      return String(dateKey).startsWith(String(reportingYear));
    })
  ), [financeTransactions, reportingYear]);

  const financeStats = useMemo(() => {
    const totals = financeTransactionsYear.reduce(
      (acc, txn) => {
        const amount = parseAmount(txn.amount);
        if (txn.direction === 'income') {
          acc.totalIncome += amount;
        } else if (txn.direction === 'expense') {
          acc.totalExpenses += amount;
        }
        acc.transactionCount += 1;
        if (!txn.category) {
          acc.uncategorizedCount += 1;
          if (txn.direction === 'expense') {
            acc.uncategorizedAmount += amount;
          }
        }
        return acc;
      },
      {
        totalExpenses: 0,
        totalIncome: 0,
        transactionCount: 0,
        uncategorizedCount: 0,
        uncategorizedAmount: 0,
      }
    );
    return {
      ...totals,
      net: totals.totalIncome - totals.totalExpenses,
    };
  }, [financeTransactionsYear]);

  const monthlySummary = useMemo(() => {
    const buckets = Array.from({ length: 12 }, (_, index) => ({
      key: `${reportingYear}-${index}`,
      label: new Date(reportingYear, index, 1).toLocaleDateString('en-US', { month: 'short' }),
      income: 0,
      expenses: 0,
    }));

    financeTransactionsYear.forEach((txn) => {
      if (!txn.transaction_date) {
        return;
      }
      const parsed = new Date(`${txn.transaction_date}T00:00:00`);
      if (Number.isNaN(parsed.getTime())) {
        return;
      }
      const bucket = buckets[parsed.getMonth()];
      if (!bucket) {
        return;
      }
      const amount = parseAmount(txn.amount);
      if (txn.direction === 'income') {
        bucket.income += amount;
      } else if (txn.direction === 'expense') {
        bucket.expenses += amount;
      }
    });

    const maxValue = buckets.reduce(
      (max, bucket) => Math.max(max, bucket.income, bucket.expenses),
      0
    );

    return {
      buckets,
      maxValue: maxValue > 0 ? maxValue : 1,
    };
  }, [financeTransactionsYear, reportingYear]);

  const topCategories = useMemo(() => {
    const totals = new Map();
    financeTransactionsYear.forEach((txn) => {
      if (txn.direction !== 'expense') {
        return;
      }
      const amount = parseAmount(txn.amount);
      if (amount <= 0) {
        return;
      }
      const category = normalizeCategoryName(txn.category) || 'Uncategorized';
      totals.set(category, (totals.get(category) || 0) + amount);
    });
    const entries = Array.from(totals.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
    const total = entries.reduce((sum, entry) => sum + entry.amount, 0);
    const top = entries.slice(0, 5);
    if (entries.length > 5) {
      const topTotal = top.reduce((sum, entry) => sum + entry.amount, 0);
      const otherAmount = total - topTotal;
      if (otherAmount > 0) {
        top.push({ category: 'Other', amount: otherAmount });
      }
    }
    return { entries: top, total };
  }, [financeTransactionsYear]);

  const pieSegments = useMemo(() => {
    if (topCategories.total === 0) {
      return [];
    }
    return topCategories.entries.map((entry, index) => ({
      ...entry,
      percent: (entry.amount / topCategories.total) * 100,
      color: PIE_COLORS[index % PIE_COLORS.length],
    }));
  }, [topCategories]);

  const pieGradient = useMemo(() => {
    if (!pieSegments.length) {
      return 'none';
    }
    let current = 0;
    const stops = pieSegments.map((segment) => {
      const start = current;
      const end = current + segment.percent;
      current = end;
      return `${segment.color} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
    });
    return `conic-gradient(${stops.join(', ')})`;
  }, [pieSegments]);

  const profitValue = financeStats.totalIncome - financeStats.totalExpenses;
  const profitLabel = `${profitValue >= 0 ? '+' : '-'}${formatCurrency(Math.abs(profitValue))}`;
  const financeKpis = [
    {
      key: 'income',
      label: 'Total Income',
      value: formatCurrency(financeStats.totalIncome),
      icon: TrendingUp,
      valueColor: 'var(--text)',
    },
    {
      key: 'expenses',
      label: 'Total Expenses',
      value: formatCurrency(financeStats.totalExpenses),
      icon: TrendingDown,
      valueColor: 'var(--text)',
    },
    {
      key: 'net',
      label: 'Net Cash Flow',
      value: formatCurrency(financeStats.net),
      icon: Wallet,
      valueColor: profitValue >= 0 ? 'var(--success)' : 'var(--danger)',
    },
    {
      key: 'uncategorized',
      label: 'Uncategorized',
      value: formatCurrency(financeStats.uncategorizedAmount),
      icon: PieChart,
      valueColor: 'var(--text)',
    },
  ];

  const actionBar = (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={() => navigate('/attendance')}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-stone-700 elevated-control"
      >
        <ClipboardCheck size={16} style={{ color: 'var(--primary-dark)' }} />
        Attendance
      </button>
      <button
        onClick={() => setIsAddChildOpen(true)}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-stone-700 elevated-control"
      >
        <Users size={16} style={{ color: 'var(--primary-dark)' }} />
        Add Child
      </button>
      <button
        onClick={() => setIsMessageOpen(true)}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-stone-700 elevated-control"
      >
        <Mail size={16} style={{ color: 'var(--primary-dark)' }} />
        Send Message
      </button>
      <button
        onClick={() => navigate('/payments')}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-stone-700 elevated-control"
      >
        <ClipboardList size={16} style={{ color: 'var(--primary-dark)' }} />
        Record Payment
      </button>
      <button
        onClick={() => setIsEventOpen(true)}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-stone-700 elevated-control"
      >
        <CalendarCheck size={16} style={{ color: 'var(--primary-dark)' }} />
        Create Event
      </button>
    </div>
  );

  const openPendingTasks = async () => {
    try {
      setPendingLoading(true);
      setPendingOpen(true);
      const response = await api.get('/notifications', { params: { limit: 25 } });
      const unread = (response.data.notifications || []).filter((item) => !item.is_read);
      setPendingNotifications(unread);
    } catch (error) {
      console.error('Failed to load pending tasks:', error);
    } finally {
      setPendingLoading(false);
    }
  };

  const refreshCompliance = async (nextRatio = ratio) => {
    try {
      setComplianceLoading(true);
      const response = await api.get('/attendance/compliance', {
        params: {
          date: today,
          ratio_kids: nextRatio.kids,
          ratio_staff: nextRatio.staff,
        },
      });
      setCompliance(response.data);
    } catch (error) {
      console.error('Failed to load compliance status:', error);
    } finally {
      setComplianceLoading(false);
    }
  };

  const handleOpenRatio = () => {
    setRatioError('');
    setRatioDraft(ratio);
    setRatioOpen(true);
  };

  const handleSaveRatio = async (event) => {
    event.preventDefault();
    const nextKids = Number.parseFloat(ratioDraft.kids);
    const nextStaff = Number.parseFloat(ratioDraft.staff);
    if (!Number.isFinite(nextKids) || nextKids <= 0 || !Number.isFinite(nextStaff) || nextStaff <= 0) {
      setRatioError('Please enter positive numbers for both kids and staff.');
      return;
    }
    setRatioError('');
    const nextRatio = { kids: nextKids, staff: nextStaff };
    setRatio(nextRatio);
    setRatioDraft(nextRatio);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(RATIO_STORAGE_KEY, JSON.stringify(nextRatio));
    }
    setRatioOpen(false);
    await refreshCompliance(nextRatio);
  };

  const ratioLabel = `${compliance?.ratio?.kids ?? ratio.kids}:${compliance?.ratio?.staff ?? ratio.staff}`;
  const complianceFooter = complianceLoading
    ? 'Calculating staffing coverage'
    : `Kids:Staff ${ratioLabel} | ${compliance.kids_present} kids | ${compliance.staff_scheduled} staff`;
  const showComplianceWarning = !complianceLoading && !compliance.in_compliance;
  const complianceIconColor = showComplianceWarning ? 'var(--danger)' : 'var(--success)';

  if (loading) {
    return (
      <Layout title="Day-of Ops" subtitle="Loading today's overview">
        <div className="flex items-center justify-center h-64">
          <div className="text-stone-500">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      title={`Day-of Ops${user?.first_name ? `, ${user.first_name}` : ''}`}
      subtitle={new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })}
      actionBar={actionBar}
    >
      <div
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"
        style={{ gap: 'var(--layout-gap)', marginBottom: 'var(--layout-gap)' }}
      >
        <MetricCard
          title="Present Today"
          value={`${summary.presentCount}/${summary.expectedCount}`}
          icon={UserCheck}
          themeIndex={1}
          delay={0.1}
        />
        <MetricCard
          title="Staff Scheduled"
          value={summary.staffScheduled}
          icon={Briefcase}
          themeIndex={2}
          delay={0.2}
        />
        <MetricCard
          title="In Compliance"
          value={
            showComplianceWarning ? (
              <AlertTriangle size={32} style={{ color: complianceIconColor }} />
            ) : (
              <Check size={32} style={{ color: complianceIconColor }} />
            )
          }
          icon={ShieldCheck}
          themeIndex={3}
          delay={0.3}
          footer={complianceFooter}
          onClick={handleOpenRatio}
        />
        <MetricCard
          title="Pending Tasks"
          value={pendingTasks}
          icon={ClipboardList}
          themeIndex={4}
          delay={0.4}
          onClick={openPendingTasks}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3" style={{ gap: 'var(--layout-gap)' }}>
        <div className="xl:col-span-2 flex flex-col" style={{ gap: 'var(--layout-gap)' }}>
          <section className="border bg-[var(--surface)]" style={HERO_PANEL_STYLE}>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="section-title font-quicksand font-bold text-xl">Finance Snapshot</h3>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  Income, expenses, and category mix for {reportingYear}.
                </p>
              </div>
              <button
                onClick={() => navigate('/finance')}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold transition-colors"
                style={{ ...OUTLINE_STYLE, color: 'var(--primary-dark)', backgroundColor: 'var(--surface)' }}
              >
                <BarChart3 size={16} style={{ color: 'var(--primary-dark)' }} />
                Open Finance
              </button>
            </div>

            {financeLoading ? (
              <div className="text-sm" style={{ color: 'var(--muted)' }}>
                Loading finance snapshot...
              </div>
            ) : financeError ? (
              <div className="text-sm" style={{ color: 'var(--muted)' }}>
                {financeError}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]" style={{ gap: 'var(--layout-gap)' }}>
                  <div className="rounded-3xl border p-5" style={FINANCE_TILE_STYLE}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--muted)' }}>
                        <PieChart size={16} />
                        Expense Categories
                      </div>
                      <span className="text-xs" style={{ color: 'var(--muted)' }}>
                        Share of expenses
                      </span>
                    </div>
                    {pieSegments.length === 0 ? (
                      <p className="text-sm" style={{ color: 'var(--muted)' }}>
                        No expense categories yet.
                      </p>
                    ) : (
                      <div className="flex flex-col lg:flex-row items-center gap-6">
                        <div className="relative w-32 h-32">
                          <div
                            className="absolute inset-0 rounded-full"
                            style={{ backgroundImage: pieGradient, boxShadow: 'var(--panel-shadow-soft)' }}
                          />
                          <div
                            className="absolute inset-4 rounded-full border"
                            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
                          />
                        </div>
                        <div className="w-full space-y-3">
                          {pieSegments.map((segment) => (
                            <div key={segment.category} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: segment.color }}
                                />
                                <span style={{ color: 'var(--text)' }}>{segment.category}</span>
                              </div>
                              <span className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>
                                {formatCurrency(segment.amount)} | {Math.round(segment.percent)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="rounded-3xl border p-5" style={FINANCE_TILE_STYLE}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--muted)' }}>
                        <BarChart3 size={16} />
                        Year-to-date
                      </div>
                      <span className="text-xs" style={{ color: 'var(--muted)' }}>
                        Reporting year {reportingYear}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
                      {financeKpis.map((item) => {
                        const Icon = item.icon;
                        return (
                          <div key={item.key} className="rounded-2xl border p-4 h-full" style={ROW_STYLE}>
                            <div className="flex items-center gap-3 lg:grid lg:grid-cols-[2.5rem_minmax(0,1fr)] lg:grid-rows-[auto_auto] lg:items-start lg:gap-x-3 lg:gap-y-1">
                              <p className="hidden lg:block lg:col-span-2 text-xs font-semibold break-words leading-tight" style={{ color: 'var(--muted)' }}>
                                {item.label}
                              </p>
                              <div
                                className="w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 lg:row-start-2 lg:col-start-1"
                                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)', color: 'var(--primary-dark)' }}
                              >
                                <Icon size={18} />
                              </div>
                              <div className="min-w-0 flex-1 lg:row-start-2 lg:col-start-2 lg:h-10 lg:flex lg:items-center">
                                <p className="text-xs font-semibold break-words leading-tight lg:hidden" style={{ color: 'var(--muted)' }}>
                                  {item.label}
                                </p>
                                <p className="text-lg font-bold leading-none" style={{ color: item.valueColor }}>
                                  {item.value}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-6 rounded-3xl border p-5" style={FINANCE_TILE_STYLE}>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <BarChart3 size={18} style={{ color: 'var(--primary-dark)' }} />
                      <h4 className="font-quicksand font-bold text-lg" style={{ color: 'var(--text)' }}>
                        Cash Flow Snapshot
                      </h4>
                    </div>
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>
                      Reporting year {reportingYear}
                    </span>
                  </div>
                  <div
                    className="grid gap-3 items-end"
                    style={{
                      height: CHART_HEIGHT,
                      gridTemplateColumns: `repeat(${monthlySummary.buckets.length}, minmax(0, 1fr))`,
                    }}
                  >
                    {monthlySummary.buckets.map((bucket) => (
                      <div key={bucket.key} className="flex flex-col items-center gap-2">
                        <div className="flex items-end gap-1 h-full">
                          <div
                            className="w-3 rounded-full"
                            style={{
                              height: `${(bucket.expenses / monthlySummary.maxValue) * CHART_HEIGHT}px`,
                              backgroundColor: 'var(--primary)',
                            }}
                            title={`Expenses: ${formatCurrency(bucket.expenses)}`}
                          />
                          <div
                            className="w-3 rounded-full"
                            style={{
                              height: `${(bucket.income / monthlySummary.maxValue) * CHART_HEIGHT}px`,
                              backgroundColor: 'var(--accent)',
                            }}
                            title={`Income: ${formatCurrency(bucket.income)}`}
                          />
                        </div>
                        <span className="text-xs" style={{ color: 'var(--muted)' }}>{bucket.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 mt-6 text-xs" style={{ color: 'var(--muted)' }}>
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--primary)' }} />
                      Expenses
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
                      Income
                    </span>
                    <span className="flex items-center gap-2 font-semibold" style={{ color: profitValue >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                      Profit {profitLabel}
                    </span>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>

        <div className="flex flex-col" style={{ gap: 'var(--layout-gap)' }}>
          <section className="border bg-[var(--surface)]" style={PANEL_STYLE}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title font-quicksand font-bold text-xl">Time Off Requests</h3>
              <button
                onClick={() => navigate('/time-entries')}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold text-stone-600 hover:bg-[var(--background)] transition-colors"
                style={OUTLINE_STYLE}
              >
                <CalendarCheck size={16} style={{ color: 'var(--primary-dark)' }} />
                Time Requests
              </button>
            </div>

            {timeOffLoading ? (
              <p className="text-xs text-stone-500 italic">Loading time off requests...</p>
            ) : timeOffSummary.total === 0 ? (
              <p className="text-xs text-stone-500 italic">No time off requests right now.</p>
            ) : (
              <div className="space-y-2">
                {timeOffSummary.visible.map((request) => (
                  <button
                    key={request.id}
                    type="button"
                    onClick={() => openTimeOffDetails(request)}
                    className="w-full text-left flex items-center justify-between p-3 rounded-xl border transition-colors hover:bg-[var(--background)]"
                    style={ROW_STYLE}
                  >
                    <div>
                      <p className="text-sm font-semibold text-stone-800">
                        {request.first_name} {request.last_name}
                      </p>
                      <p className="text-xs text-stone-500">
                        {formatRequestType(request.request_type)} | {formatRequestRange(request.start_date, request.end_date)}
                      </p>
                    </div>
                    <span
                      className="text-xs font-semibold"
                      style={{ color: requestStatusTone(request.status) }}
                    >
                      {formatRequestStatus(request.status)}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {timeOffSummary.total > 2 && (
              <button
                onClick={() => navigate('/time-entries')}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 mt-4 rounded-xl border text-sm font-semibold text-stone-600 hover:bg-[var(--background)] transition-colors"
                style={OUTLINE_STYLE}
              >
                See More
              </button>
            )}
          </section>

          <section className="border bg-[var(--surface)]" style={PANEL_STYLE}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title font-quicksand font-bold text-xl">Upcoming Events</h3>
              <button
                onClick={() => navigate('/events')}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold text-stone-600 hover:bg-[var(--background)] transition-colors"
                style={OUTLINE_STYLE}
              >
                <CalendarCheck size={16} style={{ color: 'var(--primary-dark)' }} />
                Full Calendar
              </button>
            </div>
            {upcomingEvents.total === 0 ? (
              <p className="text-xs text-stone-500 italic">No upcoming events scheduled.</p>
            ) : (
              <div className="space-y-2">
                {upcomingEvents.visible.map((eventItem) => (
                  <div
                    key={eventItem.id}
                    className="p-3 rounded-xl border"
                    style={ROW_STYLE}
                  >
                    <p className="text-sm font-semibold text-stone-800">{eventItem.title}</p>
                    <p className="text-xs text-stone-500">
                      {eventItem.event_date ? `${new Date(eventItem.event_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })} | ` : ''}
                      {eventItem.start_time ? `${formatTime(eventItem.start_time)} - ` : ''}
                      {eventItem.location || 'Location not set'}
                    </p>
                  </div>
                ))}
                {upcomingEvents.total > 2 && (
                  <button
                    onClick={() => navigate('/events')}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold text-stone-600 hover:bg-[var(--background)] transition-colors"
                    style={OUTLINE_STYLE}
                  >
                    See More
                  </button>
                )}
              </div>
            )}
          </section>

          <section className="border bg-[var(--surface)]" style={PANEL_STYLE}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title font-quicksand font-bold text-xl">Financial Alerts</h3>
              <ClipboardList size={18} style={{ color: 'var(--primary-dark)' }} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-xl border" style={ROW_STYLE}>
                <div>
                  <p className="text-sm font-semibold text-stone-800">Overdue Invoices</p>
                  <p className="text-xs text-stone-500">Follow up with families today.</p>
                </div>
                <span className="text-sm font-bold" style={{ color: 'var(--danger)' }}>{summary.overdueCount}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl border" style={ROW_STYLE}>
                <div>
                  <p className="text-sm font-semibold text-stone-800">Due Today</p>
                  <p className="text-xs text-stone-500">Invoices due end of day.</p>
                </div>
                <span className="text-sm font-bold" style={{ color: 'var(--primary-dark)' }}>{summary.dueTodayCount}</span>
              </div>
              <button
                onClick={() => navigate('/billing')}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold text-stone-600 hover:bg-[var(--background)] transition-colors"
                style={OUTLINE_STYLE}
              >
                <LogIn size={16} style={{ color: 'var(--primary-dark)' }} />
                Go to Billing
              </button>
            </div>
          </section>
        </div>
      </div>

      <AddChildModal
        isOpen={isAddChildOpen}
        onClose={() => setIsAddChildOpen(false)}
        onSuccess={loadDashboardData}
      />

      <BaseModal
        isOpen={Boolean(activeTimeOffEducator)}
        onClose={() => setActiveTimeOffUserId(null)}
        title={
          activeTimeOffEducator
            ? `Time Off Details - ${activeTimeOffEducator.first_name} ${activeTimeOffEducator.last_name}`
            : 'Time Off Details'
        }
      >
        {activeTimeOffEducator && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-2xl border themed-border p-3 bg-[color:var(--background)]">
                <div className="text-[10px] uppercase tracking-wide text-stone-500">Approved</div>
                <div className="text-lg font-semibold text-stone-800">
                  {activeTimeOffEducator.approvedHours.toFixed(1)}h
                </div>
              </div>
              <div className="rounded-2xl border themed-border p-3 bg-white">
                <div className="text-[10px] uppercase tracking-wide text-stone-500">Pending</div>
                <div className="text-lg font-semibold text-stone-800">
                  {activeTimeOffEducator.pendingHours.toFixed(1)}h
                </div>
              </div>
              <div className="rounded-2xl border themed-border p-3 bg-white">
                <div className="text-[10px] uppercase tracking-wide text-stone-500">Total</div>
                <div className="text-lg font-semibold text-stone-800">
                  {(activeTimeOffEducator.approvedHours + activeTimeOffEducator.pendingHours).toFixed(1)}h
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-stone-500 mb-2">Pending Requests</p>
              {activeGroups.pending.length === 0 ? (
                <div className="text-sm text-stone-500">No pending requests.</div>
              ) : (
                <div className="space-y-2">
                  <div className="hidden sm:grid grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_auto_auto] gap-3 text-[10px] uppercase tracking-wide text-stone-400 px-3">
                    <span>Type</span>
                    <span>Date Range</span>
                    <span>Hours</span>
                    <span className="text-right">Actions</span>
                  </div>
                  {activeGroups.pending.map((group) => (
                    <div
                      key={`pending-${group.ids.join('-')}`}
                      className="rounded-2xl border themed-border bg-white p-3"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_auto_auto] gap-3 items-center">
                        <div className="text-sm font-semibold text-stone-800">
                          {formatRequestType(group.request_type)}
                        </div>
                        <div className="text-sm text-stone-600">
                          {formatRequestRange(group.startKey, group.endKey)}
                        </div>
                        <div className="text-xs font-semibold text-stone-600">
                          {group.totalHours.toFixed(1)}h
                        </div>
                        <div className="flex items-center justify-start sm:justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleApproveBatch(group.ids)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-white"
                            style={{ backgroundColor: 'var(--primary)' }}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRejectingBatch(group);
                              setRejectReason('');
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold border themed-border text-stone-600"
                          >
                            Reject
                          </button>
                        </div>
                        {group.reason && (
                          <div className="text-xs text-stone-500 sm:col-span-4">
                            {group.reason}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-stone-500 mb-2">Approved Requests</p>
              {activeGroups.approved.length === 0 ? (
                <div className="text-sm text-stone-500">No approved requests.</div>
              ) : (
                <div className="space-y-2">
                  <div className="hidden sm:grid grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_auto] gap-3 text-[10px] uppercase tracking-wide text-stone-400 px-3">
                    <span>Type</span>
                    <span>Date Range</span>
                    <span>Hours</span>
                  </div>
                  {activeGroups.approved.map((group) => (
                    <div
                      key={`approved-${group.ids.join('-')}`}
                      className="rounded-2xl border themed-border bg-[color:var(--background)] p-3"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_auto] gap-3 items-center">
                        <div className="text-sm font-semibold text-stone-800">
                          {formatRequestType(group.request_type)}
                        </div>
                        <div className="text-sm text-stone-600">
                          {formatRequestRange(group.startKey, group.endKey)}
                        </div>
                        <div className="text-xs font-semibold text-stone-600">
                          {group.totalHours.toFixed(1)}h
                        </div>
                        {group.reason && (
                          <div className="text-xs text-stone-500 sm:col-span-3">
                            {group.reason}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {activeGroups.rejected.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wide text-stone-500 mb-2">Rejected Requests</p>
                <div className="space-y-2">
                  <div className="hidden sm:grid grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_auto] gap-3 text-[10px] uppercase tracking-wide text-stone-400 px-3">
                    <span>Type</span>
                    <span>Date Range</span>
                    <span>Status</span>
                  </div>
                  {activeGroups.rejected.map((group) => (
                    <div
                      key={`rejected-${group.ids.join('-')}`}
                      className="rounded-2xl border themed-border bg-white p-3"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_auto] gap-3 items-center">
                        <div className="text-sm font-semibold text-stone-800">
                          {formatRequestType(group.request_type)}
                        </div>
                        <div className="text-sm text-stone-600">
                          {formatRequestRange(group.startKey, group.endKey)}
                        </div>
                        <div className="text-xs font-semibold text-stone-500">
                          {formatRequestStatus(group.status)}
                        </div>
                        {group.reason && (
                          <div className="text-xs text-stone-500 sm:col-span-3">
                            {group.reason}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </BaseModal>

      <BaseModal
        isOpen={Boolean(rejectingBatch)}
        onClose={() => {
          setRejectingBatch(null);
          setRejectReason('');
        }}
        title="Reject Time Off Request"
      >
        <div className="space-y-4">
          {rejectingBatch && (
            <p className="text-sm text-stone-600">
              Rejecting {rejectingBatch.first_name} {rejectingBatch.last_name} -{' '}
              {formatRequestRange(rejectingBatch.startKey, rejectingBatch.endKey)}
            </p>
          )}
          <textarea
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white resize-none"
            placeholder="Reason for rejection (optional)"
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setRejectingBatch(null);
                setRejectReason('');
              }}
              className="flex-1 px-4 py-2 rounded-xl border themed-border text-stone-600 font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleRejectBatch}
              className="flex-1 px-4 py-2 rounded-xl text-white font-semibold"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              Reject Request{rejectingBatch && rejectingBatch.ids.length > 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </BaseModal>

      <BaseModal
        isOpen={ratioOpen}
        onClose={() => setRatioOpen(false)}
        title="Staffing Ratio"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveRatio} className="space-y-5">
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Set the kids-to-staff ratio used to check compliance on the dashboard.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border p-4" style={FINANCE_TILE_STYLE}>
              <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--muted)' }}>
                Kids
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={ratioDraft.kids}
                onChange={(event) => setRatioDraft((prev) => ({ ...prev, kids: event.target.value }))}
                className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring"
                style={{ backgroundColor: 'var(--surface)', color: 'var(--text)' }}
              />
            </div>
            <div className="rounded-2xl border p-4" style={FINANCE_TILE_STYLE}>
              <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--muted)' }}>
                Staff
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={ratioDraft.staff}
                onChange={(event) => setRatioDraft((prev) => ({ ...prev, staff: event.target.value }))}
                className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring"
                style={{ backgroundColor: 'var(--surface)', color: 'var(--text)' }}
              />
            </div>
          </div>

          <div className="rounded-2xl border p-4" style={{ ...FINANCE_TILE_STYLE, backgroundColor: 'var(--background)' }}>
            <div className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>Current ratio</div>
            <div className="text-2xl font-bold font-quicksand" style={{ color: 'var(--text)' }}>
              {ratioDraft.kids}:{ratioDraft.staff}
            </div>
            <div className="text-xs" style={{ color: 'var(--muted)' }}>
              {Number.parseFloat(ratioDraft.staff) > 0
                ? `${(Number.parseFloat(ratioDraft.kids) / Number.parseFloat(ratioDraft.staff)).toFixed(1)} kids per staff`
                : 'Add a staff value to calculate coverage.'}
            </div>
          </div>

          {ratioError && (
            <div className="rounded-2xl border p-3 text-sm" style={{ ...FINANCE_TILE_STYLE, color: 'var(--danger)' }}>
              {ratioError}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setRatioOpen(false)}
              className="flex-1 px-5 py-3 rounded-2xl border themed-border themed-hover font-bold transition-colors"
              style={{ color: 'var(--muted)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-5 py-3 rounded-2xl font-bold transition-all"
              style={{ backgroundColor: 'var(--primary)', color: 'var(--on-primary)', boxShadow: '0 12px 20px -12px var(--menu-shadow)' }}
            >
              Save Ratio
            </button>
          </div>
        </form>
      </BaseModal>

      <BaseModal
        isOpen={pendingOpen}
        onClose={() => setPendingOpen(false)}
        title="Pending Tasks"
      >
        {pendingLoading ? (
          <div className="text-sm text-stone-500">Loading tasks...</div>
        ) : pendingNotifications.length === 0 ? (
          <div className="text-sm text-stone-500">No pending tasks right now.</div>
        ) : (
          <div className="space-y-3">
            {pendingNotifications.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => {
                  if (task.action_url) {
                    navigate(task.action_url);
                    setPendingOpen(false);
                  }
                }}
                className="w-full text-left p-4 rounded-2xl border themed-border hover:bg-[var(--background)] transition-colors"
              >
                <p className="text-sm font-semibold text-stone-800">{task.title}</p>
                {task.message && (
                  <p className="text-xs text-stone-500 mt-1">{task.message}</p>
                )}
                <p className="text-[11px] text-stone-400 mt-2">
                  {task.created_at ? new Date(task.created_at).toLocaleString() : ''}
                </p>
              </button>
            ))}
          </div>
        )}
      </BaseModal>
      <SendMessageModal
        isOpen={isMessageOpen}
        onClose={() => setIsMessageOpen(false)}
      />
      <CreateEventModal
        isOpen={isEventOpen}
        onClose={() => setIsEventOpen(false)}
        onSuccess={loadDashboardData}
      />
    </Layout>
  );
}
