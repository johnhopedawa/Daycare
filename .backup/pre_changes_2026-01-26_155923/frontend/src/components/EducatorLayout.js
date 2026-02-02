import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Baby, LayoutDashboard, Calendar, Clock, ClipboardCheck, FileText, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const navItems = [
  { label: 'Dashboard', path: '/educator/dashboard', icon: LayoutDashboard },
  { label: 'My Schedule', path: '/educator/my-schedule', icon: Calendar },
  { label: 'My Hours', path: '/educator/my-hours', icon: Clock },
  { label: 'Log Hours', path: '/educator/log-hours', icon: ClipboardCheck },
  { label: 'Paystubs', path: '/educator/my-paystubs', icon: FileText },
];

export function EducatorLayout({ title, subtitle, children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div
      className="min-h-screen font-sans"
      style={{ backgroundColor: 'var(--background)', color: 'var(--text)' }}
    >
      <header
        className="border-b sticky top-0 z-20"
        style={{ backgroundColor: 'var(--menu-bg)', borderColor: 'var(--menu-border)' }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg"
              style={{
                backgroundColor: 'var(--menu-accent)',
                boxShadow: '0 8px 20px var(--menu-shadow)',
              }}
            >
              <Baby size={20} />
            </div>
            <div>
              <p
                className="text-xs uppercase tracking-[0.2em] font-quicksand"
                style={{ color: 'var(--menu-text)' }}
              >
                Educator Portal
              </p>
              <h1 className="font-quicksand font-bold text-lg">
                Little<span style={{ color: 'var(--menu-accent)' }}>Sparrows</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user?.first_name && (
              <span className="text-sm" style={{ color: 'var(--menu-text)' }}>
                Hi, <span className="font-semibold" style={{ color: 'var(--text)' }}>{user.first_name}</span>
              </span>
            )}
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold hover:text-red-500 hover:bg-red-50 transition-colors border"
              style={{ color: 'var(--menu-text)', borderColor: 'var(--menu-border)' }}
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>

        <div className="border-t" style={{ borderColor: 'var(--menu-border)' }}>
          <nav className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex gap-2 overflow-x-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`menu-link flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-semibold transition-colors whitespace-nowrap ${
                    isActive ? 'menu-link-active' : ''
                  }`}
                >
                  <item.icon size={16} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="mb-6">
          <h2 className="text-2xl sm:text-3xl font-quicksand font-bold">
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm sm:text-base mt-1" style={{ color: 'var(--muted)' }}>
              {subtitle}
            </p>
          )}
        </div>

        {children}
      </main>
    </div>
  );
}
