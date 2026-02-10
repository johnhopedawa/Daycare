import React, { useEffect, useRef, useState } from 'react';
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
  Mail,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ConfirmModal } from './modals/ConfirmModal';
import api from '../utils/api';

const OPERATIONS_DASHBOARD = {
  icon: LayoutDashboard,
  label: 'Daycare Dashboard',
  path: '/dashboard',
};

const FINANCE_DASHBOARD = {
  icon: Mail,
  label: 'Messages',
  path: '/finance',
};

const OPERATIONS_ITEMS = [
  { icon: ClipboardCheck, label: 'Attendance', path: '/attendance' },
  { icon: Calendar, label: 'Calendar', path: '/events' },
  { icon: Users, label: 'Families', path: '/families' },
  { icon: FileText, label: 'Paperwork', path: '/paperwork' },
];

const OPERATIONS_STAFFING_ITEMS = [
  { icon: GraduationCap, label: 'Staff', path: '/educators' },
  { icon: Calendar, label: 'Scheduling', path: '/scheduling' },
];

const OPERATIONS_PAYROLL_ITEMS = [
  { icon: DollarSign, label: 'Pay Periods', path: '/pay' },
  { icon: Clock, label: 'Time Requests', path: '/time-entries' },
];

const FINANCE_ITEMS = [
  { icon: Wallet, label: 'Transactions', path: '/finance/transactions' },
  { icon: Landmark, label: 'Bank Accounts', path: '/finance/accounts' },
  { icon: Tag, label: 'Categories', path: '/finance/categories' },
];

const FINANCE_BILLING_ITEMS = [
  { icon: CreditCard, label: 'Billing', path: '/billing' },
  { icon: DollarSign, label: 'Payments', path: '/payments' },
];

const REPORTS_ITEM = {
  icon: BarChart,
  label: 'Reports',
  path: '/reporting',
};

const SETTINGS_ITEM = {
  icon: Settings,
  label: 'Settings',
  path: '/settings',
};

const STORAGE_KEYS = {
  operationsOpen: 'sidebar.operationsOpen',
  financeOpen: 'sidebar.financeOpen',
  staffingOpen: 'sidebar.staffingOpen',
  payrollOpen: 'sidebar.payrollOpen',
  billingOpen: 'sidebar.billingOpen',
  navScroll: 'sidebar.navScroll',
};

const readStoredBoolean = (key, fallback) => {
  if (typeof window === 'undefined') {
    return fallback;
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) {
      return fallback;
    }
    return raw === 'true';
  } catch (error) {
    return fallback;
  }
};

