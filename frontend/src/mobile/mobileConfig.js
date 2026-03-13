import {
  Baby,
  CalendarDays,
  ClipboardCheck,
  CreditCard,
  Home,
  Mail,
  MoreHorizontal,
  UserRound,
} from 'lucide-react';

export const isMobileAppBuild = process.env.REACT_APP_MOBILE_APP === 'true';

export const roleTabConfig = {
  ADMIN: [
    { label: 'Today', path: '/admin/today', icon: Home },
    { label: 'Attendance', path: '/admin/attendance', icon: ClipboardCheck },
    { label: 'Messages', path: '/admin/messages', icon: Mail },
    { label: 'Events', path: '/admin/events', icon: CalendarDays },
    { label: 'More', path: '/admin/more', icon: MoreHorizontal },
  ],
  EDUCATOR: [
    { label: 'Home', path: '/educator/home', icon: Home },
    { label: 'Attendance', path: '/educator/attendance', icon: ClipboardCheck },
    { label: 'Care', path: '/educator/care', icon: Baby },
    { label: 'Messages', path: '/educator/messages', icon: Mail },
    { label: 'Schedule', path: '/educator/schedule', icon: CalendarDays },
  ],
  PARENT: [
    { label: 'Home', path: '/parent/home', icon: Home },
    { label: 'Child', path: '/parent/child', icon: UserRound },
    { label: 'Messages', path: '/parent/messages', icon: Mail },
    { label: 'Billing', path: '/parent/billing', icon: CreditCard },
    { label: 'Events', path: '/parent/events', icon: CalendarDays },
  ],
};

export const getRoleHomePath = (user) => {
  if (!user?.role) {
    return '/login';
  }

  if (user.role === 'PARENT') {
    if (user.must_reset_password) {
      return '/reset-password';
    }
    return '/parent/home';
  }

  if (user.role === 'EDUCATOR') {
    return '/educator/home';
  }

  return '/admin/today';
};

export const getRoleSettingsLabel = (role) => {
  if (role === 'PARENT') return 'Family Settings';
  if (role === 'EDUCATOR') return 'Educator Settings';
  return 'Admin Settings';
};

export const getRoleThemeMode = (role) => {
  return role === 'PARENT' ? 'parent' : 'staff';
};
