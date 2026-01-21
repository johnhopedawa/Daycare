import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardCheck,
  Users,
  CreditCard,
  Calendar,
  GraduationCap,
  Clock,
  DollarSign,
  Wallet,
  Landmark,
  FileText,
  BarChart,
  Tag,
  ChevronDown,
  Settings,
  LogOut,
  Baby,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const OPERATIONS_DASHBOARD = {
  icon: LayoutDashboard,
  label: 'Daycare Dashboard',
  path: '/dashboard',
};

const FINANCE_DASHBOARD = {
  icon: LayoutDashboard,
  label: 'Finance Dashboard',
  path: '/finance',
};

const OPERATIONS_ITEMS = [
  { icon: ClipboardCheck, label: 'Attendance', path: '/attendance' },
  { icon: Users, label: 'Families', path: '/families' },
  { icon: GraduationCap, label: 'Staff', path: '/educators' },
  { icon: Calendar, label: 'Scheduling', path: '/scheduling' },
  { icon: FileText, label: 'Paperwork', path: '/paperwork' },
];

const OPERATIONS_SETTINGS_ITEM = {
  icon: Settings,
  label: 'Settings',
  path: '/settings',
};

const OPERATIONS_PAYROLL_ITEMS = [
  { icon: DollarSign, label: 'Pay Periods', path: '/pay' },
  { icon: Clock, label: 'Time Entries', path: '/time-entries' },
];

const FINANCE_ITEMS = [
  { icon: Wallet, label: 'Transactions', path: '/finance/transactions' },
  { icon: Landmark, label: 'Bank Accounts', path: '/finance/accounts' },
  { icon: Tag, label: 'Categories', path: '/finance/categories' },
  { icon: BarChart, label: 'Reports', path: '/reporting' },
];

const FINANCE_BILLING_ITEMS = [
  { icon: CreditCard, label: 'Billing', path: '/billing' },
  { icon: DollarSign, label: 'Payments', path: '/payments' },
];

export function Sidebar({ isOpen, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [operationsOpen, setOperationsOpen] = useState(true);
  const [financeOpen, setFinanceOpen] = useState(true);

  const renderNavLink = (item, options = {}) => {
    const { compact = false, indent = false } = options;
    const isActive = location.pathname === item.path;
    const paddingClass = indent ? 'pl-10 pr-4' : 'px-4';
    const verticalClass = compact ? 'py-2' : 'py-3';
    const textClass = compact ? 'text-xs' : 'text-sm';
    const iconSize = compact ? 18 : 20;

    return (
      <Link
        key={item.path}
        to={item.path}
        onClick={() => {
          if (window.innerWidth < 1024) {
            onClose();
          }
        }}
        className={`menu-link w-full flex items-center gap-3 ${paddingClass} ${verticalClass} rounded-2xl transition-all duration-300 group relative overflow-hidden ${
          isActive ? 'menu-link-active font-semibold shadow-sm' : ''
        }`}
      >
        {isActive && (
          <motion.div
            layoutId="activeTab"
            className="absolute left-0 top-0 bottom-0 w-1 rounded-full"
            style={{ backgroundColor: 'var(--menu-accent)' }}
          />
        )}
        <item.icon
          size={iconSize}
          className={`transition-transform duration-300 ${
            isActive ? 'scale-110' : 'group-hover:scale-110'
          }`}
          strokeWidth={isActive ? 2.5 : 2}
        />
        <span className={`font-quicksand ${textClass}`}>{item.label}</span>
      </Link>
    );
  };

  const handleLogout = () => {
    logout();
    if (window.innerWidth < 1024) {
      onClose();
    }
    navigate('/login', { replace: true });
  };

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 z-30 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`
          w-64 h-screen fixed left-0 top-0 border-r
          flex flex-col
          transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${isOpen ? 'translate-x-0 z-40' : '-translate-x-full z-20'}
        `}
        style={{
          backgroundColor: 'var(--menu-bg)',
          borderColor: 'var(--menu-border)',
          boxShadow: '4px 0 24px var(--menu-shadow)',
        }}
      >
      <div className="px-4 pt-4 pb-2 sm:px-6 lg:hidden border-b" style={{ borderColor: 'var(--menu-border)' }}>
        <div className="flex items-center justify-between">
          <span
            className="font-quicksand text-xs font-semibold uppercase tracking-[0.2em]"
            style={{ color: 'var(--menu-text)' }}
          >
            Menu
          </span>
          {/* Mobile Close Button */}
          <button
            onClick={onClose}
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl transition-colors border"
            style={{
              color: 'var(--menu-text)',
              borderColor: 'var(--menu-border)',
            }}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="py-6 px-4 border-b" style={{ borderColor: 'var(--menu-border)' }}>
        <div className="flex items-center justify-center gap-3">
          <div
            className="min-w-10 min-h-10 w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg flex-shrink-0"
            style={{
              backgroundColor: 'var(--menu-accent)',
              boxShadow: '0 8px 20px var(--menu-shadow)',
            }}
          >
            <Baby size={24} />
          </div>
          <h1 className="font-quicksand font-bold text-xl sm:text-2xl tracking-tight leading-tight">
            Little<span style={{ color: 'var(--menu-accent)' }}>Sparrows</span>
            <br />
            Academy
          </h1>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-6 custom-scrollbar">
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setOperationsOpen((prev) => !prev)}
            className="w-full flex items-center justify-between px-4 pt-4 text-[10px] font-semibold uppercase tracking-[0.2em] opacity-70"
            style={{ color: 'var(--menu-text)' }}
            aria-expanded={operationsOpen}
          >
            Operations
            <ChevronDown
              size={14}
              className={`transition-transform ${operationsOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {renderNavLink(OPERATIONS_DASHBOARD)}

          {operationsOpen && (
            <div className="space-y-1">
              {OPERATIONS_ITEMS.map((item) => renderNavLink(item))}

              <p
                className="px-4 pt-3 text-[10px] font-semibold uppercase tracking-[0.2em] opacity-60"
                style={{ color: 'var(--menu-text)' }}
              >
                Payroll &amp; Time
              </p>
              <div className="space-y-1">
                {OPERATIONS_PAYROLL_ITEMS.map((item) => renderNavLink(item, { compact: true, indent: true }))}
              </div>

              {renderNavLink(OPERATIONS_SETTINGS_ITEM)}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setFinanceOpen((prev) => !prev)}
            className="w-full flex items-center justify-between px-4 pt-4 text-[10px] font-semibold uppercase tracking-[0.2em] opacity-70"
            style={{ color: 'var(--menu-text)' }}
            aria-expanded={financeOpen}
          >
            Finance
            <ChevronDown
              size={14}
              className={`transition-transform ${financeOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {renderNavLink(FINANCE_DASHBOARD)}

          {financeOpen && (
            <div className="space-y-1">
              {FINANCE_ITEMS.map((item) => renderNavLink(item))}

              <p
                className="px-4 pt-3 text-[10px] font-semibold uppercase tracking-[0.2em] opacity-60"
                style={{ color: 'var(--menu-text)' }}
              >
                Billing &amp; Payments
              </p>
              <div className="space-y-1">
                {FINANCE_BILLING_ITEMS.map((item) => renderNavLink(item, { compact: true, indent: true }))}
              </div>
            </div>
          )}
        </div>
      </nav>

      <div className="p-4 border-t" style={{ borderColor: 'var(--menu-border)' }}>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-colors"
          style={{ color: 'var(--menu-text)' }}
        >
          <LogOut size={20} />
          <span className="font-quicksand text-sm font-medium">Sign Out</span>
        </button>
      </div>
    </motion.aside>
    </>
  );
}
