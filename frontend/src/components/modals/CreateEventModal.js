import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BaseModal } from './BaseModal';
import { DatePickerModal } from './DatePickerModal';
import { Calendar, ChevronDown, Clock, MapPin, Users } from 'lucide-react';
import api from '../../utils/api';

const buildTimeOptions = () => {
  const options = [];
  for (let hour = 0; hour < 24; hour += 1) {
    for (let minute = 0; minute < 60; minute += 30) {
      const value = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      const labelDate = new Date(2000, 0, 1, hour, minute);
      const label = labelDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      options.push({ value, label });
    }
  }
  return options;
};

const parseDateInput = (value) => {
  if (!value) return null;
  const [year, month, day] = String(value).split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const formatDateInput = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateLabel = (value) => {
  if (!value) return 'Select date';
  const parsed = parseDateInput(value) || new Date(value);
  if (!parsed || Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export function CreateEventModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    eventName: '',
    date: '',
    time: '',
    location: '',
    attendees: 'all',
    description: '',
    requireRsvp: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false);
  const timeDropdownRef = useRef(null);
  const timeOptions = useMemo(() => buildTimeOptions(), []);
  const selectedTimeLabel = useMemo(
    () => timeOptions.find((option) => option.value === formData.time)?.label || '',
    [formData.time, timeOptions]
  );

  useEffect(() => {
    if (!isTimeDropdownOpen) return undefined;

    const handleClickOutside = (event) => {
      if (timeDropdownRef.current && !timeDropdownRef.current.contains(event.target)) {
        setIsTimeDropdownOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsTimeDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isTimeDropdownOpen]);

  useEffect(() => {
    if (isOpen) return;
    setIsDatePickerOpen(false);
    setIsTimeDropdownOpen(false);
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!formData.date) {
        setError('Please select an event date.');
        return;
      }
      if (!formData.time) {
        setError('Please select an event time.');
        return;
      }

      await api.post('/events', {
        title: formData.eventName,
        eventDate: formData.date,
        startTime: formData.time || null,
        location: formData.location || null,
        audience: formData.attendees.toUpperCase(),
        description: formData.description || null,
        requiresRsvp: formData.requireRsvp
      });

      setSuccess(true);
      setTimeout(() => {
        setFormData({
          eventName: '',
          date: '',
          time: '',
          location: '',
          attendees: 'all',
          description: '',
          requireRsvp: false,
        });
        setSuccess(false);
        onClose();
        if (onSuccess) {
          onSuccess();
        }
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Create Event">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-2xl text-green-700 text-sm">
            Event created successfully!
          </div>
        )}

        {/* Event Name */}
        <div>
          <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
            Event Name
          </label>
          <input
            type="text"
            placeholder="Fall Festival"
            value={formData.eventName}
            onChange={(e) => setFormData({ ...formData, eventName: e.target.value })}
            className="w-full px-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white"
            required
          />
        </div>

        {/* Date & Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Date
            </label>
            <button
              type="button"
              onClick={() => setIsDatePickerOpen(true)}
              className="w-full flex items-center justify-between gap-3 pl-4 pr-3 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white hover:border-[#FF9B85]"
            >
              <span className="flex items-center gap-3">
                <Calendar size={18} className="text-stone-400" />
                <span className={formData.date ? 'text-stone-800' : 'text-stone-400'}>
                  {formatDateLabel(formData.date)}
                </span>
              </span>
              <ChevronDown size={16} className="text-stone-400" />
            </button>
          </div>
          <div ref={timeDropdownRef} className="relative">
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Time
            </label>
            <button
              type="button"
              onClick={() => setIsTimeDropdownOpen((prev) => !prev)}
              className="w-full flex items-center justify-between gap-3 pl-4 pr-3 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white hover:border-[#FF9B85]"
              aria-expanded={isTimeDropdownOpen}
            >
              <span className="flex items-center gap-3">
                <Clock size={18} className="text-stone-400" />
                <span className={selectedTimeLabel ? 'text-stone-800' : 'text-stone-400'}>
                  {selectedTimeLabel || 'Select time'}
                </span>
              </span>
              <ChevronDown
                size={16}
                className={`text-stone-400 transition-transform ${isTimeDropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {isTimeDropdownOpen && (
              <div className="absolute z-20 mt-2 w-full rounded-2xl border border-[#FFE5D9] bg-white shadow-lg shadow-[#FF9B85]/10">
                <div className="max-h-56 overflow-y-auto p-2 space-y-1">
                  {timeOptions.map((option) => {
                    const isSelected = option.value === formData.time;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, time: option.value }));
                          setIsTimeDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                          isSelected ? 'bg-[#FF9B85] text-white' : 'text-stone-700 hover:bg-[#FFF8F3]'
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
            Location
          </label>
          <div className="relative">
            <MapPin
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
            />
            <input
              type="text"
              placeholder="Main Playground"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full pl-10 pr-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white"
              required
            />
          </div>
        </div>

        {/* Attendees */}
        <div>
          <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
            Who's Invited
          </label>
          <div className="relative">
            <Users
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
            />
            <select
              value={formData.attendees}
              onChange={(e) => setFormData({ ...formData, attendees: e.target.value })}
              className="w-full pl-10 pr-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white appearance-none"
            >
              <option value="all">All Families</option>
              <option value="parents">Parents Only</option>
              <option value="staff">Staff Only</option>
              <option value="children">Children Only</option>
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
            Description
          </label>
          <textarea
            placeholder="Event details, what to bring, etc..."
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white resize-none"
            required
          />
        </div>

        {/* RSVP */}
        <div className="flex items-center gap-3 p-4 bg-[#FFF8F3] rounded-2xl">
          <input
            type="checkbox"
            id="require-rsvp"
            checked={formData.requireRsvp}
            onChange={(e) => setFormData({ ...formData, requireRsvp: e.target.checked })}
            className="w-5 h-5 rounded border-[#FFE5D9] text-[#FF9B85] focus:ring-[#FF9B85]"
          />
          <label
            htmlFor="require-rsvp"
            className="text-sm text-stone-600 font-medium"
          >
            Require RSVP from families
          </label>
        </div>

        {/* Actions */}
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
            {loading ? 'Creating...' : 'Create Event'}
          </button>
        </div>
      </form>

      <DatePickerModal
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        initialDate={parseDateInput(formData.date) || undefined}
        onConfirm={(date) => {
          setFormData((prev) => ({ ...prev, date: formatDateInput(date) }));
          setIsDatePickerOpen(false);
        }}
        onClear={() => {
          setFormData((prev) => ({ ...prev, date: '' }));
          setIsDatePickerOpen(false);
        }}
        title="Select event date"
        subtitle="Choose when this event will happen"
        confirmLabel="Save date"
        clearLabel="Clear date"
      />
    </BaseModal>
  );
}
