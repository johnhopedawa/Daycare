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
        <div className="flex items-center justify-center h-48 text-stone-500">Loading...</div>
      </ParentLayout>
    );
  }

  return (
    <ParentLayout title="Messages" subtitle="Stay in touch with your daycare">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setShowCompose(!showCompose)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#FF9B85] text-white text-sm font-semibold shadow-lg shadow-[#FF9B85]/30 hover:bg-[#E07A5F] transition-colors"
        >
          <MailPlus size={16} />
          {showCompose ? 'Cancel' : 'Compose Message'}
        </button>
      </div>

      {showCompose && (
        <div className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_-4px_rgba(255,229,217,0.5)] border border-[#FFE5D9]/30 mb-6">
          <h3 className="font-quicksand font-bold text-xl text-stone-800 mb-4">
            New Message to Daycare
          </h3>
          <form onSubmit={sendMessage} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-stone-600 mb-2">Message</label>
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                rows="4"
                required
                className="w-full px-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/40 bg-white resize-none"
                placeholder="Write your message..."
              />
            </div>
            <button
              type="submit"
              disabled={sending}
              className="px-5 py-3 rounded-2xl bg-[#FF9B85] text-white text-sm font-semibold shadow-lg shadow-[#FF9B85]/30 hover:bg-[#E07A5F] transition-colors disabled:opacity-60"
            >
              {sending ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </div>
      )}

      {messages.length === 0 ? (
        <div className="bg-white p-8 rounded-3xl shadow-[0_4px_20px_-4px_rgba(255,229,217,0.5)] border border-[#FFE5D9]/30 text-center text-stone-500">
          No messages yet.
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((msg) => (
            <button
              key={msg.id}
              type="button"
              className={`w-full text-left p-6 rounded-3xl border shadow-[0_4px_20px_-4px_rgba(255,229,217,0.5)] transition-colors ${
                msg.parent_read
                  ? 'bg-white border-[#FFE5D9]/30'
                  : 'bg-[#FFF4CC] border-[#FFE5D9]'
              }`}
              onClick={() => !msg.parent_read && markAsRead(msg.id)}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                <p className="font-semibold text-stone-800">{msg.subject}</p>
                <span className="text-xs text-stone-500">
                  {new Date(msg.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-stone-500 mb-2">
                From: {msg.staff_first_name} {msg.staff_last_name}
              </p>
              <p className="text-sm text-stone-700">{msg.message}</p>
            </button>
          ))}
        </div>
      )}

      <button
        onClick={() => navigate('/parent/dashboard')}
        className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-stone-500 hover:text-[#E07A5F]"
      >
        <ArrowLeft size={16} />
        Back to Dashboard
      </button>
    </ParentLayout>
  );
}

export default ParentMessages;
