import React, { useEffect, useMemo, useState } from 'react';
import { Check, Inbox, Mail, MailOpen } from 'lucide-react';
import { Layout } from '../components/Layout';
import api from '../utils/api';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'read', label: 'Read' },
];

const formatTimestamp = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const getSenderName = (message) => {
  if (message.parent_name) return message.parent_name;
  const parentFirst = message.parent_first_name || message.to_parent_first_name || '';
  const parentLast = message.parent_last_name || message.to_parent_last_name || '';
  const staffFirst = message.staff_first_name || '';
  const staffLast = message.staff_last_name || '';
  const parentName = `${parentFirst} ${parentLast}`.trim();
  const staffName = `${staffFirst} ${staffLast}`.trim();
  return parentName || staffName || 'Unknown Sender';
};

const getSubject = (message) => message.subject || 'Message';

export function FinanceDashboardPage() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);
  const [activeMessageId, setActiveMessageId] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const response = await api.get('/messages/inbox', { params: { limit: 200 } });
      const inboxMessages = (response.data.messages || []).filter((msg) => msg.to_user_id);
      setMessages(inboxMessages);
    } catch (error) {
      console.error('Load inbox messages error:', error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, []);

  const unreadCount = useMemo(
    () => messages.filter((msg) => !msg.is_read).length,
    [messages]
  );

  const filteredMessages = useMemo(() => {
    if (filter === 'unread') {
      return messages.filter((msg) => !msg.is_read);
    }
    if (filter === 'read') {
      return messages.filter((msg) => msg.is_read);
    }
    return messages;
  }, [messages, filter]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const allVisibleSelected = useMemo(() => {
    if (filteredMessages.length === 0) return false;
    return filteredMessages.every((msg) => selectedSet.has(msg.id));
  }, [filteredMessages, selectedSet]);

  const activeMessage = useMemo(
    () => messages.find((msg) => msg.id === activeMessageId) || null,
    [messages, activeMessageId]
  );

  useEffect(() => {
    if (!filteredMessages.length) {
      setActiveMessageId(null);
      return;
    }
    if (!filteredMessages.some((msg) => msg.id === activeMessageId)) {
      setActiveMessageId(filteredMessages[0].id);
    }
  }, [filteredMessages, activeMessageId]);

  useEffect(() => {
    setSelectedIds([]);
  }, [filter]);

  const toggleSelectMessage = (messageId) => {
    setSelectedIds((prev) => {
      if (prev.includes(messageId)) {
        return prev.filter((id) => id !== messageId);
      }
      return [...prev, messageId];
    });
  };

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(filteredMessages.map((msg) => msg.id));
  };

  const markSingleAsRead = async (messageId) => {
    try {
      await api.patch(`/messages/${messageId}/read`);
      setMessages((prev) =>
        prev.map((msg) => (msg.id === messageId ? { ...msg, is_read: true } : msg))
      );
    } catch (error) {
      console.error('Mark message read error:', error);
    }
  };

  const updateReadStatus = async (isRead) => {
    if (messages.length === 0) {
      return;
    }

    try {
      setActionBusy(true);
      if (selectedIds.length === 0) {
        await api.patch('/messages/mark-all', { is_read: isRead });
        setMessages((prev) =>
          prev.map((msg) => ({ ...msg, is_read: isRead }))
        );
      } else {
        await api.patch('/messages/bulk-update', { ids: selectedIds, is_read: isRead });
        const targetSet = new Set(selectedIds);
        setMessages((prev) =>
          prev.map((msg) => (targetSet.has(msg.id) ? { ...msg, is_read: isRead } : msg))
        );
      }
      setSelectedIds([]);
    } catch (error) {
      console.error('Bulk update message status error:', error);
    } finally {
      setActionBusy(false);
    }
  };

  const handleOpenMessage = (message) => {
    setActiveMessageId(message.id);
    if (!message.is_read) {
      markSingleAsRead(message.id);
    }
  };

  if (loading) {
    return (
      <Layout title="Messages" subtitle="Inbox for parent communications">
        <div
          className="themed-surface rounded-3xl p-8 text-center"
          style={{ color: 'var(--muted)' }}
        >
          Loading messages...
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Messages" subtitle="Inbox for parent communications">
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)] gap-6">
        <section className="themed-surface rounded-3xl p-4 flex flex-col min-h-[520px]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p
                className="text-xs uppercase tracking-[0.2em]"
                style={{ color: 'var(--muted)' }}
              >
                Inbox
              </p>
              <div className="flex items-center gap-2">
                <Inbox size={18} style={{ color: 'var(--primary)' }} />
                <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>
                  Messages
                </h2>
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                {unreadCount} unread
              </p>
            </div>
            <button
              type="button"
              onClick={loadMessages}
              className="px-3 py-2 rounded-xl border text-xs font-semibold transition-colors"
              style={{
                borderColor: 'var(--border)',
                backgroundColor: 'var(--surface)',
                color: 'var(--muted)',
              }}
            >
              Refresh
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            {FILTERS.map((item) => {
              const isActive = filter === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilter(item.id)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors"
                  style={{
                    borderColor: isActive ? 'transparent' : 'var(--border)',
                    backgroundColor: isActive ? 'var(--primary)' : 'var(--surface)',
                    color: isActive ? 'var(--on-primary)' : 'var(--muted)',
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors"
              style={{
                borderColor: 'var(--border)',
                backgroundColor: allVisibleSelected ? 'var(--primary)' : 'var(--surface)',
                color: allVisibleSelected ? 'var(--on-primary)' : 'var(--muted)',
              }}
            >
              <span
                className="w-4 h-4 rounded-md flex items-center justify-center"
                style={{
                  border: `1px solid ${allVisibleSelected ? 'var(--primary)' : 'var(--border)'}`,
                  backgroundColor: allVisibleSelected ? 'var(--on-primary)' : 'transparent',
                  color: allVisibleSelected ? 'var(--primary)' : 'transparent',
                }}
              >
                <Check size={12} />
              </span>
              Select all
            </button>

            <button
              type="button"
              onClick={() => updateReadStatus(true)}
              disabled={actionBusy || messages.length === 0}
              className="px-3 py-2 rounded-xl text-xs font-semibold border transition-colors disabled:opacity-50"
              style={{
                borderColor: 'var(--border)',
                backgroundColor: 'var(--surface)',
                color: 'var(--primary-dark)',
              }}
            >
              {selectedIds.length ? 'Mark selected read' : 'Mark all read'}
            </button>

            <button
              type="button"
              onClick={() => updateReadStatus(false)}
              disabled={actionBusy || messages.length === 0}
              className="px-3 py-2 rounded-xl text-xs font-semibold border transition-colors disabled:opacity-50"
              style={{
                borderColor: 'var(--border)',
                backgroundColor: 'var(--surface)',
                color: 'var(--muted)',
              }}
            >
              {selectedIds.length ? 'Mark selected unread' : 'Mark all unread'}
            </button>
          </div>

          <div className="mt-4 flex-1 min-h-0 overflow-y-auto soft-scrollbar space-y-3 pr-1">
            {filteredMessages.length === 0 ? (
              <div className="text-sm text-center py-8" style={{ color: 'var(--muted)' }}>
                No messages in this view.
              </div>
            ) : (
              filteredMessages.map((message) => {
                const isSelected = selectedSet.has(message.id);
                const isActive = message.id === activeMessageId;
                const sender = getSenderName(message);
                return (
                  <button
                    key={message.id}
                    type="button"
                    onClick={() => handleOpenMessage(message)}
                    className="w-full text-left p-3 rounded-2xl border transition-all"
                    style={{
                      borderColor: isActive ? 'var(--primary)' : 'var(--border)',
                      backgroundColor: message.is_read ? 'var(--surface)' : 'var(--background)',
                      boxShadow: isActive ? 'var(--panel-shadow-soft)' : 'none',
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        role="checkbox"
                        aria-checked={isSelected}
                        tabIndex={0}
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleSelectMessage(message.id);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            toggleSelectMessage(message.id);
                          }
                        }}
                        className="w-5 h-5 rounded-md flex items-center justify-center mt-1"
                        style={{
                          border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                          backgroundColor: isSelected ? 'var(--primary)' : 'transparent',
                          color: isSelected ? 'var(--on-primary)' : 'transparent',
                        }}
                      >
                        <Check size={12} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
                            {sender}
                          </p>
                          <span className="text-[11px]" style={{ color: 'var(--muted)' }}>
                            {formatTimestamp(message.created_at)}
                          </span>
                        </div>
                        <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>
                          {getSubject(message)}
                        </p>
                        <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--muted)' }}>
                          {message.message}
                        </p>
                      </div>
                      <span
                        className="w-2 h-2 rounded-full mt-2"
                        style={{
                          backgroundColor: message.is_read ? 'transparent' : 'var(--primary)',
                        }}
                      />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section className="themed-surface rounded-3xl p-6 flex flex-col min-h-[520px]">
          {activeMessage ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p
                    className="text-xs uppercase tracking-[0.2em]"
                    style={{ color: 'var(--muted)' }}
                  >
                    Message
                  </p>
                  <h3 className="text-2xl font-bold mt-1" style={{ color: 'var(--text)' }}>
                    {getSubject(activeMessage)}
                  </h3>
                </div>
                <div
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
                  style={{
                    backgroundColor: activeMessage.is_read ? 'var(--surface)' : 'var(--accent)',
                    color: activeMessage.is_read ? 'var(--muted)' : 'var(--primary-dark)',
                    border: `1px solid ${activeMessage.is_read ? 'var(--border)' : 'var(--accent)'}`,
                  }}
                >
                  {activeMessage.is_read ? <MailOpen size={14} /> : <Mail size={14} />}
                  {activeMessage.is_read ? 'Read' : 'Unread'}
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-4 text-sm" style={{ color: 'var(--muted)' }}>
                <div>
                  <span
                    className="text-xs uppercase tracking-[0.2em]"
                    style={{ color: 'var(--muted)' }}
                  >
                    From
                  </span>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                    {getSenderName(activeMessage)}
                  </p>
                </div>
                <div>
                  <span
                    className="text-xs uppercase tracking-[0.2em]"
                    style={{ color: 'var(--muted)' }}
                  >
                    Received
                  </span>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                    {formatTimestamp(activeMessage.created_at)}
                  </p>
                </div>
              </div>

              <div
                className="mt-6 flex-1 rounded-2xl border p-4 text-sm whitespace-pre-line"
                style={{
                  borderColor: 'var(--border)',
                  backgroundColor: 'var(--surface)',
                  color: 'var(--text)',
                }}
              >
                {activeMessage.message}
              </div>
            </>
          ) : (
            <div
              className="flex-1 flex flex-col items-center justify-center text-center"
              style={{ color: 'var(--muted)' }}
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--primary-dark)' }}
              >
                <Mail size={22} />
              </div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                Select a message
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                Choose a message from the inbox to view details.
              </p>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}

export default FinanceDashboardPage;
