import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import {
  MetricCard,
  AttendanceWidget,
  TimelineWidget,
  QuickActions,
} from '../components/DashboardWidgets';
import {
  Users,
  UserCheck,
  Briefcase,
  ClipboardList,
  Search,
  Bell,
} from 'lucide-react';

function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    pendingHours: 0,
    openPayPeriods: 0,
    educators: 0,
    pendingPayments: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [entriesRes, periodsRes, usersRes, paymentsRes] = await Promise.all([
        api.get('/admin/time-entries?status=PENDING'),
        api.get('/pay-periods'),
        api.get('/admin/users?role=EDUCATOR'),
        api.get('/parents/payments?status=PENDING'),
      ]);

      setStats({
        pendingHours: entriesRes.data.timeEntries.length,
        openPayPeriods: periodsRes.data.payPeriods.filter((p) => p.status === 'OPEN').length,
        educators: usersRes.data.users.filter((u) => u.is_active).length,
        pendingPayments: paymentsRes.data.payments.length,
      });
    } catch (error) {
      console.error('Load stats error:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF8F3] flex items-center justify-center">
        <div className="text-stone-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF8F3] font-sans text-stone-800 selection:bg-[#FF9B85] selection:text-white">
      <main className="pl-64 min-h-screen">
        <div className="max-w-7xl mx-auto p-8 lg:p-10">
          {/* Header */}
          <header className="flex justify-between items-center mb-10">
            <div>
              <motion.h2
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-3xl font-bold font-quicksand text-stone-800 mb-1"
              >
                {getGreeting()}, {user.first_name}!
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-stone-500 font-medium"
              >
                {currentDate}
              </motion.p>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 text-sm w-64 shadow-sm placeholder:text-stone-400"
                />
              </div>
              <button className="w-10 h-10 bg-white rounded-xl border border-[#FFE5D9] flex items-center justify-center text-stone-500 hover:text-[#FF9B85] hover:shadow-md transition-all relative">
                <Bell size={20} />
                <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-400 rounded-full border border-white"></span>
              </button>
              <div className="w-10 h-10 bg-[#FFDCC8] rounded-xl flex items-center justify-center text-[#E07A5F] font-bold border border-white shadow-sm">
                {user.first_name?.charAt(0) || 'U'}
              </div>
            </div>
          </header>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricCard
              title="Total Children"
              value="42"
              icon={Users}
              color="bg-[#E5D4ED]"
              delay={0.1}
            />
            <MetricCard
              title="Present Today"
              value="38"
              icon={UserCheck}
              color="bg-[#B8E6D5]"
              delay={0.2}
            />
            <MetricCard
              title="Staff on Duty"
              value={stats.educators}
              icon={Briefcase}
              color="bg-[#FFF4CC]"
              delay={0.3}
            />
            <MetricCard
              title="Pending Tasks"
              value={stats.pendingHours}
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
                <AttendanceWidget />
              </section>

              <section>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-quicksand font-bold text-xl text-stone-800">
                    Recent Messages
                  </h3>
                  <button className="text-[#FF9B85] text-sm font-medium hover:underline">
                    View Inbox
                  </button>
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_-4px_rgba(255,229,217,0.5)] border border-[#FFE5D9]/30 space-y-4">
                  {[1, 2].map((_, i) => (
                    <div
                      key={i}
                      className="flex gap-4 p-4 rounded-2xl hover:bg-[#FFF8F3] transition-colors cursor-pointer border border-transparent hover:border-[#FFE5D9]"
                    >
                      <div className="w-12 h-12 rounded-full bg-[#E5D4ED] flex-shrink-0 flex items-center justify-center text-[#8E55A5] font-bold">
                        {i === 0 ? 'JM' : 'AK'}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <h4 className="font-bold text-stone-800 font-quicksand">
                            {i === 0 ? 'Julia Miller' : 'Alex King'}
                          </h4>
                          <span className="text-xs text-stone-400">10:30 AM</span>
                        </div>
                        <p className="text-sm text-stone-600 line-clamp-1">
                          {i === 0
                            ? 'Hi! Just wanted to let you know Leo might be a bit late today due to a dentist appointment.'
                            : 'Could you please send over the updated lunch menu for next week? Thanks!'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Right Column (Timeline & Actions) */}
            <div className="space-y-8">
              <section>
                <h3 className="font-quicksand font-bold text-xl text-stone-800 mb-4">
                  Quick Actions
                </h3>
                <QuickActions />
              </section>

              <section className="h-[400px]">
                <TimelineWidget />
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default AdminDashboard;
