import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Baby,
  CalendarDays,
  CreditCard,
  Download,
  Mail,
  MailPlus,
  MapPin,
  ReceiptText,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react';
import api from '../utils/api';
import { buildPdfFileName } from '../utils/fileName';

function todayKey() {
  return new Date().toISOString().split('T')[0];
}

function MobilePanel({ children, tone = 'white', className = '' }) {
  const tones = {
    white: 'bg-white',
    accent: 'bg-[var(--parent-soft-bg)]',
    soft: 'bg-[var(--parent-soft-bg-hover)]',
  };

  return (
    <section className={`rounded-[28px] ${tones[tone]} p-4 shadow-[0_12px_34px_rgba(15,23,42,0.08)] ${className}`}>
      {children}
    </section>
  );
}

function ParentComposerSheet({
  isOpen,
  message,
  onMessageChange,
  sending,
  onClose,
  onSend,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      <button type="button" className="absolute inset-0 bg-black/35" onClick={onClose} aria-label="Close message composer" />
      <div className="absolute inset-x-0 bottom-0 rounded-t-[32px] bg-white px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-5 shadow-[0_-18px_48px_rgba(15,23,42,0.18)]">
        <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-stone-200" />
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Parent Message</p>
            <h3 className="text-2xl font-bold text-stone-900">Contact Daycare</h3>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-stone-500">
            <X size={18} />
          </button>
        </div>
        <textarea
          rows={5}
          value={message}
          onChange={(event) => onMessageChange(event.target.value)}
          placeholder="Write your message..."
          className="mb-4 w-full resize-none rounded-[24px] border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700 outline-none focus:border-[var(--parent-button-bg)]"
        />
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={onClose} className="rounded-full border border-stone-200 px-4 py-3 text-sm font-semibold text-stone-600">
            Cancel
          </button>
          <button
            type="button"
            onClick={onSend}
            disabled={sending}
            className="rounded-full px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: 'var(--parent-button-bg)' }}
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function MobileParentHomeScreen() {
  const [dashboard, setDashboard] = useState(null);
  const [newsletters, setNewsletters] = useState([]);
  const [careLogs, setCareLogs] = useState([]);
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        const date = todayKey();
        const [dashboardRes, newslettersRes, careRes, childrenRes] = await Promise.all([
          api.get('/parent/dashboard'),
          api.get('/newsletters', { params: { limit: 4 } }),
          api.get('/care-logs', { params: { date } }),
          api.get('/parent/children'),
        ]);

        setDashboard(dashboardRes.data || null);
        setNewsletters(newslettersRes.data.newsletters || []);
        setCareLogs(careRes.data.logs || []);
        setChildren(childrenRes.data.children || []);
      } catch (error) {
        setDashboard(null);
        setNewsletters([]);
        setCareLogs([]);
        setChildren([]);
      } finally {
        setLoading(false);
      }
    };

    void loadDashboard();
  }, []);

  const heroChild = children[0] || null;
  const sortedCareLogs = useMemo(
    () => [...careLogs].sort((left, right) => `${right.log_date || ''} ${right.occurred_at || ''}`.localeCompare(`${left.log_date || ''} ${left.occurred_at || ''}`)),
    [careLogs]
  );

  return (
    <div className="space-y-4">
      <MobilePanel tone="accent">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-white text-[var(--parent-button-bg)] shadow-sm">
            <Baby size={26} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--parent-nav-active-text)]">Family Dashboard</p>
            <h1 className="mt-1 text-3xl font-bold text-stone-900">{heroChild ? `${heroChild.first_name} ${heroChild.last_name}` : 'Welcome'}</h1>
            <p className="mt-1 text-sm text-stone-600">
              {heroChild ? `${heroChild.status} | ${new Date().toLocaleDateString()}` : 'Check updates from daycare today.'}
            </p>
          </div>
        </div>
      </MobilePanel>

      {loading ? (
        <MobilePanel className="text-sm text-stone-500">Loading family updates...</MobilePanel>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <MobilePanel className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Unread Messages</p>
              <p className="mt-2 text-3xl font-black text-stone-900">{dashboard?.unread_messages_count || 0}</p>
            </MobilePanel>
            <MobilePanel className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Balance Due</p>
              <p className="mt-2 text-3xl font-black text-stone-900">${dashboard?.outstanding_balance?.toFixed(2) || '0.00'}</p>
            </MobilePanel>
          </div>

          <MobilePanel>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Today&apos;s Updates</p>
                <h2 className="mt-1 text-xl font-bold text-stone-900">Care Feed</h2>
              </div>
              <Sparkles size={18} className="text-[var(--parent-button-bg)]" />
            </div>

            <div className="mt-4 space-y-3">
              {sortedCareLogs.length === 0 ? (
                <p className="rounded-[22px] bg-stone-50 px-4 py-4 text-sm text-stone-500">No care logs have been shared yet today.</p>
              ) : (
                sortedCareLogs.map((log) => (
                  <div key={log.id} className="rounded-[22px] bg-stone-50 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-stone-900">{log.child_name} | {log.log_type}</p>
                      <p className="text-xs text-stone-500">{String(log.occurred_at || '').slice(0, 5)}</p>
                    </div>
                    {log.notes ? <p className="mt-2 text-xs text-stone-600">{log.notes}</p> : null}
                  </div>
                ))
              )}
            </div>
          </MobilePanel>

          <MobilePanel>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">News & Events</p>
                <h2 className="mt-1 text-xl font-bold text-stone-900">Latest From Daycare</h2>
              </div>
              <CalendarDays size={18} className="text-[var(--parent-button-bg)]" />
            </div>
            <div className="mt-4 space-y-3">
              {newsletters.length === 0 ? (
                <p className="rounded-[22px] bg-stone-50 px-4 py-4 text-sm text-stone-500">No newsletters posted yet.</p>
              ) : (
                newsletters.map((newsletter) => (
                  <div key={newsletter.id} className="rounded-[22px] bg-stone-50 px-4 py-3">
                    <p className="text-sm font-semibold text-stone-900">{newsletter.title}</p>
                    <p className="mt-2 line-clamp-3 text-xs text-stone-500">{newsletter.body}</p>
                  </div>
                ))
              )}
            </div>
          </MobilePanel>
        </>
      )}
    </div>
  );
}

