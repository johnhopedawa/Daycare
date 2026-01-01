import React, { useState, useEffect } from 'react';
import { BaseModal } from './BaseModal';
import { Calendar, Clock, User } from 'lucide-react';
import api from '../../utils/api';

export function AddShiftModal({ isOpen, onClose, onSuccess }) {
  const [educators, setEducators] = useState([]);
  const [formData, setFormData] = useState({
    educatorId: '',
    shiftDate: '',
    startTime: '',
    endTime: '',
    hours: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadEducators();
    }
  }, [isOpen]);

  const loadEducators = async () => {
    try {
      const response = await api.get('/admin/users?role=EDUCATOR');
      setEducators(response.data.users || []);
    } catch (error) {
      console.error('Failed to load educators:', error);
    }
  };

  const calculateHours = (startTime, endTime) => {
    if (!startTime || !endTime) return '';
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const hours = (endH + endM / 60) - (startH + startM / 60);
    return Number.isFinite(hours) ? hours.toFixed(2) : '';
  };

  const handleTimeChange = (field, value) => {
    const updated = { ...formData, [field]: value };
    if (field === 'startTime' || field === 'endTime') {
      updated.hours = calculateHours(updated.startTime, updated.endTime);
    }
    setFormData(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('/schedules/admin/schedules', {
        userId: parseInt(formData.educatorId, 10),
        shiftDate: formData.shiftDate,
        startTime: formData.startTime,
        endTime: formData.endTime,
        hours: formData.hours,
        notes: formData.notes,
      });

      setFormData({
        educatorId: '',
        shiftDate: '',
        startTime: '',
        endTime: '',
        hours: '',
        notes: '',
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to create shift:', err);
      setError(err.response?.data?.error || 'Failed to create shift. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Add New Shift">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
            Staff Member
          </label>
          <div className="relative">
            <User
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
            />
            <select
              value={formData.educatorId}
              onChange={(e) => setFormData({ ...formData, educatorId: e.target.value })}
              className="w-full pl-10 pr-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white appearance-none"
              required
            >
              <option value="">Select Staff...</option>
              {educators.map((educator) => (
                <option key={educator.id} value={educator.id}>
                  {educator.first_name} {educator.last_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
            Date
          </label>
          <div className="relative">
            <Calendar
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
            />
            <input
              type="date"
              value={formData.shiftDate}
              onChange={(e) => setFormData({ ...formData, shiftDate: e.target.value })}
              className="w-full pl-10 pr-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Start Time
            </label>
            <div className="relative">
              <Clock
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
              />
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => handleTimeChange('startTime', e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              End Time
            </label>
            <div className="relative">
              <Clock
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
              />
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => handleTimeChange('endTime', e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white"
                required
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
            Hours
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.hours}
            onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
            className="w-full px-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
            Notes (Optional)
          </label>
          <textarea
            placeholder="Any special instructions or notes..."
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white resize-none"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-6 py-3 rounded-2xl border border-[#FFE5D9] text-stone-600 font-bold hover:bg-[#FFF8F3] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-3 rounded-2xl bg-[#FF9B85] text-white font-bold shadow-lg shadow-[#FF9B85]/30 hover:bg-[#E07A5F] transition-all disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Add Shift'}
          </button>
        </div>
      </form>
    </BaseModal>
  );
}
