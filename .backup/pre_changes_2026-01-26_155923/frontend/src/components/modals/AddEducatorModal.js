import React, { useState } from 'react';
import { BaseModal } from './BaseModal';
import { User, Mail, Phone, Award, Calendar } from 'lucide-react';
import api from '../../utils/api';

export function AddEducatorModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'EDUCATOR',
    certification: '',
    yearsExperience: '',
    startDate: '',
    hourlyRate: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('/admin/users', {
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        hourly_rate: parseFloat(formData.hourlyRate) || 0,
        hire_date: formData.startDate,
        // Note: certification and years_experience fields may need to be added to backend
      });

      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        role: 'EDUCATOR',
        certification: '',
        yearsExperience: '',
        startDate: '',
        hourlyRate: '',
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to create educator:', err);
      setError(err.response?.data?.error || 'Failed to create educator. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Add New Educator">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Personal Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              First Name
            </label>
            <input
              type="text"
              placeholder="Sarah"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Last Name
            </label>
            <input
              type="text"
              placeholder="Jenkins"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white"
              required
            />
          </div>
        </div>

        {/* Contact */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Email
            </label>
            <div className="relative">
              <Mail
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
              />
              <input
                type="email"
                placeholder="sarah@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Phone
            </label>
            <div className="relative">
              <Phone
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
              />
              <input
                type="tel"
                placeholder="(555) 123-4567"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white"
              />
            </div>
          </div>
        </div>

        {/* Role */}
        <div>
          <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
            Role
          </label>
          <select
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            className="w-full px-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white"
            required
          >
            <option value="EDUCATOR">Educator</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>

        {/* Certification */}
        <div>
          <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
            Certification
          </label>
          <div className="relative">
            <Award
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
            />
            <input
              type="text"
              placeholder="ECE Level 3, Montessori, etc."
              value={formData.certification}
              onChange={(e) => setFormData({ ...formData, certification: e.target.value })}
              className="w-full pl-10 pr-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white"
            />
          </div>
        </div>

        {/* Experience, Start Date & Hourly Rate */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Years of Experience
            </label>
            <input
              type="number"
              placeholder="5"
              min="0"
              value={formData.yearsExperience}
              onChange={(e) => setFormData({ ...formData, yearsExperience: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Start Date
            </label>
            <div className="relative">
              <Calendar
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
              />
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Hourly Rate ($)
            </label>
            <input
              type="number"
              placeholder="25.00"
              min="0"
              step="0.01"
              value={formData.hourlyRate}
              onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white"
              required
            />
          </div>
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
            {loading ? 'Adding...' : 'Add Educator'}
          </button>
        </div>
      </form>
    </BaseModal>
  );
}
