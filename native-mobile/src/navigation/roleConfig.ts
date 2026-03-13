import {
  Bell,
  CalendarDays,
  ClipboardCheck,
  CreditCard,
  Home,
  Mail,
  MoreHorizontal,
  UserRound,
} from 'lucide-react-native';

import { UserRole } from '../types/domain';
import { getRoleHomeRouteName, roleHomeRouteName } from './roleRoutes';

export const adminTabs = [
  { name: 'AdminToday', title: 'Today', icon: Home },
  { name: 'AdminAttendance', title: 'Attendance', icon: ClipboardCheck },
  { name: 'AdminMessages', title: 'Messages', icon: Mail },
  { name: 'AdminEvents', title: 'Events', icon: CalendarDays },
  { name: 'AdminMore', title: 'More', icon: MoreHorizontal },
] as const;

export const educatorTabs = [
  { name: 'EducatorHome', title: 'Home', icon: Home },
  { name: 'EducatorAttendance', title: 'Attendance', icon: ClipboardCheck },
  { name: 'EducatorCare', title: 'Care', icon: Bell },
  { name: 'EducatorMessages', title: 'Messages', icon: Mail },
  { name: 'EducatorSchedule', title: 'Schedule', icon: CalendarDays },
] as const;

export const parentTabs = [
  { name: 'ParentHome', title: 'Home', icon: Home },
  { name: 'ParentChild', title: 'Child', icon: UserRound },
  { name: 'ParentMessages', title: 'Messages', icon: Mail },
  { name: 'ParentBilling', title: 'Billing', icon: CreditCard },
  { name: 'ParentEvents', title: 'Events', icon: CalendarDays },
] as const;

export { getRoleHomeRouteName, roleHomeRouteName, UserRole };