export function MobileParentChildScreen() {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadChildren = async () => {
      try {
        setLoading(true);
        const response = await api.get('/parent/children');
        setChildren(response.data.children || []);
      } catch (error) {
        setChildren([]);
      } finally {
        setLoading(false);
      }
    };

    void loadChildren();
  }, []);

  return (
    <div className="space-y-4">
      <MobilePanel tone="accent">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--parent-nav-active-text)]">Child Profile</p>
        <h1 className="mt-1 text-3xl font-bold text-stone-900">My Child</h1>
        <p className="mt-1 text-sm text-stone-600">Profile basics, medical notes, and enrollment details.</p>
      </MobilePanel>

      {loading ? (
        <MobilePanel className="text-sm text-stone-500">Loading child profiles...</MobilePanel>
      ) : children.length === 0 ? (
        <MobilePanel className="text-sm text-stone-500">No children found.</MobilePanel>
      ) : (
        children.map((child) => (
          <MobilePanel key={child.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Profile</p>
                <h2 className="mt-1 text-xl font-bold text-stone-900">{child.first_name} {child.last_name}</h2>
                <p className="mt-1 text-sm text-stone-500">{child.status}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-[var(--parent-soft-bg)] text-[var(--parent-button-bg)]">
                <UserRound size={20} />
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              <div className="rounded-[22px] bg-stone-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Date of Birth</p>
                <p className="mt-1 text-sm font-semibold text-stone-900">{new Date(child.date_of_birth).toLocaleDateString()}</p>
              </div>
              <div className="rounded-[22px] bg-stone-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Enrollment Date</p>
                <p className="mt-1 text-sm font-semibold text-stone-900">{new Date(child.enrollment_start_date).toLocaleDateString()}</p>
              </div>
              {child.allergies ? (
                <div className="rounded-[22px] bg-amber-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Allergies</p>
                  <p className="mt-1 text-sm text-amber-900">{typeof child.allergies === 'string' ? child.allergies : JSON.stringify(child.allergies)}</p>
                </div>
              ) : null}
              {child.medical_notes ? (
                <div className="rounded-[22px] bg-rose-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-700">Medical Notes</p>
                  <p className="mt-1 text-sm text-rose-900">{child.medical_notes}</p>
                </div>
              ) : null}
            </div>
          </MobilePanel>
        ))
      )}
    </div>
  );
}

