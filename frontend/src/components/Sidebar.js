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

const TODAY_ITEM = {
  icon: ClipboardCheck,
  label: 'Today',
  path: '/today',
  exact: true,
};

const DASHBOARD_ITEM = {
  icon: LayoutDashboard,
  label: 'Dashboard',
  path: '/dashboard',
  exact: true,
};

const MESSAGES_ITEM = {
  icon: Mail,
  label: 'Messages',
  path: '/finance',
  exact: true,
};

const DAILY_ITEMS = [
  { icon: ClipboardCheck, label: 'Attendance', path: '/attendance' },
  { icon: Calendar, label: 'Calendar', path: '/events' },
  { icon: Users, label: 'Families', path: '/families' },
  { icon: FileText, label: 'Newsletters', path: '/newsletters' },
];

const MANAGEMENT_TEAM_ITEMS = [
  { icon: GraduationCap, label: 'Staff', path: '/educators' },
  { icon: Calendar, label: 'Scheduling', path: '/scheduling' },
];

const MANAGEMENT_PAYROLL_ITEMS = [
  { icon: DollarSign, label: 'Pay Periods', path: '/pay' },
  { icon: Clock, label: 'Time Requests', path: '/time-entries' },
];

const MANAGEMENT_FINANCE_ITEMS = [
  { icon: Wallet, label: 'Transactions', path: '/finance/transactions' },
  { icon: Landmark, label: 'Bank Accounts', path: '/finance/accounts' },
  { icon: Tag, label: 'Categories', path: '/finance/categories' },
  { icon: CreditCard, label: 'Billing', path: '/billing' },
  { icon: DollarSign, label: 'Payments', path: '/payments' },
];

const MANAGEMENT_OTHER_ITEMS = [
  { icon: FileText, label: 'Paperwork', path: '/paperwork' },
  { icon: BarChart, label: 'Reports', path: '/reporting' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

const STORAGE_KEYS = {
  dailyOpen: 'sidebar.dailyOpen',
  managementOpen: 'sidebar.managementOpen',
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

const isPathActive = (itemPath, currentPath, exact = false) => {
  if (currentPath === itemPath) {
    return true;
  }
  if (exact) {
    return false;
  }
  return currentPath.startsWith(`${itemPath}/`);
};

export function Sidebar({ isOpen, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const navRef = useRef(null);
  const navScrollRef = useRef(0);
  const [dailyOpen, setDailyOpen] = useState(() =>
    readStoredBoolean(STORAGE_KEYS.dailyOpen, true)
  );
  const [managementOpen, setManagementOpen] = useState(() =>
    readStoredBoolean(STORAGE_KEYS.managementOpen, true)
  );
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [pendingTimeEntries, setPendingTimeEntries] = useState(0);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.dailyOpen, String(dailyOpen));
    } catch (error) {
      // Ignore storage failures (private mode or blocked storage).
    }
  }, [dailyOpen]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.managementOpen, String(managementOpen));
    } catch (error) {
      // Ignore storage failures (private mode or blocked storage).
    }
  }, [managementOpen]);

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
    const path = location.pathname;
    const isDailyRoute = [TODAY_ITEM, ...DAILY_ITEMS].some((item) => isPathActive(item.path, path, item.exact));
    const managementItems = [
      DASHBOARD_ITEM,
      ...MANAGEMENT_TEAM_ITEMS,
      ...MANAGEMENT_PAYROLL_ITEMS,
      ...MANAGEMENT_FINANCE_ITEMS,
      ...MANAGEMENT_OTHER_ITEMS,
    ];
    const isManagementRoute = managementItems.some((item) => isPathActive(item.path, path, item.exact));

    if (isDailyRoute && !dailyOpen) {
      setDailyOpen(true);
    }
    if (isManagementRoute && !managementOpen) {
      setManagementOpen(true);
    }
  }, [location.pathname, dailyOpen, managementOpen]);

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
    const isActive = isPathActive(item.path, location.pathname, item.exact);
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

  const payrollItems = MANAGEMENT_PAYROLL_ITEMS.map((item) =>
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
          {renderNavLink(TODAY_ITEM)}
          {renderNavLink(DASHBOARD_ITEM)}
          {renderNavLink(MESSAGES_ITEM)}
        </div>

        <div className="space-y-2 mt-2">
          <button
            type="button"
            onClick={() => setDailyOpen((prev) => !prev)}
            className="w-full flex items-center justify-between px-4 pt-4 text-[11px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: 'var(--menu-text)' }}
            aria-expanded={dailyOpen}
          >
            <span className="opacity-70">Daily Operations</span>
            <ChevronDown
              size={14}
              className={`transition-transform ${dailyOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {dailyOpen && (
            <div
              className="space-y-2 ml-2 pl-3 border-l"
              style={{ borderColor: 'var(--menu-border)' }}
            >
              {DAILY_ITEMS.map((item) => renderNavLink(item))}
            </div>
          )}
        </div>

        <div className="space-y-2 mt-4">
          <button
            type="button"
            onClick={() => setManagementOpen((prev) => !prev)}
            className="w-full flex items-center justify-between px-4 pt-4 text-[11px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: 'var(--menu-text)' }}
            aria-expanded={managementOpen}
          >
            <span className="opacity-70">Management</span>
            <ChevronDown
              size={14}
              className={`transition-transform ${managementOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {managementOpen && (
            <div
              className="space-y-2 ml-2 pl-3 border-l"
              style={{ borderColor: 'var(--menu-border)' }}
            >
              <div className="space-y-1">
                <div className="px-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.16em] opacity-60" style={{ color: 'var(--menu-text)' }}>
                  Team
                </div>
                {MANAGEMENT_TEAM_ITEMS.map((item) => renderNavLink(item))}
              </div>

              <div className="space-y-1">
                <div className="px-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.16em] opacity-60" style={{ color: 'var(--menu-text)' }}>
                  Payroll &amp; Time
                </div>
                {payrollItems.map((item) => renderNavLink(item))}
              </div>

              <div className="space-y-1">
                <div className="px-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.16em] opacity-60" style={{ color: 'var(--menu-text)' }}>
                  Finance
                </div>
                {MANAGEMENT_FINANCE_ITEMS.map((item) => renderNavLink(item))}
              </div>

              <div className="space-y-1">
                <div className="px-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.16em] opacity-60" style={{ color: 'var(--menu-text)' }}>
                  Other
                </div>
                {MANAGEMENT_OTHER_ITEMS.map((item) => renderNavLink(item))}
              </div>
            </div>
          )}
        </div>
      </nav>

      <div className="px-4 py-3 border-t space-y-1" style={{ borderColor: 'var(--menu-border)' }}>
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
