import React, { useState } from 'react';
import { BaseModal } from './BaseModal';
import { Calendar, Clock, MapPin, Users } from 'lucide-react';
import api from '../../utils/api';

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
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
            <div className="relative">
              <Calendar
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
              />
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Time
            </label>
            <div className="relative">
              <Clock
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
              />
              <input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white"
                required
              />
            </div>
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
    </BaseModal>
  );
}
