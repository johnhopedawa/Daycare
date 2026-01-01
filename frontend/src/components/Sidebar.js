import React from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
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
  Settings,
  LogOut,
  Baby,
} from 'lucide-react';

const menuItems = [
  {
    icon: LayoutDashboard,
    label: 'Dashboard',
    path: '/dashboard',
  },
  {
    icon: ClipboardCheck,
    label: 'Attendance',
    path: '/attendance',
  },
  {
    icon: Users,
    label: 'Families',
    path: '/families',
  },
  {
    icon: CreditCard,
    label: 'Billing',
    path: '/billing',
  },
  {
    icon: Wallet,
    label: 'Payments',
    path: '/payments',
  },
  {
    icon: Calendar,
    label: 'Staff Scheduling',
    path: '/scheduling',
  },
  {
    icon: GraduationCap,
    label: 'Educators',
    path: '/educators',
  },
  {
    icon: DollarSign,
    label: 'Pay Periods',
    path: '/pay',
  },
  {
    icon: Clock,
    label: 'Time Entries',
    path: '/time-entries',
  },
  {
    icon: Landmark,
    label: 'Bank Accounts',
    path: '/banking',
  },
  {
    icon: FileText,
    label: 'Paperwork',
    path: '/paperwork',
  },
  {
    icon: BarChart,
    label: 'Reporting',
    path: '/reporting',
  },
  {
    icon: Settings,
    label: 'Settings',
    path: '/settings',
  },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="w-64 bg-white h-screen fixed left-0 top-0 border-r border-[#FFE5D9] flex flex-col z-20 shadow-[4px_0_24px_rgba(255,229,217,0.4)]"
    >
      <div className="p-8 flex items-center gap-3">
        <div className="min-w-10 min-h-10 w-10 h-10 bg-[#FF9B85] rounded-xl flex items-center justify-center text-white shadow-lg shadow-[#FF9B85]/30 flex-shrink-0">
          <Baby size={24} />
        </div>
        <h1 className="font-quicksand font-bold text-2xl text-stone-800 tracking-tight leading-tight">
          Little<span className="text-[#FF9B85]">Sparrows</span>
          <br />
          Academy
        </h1>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-1 custom-scrollbar">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group relative overflow-hidden ${
                isActive
                  ? 'bg-[#FFE5D9] text-[#E07A5F] font-semibold shadow-sm'
                  : 'text-stone-500 hover:bg-[#FFF8F3] hover:text-[#E07A5F]'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute left-0 top-0 bottom-0 w-1 bg-[#FF9B85] rounded-full"
                />
              )}
              <item.icon
                size={20}
                className={`transition-transform duration-300 ${
                  isActive ? 'scale-110' : 'group-hover:scale-110'
                }`}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className="font-quicksand text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[#FFE5D9]">
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-stone-500 hover:bg-red-50 hover:text-red-500 transition-colors">
          <LogOut size={20} />
          <span className="font-quicksand text-sm font-medium">Logout</span>
        </button>
      </div>
    </motion.aside>
  );
}