export function Sidebar({ isOpen, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const navRef = useRef(null);
  const navScrollRef = useRef(0);
  const [operationsOpen, setOperationsOpen] = useState(() =>
    readStoredBoolean(STORAGE_KEYS.operationsOpen, true)
  );
  const [financeOpen, setFinanceOpen] = useState(() =>
    readStoredBoolean(STORAGE_KEYS.financeOpen, true)
  );
  const [staffingOpen, setStaffingOpen] = useState(() =>
    readStoredBoolean(STORAGE_KEYS.staffingOpen, true)
  );
  const [payrollOpen, setPayrollOpen] = useState(() =>
    readStoredBoolean(STORAGE_KEYS.payrollOpen, true)
  );
  const [billingOpen, setBillingOpen] = useState(() =>
    readStoredBoolean(STORAGE_KEYS.billingOpen, true)
  );
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [pendingTimeEntries, setPendingTimeEntries] = useState(0);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.operationsOpen, String(operationsOpen));
    } catch (error) {
      // Ignore storage failures (private mode or blocked storage).
    }
  }, [operationsOpen]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.financeOpen, String(financeOpen));
    } catch (error) {
      // Ignore storage failures (private mode or blocked storage).
    }
  }, [financeOpen]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.staffingOpen, String(staffingOpen));
    } catch (error) {
      // Ignore storage failures (private mode or blocked storage).
    }
  }, [staffingOpen]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.payrollOpen, String(payrollOpen));
    } catch (error) {
      // Ignore storage failures (private mode or blocked storage).
    }
  }, [payrollOpen]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.billingOpen, String(billingOpen));
    } catch (error) {
      // Ignore storage failures (private mode or blocked storage).
    }
  }, [billingOpen]);

  useEffect(() => {
    if (user?.role !== 'ADMIN') {
      return undefined;
    }
    let isMounted = true;
    const loadPending = async () => {
      try {
        const response = await api.get('/admin/time-entries', { params: { status: 'PENDING' } });
        if (isMounted) {
          setPendingTimeEntries(response.data.timeEntries?.length || 0);
        }
      } catch (error) {
        // ignore
      }
    };
    loadPending();
    const interval = setInterval(loadPending, 60000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user?.role]);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) {
      return undefined;
    }
    try {
      const stored = window.sessionStorage.getItem(STORAGE_KEYS.navScroll);
      const value = stored ? Number.parseInt(stored, 10) : 0;
      if (Number.isFinite(value)) {
        nav.scrollTop = value;
        navScrollRef.current = value;
      }
    } catch (error) {
      // Ignore storage failures.
    }

    const handleScroll = () => {
      navScrollRef.current = nav.scrollTop;
      try {
        window.sessionStorage.setItem(STORAGE_KEYS.navScroll, String(nav.scrollTop));
      } catch (error) {
        // Ignore storage failures.
      }
    };

    nav.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      nav.removeEventListener('scroll', handleScroll);
      try {
        window.sessionStorage.setItem(STORAGE_KEYS.navScroll, String(navScrollRef.current));
      } catch (error) {
        // Ignore storage failures.
      }
    };
  }, []);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) {
      return;
    }
    requestAnimationFrame(() => {
      try {
        const stored = window.sessionStorage.getItem(STORAGE_KEYS.navScroll);
        const value = stored ? Number.parseInt(stored, 10) : 0;
        if (Number.isFinite(value)) {
          nav.scrollTop = value;
          navScrollRef.current = value;
        }
      } catch (error) {
        // Ignore storage failures.
      }
    });
  }, [location.pathname]);

  const renderNavLink = (item, options = {}) => {
    const { compact = false, indent = false, dense = false } = options;
    const isActive = location.pathname === item.path;
    const paddingClass = indent ? 'pl-10 pr-4' : 'px-4';
    const verticalClass = compact ? 'py-2' : dense ? 'py-2.5' : 'py-3';
    const textClass = compact ? 'text-sm' : 'text-base';
    const iconSize = compact ? 19 : 21;
    const showBadge = Number.isFinite(item.badge) && item.badge > 0;

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
        <span className="relative">
          <item.icon
            size={iconSize}
            className={`transition-transform duration-300 ${
              isActive ? 'scale-110' : 'group-hover:scale-110'
            }`}
            strokeWidth={isActive ? 2.5 : 2}
          />
          {showBadge && (
            <span className="absolute -top-1 -right-2 min-w-[16px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold text-center shadow">
              {item.badge > 9 ? '9+' : item.badge}
            </span>
          )}
        </span>
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

  const payrollItems = OPERATIONS_PAYROLL_ITEMS.map((item) =>
    item.path === '/time-entries' ? { ...item, badge: pendingTimeEntries } : item
  );

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
          w-72 h-screen fixed left-0 top-0 border-r
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
            className="font-quicksand text-sm font-semibold uppercase tracking-[0.18em]"
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

      <nav
        ref={navRef}
        className="flex-1 overflow-y-auto px-4 py-2 custom-scrollbar"
      >
        <div className="space-y-2 pt-4">
          {renderNavLink(OPERATIONS_DASHBOARD)}
          {renderNavLink(FINANCE_DASHBOARD)}
        </div>

        <div className="space-y-2 mt-2">
          <button
            type="button"
            onClick={() => setOperationsOpen((prev) => !prev)}
            className="w-full flex items-center justify-between px-4 pt-4 text-[11px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: 'var(--menu-text)' }}
            aria-expanded={operationsOpen}
          >
            <span className="opacity-70">Operations</span>
            <ChevronDown
              size={14}
              className={`transition-transform ${operationsOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {operationsOpen && (
            <div
              className="space-y-2 ml-2 pl-3 border-l"
              style={{ borderColor: 'var(--menu-border)' }}
            >
              {OPERATIONS_ITEMS.map((item) => renderNavLink(item))}

              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setStaffingOpen((prev) => !prev)}
                  className="w-full flex items-center justify-between pr-2 pt-3 text-[11px] font-semibold uppercase tracking-[0.18em]"
                  style={{ color: 'var(--menu-text)' }}
                  aria-expanded={staffingOpen}
                >
                  <span className="opacity-60">Staff &amp; Scheduling</span>
                  <ChevronDown
                    size={12}
                    className={`transition-transform ${staffingOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {staffingOpen && (
                  <div className="space-y-1">
                    {OPERATIONS_STAFFING_ITEMS.map((item) => renderNavLink(item))}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setPayrollOpen((prev) => !prev)}
                  className="w-full flex items-center justify-between pr-2 pt-3 text-[11px] font-semibold uppercase tracking-[0.18em]"
                  style={{ color: 'var(--menu-text)' }}
                  aria-expanded={payrollOpen}
                >
                  <span className="opacity-60">Payroll &amp; Time</span>
                  <ChevronDown
                    size={12}
                    className={`transition-transform ${payrollOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {payrollOpen && (
                  <div className="space-y-1">
                    {payrollItems.map((item) => renderNavLink(item))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2 mt-4">
          <button
            type="button"
            onClick={() => setFinanceOpen((prev) => !prev)}
            className="w-full flex items-center justify-between px-4 pt-4 text-[11px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: 'var(--menu-text)' }}
            aria-expanded={financeOpen}
          >
            <span className="opacity-70">Finance</span>
            <ChevronDown
              size={14}
              className={`transition-transform ${financeOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {financeOpen && (
            <div
              className="space-y-2 ml-2 pl-3 border-l"
              style={{ borderColor: 'var(--menu-border)' }}
            >
              {FINANCE_ITEMS.map((item) => renderNavLink(item))}

              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setBillingOpen((prev) => !prev)}
                  className="w-full flex items-center justify-between pr-2 pt-3 text-[11px] font-semibold uppercase tracking-[0.18em]"
                  style={{ color: 'var(--menu-text)' }}
                  aria-expanded={billingOpen}
                >
                  <span className="opacity-60">Billing &amp; Payments</span>
                  <ChevronDown
                    size={12}
                    className={`transition-transform ${billingOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {billingOpen && (
                  <div className="space-y-1">
                    {FINANCE_BILLING_ITEMS.map((item) => renderNavLink(item))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      <div className="px-4 py-3 border-t space-y-1" style={{ borderColor: 'var(--menu-border)' }}>
        <div
          className="px-4 pt-1 text-[11px] font-semibold uppercase tracking-[0.18em] opacity-70"
          style={{ color: 'var(--menu-text)' }}
        >
          General
        </div>
        {renderNavLink(REPORTS_ITEM, { dense: true })}
        {renderNavLink(SETTINGS_ITEM, { dense: true })}
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-colors"
          style={{ color: 'var(--menu-text)' }}
        >
          <LogOut size={20} />
          <span className="font-quicksand text-base font-medium">Sign Out</span>
        </button>
      </div>
    </motion.aside>
    <ConfirmModal
      isOpen={showLogoutConfirm}
      onClose={() => setShowLogoutConfirm(false)}
      onConfirm={handleLogout}
      title="Sign out"
      message="Are you sure you want to sign out?"
      confirmLabel="Sign out"
    />
    </>
  );
}
