import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { MetricCard } from '../components/DashboardWidgets';
import { BaseModal } from '../components/modals/BaseModal';
import { AddChildModal } from '../components/modals/AddChildModal';
import { SendMessageModal } from '../components/modals/SendMessageModal';
import { CreateEventModal } from '../components/modals/CreateEventModal';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import {
  AlertTriangle,
  Briefcase,
  CalendarCheck,
  ClipboardList,
  LogIn,
  Mail,
  UserCheck,
  Users
} from 'lucide-react';

const ABSENT_STATUSES = new Set(['ABSENT', 'SICK', 'VACATION']);

const formatDate = (value) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().split('T')[0];
};

const formatTime = (value) => {
  if (!value) return '';
  const [hours, minutes] = value.split(':');
  const hour = parseInt(hours, 10);
  if (Number.isNaN(hour)) return value;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

const ActionType = {
  CHECK_IN: 'CHECK_IN',
  CHECK_OUT: 'CHECK_OUT',
  MARK_ABSENT: 'MARK_ABSENT',
};

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [events, setEvents] = useState([]);
  const [pendingTasks, setPendingTasks] = useState(0);
  const [actionModal, setActionModal] = useState({ type: null, child: null });
  const [actionForm, setActionForm] = useState({
    parentName: '',
    notes: '',
    status: 'ABSENT',
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [isMessageOpen, setIsMessageOpen] = useState(false);
  const [isAddChildOpen, setIsAddChildOpen] = useState(false);
  const [isEventOpen, setIsEventOpen] = useState(false);
  const today = useMemo(() => formatDate(new Date()), []);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [childrenRes, attendanceRes, schedulesRes, timeEntriesRes, invoicesRes, eventsRes] = await Promise.all([
        api.get('/children?status=ACTIVE'),
        api.get(`/attendance?start_date=${today}&end_date=${today}`),
        api.get(`/schedules/admin/schedules?from=${today}&to=${today}`),
        api.get('/admin/time-entries?status=PENDING'),
        api.get('/invoices'),
        api.get('/events', { params: { from: today, to: today } }),
      ]);

      setChildren(childrenRes.data.children || []);
      setAttendance(attendanceRes.data.attendance || []);
      setSchedules(schedulesRes.data.schedules || []);
      setInvoices(invoicesRes.data.invoices || []);
      setPendingTasks(timeEntriesRes.data.timeEntries.length || 0);
      setEvents(eventsRes.data.events || []);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const summary = useMemo(() => {
    const attendanceByChild = new Map();
    attendance.forEach((record) => {
      attendanceByChild.set(record.child_id, record);
    });

    const presentRecords = attendance.filter((record) => {
      const status = (record.status || '').toUpperCase();
      if (ABSENT_STATUSES.has(status)) {
        return false;
      }
      return Boolean(record.check_in_time || record.check_out_time || ['PRESENT', 'LATE'].includes(status));
    });

    const checkedIn = attendance.filter((record) => {
      const status = (record.status || '').toUpperCase();
      if (ABSENT_STATUSES.has(status)) {
        return false;
      }
      return Boolean(record.check_in_time) && !record.check_out_time;
    });

    const absent = attendance.filter((record) => ABSENT_STATUSES.has((record.status || '').toUpperCase()));
    const notCheckedIn = children.filter((child) => !attendanceByChild.has(child.id));

    const acceptedStaff = new Set(
      schedules
        .filter((schedule) => schedule.status === 'ACCEPTED')
        .map((schedule) => schedule.user_id)
    );

    const overdueInvoices = invoices.filter((invoice) => invoice.status === 'OVERDUE');
    const dueToday = invoices.filter((invoice) => {
      const status = invoice.status || '';
      const dueDate = formatDate(invoice.due_date);
      return ['SENT', 'PARTIAL'].includes(status) && dueDate === today;
    });

    return {
      expectedCount: children.length,
      presentCount: presentRecords.length,
      checkedIn,
      absent,
      notCheckedIn,
      staffScheduled: acceptedStaff.size,
      overdueCount: overdueInvoices.length,
      dueTodayCount: dueToday.length,
    };
  }, [attendance, children, invoices, schedules, today]);

  const scheduleSummary = useMemo(() => {
    const byStatus = schedules.reduce((acc, schedule) => {
      const status = schedule.status || 'PENDING';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    return {
      total: schedules.length,
      accepted: byStatus.ACCEPTED || 0,
      pending: byStatus.PENDING || 0,
      declined: byStatus.DECLINED || 0,
    };
  }, [schedules]);

  const openActionModal = (type, child) => {
    setActionForm({
      parentName: '',
      notes: '',
      status: 'ABSENT',
    });
    setActionModal({ type, child });
  };

  const closeActionModal = () => {
    setActionModal({ type: null, child: null });
  };

  const handleActionSubmit = async (event) => {
    event.preventDefault();
    if (!actionModal.child || !actionModal.type) {
      return;
    }

    setActionLoading(true);

    try {
      if (actionModal.type === ActionType.CHECK_IN) {
        if (!actionForm.parentName.trim()) {
          throw new Error('Parent or guardian name is required.');
        }
        await api.post('/attendance/check-in', {
          child_id: actionModal.child.id,
          parent_name: actionForm.parentName.trim(),
          notes: actionForm.notes.trim() || null,
        });
      }

      if (actionModal.type === ActionType.CHECK_OUT) {
        if (!actionForm.parentName.trim()) {
          throw new Error('Parent or guardian name is required.');
        }
        await api.post('/attendance/check-out', {
          child_id: actionModal.child.id,
          parent_name: actionForm.parentName.trim(),
          notes: actionForm.notes.trim() || null,
        });
      }

      if (actionModal.type === ActionType.MARK_ABSENT) {
        await api.post('/attendance/mark-absent', {
          child_id: actionModal.child.id,
          status: actionForm.status,
          notes: actionForm.notes.trim() || null,
        });
      }

      closeActionModal();
      loadDashboardData();
    } catch (error) {
      console.error('Attendance action error:', error);
      alert(error.response?.data?.error || error.message || 'Failed to update attendance');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout title="Day-of Ops" subtitle="Loading today's overview">
        <div className="flex items-center justify-center h-64">
          <div className="text-stone-500">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      title={`Day-of Ops${user?.first_name ? `, ${user.first_name}` : ''}`}
      subtitle={new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Present Today"
          value={`${summary.presentCount}/${summary.expectedCount}`}
          icon={UserCheck}
          themeIndex={1}
          delay={0.1}
        />
        <MetricCard
          title="Not Checked In"
          value={summary.notCheckedIn.length}
          icon={Users}
          themeIndex={2}
          delay={0.2}
        />
        <MetricCard
          title="Staff Scheduled"
          value={summary.staffScheduled}
          icon={Briefcase}
          themeIndex={3}
          delay={0.3}
        />
        <MetricCard
          title="Pending Tasks"
          value={pendingTasks}
          icon={ClipboardList}
          themeIndex={4}
          delay={0.4}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">
        <div className="xl:col-span-2 space-y-6 md:space-y-8">
          <section className="themed-surface rounded-3xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="font-quicksand font-bold text-xl text-stone-800">Arrivals</h3>
                <p className="text-sm text-stone-500">Track today's check-ins and absences.</p>
              </div>
              <button
                onClick={() => navigate('/attendance')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-semibold text-[#E07A5F] bg-[#FFF8F3] hover:bg-[#FFE5D9] transition-colors"
              >
                <CalendarCheck size={16} />
                Full Attendance
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-stone-800">Not Checked In</h4>
                  <span className="text-xs font-bold text-stone-500">{summary.notCheckedIn.length}</span>
                </div>
                {summary.notCheckedIn.length === 0 ? (
                  <p className="text-sm text-stone-500">All children have checked in.</p>
                ) : (
                  <div className="space-y-3">
                    {summary.notCheckedIn.slice(0, 6).map((child) => (
                      <div key={child.id} className="flex items-center justify-between p-3 rounded-2xl bg-white/70 border border-[#FFE5D9]/60">
                        <div>
                          <p className="text-sm font-semibold text-stone-800">{child.first_name} {child.last_name}</p>
                          <p className="text-xs text-stone-500">
                            Primary: {child.parents?.find((parent) => parent.is_primary_contact)?.parent_name || 'Not set'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openActionModal(ActionType.CHECK_IN, child)}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#E07A5F] hover:opacity-90"
                          >
                            Check In
                          </button>
                          <button
                            onClick={() => openActionModal(ActionType.MARK_ABSENT, child)}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#C4554D] bg-[#FFE5D9]"
                          >
                            Mark Absent
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-stone-800">Checked In</h4>
                  <span className="text-xs font-bold text-stone-500">{summary.checkedIn.length}</span>
                </div>
                {summary.checkedIn.length === 0 ? (
                  <p className="text-sm text-stone-500">No active check-ins yet.</p>
                ) : (
                  <div className="space-y-3">
                    {summary.checkedIn.slice(0, 6).map((record) => (
                      <div key={record.id} className="flex items-center justify-between p-3 rounded-2xl bg-white/70 border border-[#FFE5D9]/60">
                        <div>
                          <p className="text-sm font-semibold text-stone-800">{record.child_name}</p>
                          <p className="text-xs text-stone-500">
                            Arrived {formatTime(record.check_in_time)} - Drop-off: {record.parent_dropped_off || 'Not provided'}
                          </p>
                        </div>
                        <button
                          onClick={() => openActionModal(ActionType.CHECK_OUT, { id: record.child_id, name: record.child_name })}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#2D6A4F] bg-[#B8E6D5]"
                        >
                          Check Out
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="themed-surface rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-quicksand font-bold text-xl text-stone-800">Absences Logged</h3>
                <p className="text-sm text-stone-500">Children marked absent or out today.</p>
              </div>
              <AlertTriangle size={18} className="text-[#E07A5F]" />
            </div>
            {summary.absent.length === 0 ? (
              <p className="text-sm text-stone-500">No absences recorded today.</p>
            ) : (
              <div className="space-y-3">
                {summary.absent.map((record) => (
                  <div key={record.id} className="flex items-center justify-between p-3 rounded-2xl bg-white/70 border border-[#FFE5D9]/60">
                    <div>
                      <p className="text-sm font-semibold text-stone-800">{record.child_name}</p>
                      <p className="text-xs text-stone-500">{record.status} - {record.notes || 'No notes'}</p>
                    </div>
                    <button
                      onClick={() => openActionModal(ActionType.CHECK_IN, { id: record.child_id })}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#E07A5F] hover:opacity-90"
                    >
                      Reverse
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6 md:space-y-8">
          <section className="themed-surface rounded-3xl p-6">
            <h3 className="font-quicksand font-bold text-xl text-stone-800 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => setIsAddChildOpen(true)}
                className="inline-flex items-center justify-between px-4 py-3 rounded-2xl bg-[#FFF8F3] text-[#E07A5F] font-semibold hover:bg-[#FFE5D9] transition-colors"
              >
                Add Child
                <Users size={16} />
              </button>
              <button
                onClick={() => setIsMessageOpen(true)}
                className="inline-flex items-center justify-between px-4 py-3 rounded-2xl bg-[#FFF8F3] text-[#E07A5F] font-semibold hover:bg-[#FFE5D9] transition-colors"
              >
                Send Message
                <Mail size={16} />
              </button>
              <button
                onClick={() => navigate('/payments')}
                className="inline-flex items-center justify-between px-4 py-3 rounded-2xl bg-[#FFF8F3] text-[#E07A5F] font-semibold hover:bg-[#FFE5D9] transition-colors"
              >
                Record Payment
                <ClipboardList size={16} />
              </button>
              <button
                onClick={() => setIsEventOpen(true)}
                className="inline-flex items-center justify-between px-4 py-3 rounded-2xl bg-[#FFF8F3] text-[#E07A5F] font-semibold hover:bg-[#FFE5D9] transition-colors"
              >
                Create Event
                <CalendarCheck size={16} />
              </button>
            </div>
          </section>

          <section className="themed-surface rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-quicksand font-bold text-xl text-stone-800">Staff Coverage</h3>
              <Briefcase size={18} className="text-[#E07A5F]" />
            </div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-sm font-semibold text-stone-700">Accepted</span>
              <span className="text-xs font-bold px-2 py-1 rounded-full bg-[#B8E6D5] text-[#2D6A4F]">{scheduleSummary.accepted}</span>
              <span className="text-sm font-semibold text-stone-700">Pending</span>
              <span className="text-xs font-bold px-2 py-1 rounded-full bg-[#FFF4CC] text-[#B45309]">{scheduleSummary.pending}</span>
              <span className="text-sm font-semibold text-stone-700">Declined</span>
              <span className="text-xs font-bold px-2 py-1 rounded-full bg-[#FFE5D9] text-[#C4554D]">{scheduleSummary.declined}</span>
            </div>
            {schedules.length === 0 ? (
              <p className="text-sm text-stone-500">No shifts scheduled today.</p>
            ) : (
              <div className="space-y-3 max-h-[320px] overflow-y-auto pr-2">
                {schedules.map((schedule) => (
                  <div key={schedule.id} className="flex items-center justify-between p-3 rounded-2xl bg-white/70 border border-[#FFE5D9]/60">
                    <div>
                      <p className="text-sm font-semibold text-stone-800">{schedule.first_name} {schedule.last_name}</p>
                      <p className="text-xs text-stone-500">
                        {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                      </p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                      schedule.status === 'ACCEPTED'
                        ? 'bg-[#B8E6D5] text-[#2D6A4F]'
                        : schedule.status === 'DECLINED'
                        ? 'bg-[#FFE5D9] text-[#C4554D]'
                        : 'bg-[#FFF4CC] text-[#B45309]'
                    }`}>
                      {schedule.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="themed-surface rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-quicksand font-bold text-xl text-stone-800">Today's Events</h3>
              <CalendarCheck size={18} className="text-[#E07A5F]" />
            </div>
            {events.length === 0 ? (
              <p className="text-sm text-stone-500">No events scheduled for today.</p>
            ) : (
              <div className="space-y-3">
                {events.map((eventItem) => (
                  <div key={eventItem.id} className="p-3 rounded-2xl bg-white/70 border border-[#FFE5D9]/60">
                    <p className="text-sm font-semibold text-stone-800">{eventItem.title}</p>
                    <p className="text-xs text-stone-500">
                      {eventItem.start_time ? `${formatTime(eventItem.start_time)} - ` : ''}
                      {eventItem.location || 'Location not set'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="themed-surface rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-quicksand font-bold text-xl text-stone-800">Financial Alerts</h3>
              <ClipboardList size={18} className="text-[#E07A5F]" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-white/70 border border-[#FFE5D9]/60">
                <div>
                  <p className="text-sm font-semibold text-stone-800">Overdue Invoices</p>
                  <p className="text-xs text-stone-500">Follow up with families today.</p>
                </div>
                <span className="text-sm font-bold text-[#C4554D]">{summary.overdueCount}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-2xl bg-white/70 border border-[#FFE5D9]/60">
                <div>
                  <p className="text-sm font-semibold text-stone-800">Due Today</p>
                  <p className="text-xs text-stone-500">Invoices due end of day.</p>
                </div>
                <span className="text-sm font-bold text-[#B45309]">{summary.dueTodayCount}</span>
              </div>
              <button
                onClick={() => navigate('/billing')}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-2xl text-sm font-semibold text-[#E07A5F] bg-[#FFF8F3] hover:bg-[#FFE5D9] transition-colors"
              >
                <LogIn size={16} />
                Go to Billing
              </button>
            </div>
          </section>
        </div>
      </div>

      <BaseModal
        isOpen={Boolean(actionModal.type)}
        onClose={closeActionModal}
        title={
          actionModal.type === ActionType.CHECK_IN
            ? 'Check In'
            : actionModal.type === ActionType.CHECK_OUT
            ? 'Check Out'
            : 'Mark Absent'
        }
      >
        <form onSubmit={handleActionSubmit} className="space-y-5">
          {(actionModal.type === ActionType.CHECK_IN || actionModal.type === ActionType.CHECK_OUT) && (
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                Parent/Guardian Name
              </label>
              <input
                type="text"
                value={actionForm.parentName}
                onChange={(event) => setActionForm({ ...actionForm, parentName: event.target.value })}
                className="w-full px-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white"
                placeholder="Enter parent or guardian name"
                required
              />
            </div>
          )}

          {actionModal.type === ActionType.MARK_ABSENT && (
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">Status</label>
              <select
                value={actionForm.status}
                onChange={(event) => setActionForm({ ...actionForm, status: event.target.value })}
                className="w-full px-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white"
              >
                <option value="ABSENT">Absent</option>
                <option value="SICK">Sick</option>
                <option value="VACATION">Vacation</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Notes (Optional)
            </label>
            <textarea
              rows={3}
              value={actionForm.notes}
              onChange={(event) => setActionForm({ ...actionForm, notes: event.target.value })}
              className="w-full px-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white resize-none"
              placeholder="Add notes for today"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={closeActionModal}
              disabled={actionLoading}
              className="flex-1 px-5 py-3 rounded-2xl border border-[#FFE5D9] text-stone-600 font-bold hover:bg-[#FFF8F3] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="flex-1 px-5 py-3 rounded-2xl text-white font-bold bg-[#E07A5F] hover:opacity-90 transition-all disabled:opacity-50"
            >
              {actionLoading ? 'Saving...' : 'Confirm'}
            </button>
          </div>
        </form>
      </BaseModal>

      <AddChildModal
        isOpen={isAddChildOpen}
        onClose={() => setIsAddChildOpen(false)}
        onSuccess={loadDashboardData}
      />
      <SendMessageModal
        isOpen={isMessageOpen}
        onClose={() => setIsMessageOpen(false)}
      />
      <CreateEventModal
        isOpen={isEventOpen}
        onClose={() => setIsEventOpen(false)}
        onSuccess={loadDashboardData}
      />
    </Layout>
  );
}
