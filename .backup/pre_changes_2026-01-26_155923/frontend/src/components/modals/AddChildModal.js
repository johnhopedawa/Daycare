import React, { useState, useEffect } from 'react';
import { BaseModal } from './BaseModal';
import { User, Calendar, Cake } from 'lucide-react';
import api from '../../utils/api';

export function AddChildModal({ isOpen, onClose, onSuccess }) {
  const [families, setFamilies] = useState([]);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
    familyId: '',
    classroom: '',
    startDate: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadFamilies();
    }
  }, [isOpen]);

  const loadFamilies = async () => {
    try {
      const response = await api.get('/families');
      setFamilies(response.data.families || []);
    } catch (error) {
      console.error('Failed to load families:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('/children', {
        first_name: formData.firstName,
        last_name: formData.lastName,
        date_of_birth: formData.dateOfBirth,
        gender: formData.gender,
        family_id: parseInt(formData.familyId),
        status: 'ACTIVE',
        enrollment_date: formData.startDate,
      });

      setFormData({
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        gender: '',
        familyId: '',
        classroom: '',
        startDate: '',
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to create child:', err);
      setError(err.response?.data?.error || 'Failed to add child. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Add New Child">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Child Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              First Name
            </label>
            <input
              type="text"
              placeholder="Emma"
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
              placeholder="Smith"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Date of Birth
            </label>
            <div className="relative">
              <Cake
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
              />
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Gender
            </label>
            <select
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white"
              required
            >
              <option value="">Select...</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>

        {/* Family Selection */}
        <div>
          <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
            Assign to Family
          </label>
          <select
            value={formData.familyId}
            onChange={(e) => setFormData({ ...formData, familyId: e.target.value })}
            className="w-full px-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white"
            required
          >
            <option value="">Select Family...</option>
            {families.map((family) => {
              const familyName = family.children && family.children.length > 0
                ? `${family.children[0].last_name} Family`
                : `Family #${family.family_id}`;
              return (
                <option key={family.family_id} value={family.family_id}>
                  {familyName}
                </option>
              );
            })}
          </select>
        </div>

        {/* Classroom */}
        <div>
          <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
            Classroom
          </label>
          <select
            value={formData.classroom}
            onChange={(e) => setFormData({ ...formData, classroom: e.target.value })}
            className="w-full px-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white"
          >
            <option value="">Select Classroom...</option>
            <option value="Tiny Turtles">Tiny Turtles (0-2)</option>
            <option value="Busy Bees">Busy Bees (2-3)</option>
            <option value="Learning Lions">Learning Lions (3-5)</option>
          </select>
        </div>

        {/* Start Date */}
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
            {loading ? 'Adding...' : 'Add Child'}
          </button>
        </div>
      </form>
    </BaseModal>
  );
}
