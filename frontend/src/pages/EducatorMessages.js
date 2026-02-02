import { useEffect, useState } from 'react';
import { Mail, MailPlus } from 'lucide-react';
import { EducatorLayout } from '../components/EducatorLayout';
import { BaseModal } from '../components/modals/BaseModal';
import api from '../utils/api';

function EducatorMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [recipients, setRecipients] = useState([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [selectedRecipientIds, setSelectedRecipientIds] = useState([]);
  const [sendToAll, setSendToAll] = useState(false);
  const [subject, setSubject] = useState('Message from Educator');
  const [messageBody, setMessageBody] = useState('');
  const [sendError, setSendError] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    try {
      const response = await api.get('/messages/inbox', { params: { limit: 30 } });
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error('Load messages error:', error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const loadRecipients = async () => {
    try {
      setRecipientsLoading(true);
      const response = await api.get('/messages/recipients');
      setRecipients(response.data.recipients || []);
    } catch (error) {
      console.error('Load recipients error:', error);
      setRecipients([]);
    } finally {
      setRecipientsLoading(false);
    }
  };

  const openCompose = () => {
    setShowCompose(true);
    setSendError('');
    if (recipients.length === 0) {
      loadRecipients();
    }
  };

  const closeCompose = () => {
    setShowCompose(false);
    setSendError('');
    setSelectedRecipientIds([]);
    setSendToAll(false);
    setSubject('Message from Educator');
    setMessageBody('');
  };

  const toggleRecipient = (id) => {
    setSelectedRecipientIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      return [...prev, id];
    });
  };

  const handleSend = async (e) => {
    e.preventDefault();
    setSendError('');

    if (!messageBody.trim()) {
      setSendError('Message is required.');
      return;
    }

    if (!sendToAll && selectedRecipientIds.length === 0) {
      setSendError('Select at least one family or choose send to all.');
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
          selectedRecipientIds.map((id) =>
            api.post('/messages/send', {
              recipientType: 'parent',
              parentId: id,
              subject,
              message: messageBody,
            })
          )
        );
      }

      closeCompose();
      loadMessages();
    } catch (error) {
      setSendError(error.response?.data?.error || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const markAsRead = async (messageId) => {
    try {
      await api.patch(`/messages/${messageId}/read`);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, is_read: true } : msg
        )
      );
    } catch (error) {
      console.error('Mark as read error:', error);
    }
  };

  if (loading) {
    return (
      <EducatorLayout title="Messages" subtitle="Parent communication">
        <div className="themed-surface p-6 rounded-3xl text-center">Loading...</div>
      </EducatorLayout>
    );
  }

  return (
    <EducatorLayout title="Messages" subtitle="Parent communication">
      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={openCompose}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-white text-sm font-semibold shadow-md"
          style={{ backgroundColor: 'var(--primary)' }}
        >
          <MailPlus size={16} />
          New Message
        </button>
      </div>

      {messages.length === 0 ? (
        <div className="themed-surface p-10 rounded-3xl text-center text-stone-500">
          No messages yet.
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((msg) => (
            <button
              key={msg.id}
              type="button"
              onClick={() => !msg.is_read && markAsRead(msg.id)}
              className={`w-full text-left p-5 rounded-3xl border shadow-sm transition-colors ${
                msg.is_read ? 'bg-white themed-border' : 'bg-[var(--background)] border-[var(--primary)]'
              }`}
            >
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-[var(--card-1)] text-[var(--card-text-1)] flex items-center justify-center font-bold text-sm">
                    <Mail size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-stone-800">{msg.parent_name || 'Parent'}</p>
                    <p className="text-xs text-stone-500">{msg.subject}</p>
                  </div>
                </div>
                <span className="text-xs text-stone-400">
                  {new Date(msg.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-stone-600">{msg.message}</p>
            </button>
          ))}
        </div>
      )}

      <BaseModal
        isOpen={showCompose}
        onClose={closeCompose}
        title="Send Message"
      >
        <form onSubmit={handleSend} className="space-y-4">
          {sendError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2">
              {sendError}
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-stone-500 mb-2 font-quicksand">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl border themed-border themed-ring bg-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-stone-500 mb-2 font-quicksand">
              Recipients
            </label>
            <div className="flex items-center gap-2 mb-3 text-sm text-stone-600">
              <input
                type="checkbox"
                checked={sendToAll}
                onChange={(e) => {
                  setSendToAll(e.target.checked);
                  if (e.target.checked) {
                    setSelectedRecipientIds([]);
                  }
                }}
              />
              <span>Send to all families</span>
            </div>
            {recipientsLoading ? (
              <div className="text-sm text-stone-500">Loading families...</div>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-2 soft-scrollbar">
                {recipients.map((recipient) => (
                  <label
                    key={recipient.id}
                    className={`flex items-start gap-2 p-3 rounded-2xl border themed-border bg-white ${
                      sendToAll ? 'opacity-50' : 'cursor-pointer'
                    }`}
                  >
                    <input
                      type="checkbox"
                      disabled={sendToAll}
                      checked={selectedRecipientIds.includes(recipient.id)}
                      onChange={() => toggleRecipient(recipient.id)}
                    />
                    <div>
                      <div className="text-sm font-semibold text-stone-800">
                        {recipient.first_name} {recipient.last_name}
                      </div>
                      <div className="text-xs text-stone-500">
                        {recipient.children || 'No children listed'}
                      </div>
                    </div>
                  </label>
                ))}
                {recipients.length === 0 && !recipientsLoading && (
                  <div className="text-sm text-stone-500">No families found.</div>
                )}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold text-stone-500 mb-2 font-quicksand">
              Message
            </label>
            <textarea
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              rows={4}
              className="w-full px-4 py-2.5 rounded-2xl border themed-border themed-ring bg-white text-sm resize-none"
              placeholder="Write your message..."
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={closeCompose}
              className="flex-1 px-4 py-2 rounded-xl border themed-border text-stone-600 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending}
              className="flex-1 px-4 py-2 rounded-xl text-white font-semibold"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </form>
      </BaseModal>
    </EducatorLayout>
  );
}

export default EducatorMessages;