export function MobileParentMessagesScreen() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showComposer, setShowComposer] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  const loadMessages = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/parent/messages');
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

  const markAsRead = async (messageId) => {
    try {
      await api.patch(`/parent/messages/${messageId}/read`);
      setMessages((prev) => prev.map((item) => (
        item.id === messageId ? { ...item, parent_read: true } : item
      )));
    } catch (error) {
      // ignore
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      setSending(true);
      await api.post('/parent/messages', {
        message: newMessage,
        subject: 'Message from Parent',
      });
      setNewMessage('');
      setShowComposer(false);
      await loadMessages();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <MobilePanel tone="accent">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--parent-nav-active-text)]">Family Communication</p>
            <h1 className="mt-1 text-3xl font-bold text-stone-900">Messages</h1>
            <p className="mt-1 text-sm text-stone-600">Stay in touch with daycare staff.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowComposer(true)}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white"
            style={{ backgroundColor: 'var(--parent-button-bg)' }}
          >
            <MailPlus size={16} />
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
              if (!msg.parent_read) {
                void markAsRead(msg.id);
              }
            }}
            className={`w-full rounded-[28px] p-4 text-left shadow-[0_12px_34px_rgba(15,23,42,0.08)] ${
              msg.parent_read ? 'bg-white' : 'bg-[var(--parent-soft-bg)]'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Mail size={16} className="text-[var(--parent-button-bg)]" />
                  <p className="truncate text-sm font-semibold text-stone-900">{msg.subject}</p>
                </div>
                <p className="mt-1 text-xs text-stone-500">From: {msg.staff_first_name} {msg.staff_last_name}</p>
                <p className="mt-2 line-clamp-3 text-sm text-stone-700">{msg.message}</p>
              </div>
              {!msg.parent_read ? <span className="mt-2 inline-block h-2.5 w-2.5 rounded-full bg-[var(--parent-button-bg)]" /> : null}
            </div>
          </button>
        ))
      )}

      <ParentComposerSheet
        isOpen={showComposer}
        message={newMessage}
        onMessageChange={setNewMessage}
        sending={sending}
        onClose={() => setShowComposer(false)}
        onSend={sendMessage}
      />
    </div>
  );
}

export function MobileParentBillingScreen() {
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [creditBalance, setCreditBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBilling = async () => {
      try {
        setLoading(true);
        const [invoicesRes, paymentsRes, dashboardRes] = await Promise.all([
          api.get('/parent/invoices'),
          api.get('/parent/invoices/payments/history'),
          api.get('/parent/dashboard'),
        ]);
        setInvoices(invoicesRes.data.invoices || []);
        setPayments(paymentsRes.data.payments || []);
        setCreditBalance(parseFloat(dashboardRes.data.credit_balance || 0));
      } catch (error) {
        setInvoices([]);
        setPayments([]);
        setCreditBalance(0);
      } finally {
        setLoading(false);
      }
    };

    void loadBilling();
  }, []);

  const downloadInvoice = async (invoice) => {
    const response = await api.get(`/parent/invoices/${invoice.id}/pdf`, { responseType: 'blob' });
    const childName = [invoice.child_first_name, invoice.child_last_name].filter(Boolean).join(' ').trim();
    const filename = buildPdfFileName('Invoice', invoice.invoice_date || invoice.due_date, childName);
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const downloadReceipt = async (payment) => {
    const response = await api.get(`/parent/invoices/payments/${payment.id}/receipt-pdf`, { responseType: 'blob' });
    const receiptLabel = payment.receipt_number || payment.invoice_number || 'Receipt';
    const filename = buildPdfFileName('Receipt', payment.payment_date, receiptLabel);
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="space-y-4">
      <MobilePanel tone="accent">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--parent-nav-active-text)]">Billing</p>
        <h1 className="mt-1 text-3xl font-bold text-stone-900">Invoices & Receipts</h1>
        <p className="mt-1 text-sm text-stone-600">Review balances, invoices, and payment records.</p>
      </MobilePanel>

      <div className="grid grid-cols-2 gap-3">
        <MobilePanel className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Credit Balance</p>
          <p className="mt-2 text-3xl font-black text-stone-900">${creditBalance.toFixed(2)}</p>
        </MobilePanel>
        <MobilePanel className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Invoices</p>
          <p className="mt-2 text-3xl font-black text-stone-900">{invoices.length}</p>
        </MobilePanel>
      </div>

      {loading ? (
        <MobilePanel className="text-sm text-stone-500">Loading billing...</MobilePanel>
      ) : (
        <>
          <MobilePanel>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Invoices</p>
                <h2 className="mt-1 text-xl font-bold text-stone-900">Recent</h2>
              </div>
              <CreditCard size={18} className="text-[var(--parent-button-bg)]" />
            </div>
            <div className="mt-4 space-y-3">
              {invoices.length === 0 ? (
                <p className="rounded-[22px] bg-stone-50 px-4 py-4 text-sm text-stone-500">No invoices found.</p>
              ) : (
                invoices.map((invoice) => (
                  <div key={invoice.id} className="rounded-[22px] bg-stone-50 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-stone-900">{invoice.invoice_number}</p>
                        <p className="mt-1 text-xs text-stone-500">{new Date(invoice.invoice_date).toLocaleDateString()} | ${parseFloat(invoice.balance_due).toFixed(2)} due</p>
                      </div>
                      <button type="button" onClick={() => downloadInvoice(invoice)} className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-stone-700">
                        <Download size={14} />
                        PDF
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </MobilePanel>

          <MobilePanel>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Receipts</p>
                <h2 className="mt-1 text-xl font-bold text-stone-900">Payment History</h2>
              </div>
              <ReceiptText size={18} className="text-[var(--parent-button-bg)]" />
            </div>
            <div className="mt-4 space-y-3">
              {payments.length === 0 ? (
                <p className="rounded-[22px] bg-stone-50 px-4 py-4 text-sm text-stone-500">No payments recorded yet.</p>
              ) : (
                payments.map((payment) => (
                  <div key={payment.id} className="rounded-[22px] bg-stone-50 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-stone-900">{payment.receipt_number || 'Receipt pending'}</p>
                        <p className="mt-1 text-xs text-stone-500">{new Date(payment.payment_date).toLocaleDateString()} | ${parseFloat(payment.amount).toFixed(2)}</p>
                      </div>
                      {payment.status === 'PAID' ? (
                        <button type="button" onClick={() => downloadReceipt(payment)} className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-stone-700">
                          <Download size={14} />
                          PDF
                        </button>
                      ) : (
                        <span className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-stone-500">{payment.status}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </MobilePanel>
        </>
      )}
    </div>
  );
}

export function MobileParentEventsScreen() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        setLoading(true);
        const today = new Date();
        const end = new Date(today);
        end.setDate(end.getDate() + 60);
        const response = await api.get('/parent/events', {
          params: {
            from: today.toISOString().split('T')[0],
            to: end.toISOString().split('T')[0],
          },
        });
        setEvents(response.data.events || []);
      } catch (error) {
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    void loadEvents();
  }, []);

  const sortedEvents = useMemo(
    () => [...events].sort((left, right) => `${left.event_date || ''} ${left.start_time || ''}`.localeCompare(`${right.event_date || ''} ${right.start_time || ''}`)),
    [events]
  );

  return (
    <div className="space-y-4">
      <MobilePanel tone="accent">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--parent-nav-active-text)]">Events</p>
        <h1 className="mt-1 text-3xl font-bold text-stone-900">Calendar</h1>
        <p className="mt-1 text-sm text-stone-600">Upcoming daycare events and reminders.</p>
      </MobilePanel>

      {loading ? (
        <MobilePanel className="text-sm text-stone-500">Loading events...</MobilePanel>
      ) : sortedEvents.length === 0 ? (
        <MobilePanel className="text-sm text-stone-500">No upcoming events right now.</MobilePanel>
      ) : (
        sortedEvents.map((event) => (
          <MobilePanel key={`${event.id}-${event.event_date}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <CalendarDays size={16} className="text-[var(--parent-button-bg)]" />
                  <p className="text-sm font-semibold text-stone-900">{event.title}</p>
                </div>
                <p className="mt-2 text-xs text-stone-500">{new Date(event.event_date).toLocaleDateString()} {event.start_time ? `| ${String(event.start_time).slice(0, 5)}` : ''}</p>
                {event.location ? (
                  <p className="mt-1 inline-flex items-center gap-1 text-xs text-stone-500">
                    <MapPin size={12} />
                    {event.location}
                  </p>
                ) : null}
                {event.description ? <p className="mt-2 text-sm text-stone-600">{event.description}</p> : null}
                {event.requires_rsvp ? (
                  <div className="mt-3 inline-flex rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold text-amber-800">
                    RSVP required
                  </div>
                ) : null}
              </div>
            </div>
          </MobilePanel>
        ))
      )}
    </div>
  );
}
