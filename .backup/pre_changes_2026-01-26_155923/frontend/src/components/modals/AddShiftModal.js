import React, { useState, useEffect } from 'react';
import { Check, Repeat, User } from 'lucide-react';
import api from '../../utils/api';
import { DateTimePickerModal } from './DateTimePickerModal';

export function AddShiftModal({ isOpen, onClose, onSuccess }) {
  const [educators, setEducators] = useState([]);
  const [formData, setFormData] = useState({
    educatorId: '',
    notes: '',
    dayOfWeek: '1',
    endDate: '',
  });
  const [selection, setSelection] = useState(null);
  const [selectedDateTime, setSelectedDateTime] = useState(new Date());
  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationMessage, setValidationMessage] = useState('');
  const [conflictMessage, setConflictMessage] = useState('');

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

  const formatDateForApi = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatTimeForApi = (date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const parseTimeToMinutes = (timeString) => {
    if (!timeString) return 0;
    const parts = timeString.split(':').map(Number);
    const hours = parts[0] || 0;
    const minutes = parts[1] || 0;
    return hours * 60 + minutes;
  };

  useEffect(() => {
    const checkConflicts = async () => {
      if (!formData.educatorId || !selection?.isValid) {
        setConflictMessage('');
        return;
      }

      const dateStr = formatDateForApi(selection.start);
      try {
        const response = await api.get(
          `/schedules/admin/schedules?from=${dateStr}&to=${dateStr}&user_id=${formData.educatorId}`
        );
        const schedules = response.data.schedules || [];
        const startMinutes = selection.start.getHours() * 60 + selection.start.getMinutes();
        const endMinutes = selection.end.getHours() * 60 + selection.end.getMinutes();

        const conflict = schedules.find((schedule) => {
          if (schedule.status === 'DECLINED') return false;
          const scheduledStart = parseTimeToMinutes(schedule.start_time);
          const scheduledEnd = parseTimeToMinutes(schedule.end_time);
          return startMinutes < scheduledEnd && endMinutes > scheduledStart;
        });

        if (conflict) {
          const conflictStart = conflict.start_time?.slice(0, 5);
          const conflictEnd = conflict.end_time?.slice(0, 5);
          setConflictMessage(
            `Conflict: already scheduled ${conflictStart || ''}${conflictEnd ? `–${conflictEnd}` : ''}.`
          );
        } else {
          setConflictMessage('');
        }
      } catch (err) {
        console.error('Failed to check conflicts:', err);
        setConflictMessage('');
      }
    };

    checkConflicts();
  }, [formData.educatorId, selection]);

  const resetForm = () => {
    setFormData({
      educatorId: '',
      notes: '',
      dayOfWeek: '1',
      endDate: '',
    });
    setSelectedDateTime(new Date());
    setSelection(null);
    setRepeatEnabled(false);
    setError('');
    setValidationMessage('');
    setConflictMessage('');
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (timeSelection) => {
    setError('');
    setValidationMessage('');

    if (!formData.educatorId) {
      setValidationMessage('Please select a staff member.');
      return;
    }
    if (!timeSelection?.hours || !timeSelection?.start || !timeSelection?.end) {
      setValidationMessage('Please select a valid time range.');
      return;
    }
    if (conflictMessage && !repeatEnabled) {
      setValidationMessage('Please resolve the schedule conflict.');
      return;
    }

    setLoading(true);

    try {
      const startDate = timeSelection.start;
      const endDate = timeSelection.end;

      if (repeatEnabled) {
        // Create recurring schedule
        const response = await api.post('/schedules/admin/schedules/recurring', {
          userId: parseInt(formData.educatorId, 10),
          dayOfWeek: startDate.getDay().toString(),
          startTime: formatTimeForApi(startDate),
          endTime: formatTimeForApi(endDate),
          hours: timeSelection.hours.toFixed(2),
          startDate: formatDateForApi(startDate),
          endDate: formData.endDate || null,
          notes: formData.notes,
        });
        alert(`Created ${response.data.count} recurring shifts`);
      } else {
        // Create single schedule
        await api.post('/schedules/admin/schedules', {
          userId: parseInt(formData.educatorId, 10),
          shiftDate: formatDateForApi(startDate),
          startTime: formatTimeForApi(startDate),
          endTime: formatTimeForApi(endDate),
          hours: timeSelection.hours.toFixed(2),
          notes: formData.notes,
        });
      }

      resetForm();
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
    <DateTimePickerModal
      open={isOpen}
      initialValue={selectedDateTime}
      onClose={onClose}
      onCancel={handleCancel}
      disablePast
      onSelectionChange={(nextSelection) => setSelection(nextSelection)}
      onConfirm={(timeSelection) => {
        if (loading) return;
        setSelectedDateTime(timeSelection.start);
        handleSubmit(timeSelection);
      }}
      confirmLabel={loading ? 'Adding...' : 'Add Shift'}
      confirmDisabled={
        loading ||
        !formData.educatorId ||
        (Boolean(conflictMessage) && !repeatEnabled) ||
        (selection ? !selection.isValid : false)
      }
      sideContent={
        <div className="mt-4 space-y-4">
          <button
            type="button"
            onClick={() => setRepeatEnabled(!repeatEnabled)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl border text-sm font-bold transition-colors ${
              repeatEnabled
                ? 'border-[#FFB7AC] bg-[#FFF1EE] text-[#7C2A22]'
                : 'border-[#FFE5D9] bg-white text-stone-500 hover:text-[#FF9B85]'
            }`}
          >
            <span className="flex items-center gap-2">
              <Repeat size={16} />
              Repeat
            </span>
            <span
              className={`w-6 h-6 rounded-full border flex items-center justify-center ${
                repeatEnabled
                  ? 'bg-[#FF9B85] border-[#FF9B85] text-white'
                  : 'border-[#FFE5D9] text-stone-300'
              }`}
            >
              <Check size={14} />
            </span>
          </button>

          {repeatEnabled && (
            <div className="p-3 bg-[#FFF8F3] border border-[#FFE5D9] rounded-2xl space-y-3">
              <p className="text-xs text-stone-600 font-medium">
                This shift will repeat weekly on{' '}
                <span className="font-bold text-[#FF9B85]">
                  {selectedDateTime.toLocaleDateString('en-US', { weekday: 'long' })}
                </span>
                {' '}until the end date.
              </p>
              <div>
                <label className="block text-xs font-bold text-stone-500 mb-2 font-quicksand">
                  Repeat Until (Optional)
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  min={formatDateForApi(selectedDateTime)}
                  className="w-full px-3 py-2.5 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white text-sm"
                  placeholder="Leave blank for 3 months"
                />
                <p className="text-[10px] text-stone-400 mt-1">
                  Leave blank to create 3 months of shifts
                </p>
              </div>
            </div>
          )}

          {(error || validationMessage || (conflictMessage && !repeatEnabled)) && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs space-y-1">
              {validationMessage && <div>{validationMessage}</div>}
              {conflictMessage && !repeatEnabled && <div>{conflictMessage}</div>}
              {error && <div>{error}</div>}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-stone-500 mb-2 font-quicksand">
              Staff Member
            </label>
            <div className="relative">
              <User
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
              />
              <select
                value={formData.educatorId}
                onChange={(e) => setFormData({ ...formData, educatorId: e.target.value })}
                className="w-full pl-9 pr-3 py-2.5 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white text-sm"
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
            <label className="block text-xs font-bold text-stone-500 mb-2 font-quicksand">
              Notes (Optional)
            </label>
            <textarea
              placeholder="Any special instructions or notes..."
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2.5 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white text-sm resize-none"
            />
          </div>
        </div>
      }
    />
  );
}
