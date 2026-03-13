import {
  AdminTodaySummary,
  AttendanceCompliance,
  AttendanceRecord,
  CareLog,
  ChildSummary,
  EventItem,
  FamilySummary,
  Newsletter,
  ParentBillingSummary,
  ParentDashboardSummary,
  ParentInvoice,
  ParentMessage,
  ParentPayment,
  ParentRecipient,
  ScheduleItem,
  StaffMessage,
} from '../types/domain';
import { requestJson } from './http';

function todayKey() {
  return new Date().toISOString().split('T')[0];
}

export async function getAdminToday(baseUrl: string, token: string): Promise<AdminTodaySummary> {
  const today = todayKey();
  const [attendance, careLogs, events, compliance, unread] = await Promise.all([
    requestJson<{ attendance: AttendanceRecord[] }>({
      baseUrl,
      path: '/attendance/today',
      token,
    }),
    requestJson<{ logs: CareLog[] }>({
      baseUrl,
      path: '/care-logs',
      token,
      query: { date: today },
    }),
    requestJson<{ events: EventItem[] }>({
      baseUrl,
      path: '/events',
      token,
      query: { from: today, limit: 8 },
    }),
    requestJson<AttendanceCompliance>({
      baseUrl,
      path: '/attendance/compliance',
      token,
      query: { date: today },
    }),
    requestJson<{ count: number }>({
      baseUrl,
      path: '/messages/unread-count',
      token,
    }),
  ]);

  return {
    attendance: attendance.attendance,
    careLogs: careLogs.logs,
    events: events.events,
    compliance,
    unreadCount: unread.count || 0,
  };
}

export async function getStaffAttendance(baseUrl: string, token: string) {
  const today = todayKey();
  const [attendance, children] = await Promise.all([
    requestJson<{ attendance: AttendanceRecord[] }>({
      baseUrl,
      path: '/attendance',
      token,
      query: {
        start_date: today,
        end_date: today,
      },
    }),
    requestJson<{ children: ChildSummary[] }>({
      baseUrl,
      path: '/attendance/children',
      token,
      query: {
        status: 'ACTIVE',
        date: today,
      },
    }),
  ]);

  return {
    attendance: attendance.attendance,
    children: children.children,
  };
}

export async function getAdminAttendance(baseUrl: string, token: string) {
  const today = todayKey();
  const [attendance, children] = await Promise.all([
    requestJson<{ attendance: AttendanceRecord[] }>({
      baseUrl,
      path: '/attendance/today',
      token,
    }),
    requestJson<{ children: ChildSummary[] }>({
      baseUrl,
      path: '/attendance/children',
      token,
      query: {
        status: 'ACTIVE',
        date: today,
      },
    }),
  ]);

  return {
    attendance: attendance.attendance,
    children: children.children,
  };
}

export async function checkInChild(
  baseUrl: string,
  token: string,
  childId: number,
  parentName: string,
  notes?: string,
  checkInTime?: string
) {
  return requestJson({
    baseUrl,
    path: '/attendance/check-in',
    token,
    method: 'POST',
    body: {
      child_id: childId,
      parent_name: parentName,
      notes: notes || null,
      check_in_time: checkInTime || undefined,
    },
  });
}

export async function checkOutChild(
  baseUrl: string,
  token: string,
  childId: number,
  parentName: string,
  notes?: string,
  checkOutTime?: string
) {
  return requestJson({
    baseUrl,
    path: '/attendance/check-out',
    token,
    method: 'POST',
    body: {
      child_id: childId,
      parent_name: parentName,
      notes: notes || null,
      check_out_time: checkOutTime || undefined,
    },
  });
}

export async function markChildAbsent(
  baseUrl: string,
  token: string,
  childId: number,
  status: 'ABSENT' | 'SICK' | 'VACATION',
  notes?: string
) {
  return requestJson({
    baseUrl,
    path: '/attendance/mark-absent',
    token,
    method: 'POST',
    body: {
      child_id: childId,
      status,
      notes: notes || null,
    },
  });
}

