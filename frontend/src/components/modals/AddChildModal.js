import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BaseModal } from './BaseModal';
import { DatePickerModal } from './DatePickerModal';
import { AddFamilyModal } from './AddFamilyModal';
import { Calendar, Cake, ChevronDown, Plus } from 'lucide-react';
import api from '../../utils/api';

const GENDER_OPTIONS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
];

const todayDateKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const buildInitialFormData = () => ({
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  gender: '',
  familyId: '',
  startDate: todayDateKey(),
});

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

const formatDateLabel = (value, fallbackLabel) => {
  if (!value) return fallbackLabel;
  const parsed = parseDateInput(value) || new Date(value);
  if (!parsed || Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const buildFamilyName = (family) => {
  const customName = family.family_name
    || family.parents?.map((parent) => parent.family_name).find(Boolean);
  const childLastName = family.children && family.children.length > 0
    ? family.children[0].last_name
    : '';
  return customName
    || (childLastName ? `${childLastName} Family` : `Family #${family.family_id}`);
};

const getFamilyParentIds = (family) => (
  (family?.parents || [])
    .map((parent) => Number(parent.parent_id))
    .filter((id) => Number.isFinite(id))
);

const normalizeTextValue = (value) => String(value || '').trim().toLowerCase();

const normalizeDateValue = (value) => {
  const rawValue = String(value || '').trim();
  if (!rawValue) return '';

  const parsed = new Date(rawValue);
  if (!Number.isNaN(parsed.getTime())) {
    return formatDateInput(parsed);
  }

  const isoDateMatch = rawValue.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoDateMatch) return isoDateMatch[1];
  return rawValue.toLowerCase();
};

const isSameChildRecord = (left = {}, right = {}) => (
  normalizeTextValue(left.first_name || left.firstName) === normalizeTextValue(right.first_name || right.firstName)
  && normalizeTextValue(left.last_name || left.lastName) === normalizeTextValue(right.last_name || right.lastName)
  && normalizeDateValue(left.date_of_birth || left.dateOfBirth) === normalizeDateValue(right.date_of_birth || right.dateOfBirth)
);

export function AddChildModal({ isOpen, onClose, onSuccess }) {
  const [families, setFamilies] = useState([]);
  const [formData, setFormData] = useState(buildInitialFormData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [genderDropdownOpen, setGenderDropdownOpen] = useState(false);
  const [familyDropdownOpen, setFamilyDropdownOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [activeDateField, setActiveDateField] = useState(null);
  const [isAddFamilyOpen, setIsAddFamilyOpen] = useState(false);

  const genderDropdownRef = useRef(null);
  const familyDropdownRef = useRef(null);

  const selectedFamily = useMemo(
    () => families.find((family) => String(family.family_id) === String(formData.familyId)),
    [families, formData.familyId]
  );
  const selectedFamilyName = selectedFamily ? buildFamilyName(selectedFamily) : '';
  const selectedGenderLabel = GENDER_OPTIONS.find((option) => option.value === formData.gender)?.label || '';

  const initialChildForFamilyModal = useMemo(() => ({
    firstName: formData.firstName,
    lastName: formData.lastName,
    dateOfBirth: formData.dateOfBirth,
  }), [formData.firstName, formData.lastName, formData.dateOfBirth]);

  const loadFamilies = async (preferredFamilyId = null) => {
    try {
      const response = await api.get('/families');
      const nextFamilies = response.data.families || [];
      setFamilies(nextFamilies);

      if (preferredFamilyId) {
        const found = nextFamilies.find((family) => String(family.family_id) === String(preferredFamilyId));
        if (found) {
          setFormData((prev) => ({ ...prev, familyId: String(found.family_id) }));
        }
      }
    } catch (requestError) {
      console.error('Failed to load families:', requestError);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setFormData(buildInitialFormData());
    setError('');
    setGenderDropdownOpen(false);
    setFamilyDropdownOpen(false);
    setIsDatePickerOpen(false);
    setActiveDateField(null);
    setIsAddFamilyOpen(false);
    loadFamilies();
  }, [isOpen]);

  useEffect(() => {
    if (!genderDropdownOpen && !familyDropdownOpen) return;

    const handleClickOutside = (event) => {
      if (
        genderDropdownRef.current
        && !genderDropdownRef.current.contains(event.target)
      ) {
        setGenderDropdownOpen(false);
      }
      if (
        familyDropdownRef.current
        && !familyDropdownRef.current.contains(event.target)
      ) {
        setFamilyDropdownOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setGenderDropdownOpen(false);
        setFamilyDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [genderDropdownOpen, familyDropdownOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!formData.dateOfBirth) {
        setError('Please select date of birth.');
        return;
      }

      if (!formData.gender) {
        setError('Please select gender.');
        return;
      }

      if (!formData.startDate) {
        setError('Please select start date.');
        return;
      }

      if (!selectedFamily) {
        setError('Please select a family.');
        return;
      }

      const parentIds = getFamilyParentIds(selectedFamily);
      if (parentIds.length === 0) {
        setError('Selected family has no parents. Choose another family or add a new family.');
        return;
      }

      const duplicateChildExists = (selectedFamily.children || []).some((child) => isSameChildRecord(child, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        dateOfBirth: formData.dateOfBirth,
      }));

      if (duplicateChildExists) {
        setError('This child already exists in the selected family.');
        return;
      }

      await api.post('/children', {
        first_name: formData.firstName,
        last_name: formData.lastName,
        date_of_birth: formData.dateOfBirth,
        gender: formData.gender,
        enrollment_start_date: formData.startDate,
        status: 'ACTIVE',
        parent_ids: parentIds,
      });

      setFormData(buildInitialFormData());
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
    <>
      <BaseModal isOpen={isOpen} onClose={onClose} title="Add New Child">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                First Name
              </label>
              <input
                type="text"
                placeholder="Emma"
                value={formData.firstName}
                onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))}
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
                onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
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
              <button
                type="button"
                onClick={() => {
                  setActiveDateField('dateOfBirth');
                  setIsDatePickerOpen(true);
                }}
                className="w-full flex items-center justify-between gap-3 pl-4 pr-3 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white hover:border-[#FF9B85]"
              >
                <span className="flex items-center gap-3">
                  <Cake size={18} className="text-stone-400" />
                  <span className={formData.dateOfBirth ? 'text-stone-800' : 'text-stone-400'}>
                    {formatDateLabel(formData.dateOfBirth, 'Select date of birth')}
                  </span>
                </span>
                <Calendar size={16} className="text-stone-400" />
              </button>
            </div>

            <div ref={genderDropdownRef} className="relative">
              <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                Gender
              </label>
              <button
                type="button"
                onClick={() => setGenderDropdownOpen((prev) => !prev)}
                className="w-full px-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white flex items-center justify-between"
                aria-expanded={genderDropdownOpen}
              >
                <span className={selectedGenderLabel ? 'text-stone-800' : 'text-stone-400'}>
                  {selectedGenderLabel || 'Select gender'}
                </span>
                <ChevronDown
                  size={16}
                  className={`text-stone-400 transition-transform ${genderDropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {genderDropdownOpen && (
                <div className="absolute z-20 mt-2 w-full rounded-2xl border border-[#FFE5D9] bg-white shadow-lg shadow-[#FF9B85]/10 p-2 space-y-1">
                  {GENDER_OPTIONS.map((option) => {
                    const isSelected = option.value === formData.gender;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, gender: option.value }));
                          setGenderDropdownOpen(false);
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
              )}
            </div>
          </div>

          <div ref={familyDropdownRef} className="relative">
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Select Family
            </label>
            <button
              type="button"
              onClick={() => setFamilyDropdownOpen((prev) => !prev)}
              className="w-full px-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white flex items-center justify-between"
              aria-expanded={familyDropdownOpen}
            >
              <span className={selectedFamilyName ? 'text-stone-800' : 'text-stone-400'}>
                {selectedFamilyName || 'Choose family'}
              </span>
              <ChevronDown
                size={16}
                className={`text-stone-400 transition-transform ${familyDropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {familyDropdownOpen && (
              <div className="absolute z-20 mt-2 w-full rounded-2xl border border-[#FFE5D9] bg-white shadow-lg shadow-[#FF9B85]/10">
                <div className="max-h-56 overflow-y-auto p-2 space-y-1">
                  {families.length === 0 && (
                    <div className="px-3 py-2 text-xs text-stone-500">
                      No families yet.
                    </div>
                  )}
                  {families.map((family) => {
                    const optionKey = String(family.family_id);
                    const isSelected = optionKey === String(formData.familyId);
                    const familyName = buildFamilyName(family);
                    const parentCount = getFamilyParentIds(family).length;
                    return (
                      <button
                        key={optionKey}
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, familyId: optionKey }));
                          setFamilyDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl transition-colors ${
                          isSelected ? 'bg-[#FF9B85] text-white' : 'hover:bg-[#FFF8F3] text-stone-700'
                        }`}
                      >
                        <div className="text-sm font-semibold">{familyName}</div>
                        <div className={`text-xs ${isSelected ? 'text-[#FFECE4]' : 'text-stone-500'}`}>
                          {parentCount} parent{parentCount === 1 ? '' : 's'} linked
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="border-t border-[#FFE5D9] p-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFamilyDropdownOpen(false);
                      setIsAddFamilyOpen(true);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-sm font-semibold text-[#E07A5F] hover:bg-[#FFF8F3] flex items-center gap-2"
                  >
                    <Plus size={14} />
                    Add Family
                  </button>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Start Date
            </label>
            <button
              type="button"
              onClick={() => {
                setActiveDateField('startDate');
                setIsDatePickerOpen(true);
              }}
              className="w-full flex items-center justify-between gap-3 pl-4 pr-3 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white hover:border-[#FF9B85]"
            >
              <span className="flex items-center gap-3">
                <Calendar size={18} className="text-stone-400" />
                <span className={formData.startDate ? 'text-stone-800' : 'text-stone-400'}>
                  {formatDateLabel(formData.startDate, 'Select start date')}
                </span>
              </span>
              <ChevronDown size={16} className="text-stone-400" />
            </button>
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
              {loading ? 'Adding...' : 'Add Child'}
            </button>
          </div>
        </form>
      </BaseModal>

      <DatePickerModal
        isOpen={isDatePickerOpen}
        onClose={() => {
          setIsDatePickerOpen(false);
          setActiveDateField(null);
        }}
        initialDate={
          activeDateField
            ? parseDateInput(formData[activeDateField])
            : undefined
        }
        onConfirm={(date) => {
          if (!activeDateField) return;
          setFormData((prev) => ({ ...prev, [activeDateField]: formatDateInput(date) }));
          setIsDatePickerOpen(false);
          setActiveDateField(null);
        }}
        onClear={() => {
          if (!activeDateField) return;
          setFormData((prev) => ({ ...prev, [activeDateField]: '' }));
          setIsDatePickerOpen(false);
          setActiveDateField(null);
        }}
        title={activeDateField === 'dateOfBirth' ? 'Select date of birth' : 'Select start date'}
        subtitle={activeDateField === 'dateOfBirth'
          ? "Choose the child's date of birth"
          : 'Choose enrollment start date'}
        confirmLabel="Save date"
        clearLabel="Clear date"
      />

      <AddFamilyModal
        isOpen={isAddFamilyOpen}
        onClose={() => setIsAddFamilyOpen(false)}
        onSuccess={async () => {
          await loadFamilies();
          setIsAddFamilyOpen(false);
          setFormData(buildInitialFormData());
          if (onSuccess) onSuccess();
          onClose();
        }}
        initialChild={initialChildForFamilyModal}
      />
    </>
  );
}
