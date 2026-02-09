import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  User,
  LayoutDashboard,
  Users,
  FileText,
  Calendar,
  MessageSquare,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ConfirmModal } from './modals/ConfirmModal';

const navItems = [
  { label: 'Dashboard', path: '/parent/dashboard', icon: LayoutDashboard },
  { label: 'My Children', path: '/parent/children', icon: Users },
  { label: 'Invoices', path: '/parent/invoices', icon: FileText },
  { label: 'Events', path: '/parent/events', icon: Calendar },
  { label: 'Messages', path: '/parent/messages', icon: MessageSquare },
];

export function ParentLayout({ title, subtitle, children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/parents', { replace: true });
  };

  return (
    <div className="parent-portal-shell min-h-screen font-sans">
      <header className="w-full parent-glass-header border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3">
              <div className="parent-icon-chip p-2 rounded-full">
                <User className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] tracking-widest parent-text-muted font-semibold uppercase">
                  Parent Portal
                </span>
                <span className="text-3xl font-script parent-brand pt-1">
                  Little Sparrows Academy
                </span>
              </div>
            </div>

            <div className="flex items-center gap-6">
              {user?.first_name && (
                <div className="hidden md:block text-sm parent-text-muted">
                  Hi, <span className="font-semibold parent-text">{user.first_name}</span>
                </div>
              )}
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="parent-button-soft flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <nav className="w-full parent-nav-shell border-b shadow-sm relative z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-6 overflow-x-auto no-scrollbar">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`parent-nav-link relative flex items-center gap-2 py-4 text-sm font-medium transition-colors duration-200 whitespace-nowrap ${
                    isActive ? 'parent-nav-link-active' : ''
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10 text-center md:text-left">
          <h2 className="text-3xl md:text-4xl font-bold parent-text mb-2 tracking-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="parent-text-muted text-lg">
              {subtitle}
            </p>
          )}
        </div>

        {children}
      </main>

      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="Sign out"
        message="Are you sure you want to sign out?"
        confirmLabel="Sign out"
      />
    </div>
  );
}