export async function getStaffMessages(baseUrl: string, token: string) {
  const [messages, recipients] = await Promise.all([
    requestJson<{ messages: StaffMessage[] }>({
      baseUrl,
      path: '/messages/inbox',
      token,
      query: { limit: 50 },
    }),
    requestJson<{ recipients: ParentRecipient[] }>({
      baseUrl,
      path: '/messages/recipients',
      token,
    }),
  ]);

  return {
    messages: messages.messages,
    recipients: recipients.recipients,
  };
}

export async function markStaffMessageRead(baseUrl: string, token: string, messageId: number) {
  return requestJson({
    baseUrl,
    path: `/messages/${messageId}/read`,
    token,
    method: 'PATCH',
  });
}

export async function sendStaffMessage(
  baseUrl: string,
  token: string,
  payload: {
    recipientType: 'all' | 'parent';
    parentId?: number;
    subject: string;
    message: string;
  }
) {
  return requestJson({
    baseUrl,
    path: '/messages/send',
    token,
    method: 'POST',
    body: payload,
  });
}

export async function getStaffEvents(baseUrl: string, token: string) {
  const today = todayKey();
  return requestJson<{ events: EventItem[] }>({
    baseUrl,
    path: '/events',
    token,
    query: {
      from: today,
      limit: 20,
    },
  });
}

export async function getAdminMore(baseUrl: string, token: string) {
  const [families, newsletters] = await Promise.all([
    requestJson<{ families: FamilySummary[] }>({
      baseUrl,
      path: '/families',
      token,
    }),
    requestJson<{ newsletters: Newsletter[] }>({
      baseUrl,
      path: '/newsletters',
      token,
      query: { limit: 3 },
    }),
  ]);

  return {
    families: families.families,
    newsletters: newsletters.newsletters,
  };
}

export async function getEducatorHome(baseUrl: string, token: string) {
  const today = todayKey();
  const nextMonth = new Date();
  nextMonth.setDate(nextMonth.getDate() + 30);

  const [attendance, careLogs, schedules] = await Promise.all([
    requestJson<{ children: ChildSummary[] }>({
      baseUrl,
      path: '/attendance/children',
      token,
      query: { status: 'ACTIVE', date: today },
    }),
    requestJson<{ logs: CareLog[] }>({
      baseUrl,
      path: '/care-logs',
      token,
      query: { date: today },
    }),
    requestJson<{ schedules: ScheduleItem[] }>({
      baseUrl,
      path: '/schedules/my-schedules',
      token,
      query: {
        from: today,
        to: nextMonth.toISOString().split('T')[0],
      },
    }),
  ]);

  return {
    children: attendance.children,
    careLogs: careLogs.logs,
    schedules: schedules.schedules,
  };
}

export async function getEducatorCare(baseUrl: string, token: string) {
  const today = todayKey();
  const [children, careLogs] = await Promise.all([
    requestJson<{ children: ChildSummary[] }>({
      baseUrl,
      path: '/attendance/children',
      token,
      query: { status: 'ACTIVE', date: today },
    }),
    requestJson<{ logs: CareLog[] }>({
      baseUrl,
      path: '/care-logs',
      token,
      query: { date: today },
    }),
  ]);

  return {
    children: children.children,
    careLogs: careLogs.logs,
  };
}

export async function createCareLog(
  baseUrl: string,
  token: string,
  payload: {
    childId: number;
    logType: 'NAP' | 'PEE' | 'POO';
    occurredAt?: string;
    notes?: string;
  }
) {
  return requestJson({
    baseUrl,
    path: '/care-logs',
    token,
    method: 'POST',
    body: {
      child_id: payload.childId,
      log_type: payload.logType,
      occurred_at: payload.occurredAt || null,
      notes: payload.notes || null,
    },
  });
}

export async function getEducatorSchedule(baseUrl: string, token: string) {
  const today = todayKey();
  const nextSixWeeks = new Date();
  nextSixWeeks.setDate(nextSixWeeks.getDate() + 45);

  return requestJson<{ schedules: ScheduleItem[] }>({
    baseUrl,
    path: '/schedules/my-schedules',
    token,
    query: {
      from: today,
      to: nextSixWeeks.toISOString().split('T')[0],
    },
  });
}

