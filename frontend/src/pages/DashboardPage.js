import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import {
  MetricCard,
  AttendanceWidget,
  TimelineWidget,
  QuickActions,
} from '../components/DashboardWidgets';
import { Users, UserCheck, Briefcase, ClipboardList } from 'lucide-react';
import api from '../utils/api';
import { AddChildModal } from '../components/modals/AddChildModal';
import { SendMessageModal } from '../components/modals/SendMessageModal';
import { CreateEventModal } from '../components/modals/CreateEventModal';

export function DashboardPage() {
  const [stats, setStats] = useState({
    totalChildren: 0,
    presentToday: 0,
    staffOnDuty: 0,
    pendingTasks: 0,
  });
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddChildOpen, setIsAddChildOpen] = useState(false);
  const [isMessageOpen, setIsMessageOpen] = useState(false);
  const [isEventOpen, setIsEventOpen] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [childrenRes, attendanceRes, usersRes, timeEntriesRes] = await Promise.all([
        api.get('/children?status=ACTIVE'),
        api.get('/attendance/today'),
        api.get('/admin/users?role=EDUCATOR'),
        api.get('/admin/time-entries?status=PENDING'),
      ]);

      // Calculate stats
      const presentCount = attendanceRes.data.attendance.filter(
        a => a.status === 'PRESENT' || a.status === 'LATE'
      ).length;

      setStats({
        totalChildren: childrenRes.data.children.length,
        presentToday: presentCount,
        staffOnDuty: usersRes.data.users.filter(u => u.is_active).length,
        pendingTasks: timeEntriesRes.data.timeEntries.length,
      });

      // Format attendance for widget
      const formattedAttendance = attendanceRes.data.attendance
        .slice(0, 5)
        .map(a => ({
          id: a.child_id.toString(),
          name: a.child_name,
          status: a.status.toLowerCase(), // 'PRESENT' -> 'present'
          time: a.check_in_time ? formatTime(a.check_in_time) : undefined,
        }));

      setAttendance(formattedAttendance);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (time24) => {
    if (!time24) return null;
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  if (loading) {
    return (
      <Layout title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="text-stone-500">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Good Morning! ☀️">
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Total Children"
          value={stats.totalChildren}
          icon={Users}
          color="bg-[#E5D4ED]"
          delay={0.1}
        />
        <MetricCard
          title="Present Today"
          value={stats.presentToday}
          icon={UserCheck}
          color="bg-[#B8E6D5]"
          delay={0.2}
        />
        <MetricCard
          title="Staff on Duty"
          value={stats.staffOnDuty}
          icon={Briefcase}
          color="bg-[#FFF4CC]"
          delay={0.3}
        />
        <MetricCard
          title="Pending Tasks"
          value={stats.pendingTasks}
          icon={ClipboardList}
          color="bg-[#FFDCC8]"
          delay={0.4}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (Attendance & Messages) */}
        <div className="lg:col-span-2 space-y-8">
          <section className="h-[400px]">
            <AttendanceWidget children={attendance} />
          </section>

          <section>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-quicksand font-bold text-xl text-stone-800">
                Recent Messages
              </h3>
              <button className="text-[#FF9B85] text-sm font-medium hover:underline">
                Coming Soon
              </button>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_-4px_rgba(255,229,217,0.5)] border border-[#FFE5D9]/30">
              <p className="text-stone-500 text-center py-8">
                Messaging feature coming soon
              </p>
            </div>
          </section>
        </div>

        {/* Right Column (Timeline & Actions) */}
        <div className="space-y-8">
          <section>
            <h3 className="font-quicksand font-bold text-xl text-stone-800 mb-4">
              Quick Actions
            </h3>
            <QuickActions
              onAddChild={() => setIsAddChildOpen(true)}
              onSendMessage={() => setIsMessageOpen(true)}
              onCreateEvent={() => setIsEventOpen(true)}
            />
          </section>

          <section className="h-[400px]">
            <TimelineWidget />
          </section>
        </div>
      </div>

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
      />
    </Layout>
  );
}
