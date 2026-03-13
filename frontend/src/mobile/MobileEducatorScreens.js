import { useCallback, useEffect, useState } from 'react';
import {
  Baby,
  CalendarDays,
  ChevronRight,
  Clock3,
  Mail,
  MessageSquarePlus,
  Minus,
  MoonStar,
  Plus,
  ReceiptText,
  TimerReset,
  Toilet,
  X,
} from 'lucide-react';
import api from '../utils/api';
import { MobileAttendanceScreen } from './MobileAttendanceScreen';

function todayKey() {
  return new Date().toISOString().split('T')[0];
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

function MobilePanel({ children, tone = 'white', className = '' }) {
  const tones = {
    white: 'bg-white',
    accent: 'bg-[rgba(var(--accent-rgb),0.18)]',
    soft: 'bg-[var(--background)]',
  };

  return (
    <section className={`rounded-[28px] ${tones[tone]} p-4 shadow-[0_12px_34px_rgba(15,23,42,0.08)] ${className}`}>
      {children}
    </section>
  );
}

function FloatingCareMenu({ open, onToggle, actions, onAction }) {
  return (
    <>
      {open ? <button type="button" className="fixed inset-0 z-40 bg-black/25" onClick={onToggle} aria-label="Close care actions" /> : null}
      <div className="pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] right-5 z-50 flex flex-col items-end gap-2">
        {actions.map((action, index) => (
          <button
            key={action.key}
            type="button"
            onClick={() => onAction(action.key)}
            className={`pointer-events-auto flex items-center gap-3 rounded-full bg-white px-4 py-3 shadow-[0_18px_36px_rgba(15,23,42,0.16)] transition-all duration-200 ${
              open ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-4 opacity-0 scale-95'
            }`}
            style={{ transitionDelay: open ? `${index * 35}ms` : '0ms' }}
          >
            <span className="text-sm font-semibold text-stone-700">{action.label}</span>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--background)] text-[var(--primary-dark)]">
              <action.icon size={18} />
            </span>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={`fixed bottom-[calc(env(safe-area-inset-bottom)+5rem)] right-5 z-50 flex h-16 w-16 items-center justify-center rounded-full text-white shadow-[0_18px_36px_rgba(224,122,95,0.42)] transition-transform duration-200 ${
          open ? 'scale-[0.98]' : ''
        }`}
        style={{ backgroundColor: 'var(--primary)' }}
      >
        {open ? <X size={24} /> : <Plus size={24} />}
      </button>
    </>
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
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Educator Messages</p>
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

export function MobileEducatorHomeScreen() {
  const [summary, setSummary] = useState(null);
  const [upcomingShifts, setUpcomingShifts] = useState([]);
  const [careChildren, setCareChildren] = useState([]);
  const [careLogs, setCareLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const today = new Date();
        const rangeStart = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
        const rangeEnd = today.toISOString().split('T')[0];
        const upcomingEnd = new Date(today);
        upcomingEnd.setDate(upcomingEnd.getDate() + 30);

        const [summaryRes, upcomingRes, childrenRes, careRes] = await Promise.all([
          api.get('/reports/staff/hours', { params: { start_date: rangeStart, end_date: rangeEnd } }),
          api.get('/schedules/my-schedules', {
            params: { from: rangeEnd, to: upcomingEnd.toISOString().split('T')[0] },
          }),
          api.get('/attendance/children', { params: { status: 'ACTIVE', date: todayKey() } }),
          api.get('/care-logs', { params: { date: todayKey() } }),
        ]);

        setSummary(summaryRes.data.summary || {});
        setUpcomingShifts(upcomingRes.data.schedules || []);
        setCareChildren(childrenRes.data.children || []);
        setCareLogs(careRes.data.logs || []);
      } catch (error) {
        setSummary({});
        setUpcomingShifts([]);
        setCareChildren([]);
        setCareLogs([]);
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, []);

  const nextShift = upcomingShifts.find((shift) => shift.status !== 'DECLINED') || null;

  return (
    <div className="space-y-4">
      <MobilePanel tone="accent">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Classroom Overview</p>
        <h1 className="mt-1 font-quicksand text-3xl font-bold text-stone-900">Home</h1>
        <p className="mt-1 text-sm text-stone-600">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-[24px] bg-white px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Children Present</p>
            <p className="mt-1 text-3xl font-black text-stone-900">{careChildren.length}</p>
          </div>
          <div className="rounded-[24px] bg-white px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Care Logs Today</p>
            <p className="mt-1 text-3xl font-black text-stone-900">{careLogs.length}</p>
          </div>
        </div>
      </MobilePanel>

      {loading ? (
        <MobilePanel className="text-sm text-stone-500">Loading classroom dashboard...</MobilePanel>
      ) : (
        <>
          <MobilePanel>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Next Shift</p>
                <h2 className="mt-1 font-quicksand text-xl font-bold text-stone-900">
                  {nextShift ? new Date(nextShift.shift_date).toLocaleDateString() : 'No shift scheduled'}
                </h2>
              </div>
              <CalendarDays size={18} className="text-[var(--primary-dark)]" />
            </div>
            <p className="mt-3 text-sm text-stone-600">
              {nextShift ? `${formatTime(nextShift.start_time)} - ${formatTime(nextShift.end_time)} | ${nextShift.hours}h` : 'Your schedule is clear right now.'}
            </p>
          </MobilePanel>

          <MobilePanel>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Children In Care</p>
                <h2 className="mt-1 font-quicksand text-xl font-bold text-stone-900">Today&apos;s List</h2>
              </div>
              <Baby size={18} className="text-[var(--primary-dark)]" />
            </div>

            <div className="mt-4 space-y-3">
              {careChildren.length === 0 ? (
                <p className="rounded-[22px] bg-stone-50 px-4 py-4 text-sm text-stone-500">No children are currently in your attendance list.</p>
              ) : (
                careChildren.slice(0, 6).map((child) => (
                  <div key={child.id} className="flex items-center justify-between rounded-[22px] bg-stone-50 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-stone-900">{child.first_name} {child.last_name}</p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {child.allergies ? <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800">Allergy info</span> : null}
                        {child.medical_notes ? <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-800">Medical notes</span> : null}
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-stone-400" />
                  </div>
                ))
              )}
            </div>
          </MobilePanel>

          <MobilePanel>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Work Summary</p>
                <h2 className="mt-1 font-quicksand text-xl font-bold text-stone-900">Year To Date</h2>
              </div>
              <Clock3 size={18} className="text-[var(--primary-dark)]" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-[24px] bg-stone-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Completed Hours</p>
                <p className="mt-1 text-2xl font-black text-stone-900">{parseFloat(summary?.completed_hours || 0).toFixed(2)}</p>
              </div>
              <div className="rounded-[24px] bg-stone-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Upcoming Shifts</p>
                <p className="mt-1 text-2xl font-black text-stone-900">{upcomingShifts.length}</p>
              </div>
            </div>
          </MobilePanel>
        </>
      )}
    </div>
  );
}

export function MobileEducatorAttendanceScreen() {
  return <MobileAttendanceScreen role="EDUCATOR" title="Attendance" subtitle="Check children in and out with fast classroom controls" />;
}

export function MobileEducatorCareScreen() {
  const [children, setChildren] = useState([]);
  const [careLogs, setCareLogs] = useState([]);
  const [careForm, setCareForm] = useState({
    child_id: '',
    log_type: 'NAP',
    occurred_at: '',
    notes: '',
  });
  const [careSaving, setCareSaving] = useState(false);
  const [careError, setCareError] = useState('');
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  const loadCare = useCallback(async () => {
    try {
      setLoading(true);
      setCareError('');
      const [childrenRes, logsRes] = await Promise.all([
        api.get('/attendance/children', { params: { status: 'ACTIVE', date: todayKey() } }),
        api.get('/care-logs', { params: { date: todayKey() } }),
      ]);
      const loadedChildren = childrenRes.data.children || [];
      setChildren(loadedChildren);
      setCareLogs(logsRes.data.logs || []);
      setCareForm((prev) => ({
        ...prev,
        child_id: prev.child_id || String(loadedChildren[0]?.id || ''),
      }));
    } catch (error) {
      setChildren([]);
      setCareLogs([]);
      setCareError(error.response?.data?.error || 'Failed to load care logs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCare();
  }, [loadCare]);

  const handleQuickAction = (type) => {
    setCareForm((prev) => ({ ...prev, log_type: type }));
    setMenuOpen(false);
  };

  const submitCareLog = async () => {
    if (!careForm.child_id) {
      setCareError('Select a child before saving.');
      return;
    }

    try {
      setCareSaving(true);
      setCareError('');
      await api.post('/care-logs', {
        child_id: Number.parseInt(careForm.child_id, 10),
        log_type: careForm.log_type,
        occurred_at: careForm.occurred_at || null,
        notes: careForm.notes.trim() || null,
        log_date: todayKey(),
      });
      setCareForm((prev) => ({ ...prev, occurred_at: '', notes: '' }));
      await loadCare();
    } catch (error) {
      setCareError(error.response?.data?.error || 'Failed to save care log.');
    } finally {
      setCareSaving(false);
    }
  };

  const quickActions = [
    { key: 'NAP', label: 'Nap', icon: MoonStar },
    { key: 'PEE', label: 'Pee', icon: Toilet },
    { key: 'POO', label: 'Poo', icon: Minus },
  ];

  return (
    <div className="space-y-4 pb-20">
      <MobilePanel tone="accent">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Quick Log Zone</p>
        <h1 className="mt-1 font-quicksand text-3xl font-bold text-stone-900">Care</h1>
        <p className="mt-1 text-sm text-stone-600">Fast entry for naps, pees, and poos.</p>
      </MobilePanel>

      <MobilePanel>
        <div className="grid gap-3">
          <select
            value={careForm.child_id}
            onChange={(event) => setCareForm((prev) => ({ ...prev, child_id: event.target.value }))}
            className="w-full rounded-[24px] border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700 outline-none focus:border-[var(--primary)]"
          >
            <option value="">Select child</option>
            {children.map((child) => (
              <option key={child.id} value={child.id}>
                {child.first_name} {child.last_name}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[24px] bg-stone-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Selected Action</p>
              <p className="mt-1 text-lg font-black text-stone-900">{careForm.log_type}</p>
            </div>
            <input
              type="time"
              value={careForm.occurred_at}
              onChange={(event) => setCareForm((prev) => ({ ...prev, occurred_at: event.target.value }))}
              className="w-full rounded-[24px] border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700 outline-none focus:border-[var(--primary)]"
            />
          </div>
          <textarea
            rows={3}
            value={careForm.notes}
            onChange={(event) => setCareForm((prev) => ({ ...prev, notes: event.target.value }))}
            placeholder="Optional notes..."
            className="w-full resize-none rounded-[24px] border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700 outline-none focus:border-[var(--primary)]"
          />
          {careError ? <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{careError}</div> : null}
          <button
            type="button"
            onClick={submitCareLog}
            disabled={careSaving}
            className="rounded-full bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {careSaving ? 'Saving...' : 'Save Entry'}
          </button>
        </div>
      </MobilePanel>

      <MobilePanel>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Today Feed</p>
            <h2 className="mt-1 font-quicksand text-xl font-bold text-stone-900">Recent Activity</h2>
          </div>
          <button type="button" onClick={loadCare} className="text-xs font-semibold text-[var(--primary-dark)]">Refresh</button>
        </div>
        <div className="mt-4 space-y-3">
          {loading ? (
            <p className="text-sm text-stone-500">Loading care logs...</p>
          ) : careLogs.length === 0 ? (
            <p className="rounded-[22px] bg-stone-50 px-4 py-4 text-sm text-stone-500">No care logs recorded yet today.</p>
          ) : (
            careLogs.map((log) => (
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

      <FloatingCareMenu open={menuOpen} onToggle={() => setMenuOpen((prev) => !prev)} actions={quickActions} onAction={handleQuickAction} />
    </div>
  );
}

export function MobileEducatorMessagesScreen() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showComposer, setShowComposer] = useState(false);
  const [recipients, setRecipients] = useState([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [selectedRecipientIds, setSelectedRecipientIds] = useState([]);
  const [sendToAll, setSendToAll] = useState(false);
  const [subject, setSubject] = useState('Message from Educator');
  const [messageBody, setMessageBody] = useState('');
  const [sendError, setSendError] = useState('');
  const [sending, setSending] = useState(false);

  const loadMessages = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/messages/inbox', { params: { limit: 40 } });
      setMessages(response.data.messages || []);
    } catch (error) {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

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
    setSubject('Message from Educator');
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
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Parent Communication</p>
            <h1 className="mt-1 font-quicksand text-3xl font-bold text-stone-900">Messages</h1>
            <p className="mt-1 text-sm text-stone-600">Stay in touch with families throughout the day.</p>
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
                  <p className="truncate text-sm font-semibold text-stone-900">{msg.parent_name || 'Parent'}</p>
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

export function MobileEducatorScheduleScreen() {
  const [schedules, setSchedules] = useState([]);
  const [requests, setRequests] = useState([]);
  const [balances, setBalances] = useState({ sick_days_remaining: 0, vacation_days_remaining: 0 });
  const [paystubs, setPaystubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requestType, setRequestType] = useState('VACATION');
  const [requestStartDate, setRequestStartDate] = useState(todayKey());
  const [requestEndDate, setRequestEndDate] = useState(todayKey());
  const [requestNote, setRequestNote] = useState('');
  const [requestError, setRequestError] = useState('');
  const [requestSaving, setRequestSaving] = useState(false);

  const loadScheduleData = useCallback(async () => {
    try {
      setLoading(true);
      const today = todayKey();
      const upcomingEnd = new Date();
      upcomingEnd.setDate(upcomingEnd.getDate() + 45);

      const [scheduleRes, balancesRes, requestsRes, paystubsRes] = await Promise.all([
        api.get('/schedules/my-schedules', {
          params: { from: today, to: upcomingEnd.toISOString().split('T')[0] },
        }),
        api.get('/auth/me'),
        api.get('/time-off-requests/mine'),
        api.get('/documents/paystubs/mine'),
      ]);

      setSchedules(scheduleRes.data.schedules || []);
      setBalances({
        sick_days_remaining: balancesRes.data.user.sick_days_remaining || 0,
        vacation_days_remaining: balancesRes.data.user.vacation_days_remaining || 0,
      });
      setRequests(requestsRes.data.requests || []);
      setPaystubs(paystubsRes.data.paystubs || []);
    } catch (error) {
      setSchedules([]);
      setRequests([]);
      setPaystubs([]);
      setBalances({ sick_days_remaining: 0, vacation_days_remaining: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadScheduleData();
  }, [loadScheduleData]);

  const handleShiftAction = async (shift, action) => {
    try {
      if (action === 'accept') {
        await api.post(`/schedules/my-schedules/${shift.id}/accept`);
      } else {
        await api.post(`/schedules/my-schedules/${shift.id}/decline`, {
          reason: 'Declined from mobile',
          declineType: 'UNPAID',
        });
      }
      await loadScheduleData();
    } catch (error) {
      setRequestError(error.response?.data?.error || 'Failed to update shift.');
    }
  };

  const handleRequestSubmit = async () => {
    try {
      setRequestSaving(true);
      setRequestError('');
      await api.post('/time-off-requests', {
        startDate: requestStartDate,
        endDate: requestEndDate,
        requestType,
        reason: requestNote || null,
      });
      setRequestNote('');
      await loadScheduleData();
    } catch (error) {
      setRequestError(error.response?.data?.error || 'Failed to submit request.');
    } finally {
      setRequestSaving(false);
    }
  };

  const downloadPaystub = async (stub) => {
    try {
      const response = await api.get(`/documents/paystubs/${stub.id}/pdf`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `paystub-${stub.stub_number}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      setRequestError('Failed to download paystub.');
    }
  };

  return (
    <div className="space-y-4">
      <MobilePanel tone="accent">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Schedule & Time</p>
        <h1 className="mt-1 font-quicksand text-3xl font-bold text-stone-900">Schedule</h1>
        <p className="mt-1 text-sm text-stone-600">Review shifts, time off, hours, and paystubs.</p>
      </MobilePanel>

      {loading ? (
        <MobilePanel className="text-sm text-stone-500">Loading schedule...</MobilePanel>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <MobilePanel className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Vacation Hours</p>
              <p className="mt-2 text-3xl font-black text-stone-900">{parseFloat(balances.vacation_days_remaining || 0).toFixed(1)}</p>
            </MobilePanel>
            <MobilePanel className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Sick Hours</p>
              <p className="mt-2 text-3xl font-black text-stone-900">{parseFloat(balances.sick_days_remaining || 0).toFixed(1)}</p>
            </MobilePanel>
          </div>

          <MobilePanel>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Upcoming Shifts</p>
                <h2 className="mt-1 font-quicksand text-xl font-bold text-stone-900">Next 45 Days</h2>
              </div>
              <CalendarDays size={18} className="text-[var(--primary-dark)]" />
            </div>
            <div className="mt-4 space-y-3">
              {schedules.length === 0 ? (
                <p className="rounded-[22px] bg-stone-50 px-4 py-4 text-sm text-stone-500">No shifts in this range.</p>
              ) : (
                schedules.slice(0, 8).map((shift) => (
                  <div key={shift.id} className="rounded-[22px] bg-stone-50 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-stone-900">{new Date(shift.shift_date).toLocaleDateString()}</p>
                        <p className="mt-1 text-xs text-stone-500">{formatTime(shift.start_time)} - {formatTime(shift.end_time)} | {shift.hours}h</p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-stone-600">{shift.status}</span>
                    </div>
                    {shift.status === 'PENDING' ? (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => handleShiftAction(shift, 'accept')} className="rounded-full bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-white">
                          Accept
                        </button>
                        <button type="button" onClick={() => handleShiftAction(shift, 'decline')} className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-stone-600">
                          Decline
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </MobilePanel>

          <MobilePanel>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Time Off</p>
                <h2 className="mt-1 font-quicksand text-xl font-bold text-stone-900">Request Time Off</h2>
              </div>
              <TimerReset size={18} className="text-[var(--primary-dark)]" />
            </div>
            <div className="mt-4 grid gap-3">
              <select value={requestType} onChange={(event) => setRequestType(event.target.value)} className="w-full rounded-[24px] border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700 outline-none focus:border-[var(--primary)]">
                <option value="VACATION">Vacation</option>
                <option value="SICK">Sick</option>
                <option value="UNPAID">Unpaid</option>
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input type="date" value={requestStartDate} onChange={(event) => setRequestStartDate(event.target.value)} className="w-full rounded-[24px] border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700 outline-none focus:border-[var(--primary)]" />
                <input type="date" value={requestEndDate} onChange={(event) => setRequestEndDate(event.target.value)} className="w-full rounded-[24px] border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700 outline-none focus:border-[var(--primary)]" />
              </div>
              <textarea
                rows={3}
                value={requestNote}
                onChange={(event) => setRequestNote(event.target.value)}
                placeholder="Add details for admin..."
                className="w-full resize-none rounded-[24px] border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700 outline-none focus:border-[var(--primary)]"
              />
              {requestError ? <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{requestError}</div> : null}
              <button
                type="button"
                onClick={handleRequestSubmit}
                disabled={requestSaving}
                className="rounded-full bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {requestSaving ? 'Submitting...' : 'Request Time Off'}
              </button>
            </div>
          </MobilePanel>

          <MobilePanel>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Recent Requests</p>
                <h2 className="mt-1 font-quicksand text-xl font-bold text-stone-900">Status</h2>
              </div>
              <ChevronRight size={16} className="text-stone-400" />
            </div>
            <div className="mt-4 space-y-3">
              {requests.length === 0 ? (
                <p className="rounded-[22px] bg-stone-50 px-4 py-4 text-sm text-stone-500">No time-off requests yet.</p>
              ) : (
                requests.slice(0, 5).map((request) => (
                  <div key={request.id} className="rounded-[22px] bg-stone-50 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-stone-900">{request.request_type}</p>
                        <p className="mt-1 text-xs text-stone-500">{request.start_date} to {request.end_date}</p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-stone-600">{request.status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </MobilePanel>

          <MobilePanel>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Paystubs</p>
                <h2 className="mt-1 font-quicksand text-xl font-bold text-stone-900">Downloads</h2>
              </div>
              <ReceiptText size={18} className="text-[var(--primary-dark)]" />
            </div>
            <div className="mt-4 space-y-3">
              {paystubs.length === 0 ? (
                <p className="rounded-[22px] bg-stone-50 px-4 py-4 text-sm text-stone-500">No paystubs available yet.</p>
              ) : (
                paystubs.slice(0, 4).map((stub) => (
                  <button key={stub.id} type="button" onClick={() => downloadPaystub(stub)} className="flex w-full items-center justify-between rounded-[22px] bg-stone-50 px-4 py-3 text-left">
                    <div>
                      <p className="text-sm font-semibold text-stone-900">{stub.period_name}</p>
                      <p className="mt-1 text-xs text-stone-500">{new Date(stub.start_date).toLocaleDateString()} - {new Date(stub.end_date).toLocaleDateString()}</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-stone-600">${parseFloat(stub.net_amount).toFixed(2)}</span>
                  </button>
                ))
              )}
            </div>
          </MobilePanel>
        </>
      )}
    </div>
  );
}
