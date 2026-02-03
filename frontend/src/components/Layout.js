import React, { useEffect, useRef, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Search, Bell, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

export function Layout({ children, title, subtitle, actionBar }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationsRef = useRef(null);
  const navigate = useNavigate();

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  useEffect(() => {
    let isMounted = true;
    const loadUnread = async () => {
      try {
        const response = await api.get('/notifications/unread-count');
        if (isMounted) {
          setUnreadCount(response.data.count || 0);
        }
      } catch (error) {
        // ignore notification errors
      }
    };

    loadUnread();
    const interval = setInterval(loadUnread, 60000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!notificationsRef.current) {
        return;
      }
      if (!notificationsRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };
    if (notificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [notificationsOpen]);

  const loadNotifications = async () => {
    try {
      setNotificationsLoading(true);
      const response = await api.get('/notifications', { params: { limit: 20 } });
      setNotifications(response.data.notifications || []);
    } catch (error) {
      // ignore notification errors
    } finally {
      setNotificationsLoading(false);
    }
  };

  const handleToggleNotifications = () => {
    const next = !notificationsOpen;
    setNotificationsOpen(next);
    if (next) {
      loadNotifications();
    }
  };

  const handleNotificationHover = async (notification) => {
    if (!notification || notification.is_read) {
      return;
    }
    try {
      await api.patch(`/notifications/${notification.id}/read`);
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notification.id ? { ...item, is_read: true } : item
        )
      );
      setUnreadCount((prev) => Math.max(prev - 1, 0));
    } catch (error) {
      // ignore
    }
  };

  const handleNotificationClick = (notification) => {
    if (notification?.action_url) {
      navigate(notification.action_url);
      setNotificationsOpen(false);
    }
  };

  return (
    <div
      className="min-h-screen font-sans relative"
      style={{
        backgroundColor: 'var(--background)',
        color: 'var(--text)',
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundColor: 'var(--app-backdrop)' }}
        aria-hidden="true"
      />

      <div className="relative z-10">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="lg:pl-72 min-h-screen transition-all duration-300">
          <div style={{ padding: 'var(--layout-padding)' }}>
            <div className="max-w-6xl mx-auto w-full">
          {/* Header */}
          <header
            className="flex flex-wrap items-start justify-between gap-4"
            style={{ marginBottom: 'var(--layout-gap)' }}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {/* Mobile Hamburger Menu */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl border hover:shadow-md transition-all"
                style={{
                  backgroundColor: 'var(--surface)',
                  borderColor: 'var(--border)',
                  color: 'var(--muted)',
                }}
              >
                <Menu size={20} />
              </button>

              <div className="min-w-0">
                <h2 className="text-2xl sm:text-3xl font-bold font-quicksand mb-1">
                  {title}
                </h2>
                <p
                  className="text-sm sm:text-base font-medium"
                  style={{ color: 'var(--muted)' }}
                >
                  {subtitle || currentDate}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-end w-full sm:w-auto">
              <div className="relative hidden md:block">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  size={18}
                  style={{ color: 'var(--muted)' }}
                />
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-10 pr-4 py-2.5 rounded-2xl border focus:outline-none focus:ring-2 text-sm w-32 lg:w-48 xl:w-64 shadow-sm placeholder:text-stone-400"
                  style={{
                    backgroundColor: 'var(--surface)',
                    borderColor: 'var(--border)',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                    '--tw-ring-color': 'rgba(var(--primary-rgb), 0.5)',
                  }}
                />
              </div>
              <div className="relative flex-shrink-0" ref={notificationsRef}>
                <button
                  onClick={handleToggleNotifications}
                  className="w-10 h-10 rounded-xl border flex items-center justify-center hover:shadow-md transition-all relative"
                  style={{
                    backgroundColor: 'var(--surface)',
                    borderColor: 'var(--border)',
                    color: 'var(--muted)',
                  }}
                  aria-label="Open notifications"
                >
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold text-center shadow">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {notificationsOpen && (
                  <div
                    className="absolute right-0 mt-3 w-80 max-w-[90vw] rounded-2xl border shadow-xl overflow-hidden z-30"
                    style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b themed-border">
                      <div>
                        <p className="text-sm font-bold text-stone-800">Notifications</p>
                        <p className="text-xs text-stone-500">{unreadCount} unread</p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await api.patch('/notifications/read-all');
                            setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
                            setUnreadCount(0);
                          } catch (error) {
                            // ignore
                          }
                        }}
                        className="text-xs font-semibold text-stone-500 hover:text-[var(--primary-dark)]"
                      >
                        Mark all read
                      </button>
                    </div>
                    <div className="max-h-72 overflow-y-auto soft-scrollbar">
                      {notificationsLoading ? (
                        <div className="px-4 py-6 text-sm text-stone-500">Loading notifications...</div>
                      ) : notifications.length === 0 ? (
                        <div className="px-4 py-6 text-sm text-stone-500">No notifications yet.</div>
                      ) : (
                        <div className="divide-y themed-border">
                          {notifications.map((notification) => (
                            <button
                              key={notification.id}
                              type="button"
                              onMouseEnter={() => handleNotificationHover(notification)}
                              onClick={() => handleNotificationClick(notification)}
                              className={`w-full text-left px-4 py-3 transition-colors ${
                                notification.is_read ? 'bg-white' : 'bg-[var(--background)]'
                              }`}
                            >
                              <p className="text-sm font-semibold text-stone-800">
                                {notification.title}
                              </p>
                              {notification.message && (
                                <p className="text-xs text-stone-500 mt-1 line-clamp-2">
                                  {notification.message}
                                </p>
                              )}
                              <p className="text-[11px] text-stone-400 mt-2">
                                {notification.created_at
                                  ? new Date(notification.created_at).toLocaleString()
                                  : ''}
                              </p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center font-bold border shadow-sm flex-shrink-0"
                style={{
                  backgroundColor: 'var(--accent)',
                  color: 'var(--primary-dark)',
                  borderColor: 'var(--surface)',
                }}
              >
                S
              </div>
            </div>
          </header>

          {actionBar ? (
            <div style={{ marginBottom: 'var(--layout-gap)' }}>
              {actionBar}
            </div>
          ) : null}

          <div>{children}</div>
          </div>
          </div>
        </main>
      </div>
    </div>
  );
}
