import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, Clock, Pencil, Plus, Trash2, User } from 'lucide-react';
import { AddShiftModal } from '../components/modals/AddShiftModal';
import { BaseModal } from '../components/modals/BaseModal';
import api from '../utils/api';

export function StaffSchedulingPage() {
  const [schedules, setSchedules] = useState([]);
  const [educators, setEducators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddShiftOpen, setIsAddShiftOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [selectedEducator, setSelectedEducator] = useState('all');
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      from: start.toISOString().split('T')[0],
      to: end.toISOString().split('T')[0]
    };
  });

  const [editForm, setEditForm] = useState({
    shiftDate: '',
    startTime: '',
    endTime: '',
    hours: '',
    notes: ''
  });

  const loadEducators = useCallback(async () => {
    try {
      const response = await api.get('/admin/users?role=EDUCATOR');
      setEducators(response.data.users || []);
    } catch (error) {
      console.error('Failed to load educators:', error);
    }
  }, []);

  const loadSchedules = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (dateRange.from) params.append('from', dateRange.from);
      if (dateRange.to) params.append('to', dateRange.to);
      if (selectedEducator !== 'all') params.append('user_id', selectedEducator);

      const response = await api.get(`/schedules/admin/schedules?${params.toString()}`);
      setSchedules(response.data.schedules || []);
    } catch (error) {
      console.error('Failed to load schedules:', error);
    } finally {
      setLoading(false);
    }
  }, [dateRange, selectedEducator]);

  useEffect(() => {
    loadEducators();
  }, [loadEducators]);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  const formatTime = (time24) => {
    if (!time24) return null;
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const calculateHours = (startTime, endTime) => {
    if (!startTime || !endTime) return '';
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const hours = (endH + endM / 60) - (startH + startM / 60);
    return Number.isFinite(hours) ? hours.toFixed(2) : '';
  };

  const groupSchedulesByDate = (items) => {
    const grouped = {};
    items.forEach((schedule) => {
      const date = schedule.shift_date;
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(schedule);
    });
    return grouped;
  };

  const getColorForEducator = (index) => {
    const colors = [
      'bg-[#E5D4ED] text-[#8E55A5]',
      'bg-[#B8E6D5] text-[#2D6A4F]',
      'bg-[#FFF4CC] text-[#B45309]',
      'bg-[#FFDCC8] text-[#E07A5F]'
    ];
    return colors[index % colors.length];
  };

  const openEditModal = (schedule) => {
    setEditingSchedule(schedule);
    setEditForm({
      shiftDate: schedule.shift_date || '',
      startTime: schedule.start_time || '',
      endTime: schedule.end_time || '',
      hours: schedule.hours || '',
      notes: schedule.notes || ''
    });
    setIsEditOpen(true);
  };

  const handleEditTimeChange = (field, value) => {
    const next = { ...editForm, [field]: value };
    if (field === 'startTime' || field === 'endTime') {
      next.hours = calculateHours(next.startTime, next.endTime);
    }
    setEditForm(next);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingSchedule) return;

    try {
      await api.patch(`/schedules/admin/schedules/${editingSchedule.id}`, editForm);
      setIsEditOpen(false);
      setEditingSchedule(null);
      loadSchedules();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to update schedule');
    }
  };

  const handleDeleteSchedule = async (id) => {
    if (!window.confirm('Delete this shift?')) return;
    try {
      await api.delete(`/schedules/admin/schedules/${id}`);
      loadSchedules();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete schedule');
    }
  };

  const groupedSchedules = groupSchedulesByDate(schedules);
  const sortedDates = Object.keys(groupedSchedules).sort();

  return (
    <Layout title="Staff Scheduling" subtitle="Manage educator shifts and coverage">
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-[#FFE5D9] mb-8 flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
          <div className="flex items-center gap-2 bg-[#FFF8F3] p-1.5 rounded-2xl border border-[#FFE5D9]">
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              className="bg-transparent border-none text-sm font-medium text-stone-600 focus:ring-0 px-2"
            />
            <span className="text-stone-400 text-xs">to</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              className="bg-transparent border-none text-sm font-medium text-stone-600 focus:ring-0 px-2"
            />
          </div>

          <div className="relative">
            <select
              value={selectedEducator}
              onChange={(e) => setSelectedEducator(e.target.value)}
              className="appearance-none pl-10 pr-8 py-2.5 rounded-2xl border border-[#FFE5D9] bg-white text-sm font-medium text-stone-600 focus:outline-none focus:ring-2 focus:ring-[#FF9B85] cursor-pointer hover:bg-[#FFF8F3] transition-colors"
            >
              <option value="all">All Educators</option>
              {educators.map((edu) => (
                <option key={edu.id} value={edu.id}>
                  {edu.first_name} {edu.last_name}
                </option>
              ))}
            </select>
            <User
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
            />
          </div>
        </div>

        <div className="flex gap-3 w-full lg:w-auto">
          <button
            onClick={() => setIsAddShiftOpen(true)}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl bg-[#FF9B85] text-white font-bold text-sm shadow-lg shadow-[#FF9B85]/30 hover:bg-[#E07A5F] hover:shadow-xl hover:-translate-y-0.5 transition-all"
          >
            <Plus size={18} />
            Add Shift
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 text-stone-400">
          <div className="w-10 h-10 border-4 border-[#FFE5D9] border-t-[#FF9B85] rounded-full animate-spin mb-4" />
          <p className="font-quicksand font-medium">Loading schedules...</p>
        </div>
      ) : schedules.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-16 text-center shadow-sm border border-[#FFE5D9]/50"
        >
          <div className="w-20 h-20 bg-[#FFF8F3] rounded-full flex items-center justify-center mx-auto mb-6 text-[#FF9B85]">
            <CalendarIcon size={40} />
          </div>
          <h3 className="font-quicksand font-bold text-2xl text-stone-800 mb-3">
            No Schedules Found
          </h3>
          <p className="text-stone-500 mb-8 max-w-md mx-auto">
            There are no shifts scheduled for this date range. Try adjusting
            your filters or add a new shift to get started.
          </p>
          <button
            onClick={() => setIsAddShiftOpen(true)}
            className="px-8 py-3 bg-[#FF9B85] text-white font-bold rounded-2xl shadow-lg hover:bg-[#E07A5F] transition-colors"
          >
            Create First Shift
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
          <AnimatePresence>
            {sortedDates.map((date, dateIndex) => (
              <motion.div
                key={date}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: dateIndex * 0.05 }}
                className="bg-white/60 backdrop-blur-sm rounded-3xl p-5 border border-[#FFE5D9]/30 shadow-sm flex flex-col gap-4"
              >
                <div className="flex items-center justify-between pb-2 border-b border-[#FFE5D9]/50">
                  <div className="flex items-baseline gap-2">
                    <span className="font-quicksand font-bold text-xl text-stone-800">
                      {new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                    <span className="text-stone-400 font-medium text-sm">
                      {new Date(date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-[#FF9B85] bg-[#FFF8F3] px-2 py-1 rounded-lg">
                    {groupedSchedules[date].length} shifts
                  </span>
                </div>

                <div className="space-y-3">
                  {groupedSchedules[date].map((schedule, i) => (
                    <motion.div
                      key={schedule.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: dateIndex * 0.05 + i * 0.03 }}
                      className="group relative bg-white rounded-xl p-3 shadow-sm border border-[#FFE5D9]/50 hover:shadow-md hover:border-[#FF9B85]/30 transition-all duration-200"
                    >
                      <div
                        className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${getColorForEducator(i).split(' ')[0]}`}
                      />
                      <div className="pl-3">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-quicksand font-bold text-stone-800 text-sm">
                            {schedule.first_name} {schedule.last_name}
                          </h4>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                            <button
                              onClick={() => openEditModal(schedule)}
                              className="p-1 text-stone-400 hover:text-[#E07A5F]"
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              onClick={() => handleDeleteSchedule(schedule.id)}
                              className="p-1 text-stone-400 hover:text-red-500"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-stone-500 mb-2">
                          <Clock size={12} />
                          <span>
                            {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                          </span>
                          <span className="px-1.5 py-0.5 rounded-md bg-stone-100 text-stone-500 font-medium text-[10px]">
                            {schedule.hours}h
                          </span>
                        </div>

                        {schedule.notes && (
                          <div className="text-[10px] text-stone-500 bg-[#FFF8F3] p-1.5 rounded-lg line-clamp-2">
                            {schedule.notes}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <AddShiftModal
        isOpen={isAddShiftOpen}
        onClose={() => setIsAddShiftOpen(false)}
        onSuccess={loadSchedules}
      />

      <BaseModal
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setEditingSchedule(null);
        }}
        title="Edit Schedule"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Date *
            </label>
            <input
              type="date"
              value={editForm.shiftDate}
              onChange={(e) => setEditForm({ ...editForm, shiftDate: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl border border-[#FFE5D9] bg-white"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                Start Time *
              </label>
              <input
                type="time"
                value={editForm.startTime}
                onChange={(e) => handleEditTimeChange('startTime', e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-[#FFE5D9] bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                End Time *
              </label>
              <input
                type="time"
                value={editForm.endTime}
                onChange={(e) => handleEditTimeChange('endTime', e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-[#FFE5D9] bg-white"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Hours *
            </label>
            <input
              type="number"
              step="0.01"
              value={editForm.hours}
              onChange={(e) => setEditForm({ ...editForm, hours: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl border border-[#FFE5D9] bg-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Notes
            </label>
            <textarea
              rows={3}
              value={editForm.notes}
              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl border border-[#FFE5D9] bg-white resize-none"
            />
          </div>
          <div className="flex gap-3 pt-4 border-t border-[#FFE5D9]">
            <button
              type="button"
              onClick={() => {
                setIsEditOpen(false);
                setEditingSchedule(null);
              }}
              className="flex-1 px-6 py-3 rounded-2xl border border-[#FFE5D9] text-stone-600 font-bold hover:bg-[#FFF8F3] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 rounded-2xl bg-[#FF9B85] text-white font-bold shadow-lg shadow-[#FF9B85]/30 hover:bg-[#E07A5F] transition-all"
            >
              Save Changes
            </button>
          </div>
        </form>
      </BaseModal>
    </Layout>
  );
}
