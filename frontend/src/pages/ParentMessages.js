import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MailPlus, ArrowLeft } from 'lucide-react';
import { ParentLayout } from '../components/ParentLayout';
import api from '../utils/api';

function ParentMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    try {
      const response = await api.get('/parent/messages');
      setMessages(response.data.messages);
    } catch (error) {
      console.error('Load messages error:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (messageId) => {
    try {
      await api.patch(`/parent/messages/${messageId}/read`);
      setMessages(messages.map(m =>
        m.id === messageId ? { ...m, parent_read: true } : m
      ));
    } catch (error) {
      console.error('Mark as read error:', error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      await api.post('/parent/messages', {
        message: newMessage,
        subject: 'Message from Parent'
      });

      setNewMessage('');
      setShowCompose(false);
    } catch (error) {
      console.error('Send message error:', error);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <ParentLayout title="Messages" subtitle="Stay in touch with your daycare">
        <div className="flex items-center justify-center h-48 parent-text-muted">Loading...</div>
      </ParentLayout>
    );
  }

  return (
    <ParentLayout title="Messages" subtitle="Stay in touch with your daycare">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setShowCompose(!showCompose)}
          className="parent-button-primary inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold shadow-md transition-colors"
        >
          <MailPlus size={16} />
          {showCompose ? 'Cancel' : 'Compose Message'}
        </button>
      </div>

      {showCompose && (
        <div className="parent-card p-6 rounded-xl border border-gray-100 mb-6">
          <h3 className="font-bold text-xl parent-text mb-4">
            New Message to Daycare
          </h3>
          <form onSubmit={sendMessage} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold parent-text-muted mb-2">Message</label>
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                rows="4"
                required
                className="parent-input w-full px-4 py-3 rounded-xl resize-none"
                placeholder="Write your message..."
              />
            </div>
            <button
              type="submit"
              disabled={sending}
              className="parent-button-primary px-5 py-3 rounded-xl text-sm font-semibold shadow-md transition-colors disabled:opacity-60"
            >
              {sending ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </div>
      )}

      {messages.length === 0 ? (
        <div className="parent-card p-8 rounded-xl border border-gray-100 text-center parent-text-muted">
          No messages yet.
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((msg) => (
            <button
              key={msg.id}
              type="button"
              className={`w-full text-left p-6 rounded-xl border transition-colors ${
                msg.parent_read
                  ? 'parent-card'
                  : 'parent-card-strong'
              }`}
              onClick={() => !msg.parent_read && markAsRead(msg.id)}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                <p className="font-semibold parent-text">{msg.subject}</p>
                <span className="text-xs parent-text-muted">
                  {new Date(msg.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm parent-text-muted mb-2">
                From: {msg.staff_first_name} {msg.staff_last_name}
              </p>
              <p className="text-sm parent-text">{msg.message}</p>
            </button>
          ))}
        </div>
      )}

      <button
        onClick={() => navigate('/parent/dashboard')}
        className="mt-6 inline-flex items-center gap-2 text-sm font-semibold parent-text-muted hover:opacity-90 transition-opacity"
      >
        <ArrowLeft size={16} />
        Back to Dashboard
      </button>
    </ParentLayout>
  );
}

export default ParentMessages;
