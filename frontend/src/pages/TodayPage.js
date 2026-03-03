import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Baby,
  Check,
  ChevronDown,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Plus,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { Layout } from '../components/Layout';
import api from '../utils/api';

const ABSENT_STATUSES = new Set(['ABSENT', 'SICK', 'VACATION']);
const DEFAULT_RATIO = { kids: 4, staff: 1 };
const MAINTENANCE_EVENT_KEYWORDS = [
  'maintenance',
  'inspect',
  'inspection',
  'annual',
  'license',
  'licensing',
  'audit',
  'compliance',
  'safety',
  'certification',
  'renewal',
  'expiry',
  'expiration',
  'fire drill',
];
const CARE_LOG_TYPE_OPTIONS = [
  { value: 'NAP', label: 'Nap' },
  { value: 'PEE', label: 'Pee' },
  { value: 'POO', label: 'Poo' },
];

const formatDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatTime = (value) => {
  if (!value) return '-';
  const [hours, minutes] = String(value).split(':');
  const hour = Number.parseInt(hours, 10);
  if (!Number.isFinite(hour)) return value;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

const CARE_LOG_TIME_OPTIONS = Array.from({ length: 288 }, (_, index) => {
  const totalMinutes = index * 5;
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const minutes = String(totalMinutes % 60).padStart(2, '0');
  const value = `${hours}:${minutes}`;
  return { value, label: formatTime(value) };
});

const isPresentRecord = (record) => {
  const status = String(record?.status || '').toUpperCase();
  if (ABSENT_STATUSES.has(status)) {
    return false;
  }
  return Boolean(
    record?.check_in_time
      || record?.check_out_time
      || ['PRESENT', 'LATE'].includes(status)
  );
};

const isMaintenanceEvent = (eventItem) => {
  const searchable = [
    eventItem?.title,
    eventItem?.description,
    eventItem?.event_type,
    eventItem?.location,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return MAINTENANCE_EVENT_KEYWORDS.some((keyword) => searchable.includes(keyword));
};

export function TodayPage() {
  const navigate = useNavigate();
  const todayKey = useMemo(() => formatDateKey(new Date()), []);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [children, setChildren] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [events, setEvents] = useState([]);
  const [careLogs, setCareLogs] = useState([]);
  const [pendingTasks, setPendingTasks] = useState(0);
  const [compliance, setCompliance] = useState({
    in_compliance: true,
    kids_present: 0,
    staff_scheduled: 0,
    required_staff: 0,
    ratio: {
      kids: DEFAULT_RATIO.kids,
      staff: DEFAULT_RATIO.staff,
      kids_per_staff: DEFAULT_RATIO.kids / DEFAULT_RATIO.staff,
    },
  });
  const [careForm, setCareForm] = useState({
    child_id: '',
    log_type: 'NAP',
    occurred_at: '',
    notes: '',
  });
  const [careSaving, setCareSaving] = useState(false);
  const [careError, setCareError] = useState('');
  const [activeCareDropdown, setActiveCareDropdown] = useState(null);
  const childDropdownRef = useRef(null);
  const logTypeDropdownRef = useRef(null);
  const timeDropdownRef = useRef(null);

  const loadTodayWorkspace = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    setCareError('');
    try {
      const results = await Promise.allSettled([
        api.get('/children?status=ACTIVE'),
        api.get(`/attendance?start_date=${todayKey}&end_date=${todayKey}`),
        api.get(`/schedules/admin/schedules?from=${todayKey}&to=${todayKey}`),
        api.get('/notifications/unread-count'),
        api.get('/care-logs', { params: { date: todayKey } }),
        api.get('/events', { params: { from: todayKey, limit: 12 } }),
        api.get('/attendance/compliance', {
          params: {
            date: todayKey,
            ratio_kids: DEFAULT_RATIO.kids,
            ratio_staff: DEFAULT_RATIO.staff,
          },
        }),
      ]);

      const [
        childrenRes,
        attendanceRes,
        schedulesRes,
        notificationsRes,
        careLogsRes,
        eventsRes,
        complianceRes,
      ] = results;

      const loadedChildren = childrenRes.status === 'fulfilled'
        ? (childrenRes.value.data.children || [])
        : [];
      const attendanceRows = attendanceRes.status === 'fulfilled'
        ? (attendanceRes.value.data.attendance || [])
        : [];
      const scheduleRows = schedulesRes.status === 'fulfilled'
        ? (schedulesRes.value.data.schedules || [])
        : [];

      setChildren(loadedChildren);
      setAttendance(attendanceRows);
      setSchedules(scheduleRows);
      setPendingTasks(
        notificationsRes.status === 'fulfilled' ? (notificationsRes.value.data.count || 0) : 0
      );
      setCareLogs(careLogsRes.status === 'fulfilled' ? (careLogsRes.value.data.logs || []) : []);
      setEvents(eventsRes.status === 'fulfilled' ? (eventsRes.value.data.events || []) : []);

      if (loadedChildren.length > 0) {
        setCareForm((prev) => ({
          ...prev,
          child_id: prev.child_id || String(loadedChildren[0].id),
        }));
      }

      if (complianceRes.status === 'fulfilled') {
        setCompliance(complianceRes.value.data);
      } else {
        const presentCount = attendanceRows.filter(isPresentRecord).length;
        const acceptedStaff = new Set(
          scheduleRows
            .filter((schedule) => schedule.status === 'ACCEPTED')
            .map((schedule) => schedule.user_id)
        );
        const staffScheduled = acceptedStaff.size;
        const kidsPerStaff = DEFAULT_RATIO.kids / DEFAULT_RATIO.staff;
        const requiredStaff = kidsPerStaff > 0 ? Math.ceil(presentCount / kidsPerStaff) : 0;
        setCompliance({
          in_compliance: staffScheduled >= requiredStaff,
          kids_present: presentCount,
          staff_scheduled: staffScheduled,
          required_staff: requiredStaff,
          ratio: {
            kids: DEFAULT_RATIO.kids,
            staff: DEFAULT_RATIO.staff,
            kids_per_staff: kidsPerStaff,
          },
        });
      }
    } catch (error) {
      setLoadError('Failed to load today workspace.');
    } finally {
      setLoading(false);
    }
  }, [todayKey]);

  useEffect(() => {
    void loadTodayWorkspace();
  }, [loadTodayWorkspace]);

  useEffect(() => {
    if (!activeCareDropdown) return undefined;

    const handlePointerDown = (event) => {
      const childOpen = childDropdownRef.current?.contains(event.target);
      const typeOpen = logTypeDropdownRef.current?.contains(event.target);
      const timeOpen = timeDropdownRef.current?.contains(event.target);
      if (!childOpen && !typeOpen && !timeOpen) {
        setActiveCareDropdown(null);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setActiveCareDropdown(null);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [activeCareDropdown]);

  const submitCareLog = async (event) => {
    event.preventDefault();
    const childId = Number.parseInt(careForm.child_id, 10);
    if (!Number.isInteger(childId) || childId <= 0) {
      setCareError('Select a child before saving.');
      return;
    }

    try {
      setCareSaving(true);
      setCareError('');
      await api.post('/care-logs', {
        child_id: childId,
        log_type: careForm.log_type,
        occurred_at: careForm.occurred_at || null,
        notes: careForm.notes.trim() || null,
        log_date: todayKey,
      });

      setCareForm((prev) => ({
        ...prev,
        occurred_at: '',
        notes: '',
      }));

      const refresh = await api.get('/care-logs', { params: { date: todayKey } });
      setCareLogs(refresh.data.logs || []);
    } catch (error) {
      setCareError(error.response?.data?.error || 'Failed to save care log.');
    } finally {
      setCareSaving(false);
    }
  };

  const summary = useMemo(() => {
    const presentCount = attendance.filter(isPresentRecord).length;
    const acceptedStaff = new Set(
      schedules
        .filter((schedule) => schedule.status === 'ACCEPTED')
        .map((schedule) => schedule.user_id)
    );
    const careByType = careLogs.reduce((acc, entry) => {
      const key = String(entry.log_type || '').toUpperCase();
      if (!key) return acc;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return {
      expected: children.length,
      present: presentCount,
      staffScheduled: acceptedStaff.size,
      naps: careByType.NAP || 0,
      pees: careByType.PEE || 0,
      poos: careByType.POO || 0,
      careEntries: careLogs.length,
    };
  }, [attendance, careLogs, children.length, schedules]);

  const sortedCareLogs = useMemo(
    () => [...careLogs].sort((a, b) => {
      const aKey = `${a.log_date || ''} ${a.occurred_at || ''} ${a.created_at || ''}`;
      const bKey = `${b.log_date || ''} ${b.occurred_at || ''} ${b.created_at || ''}`;
      if (aKey < bKey) return 1;
      if (aKey > bKey) return -1;
      return 0;
    }),
    [careLogs]
  );

  const upcomingEvents = useMemo(
    () => events.slice(0, 4),
    [events]
  );

  const maintenanceEvents = useMemo(
    () => events.filter(isMaintenanceEvent).slice(0, 4),
    [events]
  );

  const dateSubtitle = useMemo(
    () =>
      new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    []
  );
  const selectedChildLabel = useMemo(() => {
    if (!careForm.child_id) {
      return 'Select child';
    }
    const selectedChild = children.find((child) => String(child.id) === String(careForm.child_id));
    if (!selectedChild) {
      return 'Select child';
    }
    return `${selectedChild.first_name} ${selectedChild.last_name}`;
  }, [careForm.child_id, children]);

  const selectedLogTypeLabel = useMemo(() => {
    const selected = CARE_LOG_TYPE_OPTIONS.find((option) => option.value === careForm.log_type);
    return selected?.label || 'Nap';
  }, [careForm.log_type]);
  const selectedTimeLabel = useMemo(() => {
    if (!careForm.occurred_at) {
      return 'Select time';
    }
    return formatTime(careForm.occurred_at);
  }, [careForm.occurred_at]);

  const actionBar = (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      <button
        type="button"
        onClick={() => navigate('/attendance')}
        className="inline-flex items-center justify-between rounded-2xl border px-4 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
      >
        Attendance
        <ArrowRight size={14} />
      </button>
      <button
        type="button"
        onClick={() => navigate('/families')}
        className="inline-flex items-center justify-between rounded-2xl border px-4 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
      >
        Families
        <ArrowRight size={14} />
      </button>
      <button
        type="button"
        onClick={() => navigate('/events')}
        className="inline-flex items-center justify-between rounded-2xl border px-4 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
      >
        Calendar
        <ArrowRight size={14} />
      </button>
      <button
        type="button"
        onClick={() => navigate('/dashboard')}
        className="inline-flex items-center justify-between rounded-2xl border px-4 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
      >
        Dashboard
        <ArrowRight size={14} />
      </button>
    </div>
  );

  if (loading) {
    return (
      <Layout title="Today" subtitle={dateSubtitle}>
        <div className="flex min-h-[340px] items-center justify-center">
          <div className="rounded-3xl border px-8 py-10 text-center" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
            <div
              className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4"
              style={{ borderColor: 'var(--border)', borderTopColor: 'var(--primary)' }}
            />
            <div className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>
              Loading your day...
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Today" subtitle={dateSubtitle} actionBar={actionBar}>
      <div className="space-y-6">
        <section
          className="overflow-hidden rounded-[28px] border p-6 md:p-8"
          style={{
            borderColor: 'rgba(var(--accent-rgb), 0.26)',
            backgroundColor: 'var(--surface)',
            boxShadow: '0 20px 40px rgba(15, 23, 42, 0.12)',
            backgroundImage:
              'linear-gradient(150deg, rgba(var(--accent-rgb), 0.18) 0%, rgba(255, 255, 255, 0.95) 52%, rgba(var(--accent-rgb), 0.08) 100%)',
          }}
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p
                className="inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-black uppercase tracking-[0.16em]"
                style={{
                  backgroundColor: 'rgba(var(--accent-rgb), 0.18)',
                  borderColor: 'rgba(var(--accent-rgb), 0.35)',
                  color: 'var(--primary-dark)',
                }}
              >
                <Sparkles size={15} />
                Daily Workspace
              </p>
              <span className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em]" style={{ backgroundColor: 'rgba(255,255,255,0.9)', color: 'var(--primary-dark)' }}>
                Live Operations
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: 'rgba(255,255,255,0.9)', color: 'var(--primary-dark)' }}>
                {summary.present}/{summary.expected} present
              </span>
              <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: 'rgba(255,255,255,0.9)', color: 'var(--primary-dark)' }}>
                {summary.staffScheduled} staff scheduled
              </span>
              <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: 'rgba(255,255,255,0.9)', color: 'var(--primary-dark)' }}>
                {summary.careEntries} care entries
              </span>
              <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: 'rgba(255,255,255,0.9)', color: compliance.in_compliance ? 'var(--success)' : 'var(--danger)' }}>
                {compliance.in_compliance ? 'In compliance' : 'Needs coverage'}
              </span>
            </div>
          </div>
        </section>

        {loadError ? (
          <div className="rounded-2xl border px-4 py-3 text-sm" style={{ borderColor: 'var(--danger)', color: 'var(--danger)', backgroundColor: 'rgba(239, 68, 68, 0.07)' }}>
            {loadError}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
            <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--muted)' }}>
              Attendance
            </p>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-3xl font-black text-stone-800">{summary.present}</span>
              <span className="mb-1 text-sm text-stone-500">present now</span>
            </div>
          </div>

          <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
            <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--muted)' }}>
              Staffing
            </p>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-3xl font-black text-stone-800">{summary.staffScheduled}</span>
              <span className="mb-1 text-sm text-stone-500">scheduled</span>
            </div>
          </div>

          <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
            <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--muted)' }}>
              Care Logs
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-full px-2.5 py-1 font-semibold" style={{ backgroundColor: 'rgba(var(--accent-rgb), 0.12)', color: 'var(--primary-dark)' }}>Naps {summary.naps}</span>
              <span className="rounded-full px-2.5 py-1 font-semibold" style={{ backgroundColor: 'rgba(var(--accent-rgb), 0.12)', color: 'var(--primary-dark)' }}>Pees {summary.pees}</span>
              <span className="rounded-full px-2.5 py-1 font-semibold" style={{ backgroundColor: 'rgba(var(--accent-rgb), 0.12)', color: 'var(--primary-dark)' }}>Poos {summary.poos}</span>
            </div>
          </div>

          <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
            <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--muted)' }}>
              Pending Tasks
            </p>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-3xl font-black text-stone-800">{pendingTasks}</span>
              <span className="mb-1 text-sm text-stone-500">notifications</span>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-[28px] border p-5 md:p-6" style={{ borderColor: 'rgba(var(--accent-rgb), 0.24)', backgroundColor: 'var(--surface)' }}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="font-quicksand text-xl font-bold text-stone-800">Today&apos;s Naps, Pees, and Poos</h3>
              <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: 'rgba(var(--accent-rgb), 0.12)', color: 'var(--primary-dark)' }}>
                <Baby size={14} />
                {todayKey}
              </span>
            </div>

            <form onSubmit={submitCareLog} className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-3">
                <div ref={childDropdownRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setActiveCareDropdown((prev) => (prev === 'child' ? null : 'child'))}
                    className="w-full px-3 py-2 rounded-xl border themed-ring text-sm text-left"
                    style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
                    aria-haspopup="listbox"
                    aria-expanded={activeCareDropdown === 'child'}
                  >
                    <span className={careForm.child_id ? 'text-stone-700 font-medium' : 'text-stone-400'}>
                      {selectedChildLabel}
                    </span>
                    <ChevronDown
                      size={14}
                      className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 transition-transform ${
                        activeCareDropdown === 'child' ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {activeCareDropdown === 'child' && (
                    <div className="absolute z-30 mt-2 w-full rounded-2xl border border-[#FFE5D9] bg-white shadow-lg shadow-[#FF9B85]/10">
                      <div className="max-h-56 overflow-y-auto p-2 space-y-1" role="listbox">
                        <button
                          type="button"
                          onClick={() => {
                            setCareForm((prev) => ({ ...prev, child_id: '' }));
                            setActiveCareDropdown(null);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                            !careForm.child_id
                              ? 'bg-[#FF9B85] text-white'
                              : 'text-stone-700 hover:bg-[#FFF8F3]'
                          }`}
                        >
                          Select child
                        </button>
                        {children.map((child) => {
                          const optionValue = String(child.id);
                          const isSelected = String(careForm.child_id) === optionValue;
                          return (
                            <button
                              key={child.id}
                              type="button"
                              onClick={() => {
                                setCareForm((prev) => ({ ...prev, child_id: optionValue }));
                                setActiveCareDropdown(null);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center justify-between gap-2 ${
                                isSelected
                                  ? 'bg-[#FF9B85] text-white'
                                  : 'text-stone-700 hover:bg-[#FFF8F3]'
                              }`}
                            >
                              <span>{child.first_name} {child.last_name}</span>
                              {isSelected ? <Check size={14} /> : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <div ref={logTypeDropdownRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setActiveCareDropdown((prev) => (prev === 'type' ? null : 'type'))}
                    className="w-full px-3 py-2 rounded-xl border themed-ring text-sm text-left"
                    style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
                    aria-haspopup="listbox"
                    aria-expanded={activeCareDropdown === 'type'}
                  >
                    <span className="text-stone-700 font-medium">{selectedLogTypeLabel}</span>
                    <ChevronDown
                      size={14}
                      className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 transition-transform ${
                        activeCareDropdown === 'type' ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {activeCareDropdown === 'type' && (
                    <div className="absolute z-30 mt-2 w-full rounded-2xl border border-[#FFE5D9] bg-white shadow-lg shadow-[#FF9B85]/10">
                      <div className="max-h-56 overflow-y-auto p-2 space-y-1" role="listbox">
                        {CARE_LOG_TYPE_OPTIONS.map((option) => {
                          const isSelected = careForm.log_type === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => {
                                setCareForm((prev) => ({ ...prev, log_type: option.value }));
                                setActiveCareDropdown(null);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center justify-between gap-2 ${
                                isSelected
                                  ? 'bg-[#FF9B85] text-white'
                                  : 'text-stone-700 hover:bg-[#FFF8F3]'
                              }`}
                            >
                              <span>{option.label}</span>
                              {isSelected ? <Check size={14} /> : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <div ref={timeDropdownRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setActiveCareDropdown((prev) => (prev === 'time' ? null : 'time'))}
                    className="w-full px-3 py-2 rounded-xl border themed-ring text-sm text-left"
                    style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
                    aria-haspopup="listbox"
                    aria-expanded={activeCareDropdown === 'time'}
                  >
                    <span className={careForm.occurred_at ? 'text-stone-700 font-medium' : 'text-stone-400'}>
                      {selectedTimeLabel}
                    </span>
                    <ChevronDown
                      size={14}
                      className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 transition-transform ${
                        activeCareDropdown === 'time' ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {activeCareDropdown === 'time' && (
                    <div className="absolute z-30 mt-2 w-full rounded-2xl border border-[#FFE5D9] bg-white shadow-lg shadow-[#FF9B85]/10">
                      <div className="max-h-56 overflow-y-auto p-2 space-y-1" role="listbox">
                        <button
                          type="button"
                          onClick={() => {
                            setCareForm((prev) => ({ ...prev, occurred_at: '' }));
                            setActiveCareDropdown(null);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                            !careForm.occurred_at
                              ? 'bg-[#FF9B85] text-white'
                              : 'text-stone-700 hover:bg-[#FFF8F3]'
                          }`}
                        >
                          Select time
                        </button>
                        {CARE_LOG_TIME_OPTIONS.map((option) => {
                          const isSelected = careForm.occurred_at === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => {
                                setCareForm((prev) => ({ ...prev, occurred_at: option.value }));
                                setActiveCareDropdown(null);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center justify-between gap-2 ${
                                isSelected
                                  ? 'bg-[#FF9B85] text-white'
                                  : 'text-stone-700 hover:bg-[#FFF8F3]'
                              }`}
                            >
                              <span>{option.label}</span>
                              {isSelected ? <Check size={14} /> : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <textarea
                rows={2}
                value={careForm.notes}
                onChange={(event) => setCareForm((prev) => ({ ...prev, notes: event.target.value }))}
                placeholder="Optional notes..."
                className="w-full rounded-xl border px-3 py-2 text-sm themed-ring resize-none"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
              />
              <button
                type="submit"
                disabled={careSaving}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                style={{ backgroundColor: 'var(--primary)' }}
              >
                <Plus size={14} />
                {careSaving ? 'Saving...' : 'Add Entry'}
              </button>
            </form>

            {careError ? (
              <div className="mt-3 rounded-xl border px-3 py-2 text-sm" style={{ borderColor: 'var(--danger)', color: 'var(--danger)', backgroundColor: 'rgba(239, 68, 68, 0.07)' }}>
                {careError}
              </div>
            ) : null}

            <div className="mt-4 space-y-2">
              {sortedCareLogs.length === 0 ? (
                <p className="rounded-xl border px-3 py-3 text-sm italic" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
                  No care entries yet today.
                </p>
              ) : (
                sortedCareLogs.slice(0, 8).map((log) => (
                  <div key={log.id} className="rounded-xl border px-3 py-2.5" style={{ borderColor: 'var(--border)', backgroundColor: 'rgba(255, 255, 255, 0.9)' }}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-stone-800">
                        {log.child_name} | {log.log_type}
                      </p>
                      <p className="text-xs text-stone-500">{formatTime(log.occurred_at)}</p>
                    </div>
                    {log.notes ? (
                      <p className="mt-1 text-xs text-stone-600">{log.notes}</p>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </section>

          <div className="space-y-6">
            <section className="rounded-[28px] border p-5 md:p-6" style={{ borderColor: 'rgba(var(--accent-rgb), 0.24)', backgroundColor: 'var(--surface)' }}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-quicksand text-lg font-bold text-stone-800">Coming Up &amp; Maintenance</h3>
                <button
                  type="button"
                  onClick={() => navigate('/events')}
                  className="text-xs font-semibold"
                  style={{ color: 'var(--primary-dark)' }}
                >
                  Full Calendar
                </button>
              </div>

              <div className="space-y-2">
                {maintenanceEvents.length > 0 ? (
                  maintenanceEvents.map((eventItem) => (
                    <div key={`m-${eventItem.id}`} className="rounded-xl border px-3 py-2.5" style={{ borderColor: 'rgba(var(--accent-rgb), 0.28)', backgroundColor: 'rgba(var(--accent-rgb), 0.08)' }}>
                      <p className="text-sm font-semibold text-stone-800">{eventItem.title}</p>
                      <p className="text-xs text-stone-600">
                        {eventItem.event_date ? new Date(eventItem.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No date'}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="rounded-xl border px-3 py-3 text-xs italic" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
                    No inspection/maintenance reminders are currently tagged in upcoming events.
                  </p>
                )}
              </div>

              <div className="mt-4 space-y-2">
                {upcomingEvents.slice(0, 3).map((eventItem) => (
                  <div key={eventItem.id} className="rounded-xl border px-3 py-2.5" style={{ borderColor: 'var(--border)' }}>
                    <p className="text-sm font-semibold text-stone-800">{eventItem.title}</p>
                    <p className="text-xs text-stone-500">
                      {eventItem.event_date ? new Date(eventItem.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No date'}
                      {eventItem.start_time ? ` | ${formatTime(eventItem.start_time)}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[28px] border p-5 md:p-6" style={{ borderColor: 'rgba(var(--accent-rgb), 0.24)', backgroundColor: 'var(--surface)' }}>
              <h3 className="mb-3 font-quicksand text-lg font-bold text-stone-800">Daily Readiness</h3>
              <div className="space-y-2.5">
                <div className="flex items-start gap-2">
                  {compliance.in_compliance ? (
                    <CheckCircle2 size={16} style={{ color: 'var(--success)', marginTop: 2 }} />
                  ) : (
                    <AlertTriangle size={16} style={{ color: 'var(--danger)', marginTop: 2 }} />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-stone-800">Staffing Compliance</p>
                    <p className="text-xs text-stone-600">
                      {compliance.staff_scheduled} scheduled, {compliance.required_staff} required ({compliance.ratio?.kids || DEFAULT_RATIO.kids}:{compliance.ratio?.staff || DEFAULT_RATIO.staff} ratio)
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <ClipboardCheck size={16} style={{ color: 'var(--primary-dark)', marginTop: 2 }} />
                  <div>
                    <p className="text-sm font-semibold text-stone-800">Attendance Coverage</p>
                    <p className="text-xs text-stone-600">
                      {summary.present} of {summary.expected} children accounted for today.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Clock3 size={16} style={{ color: 'var(--primary-dark)', marginTop: 2 }} />
                  <div>
                    <p className="text-sm font-semibold text-stone-800">Pending Tasks</p>
                    <p className="text-xs text-stone-600">
                      {pendingTasks} unread task notifications.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => navigate('/time-entries')}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold"
                  style={{ borderColor: 'var(--border)', color: 'var(--primary-dark)' }}
                >
                  <ShieldCheck size={14} />
                  Time Requests
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/families')}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold"
                  style={{ borderColor: 'var(--border)', color: 'var(--primary-dark)' }}
                >
                  <Users size={14} />
                  Family Follow-up
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default TodayPage;
