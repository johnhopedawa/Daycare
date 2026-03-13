export type UserRole = 'ADMIN' | 'EDUCATOR' | 'PARENT';

export interface AuthUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  must_reset_password?: boolean;
  sick_days_remaining?: number;
  vacation_days_remaining?: number;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

export interface AttendanceRecord {
  id: number;
  child_id: number;
  child_name: string;
  attendance_date: string;
  status: string;
  check_in_time?: string | null;
  check_out_time?: string | null;
  parent_dropped_off?: string | null;
  parent_picked_up?: string | null;
  notes?: string | null;
}

export interface ChildParentSummary {
  id: number;
  first_name: string;
  last_name: string;
  is_primary_contact?: boolean;
  relationship?: string | null;
}

export interface ChildSummary {
  id: number;
  first_name: string;
  last_name: string;
  status: string;
  allergies?: string | null;
  medical_notes?: string | null;
  date_of_birth?: string;
  enrollment_start_date?: string;
  parents?: ChildParentSummary[];
}

export interface CareLog {
  id: number;
  child_id: number;
  child_name: string;
  log_date: string;
  log_type: 'NAP' | 'PEE' | 'POO';
  occurred_at?: string | null;
  notes?: string | null;
  created_by_first_name?: string;
  created_by_last_name?: string;
}

export interface StaffMessage {
  id: number;
  subject: string;
  message: string;
  created_at: string;
  is_read?: boolean;
  parent_name?: string;
  parent_first_name?: string;
  parent_last_name?: string;
}

export interface ParentMessage {
  id: number;
  subject: string;
  message: string;
  created_at: string;
  parent_read?: boolean;
  staff_first_name?: string;
  staff_last_name?: string;
}

export interface ParentRecipient {
  id: number;
  first_name: string;
  last_name: string;
  email?: string | null;
  children?: string;
}

export interface EventItem {
  id: number;
  title: string;
  event_date: string;
  start_time?: string | null;
  end_time?: string | null;
  location?: string | null;
  description?: string | null;
  audience?: string | null;
  entry_type?: string | null;
  requires_rsvp?: boolean;
  parent_rsvp_status?: 'GOING' | 'NOT_GOING' | null;
}

export interface ScheduleItem {
  id: number;
  shift_date: string;
  start_time: string;
  end_time: string;
  hours: number;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  decline_reason?: string | null;
  decline_type?: 'SICK_DAY' | 'VACATION_DAY' | 'UNPAID' | null;
}

export interface Newsletter {
  id: number;
  title: string;
  body: string;
  published_at?: string | null;
}

export interface FamilySummary {
  family_id: string;
  family_name?: string | null;
  parents: Array<{
    parent_id: number;
    parent_first_name: string;
    parent_last_name: string;
    is_primary_contact?: boolean;
  }>;
  children: ChildSummary[];
}

export interface ParentDashboardSummary {
  children_count: number;
  outstanding_balance: number;
  upcoming_invoices_count: number;
  unread_messages_count: number;
  credit_balance: number;
}

export interface ParentInvoice {
  id: number;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  status: string;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  child_first_name?: string;
  child_last_name?: string;
}

export interface ParentPayment {
  id: number;
  amount: number;
  payment_date: string;
  status: string;
  receipt_number?: string | null;
  invoice_number?: string | null;
}

export interface AttendanceCompliance {
  in_compliance: boolean;
  kids_present: number;
  staff_scheduled: number;
  required_staff: number;
  ratio?: {
    kids: number;
    staff: number;
    kids_per_staff: number;
  };
}

export interface ParentBillingSummary {
  invoices: ParentInvoice[];
  payments: ParentPayment[];
  dashboard: ParentDashboardSummary;
}

export interface HealthResponse {
  status: string;
}

export interface AdminTodaySummary {
  attendance: AttendanceRecord[];
  careLogs: CareLog[];
  events: EventItem[];
  compliance: AttendanceCompliance;
  unreadCount: number;
}
