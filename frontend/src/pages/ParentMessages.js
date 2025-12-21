import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

  if (loading) return <main className="main"><div className="loading">Loading...</div></main>;

  return (
    <main className="main">
      <div className="header">
        <h1>Messages</h1>
      </div>

      <button onClick={() => setShowCompose(!showCompose)} style={{ marginBottom: '1rem' }}>
        {showCompose ? 'Cancel' : 'Compose Message'}
      </button>

      {showCompose && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3>New Message to Daycare</h3>
          <form onSubmit={sendMessage}>
            <div className="form-group">
              <label>Message</label>
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                rows="4"
                required
              />
            </div>
            <button type="submit" disabled={sending}>
              {sending ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </div>
      )}

      {messages.length === 0 ? (
        <div className="card">
          <p>No messages</p>
        </div>
      ) : (
        messages.map(msg => (
          <div
            key={msg.id}
            className="card"
            style={{
              backgroundColor: msg.parent_read ? '#fff' : '#e3f2fd',
              cursor: 'pointer'
            }}
            onClick={() => !msg.parent_read && markAsRead(msg.id)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <strong>{msg.subject}</strong>
              <span style={{ fontSize: '0.875rem', color: '#666' }}>
                {new Date(msg.created_at).toLocaleDateString()}
              </span>
            </div>
            <p style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>
              From: {msg.staff_first_name} {msg.staff_last_name}
            </p>
            <p>{msg.message}</p>
          </div>
        ))
      )}

      <button onClick={() => navigate('/parent/dashboard')} className="secondary">
        Back to Dashboard
      </button>
    </main>
  );
}

export default ParentMessages;
