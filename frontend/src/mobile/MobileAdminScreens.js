import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Bell,
  CalendarDays,
  ChevronRight,
  Clock3,
  Mail,
  MessageSquarePlus,
  Plus,
  Settings,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { CreateEventModal } from '../components/modals/CreateEventModal';

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

function todayKey() {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

function formatTime(value) {
  if (!value) return '';
  const [hours, minutes] = String(value).split(':');
  const hour = Number.parseInt(hours, 10);
  if (!Number.isFinite(hour)) return value;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${suffix}`;
}

function isPresentRecord(record) {
  const status = String(record?.status || '').toUpperCase();
  if (['ABSENT', 'SICK', 'VACATION'].includes(status)) return false;
  return Boolean(record?.check_in_time || record?.check_out_time || ['PRESENT', 'LATE'].includes(status));
}

function isMaintenanceEvent(eventItem) {
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
}

function MobilePanel({ children, tone = 'white', className = '' }) {
  const tones = {
    white: 'bg-white',
    warm: 'bg-[var(--background)]',
    accent: 'bg-[rgba(var(--accent-rgb),0.18)]',
  };

  return (
    <section className={`rounded-[28px] ${tones[tone]} p-4 shadow-[0_12px_34px_rgba(15,23,42,0.08)] ${className}`}>
      {children}
    </section>
  );
}

function ComposerSheet({
  isOpen,
  recipients,
  recipientsLoading,
  selectedIds,
  onToggleRecipient,
  sendToAll,
  onSendToAllChange,
  subject,
  onSubjectChange,
  message,
  onMessageChange,
  sending,
  onClose,
  onSend,
  error,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      <button type="button" className="absolute inset-0 bg-black/35" onClick={onClose} aria-label="Close message composer" />
      <div className="absolute inset-x-0 bottom-0 rounded-t-[32px] bg-white px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-5 shadow-[0_-18px_48px_rgba(15,23,42,0.18)]">
        <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-stone-200" />
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Admin Messages</p>
            <h3 className="font-quicksand text-2xl font-bold text-stone-900">New Message</h3>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-stone-500">
            <X size={18} />
          </button>
        </div>

        {error ? (
          <div className="mb-3 rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="mb-3 rounded-[24px] bg-stone-50 p-4">
          <label className="flex items-center gap-2 text-sm font-medium text-stone-700">
            <input type="checkbox" checked={sendToAll} onChange={(event) => onSendToAllChange(event.target.checked)} />
            Send to all families
          </label>
        </div>

        {!sendToAll ? (
          <div className="mb-3 max-h-40 space-y-2 overflow-y-auto rounded-[24px] bg-stone-50 p-3">
            {recipientsLoading ? (
              <div className="px-2 py-3 text-sm text-stone-500">Loading families...</div>
            ) : recipients.length === 0 ? (
              <div className="px-2 py-3 text-sm text-stone-500">No families found.</div>
            ) : (
              recipients.map((recipient) => (
                <label key={recipient.id} className="flex items-start gap-3 rounded-[20px] bg-white px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(recipient.id)}
                    onChange={() => onToggleRecipient(recipient.id)}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-stone-800">{recipient.first_name} {recipient.last_name}</p>
                    <p className="truncate text-xs text-stone-500">{recipient.children || 'No children listed'}</p>
                  </div>
                </label>
              ))
            )}
          </div>
        ) : null}

        <input
          value={subject}
          onChange={(event) => onSubjectChange(event.target.value)}
          placeholder="Subject"
          className="mb-3 w-full rounded-[24px] border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700 outline-none focus:border-[var(--primary)]"
        />
        <textarea
          rows={5}
          value={message}
          onChange={(event) => onMessageChange(event.target.value)}
          placeholder="Write your message..."
          className="mb-4 w-full resize-none rounded-[24px] border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700 outline-none focus:border-[var(--primary)]"
        />

        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={onClose} className="rounded-full border border-stone-200 px-4 py-3 text-sm font-semibold text-stone-600">
            Cancel
          </button>
          <button
            type="button"
            onClick={onSend}
            disabled={sending}
            className="rounded-full bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function MobileAdminTodayScreen() {
  const navigate = useNavigate();
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

  const loadWorkspace = useCallback(async () => {
    const date = todayKey();
    try {
      setLoading(true);
      setLoadError('');
      const results = await Promise.allSettled([
        api.get('/children', { params: { status: 'ACTIVE' } }),
        api.get('/attendance', { params: { start_date: date, end_date: date } }),
        api.get('/schedules/admin/schedules', { params: { from: date, to: date } }),
        api.get('/notifications/unread-count'),
        api.get('/care-logs', { params: { date } }),
        api.get('/events', { params: { from: date, limit: 12 } }),
        api.get('/attendance/compliance', {
          params: {
            date,
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

      const loadedChildren = childrenRes.status === 'fulfilled' ? (childrenRes.value.data.children || []) : [];
      const loadedAttendance = attendanceRes.status === 'fulfilled' ? (attendanceRes.value.data.attendance || []) : [];
      const loadedSchedules = schedulesRes.status === 'fulfilled' ? (schedulesRes.value.data.schedules || []) : [];
      const loadedEvents = eventsRes.status === 'fulfilled' ? (eventsRes.value.data.events || []) : [];
      const loadedCareLogs = careLogsRes.status === 'fulfilled' ? (careLogsRes.value.data.logs || []) : [];

      setChildren(loadedChildren);
      setAttendance(loadedAttendance);
      setSchedules(loadedSchedules);
      setEvents(loadedEvents);
      setCareLogs(loadedCareLogs);
      setPendingTasks(notificationsRes.status === 'fulfilled' ? (notificationsRes.value.data.count || 0) : 0);

      if (complianceRes.status === 'fulfilled') {
        setCompliance(complianceRes.value.data);
      } else {
        const presentCount = loadedAttendance.filter(isPresentRecord).length;
        const acceptedStaff = new Set(
          loadedSchedules
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
  }, []);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  const summary = useMemo(() => {
    const present = attendance.filter(isPresentRecord).length;
    const absent = attendance.filter((item) => ['ABSENT', 'SICK', 'VACATION'].includes(String(item.status || '').toUpperCase())).length;
    const staffOnShift = new Set(
      schedules
        .filter((schedule) => schedule.status === 'ACCEPTED')
        .map((schedule) => schedule.user_id)
    ).size;
    return {
      present,
      absent,
      staffOnShift,
      careEntries: careLogs.length,
      urgent: Number(!compliance.in_compliance) + Number(pendingTasks > 0) + Number(events.some(isMaintenanceEvent)),
    };
  }, [attendance, schedules, careLogs.length, compliance.in_compliance, pendingTasks, events]);

  const maintenanceEvents = useMemo(() => events.filter(isMaintenanceEvent).slice(0, 3), [events]);
  const recentCareLogs = useMemo(() => [...careLogs].slice(0, 4), [careLogs]);
  const coverageLabel = compliance.in_compliance ? 'In ratio' : 'Needs coverage';

  return (
    <div className="space-y-4">
      <MobilePanel tone="accent">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--primary-dark)]">
              <Sparkles size={13} />
              Live Oversight
            </p>
            <h1 className="mt-3 font-quicksand text-3xl font-bold text-stone-900">Today</h1>
            <p className="mt-1 text-sm text-stone-600">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={loadWorkspace}
            className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-stone-600 shadow-sm"
          >
            Refresh
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-[24px] bg-white px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Checked In</p>
            <p className="mt-1 text-3xl font-black text-stone-900">{summary.present}</p>
          </div>
          <div className="rounded-[24px] bg-white px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Absent</p>
            <p className="mt-1 text-3xl font-black text-stone-900">{summary.absent}</p>
          </div>
          <div className="rounded-[24px] bg-white px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Staff On Shift</p>
            <p className="mt-1 text-3xl font-black text-stone-900">{summary.staffOnShift}</p>
          </div>
          <div className={`rounded-[24px] px-4 py-3 ${compliance.in_compliance ? 'bg-emerald-50' : 'bg-amber-50'}`}>
            <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${compliance.in_compliance ? 'text-emerald-700' : 'text-amber-700'}`}>Coverage</p>
            <p className={`mt-1 text-lg font-black ${compliance.in_compliance ? 'text-emerald-900' : 'text-amber-900'}`}>{coverageLabel}</p>
          </div>
        </div>
      </MobilePanel>

      {loadError ? (
        <MobilePanel className="border border-rose-200 bg-rose-50 text-sm text-rose-700 shadow-none">
          {loadError}
        </MobilePanel>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => navigate('/admin/attendance')} className="rounded-[24px] bg-white px-4 py-4 text-left shadow-[0_12px_34px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Quick Action</p>
          <div className="mt-2 flex items-center justify-between">
            <span className="font-semibold text-stone-900">Attendance</span>
            <ArrowRight size={16} className="text-[var(--primary-dark)]" />
          </div>
        </button>
        <button type="button" onClick={() => navigate('/admin/messages')} className="rounded-[24px] bg-white px-4 py-4 text-left shadow-[0_12px_34px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Quick Action</p>
          <div className="mt-2 flex items-center justify-between">
            <span className="font-semibold text-stone-900">Messages</span>
            <ArrowRight size={16} className="text-[var(--primary-dark)]" />
          </div>
        </button>
      </div>

      <MobilePanel>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Readiness</p>
            <h2 className="mt-1 font-quicksand text-xl font-bold text-stone-900">Daily Status</h2>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${compliance.in_compliance ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
            {coverageLabel}
          </span>
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex items-start gap-3 rounded-[22px] bg-stone-50 px-4 py-3">
            <Users size={18} className="mt-0.5 text-[var(--primary-dark)]" />
            <div>
              <p className="text-sm font-semibold text-stone-900">Staffing Compliance</p>
              <p className="mt-1 text-xs text-stone-500">
                {compliance.staff_scheduled} scheduled, {compliance.required_staff} required at {compliance.ratio?.kids || DEFAULT_RATIO.kids}:{compliance.ratio?.staff || DEFAULT_RATIO.staff}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-[22px] bg-stone-50 px-4 py-3">
            <Bell size={18} className="mt-0.5 text-[var(--primary-dark)]" />
            <div>
              <p className="text-sm font-semibold text-stone-900">Pending Follow-Up</p>
              <p className="mt-1 text-xs text-stone-500">{pendingTasks} unread notifications need review.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-[22px] bg-stone-50 px-4 py-3">
            <Clock3 size={18} className="mt-0.5 text-[var(--primary-dark)]" />
            <div>
              <p className="text-sm font-semibold text-stone-900">Care Activity</p>
              <p className="mt-1 text-xs text-stone-500">{summary.careEntries} care entries posted so far for {children.length} active children.</p>
            </div>
          </div>
        </div>
      </MobilePanel>

      <MobilePanel>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Urgent Follow-Up</p>
            <h2 className="mt-1 font-quicksand text-xl font-bold text-stone-900">Priority Stack</h2>
          </div>
          <span className="rounded-full bg-[var(--background)] px-3 py-1 text-xs font-semibold text-[var(--primary-dark)]">
            {summary.urgent} items
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {pendingTasks > 0 ? (
            <button type="button" onClick={() => navigate('/admin/messages')} className="flex w-full items-center justify-between rounded-[22px] bg-amber-50 px-4 py-3 text-left">
              <div>
                <p className="text-sm font-semibold text-amber-900">Unread messages and notifications</p>
                <p className="mt-1 text-xs text-amber-700">{pendingTasks} items waiting for follow-up.</p>
              </div>
              <ChevronRight size={16} className="text-amber-700" />
            </button>
          ) : null}

          {!compliance.in_compliance ? (
            <div className="rounded-[22px] bg-rose-50 px-4 py-3">
              <p className="text-sm font-semibold text-rose-900">Coverage alert</p>
              <p className="mt-1 text-xs text-rose-700">Current staffing is below the required ratio for today.</p>
            </div>
          ) : null}

          {maintenanceEvents.map((eventItem) => (
            <button key={eventItem.id} type="button" onClick={() => navigate('/admin/events')} className="flex w-full items-center justify-between rounded-[22px] bg-stone-50 px-4 py-3 text-left">
              <div>
                <p className="text-sm font-semibold text-stone-900">{eventItem.title}</p>
                <p className="mt-1 text-xs text-stone-500">
                  {eventItem.event_date ? new Date(eventItem.event_date).toLocaleDateString() : 'No date'}
                </p>
              </div>
              <ChevronRight size={16} className="text-stone-400" />
            </button>
          ))}

          {pendingTasks === 0 && compliance.in_compliance && maintenanceEvents.length === 0 ? (
            <div className="rounded-[22px] bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
              No urgent items at the moment.
            </div>
          ) : null}
        </div>
      </MobilePanel>

      <MobilePanel>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Latest Care Logs</p>
            <h2 className="mt-1 font-quicksand text-xl font-bold text-stone-900">Shared With Parents</h2>
          </div>
          <button type="button" onClick={() => navigate('/admin/attendance')} className="text-xs font-semibold text-[var(--primary-dark)]">
            Open attendance
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {loading ? (
            <p className="text-sm text-stone-500">Loading updates...</p>
          ) : recentCareLogs.length === 0 ? (
            <p className="rounded-[22px] bg-stone-50 px-4 py-4 text-sm text-stone-500">No care logs shared yet today.</p>
          ) : (
            recentCareLogs.map((log) => (
              <div key={log.id} className="rounded-[22px] bg-stone-50 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-stone-900">{log.child_name} | {log.log_type}</p>
                  <p className="text-xs text-stone-500">{formatTime(log.occurred_at)}</p>
                </div>
                {log.notes ? <p className="mt-2 text-xs text-stone-600">{log.notes}</p> : null}
              </div>
            ))
          )}
        </div>
      </MobilePanel>
    </div>
  );
}

export function MobileAdminMessagesScreen() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showComposer, setShowComposer] = useState(false);
  const [recipients, setRecipients] = useState([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [selectedRecipientIds, setSelectedRecipientIds] = useState([]);
  const [sendToAll, setSendToAll] = useState(false);
  const [subject, setSubject] = useState('Message from Admin');
  const [messageBody, setMessageBody] = useState('');
  const [sendError, setSendError] = useState('');
  const [sending, setSending] = useState(false);

  const loadMessages = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/messages/inbox', { params: { limit: 60 } });
      const inbox = (response.data.messages || []).filter((item) => item.to_user_id);
      setMessages(inbox);
    } catch (error) {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRecipients = async () => {
    try {
      setRecipientsLoading(true);
      const response = await api.get('/messages/recipients');
      setRecipients(response.data.recipients || []);
    } catch (error) {
      setRecipients([]);
    } finally {
      setRecipientsLoading(false);
    }
  };

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  const unreadCount = useMemo(() => messages.filter((item) => !item.is_read).length, [messages]);

  const toggleRecipient = (id) => {
    setSelectedRecipientIds((prev) => (
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    ));
  };

  const handleOpenComposer = () => {
    setShowComposer(true);
    setSendError('');
    if (recipients.length === 0) {
      void loadRecipients();
    }
  };

  const handleCloseComposer = () => {
    setShowComposer(false);
    setSelectedRecipientIds([]);
    setSendToAll(false);
    setSubject('Message from Admin');
    setMessageBody('');
    setSendError('');
  };

  const handleSend = async () => {
    if (!messageBody.trim()) {
      setSendError('Message is required.');
      return;
    }
    if (!sendToAll && selectedRecipientIds.length === 0) {
      setSendError('Choose at least one family or send to all.');
      return;
    }

    try {
      setSending(true);
      if (sendToAll) {
        await api.post('/messages/send', {
          recipientType: 'all',
          subject,
          message: messageBody,
        });
      } else {
        await Promise.all(
          selectedRecipientIds.map((id) => api.post('/messages/send', {
            recipientType: 'parent',
            parentId: id,
            subject,
            message: messageBody,
          }))
        );
      }
      handleCloseComposer();
      await loadMessages();
    } catch (error) {
      setSendError(error.response?.data?.error || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const markAsRead = async (messageId) => {
    try {
      await api.patch(`/messages/${messageId}/read`);
      setMessages((prev) => prev.map((item) => (
        item.id === messageId ? { ...item, is_read: true } : item
      )));
    } catch (error) {
      // ignore
    }
  };

  return (
    <div className="space-y-4">
      <MobilePanel tone="accent">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Admin Inbox</p>
            <h1 className="mt-1 font-quicksand text-3xl font-bold text-stone-900">Messages</h1>
            <p className="mt-1 text-sm text-stone-600">{unreadCount} unread conversations</p>
          </div>
          <button
            type="button"
            onClick={handleOpenComposer}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white"
          >
            <MessageSquarePlus size={16} />
            Compose
          </button>
        </div>
      </MobilePanel>

      {loading ? (
        <MobilePanel className="text-sm text-stone-500">Loading messages...</MobilePanel>
      ) : messages.length === 0 ? (
        <MobilePanel className="text-sm text-stone-500">No messages yet.</MobilePanel>
      ) : (
        messages.map((msg) => (
          <button
            key={msg.id}
            type="button"
            onClick={() => {
              if (!msg.is_read) {
                void markAsRead(msg.id);
              }
            }}
            className={`w-full rounded-[28px] p-4 text-left shadow-[0_12px_34px_rgba(15,23,42,0.08)] ${
              msg.is_read ? 'bg-white' : 'bg-[var(--background)]'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Mail size={16} className="text-[var(--primary-dark)]" />
                  <p className="truncate text-sm font-semibold text-stone-900">{msg.parent_name || `${msg.parent_first_name || ''} ${msg.parent_last_name || ''}`.trim() || 'Parent'}</p>
                </div>
                <p className="mt-2 text-sm font-medium text-stone-700">{msg.subject || 'Message'}</p>
                <p className="mt-1 line-clamp-2 text-xs text-stone-500">{msg.message}</p>
              </div>
              <div className="shrink-0 text-right">
                {!msg.is_read ? <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--primary)]" /> : null}
                <p className="mt-3 text-[11px] text-stone-400">{new Date(msg.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </button>
        ))
      )}

      <ComposerSheet
        isOpen={showComposer}
        recipients={recipients}
        recipientsLoading={recipientsLoading}
        selectedIds={selectedRecipientIds}
        onToggleRecipient={toggleRecipient}
        sendToAll={sendToAll}
        onSendToAllChange={setSendToAll}
        subject={subject}
        onSubjectChange={setSubject}
        message={messageBody}
        onMessageChange={setMessageBody}
        sending={sending}
        onClose={handleCloseComposer}
        onSend={handleSend}
        error={sendError}
      />
    </div>
  );
}

export function MobileAdminEventsScreen() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      const response = await api.get('/events', {
        params: {
          from: start.toISOString().split('T')[0],
          to: end.toISOString().split('T')[0],
        },
      });
      setEvents(response.data.events || []);
    } catch (error) {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const sortedEvents = useMemo(
    () => [...events].sort((left, right) => `${left.event_date || ''} ${left.start_time || ''}`.localeCompare(`${right.event_date || ''} ${right.start_time || ''}`)),
    [events]
  );

  return (
    <div className="space-y-4">
      <MobilePanel tone="accent">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Calendar</p>
            <h1 className="mt-1 font-quicksand text-3xl font-bold text-stone-900">
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h1>
            <p className="mt-1 text-sm text-stone-600">Events, family dates, and maintenance reminders.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white"
          >
            <Plus size={16} />
            Add
          </button>
        </div>
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-stone-600">
            Prev
          </button>
          <button type="button" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-stone-600">
            Next
          </button>
        </div>
      </MobilePanel>

      {loading ? (
        <MobilePanel className="text-sm text-stone-500">Loading events...</MobilePanel>
      ) : sortedEvents.length === 0 ? (
        <MobilePanel className="text-sm text-stone-500">No events scheduled this month.</MobilePanel>
      ) : (
        sortedEvents.map((event) => (
          <MobilePanel key={`${event.id}-${event.event_date}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <CalendarDays size={16} className="text-[var(--primary-dark)]" />
                  <p className="text-sm font-semibold text-stone-900">{event.title}</p>
                </div>
                <p className="mt-2 text-xs text-stone-500">
                  {event.event_date ? new Date(event.event_date).toLocaleDateString() : 'No date'}
                  {event.start_time ? ` | ${formatTime(event.start_time)}` : ''}
                </p>
                {event.location ? <p className="mt-1 text-xs text-stone-500">{event.location}</p> : null}
                {event.description ? <p className="mt-2 text-sm text-stone-600">{event.description}</p> : null}
              </div>
              <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${isMaintenanceEvent(event) ? 'bg-amber-100 text-amber-700' : 'bg-[var(--background)] text-[var(--primary-dark)]'}`}>
                {isMaintenanceEvent(event) ? 'Maintenance' : 'Event'}
              </span>
            </div>
          </MobilePanel>
        ))
      )}

      <CreateEventModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        initialDate={currentMonth}
        onSuccess={() => {
          setShowCreateModal(false);
          void loadEvents();
        }}
      />
    </div>
  );
}

export function MobileAdminMoreScreen() {
  const navigate = useNavigate();
  const [familySummary, setFamilySummary] = useState({ families: 0, parents: 0, children: 0 });
  const [newsletters, setNewsletters] = useState([]);

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const [familiesRes, newslettersRes] = await Promise.all([
          api.get('/families'),
          api.get('/newsletters', { params: { limit: 3 } }),
        ]);
        const families = familiesRes.data.families || [];
        setFamilySummary({
          families: families.length,
          parents: families.reduce((sum, family) => sum + (family.parents?.length || 0), 0),
          children: families.reduce((sum, family) => sum + (family.children?.length || 0), 0),
        });
        setNewsletters(newslettersRes.data.newsletters || []);
      } catch (error) {
        setFamilySummary({ families: 0, parents: 0, children: 0 });
        setNewsletters([]);
      }
    };

    void loadSummary();
  }, []);

  return (
    <div className="space-y-4">
      <MobilePanel tone="accent">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Admin More</p>
            <h1 className="mt-1 font-quicksand text-3xl font-bold text-stone-900">Operations</h1>
            <p className="mt-1 text-sm text-stone-600">High-level family info, parent updates, and settings.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[var(--primary-dark)] shadow-sm"
          >
            <Settings size={18} />
          </button>
        </div>
      </MobilePanel>

      <div className="grid grid-cols-3 gap-3">
        <MobilePanel className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Families</p>
          <p className="mt-2 text-3xl font-black text-stone-900">{familySummary.families}</p>
        </MobilePanel>
        <MobilePanel className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Parents</p>
          <p className="mt-2 text-3xl font-black text-stone-900">{familySummary.parents}</p>
        </MobilePanel>
        <MobilePanel className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Children</p>
          <p className="mt-2 text-3xl font-black text-stone-900">{familySummary.children}</p>
        </MobilePanel>
      </div>

      <MobilePanel>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Parent Updates</p>
            <h2 className="mt-1 font-quicksand text-xl font-bold text-stone-900">Latest Newsletters</h2>
          </div>
          <button
            type="button"
            onClick={() => navigate('/admin/messages')}
            className="text-xs font-semibold text-[var(--primary-dark)]"
          >
            Open inbox
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {newsletters.length === 0 ? (
            <p className="rounded-[22px] bg-stone-50 px-4 py-4 text-sm text-stone-500">No newsletters posted yet.</p>
          ) : (
            newsletters.map((newsletter) => (
              <div key={newsletter.id} className="rounded-[22px] bg-stone-50 px-4 py-3">
                <p className="text-sm font-semibold text-stone-900">{newsletter.title}</p>
                <p className="mt-1 line-clamp-3 text-xs text-stone-500">{newsletter.body}</p>
              </div>
            ))
          )}
        </div>
      </MobilePanel>

      <MobilePanel>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Settings</p>
            <h2 className="mt-1 font-quicksand text-xl font-bold text-stone-900">Mobile Controls</h2>
          </div>
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="rounded-full bg-[var(--background)] px-3 py-2 text-xs font-semibold text-[var(--primary-dark)]"
          >
            Open
          </button>
        </div>
        <div className="mt-4 space-y-3">
          <div className="rounded-[22px] bg-stone-50 px-4 py-3 text-sm text-stone-600">
            Profile, password, notification preferences, and display density are available in mobile settings.
          </div>
          <div className="rounded-[22px] bg-stone-50 px-4 py-3 text-sm text-stone-600">
            Billing identity, tax setup, theme administration, and developer tools remain web-heavy secondary workflows.
          </div>
        </div>
      </MobilePanel>
    </div>
  );
}
