import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { motion } from 'framer-motion';
import { Calendar, Clock, Pencil, Trash2, Repeat } from 'lucide-react';
import { AddShiftModal } from '../components/modals/AddShiftModal';
import { BaseModal } from '../components/modals/BaseModal';
import api from '../utils/api';

export function StaffSchedulingPage() {
  const [schedules, setSchedules] = useState([]);
  const [educators, setEducators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddShiftOpen, setIsAddShiftOpen] = useState(false);
  const [isRecurringOpen, setIsRecurringOpen] = useState(false);
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

  const [recurringForm, setRecurringForm] = useState({
    userId: '',
    dayOfWeek: '1',
    startTime: '09:00',
    endTime: '17:00',
    hours: '8.00',
    startDate: '',
    endDate: '',
    notes: ''
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

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

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

  const handleRecurringTimeChange = (field, value) => {
    const next = { ...recurringForm, [field]: value };
    if (field === 'startTime' || field === 'endTime') {
      next.hours = calculateHours(next.startTime, next.endTime);
    }
    setRecurringForm(next);
  };

  const handleCreateRecurring = async (e) => {
    e.preventDefault();

    if (!recurringForm.userId) {
      alert('Please select an educator');
      return;
    }

    try {
      const response = await api.post('/schedules/admin/schedules/recurring', recurringForm);
      alert(`Created ${response.data.count} recurring shifts`);
      setIsRecurringOpen(false);
      setRecurringForm({
        userId: '',
        dayOfWeek: '1',
        startTime: '09:00',
        endTime: '17:00',
        hours: '8.00',
        startDate: '',
        endDate: '',
        notes: ''
      });
      loadSchedules();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to create recurring schedule');
    }
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

  if (loading) {
    return (
      <Layout title="Staff Scheduling" subtitle="Manage educator shifts and coverage">
        <div className="flex items-center justify-center h-64">
          <div className="text-stone-500">Loading...</div>
        </div>
      </Layout>
    );
  }

  const groupedSchedules = groupSchedulesByDate(schedules);
  const sortedDates = Object.keys(groupedSchedules).sort();

  return (
    <Layout title="Staff Scheduling" subtitle="Manage educator shifts and coverage">
      <div className="flex flex-wrap gap-3 mb-6 items-end">
        <div>
          <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider font-quicksand mb-2">
            From
          </label>
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
            className="px-4 py-2 rounded-2xl border border-[#FFE5D9] bg-white text-stone-600"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider font-quicksand mb-2">
            To
          </label>
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
            className="px-4 py-2 rounded-2xl border border-[#FFE5D9] bg-white text-stone-600"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider font-quicksand mb-2">
            Educator
          </label>
          <select
            value={selectedEducator}
            onChange={(e) => setSelectedEducator(e.target.value)}
            className="px-4 py-2 rounded-2xl border border-[#FFE5D9] bg-white text-stone-600"
          >
            <option value="all">All Educators</option>
            {educators.map((educator) => (
              <option key={educator.id} value={educator.id}>
                {educator.first_name} {educator.last_name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsAddShiftOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#FF9B85] text-white font-medium text-sm hover:bg-[#E07A5F] transition-colors"
          >
            Add Shift
          </button>
          <button
            onClick={() => setIsRecurringOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#FFF8F3] text-[#E07A5F] font-medium text-sm hover:bg-[#FFE5D9] transition-colors flex items-center gap-2"
          >
            <Repeat size={16} /> Recurring
          </button>
        </div>
      </div>

      {schedules.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center shadow-[0_4px_20px_-4px_rgba(255,229,217,0.5)] border border-[#FFE5D9]/30">
          <Calendar size={48} className="mx-auto mb-4 text-stone-300" />
          <h3 className="font-quicksand font-bold text-xl text-stone-800 mb-2">
            No Schedules Yet
          </h3>
          <p className="text-stone-500 mb-6">
            Create your first schedule to manage staff shifts
          </p>
          <button
            onClick={() => setIsAddShiftOpen(true)}
            className="px-6 py-3 bg-[#FF9B85] text-white font-bold rounded-xl shadow-md hover:bg-[#E07A5F] transition-colors"
          >
            Create Schedule
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedDates.map((date, dateIndex) => (
            <motion.div
              key={date}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: dateIndex * 0.1 }}
            >
              <h3 className="font-quicksand font-bold text-lg text-stone-800 mb-4">
                {formatDate(date)}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedSchedules[date].map((schedule, i) => (
                  <motion.div
                    key={schedule.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: dateIndex * 0.1 + i * 0.05 }}
                    className="bg-white p-5 rounded-2xl shadow-[0_4px_20px_-4px_rgba(255,229,217,0.5)] border border-[#FFE5D9]/30"
                  >
                    <div className="flex items-start gap-3 mb-4">
                      <div
                        className={`w-12 h-12 rounded-full ${getColorForEducator(i)} flex items-center justify-center text-sm font-bold shadow-inner`}
                      >
                        {schedule.first_name
                          ? `${schedule.first_name[0]}${schedule.last_name ? schedule.last_name[0] : ''}`
                          : '??'}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-quicksand font-bold text-stone-800">
                          {schedule.first_name} {schedule.last_name}
                        </h4>
                        <p className="text-stone-500 text-sm">
                          {schedule.status}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-stone-600 text-sm">
                        <Clock size={14} />
                        <span>
                          {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                        </span>
                      </div>
                      {schedule.notes && (
                        <div className="p-3 bg-[#FFF8F3] rounded-lg">
                          <p className="text-xs text-stone-600">{schedule.notes}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-2 mt-4">
                      <button
                        onClick={() => openEditModal(schedule)}
                        className="text-[#E07A5F] hover:text-[#C4554D]"
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteSchedule(schedule.id)}
                        className="text-red-500 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AddShiftModal
        isOpen={isAddShiftOpen}
        onClose={() => setIsAddShiftOpen(false)}
        onSuccess={loadSchedules}
      />

      <BaseModal
        isOpen={isRecurringOpen}
        onClose={() => setIsRecurringOpen(false)}
        title="Create Recurring Schedule"
      >
        <form onSubmit={handleCreateRecurring} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Educator *
            </label>
            <select
              value={recurringForm.userId}
              onChange={(e) => setRecurringForm({ ...recurringForm, userId: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl border border-[#FFE5D9] bg-white"
              required
            >
              <option value="">Select Educator</option>
              {educators.map((edu) => (
                <option key={edu.id} value={edu.id}>
                  {edu.first_name} {edu.last_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Day of Week *
            </label>
            <select
              value={recurringForm.dayOfWeek}
              onChange={(e) => setRecurringForm({ ...recurringForm, dayOfWeek: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl border border-[#FFE5D9] bg-white"
              required
            >
              <option value="0">Sunday</option>
              <option value="1">Monday</option>
              <option value="2">Tuesday</option>
              <option value="3">Wednesday</option>
              <option value="4">Thursday</option>
              <option value="5">Friday</option>
              <option value="6">Saturday</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                Start Time *
              </label>
              <input
                type="time"
                value={recurringForm.startTime}
                onChange={(e) => handleRecurringTimeChange('startTime', e.target.value)}
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
                value={recurringForm.endTime}
                onChange={(e) => handleRecurringTimeChange('endTime', e.target.value)}
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
              value={recurringForm.hours}
              onChange={(e) => setRecurringForm({ ...recurringForm, hours: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl border border-[#FFE5D9] bg-white"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                Start Date *
              </label>
              <input
                type="date"
                value={recurringForm.startDate}
                onChange={(e) => setRecurringForm({ ...recurringForm, startDate: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border border-[#FFE5D9] bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                End Date (optional)
              </label>
              <input
                type="date"
                value={recurringForm.endDate}
                onChange={(e) => setRecurringForm({ ...recurringForm, endDate: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border border-[#FFE5D9] bg-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Notes
            </label>
            <textarea
              rows={3}
              value={recurringForm.notes}
              onChange={(e) => setRecurringForm({ ...recurringForm, notes: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl border border-[#FFE5D9] bg-white resize-none"
            />
          </div>
          <div className="flex gap-3 pt-4 border-t border-[#FFE5D9]">
            <button
              type="button"
              onClick={() => setIsRecurringOpen(false)}
              className="flex-1 px-6 py-3 rounded-2xl border border-[#FFE5D9] text-stone-600 font-bold hover:bg-[#FFF8F3] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 rounded-2xl bg-[#FF9B85] text-white font-bold shadow-lg shadow-[#FF9B85]/30 hover:bg-[#E07A5F] transition-all"
            >
              Create Recurring
            </button>
          </div>
        </form>
      </BaseModal>

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