export async function acceptSchedule(baseUrl: string, token: string, scheduleId: number) {
  return requestJson({
    baseUrl,
    path: `/schedules/my-schedules/${scheduleId}/accept`,
    token,
    method: 'POST',
  });
}

export async function declineSchedule(
  baseUrl: string,
  token: string,
  scheduleId: number,
  reason: string,
  declineType: 'SICK_DAY' | 'VACATION_DAY' | 'UNPAID'
) {
  return requestJson({
    baseUrl,
    path: `/schedules/my-schedules/${scheduleId}/decline`,
    token,
    method: 'POST',
    body: {
      reason,
      declineType,
    },
  });
}

export async function getParentHome(baseUrl: string, token: string) {
  const today = todayKey();
  const [dashboard, newsletters, careLogs, children] = await Promise.all([
    requestJson<ParentDashboardSummary>({
      baseUrl,
      path: '/parent/dashboard',
      token,
    }),
    requestJson<{ newsletters: Newsletter[] }>({
      baseUrl,
      path: '/newsletters',
      token,
      query: { limit: 4 },
    }),
    requestJson<{ logs: CareLog[] }>({
      baseUrl,
      path: '/care-logs',
      token,
      query: { date: today },
    }),
    requestJson<{ children: ChildSummary[] }>({
      baseUrl,
      path: '/parent/children',
      token,
    }),
  ]);

  return {
    dashboard,
    newsletters: newsletters.newsletters,
    careLogs: careLogs.logs,
    children: children.children,
  };
}

export async function getParentChildren(baseUrl: string, token: string) {
  return requestJson<{ children: ChildSummary[] }>({
    baseUrl,
    path: '/parent/children',
    token,
  });
}

export async function getParentMessages(baseUrl: string, token: string) {
  return requestJson<{ messages: ParentMessage[] }>({
    baseUrl,
    path: '/parent/messages',
    token,
  });
}

export async function markParentMessageRead(baseUrl: string, token: string, messageId: number) {
  return requestJson({
    baseUrl,
    path: `/parent/messages/${messageId}/read`,
    token,
    method: 'PATCH',
  });
}

export async function sendParentMessage(baseUrl: string, token: string, message: string) {
  return requestJson({
    baseUrl,
    path: '/parent/messages',
    token,
    method: 'POST',
    body: {
      subject: 'Message from Parent',
      message,
    },
  });
}

export async function getParentBilling(baseUrl: string, token: string): Promise<ParentBillingSummary> {
  const [invoices, payments, dashboard] = await Promise.all([
    requestJson<{ invoices: ParentInvoice[] }>({
      baseUrl,
      path: '/parent/invoices',
      token,
    }),
    requestJson<{ payments: ParentPayment[] }>({
      baseUrl,
      path: '/parent/invoices/payments/history',
      token,
    }),
    requestJson<ParentDashboardSummary>({
      baseUrl,
      path: '/parent/dashboard',
      token,
    }),
  ]);

  return {
    invoices: invoices.invoices,
    payments: payments.payments,
    dashboard,
  };
}

export async function getParentInvoicePdfLink(baseUrl: string, token: string, invoiceId: number) {
  return requestJson<{ url: string }>({
    baseUrl,
    path: `/parent/invoices/${invoiceId}/pdf-link`,
    token,
    method: 'POST',
  });
}

export async function getParentEvents(baseUrl: string, token: string) {
  const today = todayKey();
  const nextTwoMonths = new Date();
  nextTwoMonths.setDate(nextTwoMonths.getDate() + 60);

  return requestJson<{ events: EventItem[] }>({
    baseUrl,
    path: '/parent/events',
    token,
    query: {
      from: today,
      to: nextTwoMonths.toISOString().split('T')[0],
    },
  });
}

export async function submitParentRsvp(
  baseUrl: string,
  token: string,
  eventId: number,
  status: 'GOING' | 'NOT_GOING'
) {
  return requestJson({
    baseUrl,
    path: `/parent/events/${eventId}/rsvp`,
    token,
    method: 'POST',
    body: { status },
  });
}
