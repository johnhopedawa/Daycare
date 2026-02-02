import React, { useState } from 'react';
import { BaseModal } from './BaseModal';
import { DatePickerModal } from './DatePickerModal';
import { User, Mail, Phone, MapPin, Plus, X, Cake, DollarSign } from 'lucide-react';
import api from '../../utils/api';

export function AddFamilyModal({ isOpen, onClose, onSuccess }) {
  const createChild = () => ({
    id: `child-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    monthlyRate: '',
    allergies: { common: [], other: '' },
    medicalNotes: '',
    notes: ''
  });

  const [formData, setFormData] = useState({
    familyName: '',
    parents: [{ id: Date.now(), firstName: '', lastName: '', email: '', phone: '' }],
    children: [createChild()],
    addressLine1: '',
    addressLine2: '',
    city: '',
    province: '',
    postalCode: '',
  });
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [activeChildIndex, setActiveChildIndex] = useState(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const COMMON_ALLERGIES = [
    'None', 'Milk', 'Eggs', 'Nuts', 'Tree Nuts', 'Soy', 'Wheat (Gluten)',
    'Fish', 'Shellfish', 'Sesame', 'Strawberries', 'Citrus Fruits', 'Bananas',
    'Chocolate/Cocoa', 'Food Dyes', 'Corn', 'Dust Mites', 'Pollen', 'Pet'
  ];

  const formatDateInput = (date) => {
    if (!date || Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const parseDateInput = (value) => {
    if (!value) return null;
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  };

  const formatDateLabel = (value) => {
    if (!value) return 'Select date of birth';
    const date = parseDateInput(value) || new Date(value);
    if (!date || Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const addChild = () => {
    setFormData({
      ...formData,
      children: [...formData.children, createChild()],
    });
  };

  const removeChild = (index) => {
    setFormData({
      ...formData,
      children: formData.children.filter((_, i) => i !== index),
    });

    if (activeChildIndex === index) {
      setIsDatePickerOpen(false);
      setActiveChildIndex(null);
    } else if (activeChildIndex > index) {
      setActiveChildIndex(activeChildIndex - 1);
    }
  };

  const updateChild = (index, field, value) => {
    const updated = [...formData.children];
    updated[index][field] = value;
    setFormData({ ...formData, children: updated });
  };

  const normalizeAllergies = (allergies) => {
    if (!allergies) return null;
    const common = (allergies.common || []).filter(Boolean);
    const other = (allergies.other || '').trim();
    if (common.length === 0 && !other) return null;
    return { common, other };
  };

  const toggleChildAllergy = (index, allergy) => {
    setFormData((prev) => {
      const children = [...prev.children];
      const current = children[index]?.allergies?.common || [];
      const nextCommon = current.includes(allergy)
        ? current.filter((item) => item !== allergy)
        : [...current, allergy];
      children[index] = {
        ...children[index],
        allergies: {
          ...(children[index].allergies || { common: [], other: '' }),
          common: nextCommon
        }
      };
      return { ...prev, children };
    });
  };

  const updateChildAllergyOther = (index, value) => {
    setFormData((prev) => {
      const children = [...prev.children];
      children[index] = {
        ...children[index],
        allergies: {
          ...(children[index].allergies || { common: [], other: '' }),
          other: value
        }
      };
      return { ...prev, children };
    });
  };

  const openDatePicker = (index) => {
    setActiveChildIndex(index);
    setIsDatePickerOpen(true);
  };

  const closeDatePicker = () => {
    setIsDatePickerOpen(false);
    setActiveChildIndex(null);
  };

  const addParent = () => {
    if (formData.parents.length >= 2) return;
    setFormData({
      ...formData,
      parents: [...formData.parents, { id: Date.now(), firstName: '', lastName: '', email: '', phone: '' }],
    });
  };

  const removeParent = (index) => {
    if (formData.parents.length > 1) {
      setFormData({
        ...formData,
        parents: formData.parents.filter((_, i) => i !== index),
      });
    }
  };

  const updateParent = (index, field, value) => {
    const updated = [...formData.parents];
    updated[index][field] = value;
    setFormData({ ...formData, parents: updated });
  };

  const handleAddEmergencyContact = () => {
    setEmergencyContacts([
      ...emergencyContacts,
      {
        id: `new-${Date.now()}`,
        name: '',
        phone: '',
        relationship: '',
        is_primary: emergencyContacts.length === 0
      }
    ]);
  };

  const handleUpdateEmergencyContact = (index, field, value) => {
    const updated = [...emergencyContacts];
    updated[index] = { ...updated[index], [field]: value };

    if (field === 'is_primary' && value) {
      updated.forEach((contact, i) => {
        if (i !== index) {
          contact.is_primary = false;
        }
      });
    }

    setEmergencyContacts(updated);
  };

  const handleDeleteEmergencyContact = (index) => {
    setEmergencyContacts(emergencyContacts.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!formData.children.length) {
        setError('Please add at least one child.');
        return;
      }

      const missingChild = formData.children.find((child) =>
        !child.firstName || !child.lastName || !child.dateOfBirth
      );

      if (missingChild) {
        setError('Please enter first name, last name, and date of birth for each child.');
        return;
      }

      const parent1 = formData.parents[0] || {};
      const parent2 = formData.parents[1] || {};
      const primaryChild = formData.children[0] || {};
      const primaryAllergies = normalizeAllergies(primaryChild.allergies);

      const response = await api.post('/families', {
        familyName: formData.familyName || '',
        parent1FirstName: parent1.firstName || '',
        parent1LastName: parent1.lastName || '',
        parent1Email: parent1.email || '',
        parent1Phone: parent1.phone || '',
        parent2FirstName: parent2.firstName || '',
        parent2LastName: parent2.lastName || '',
        parent2Email: parent2.email || '',
        parent2Phone: parent2.phone || '',
        address_line1: formData.addressLine1 || '',
        address_line2: formData.addressLine2 || '',
        city: formData.city || '',
        province: formData.province || '',
        postal_code: formData.postalCode || '',
        childFirstName: primaryChild.firstName || '',
        childLastName: primaryChild.lastName || '',
        childDob: primaryChild.dateOfBirth || '',
        childStatus: 'ACTIVE',
        childMonthlyRate: primaryChild.monthlyRate || '',
        allergies: primaryAllergies,
        medical_notes: primaryChild.medicalNotes || '',
        notes: primaryChild.notes || ''
      });

      const createdChildIds = [];
      const createdPrimaryChildId = response.data.child?.id;
      if (createdPrimaryChildId) {
        createdChildIds.push(createdPrimaryChildId);
      }

      const parentIds = response.data.parentIds || response.data.parent_ids || [];
      const additionalChildren = formData.children.slice(1);
      const enrollmentStartDate = formatDateInput(new Date());

      if (additionalChildren.length > 0 && parentIds.length === 0) {
        throw new Error('Unable to add additional children without parent records.');
      }

      for (const child of additionalChildren) {
        const normalizedAllergies = normalizeAllergies(child.allergies);
        const childResponse = await api.post('/children', {
          first_name: child.firstName,
          last_name: child.lastName,
          date_of_birth: child.dateOfBirth,
          enrollment_start_date: enrollmentStartDate,
          status: 'ACTIVE',
          monthly_rate: child.monthlyRate ? parseFloat(child.monthlyRate) : null,
          billing_cycle: 'MONTHLY',
          allergies: normalizedAllergies ? JSON.stringify(normalizedAllergies) : null,
          medical_notes: child.medicalNotes || null,
          notes: child.notes || null,
          parent_ids: parentIds
        });

        if (childResponse.data.child?.id) {
          createdChildIds.push(childResponse.data.child.id);
        }
      }

      if (createdChildIds.length > 0 && emergencyContacts.length > 0) {
        for (const childId of createdChildIds) {
          for (const contact of emergencyContacts) {
            if (contact.name) {
              await api.post(`/children/${childId}/emergency-contacts`, {
                name: contact.name,
                phone: contact.phone || null,
                relationship: contact.relationship || null,
                is_primary: contact.is_primary || false
              });
            }
          }
        }
      }

      // Reset form and close modal
      setFormData({
        familyName: '',
        parents: [{ id: Date.now(), firstName: '', lastName: '', email: '', phone: '' }],
        children: [createChild()],
        addressLine1: '',
        addressLine2: '',
        city: '',
        province: '',
        postalCode: '',
      });
      setEmergencyContacts([]);
      setActiveChildIndex(null);
      setIsDatePickerOpen(false);

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to create family:', err);
      setError(err.response?.data?.error || err.message || 'Failed to create family. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Add New Family">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Family Name */}
        <div>
          <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
            Family Name
          </label>
          <input
            type="text"
            placeholder="The Smith Family"
            value={formData.familyName}
            onChange={(e) => setFormData({ ...formData, familyName: e.target.value })}
            className="w-full px-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white text-stone-800"
            required
          />
        </div>

        {/* Parents / Guardians */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-bold text-stone-700 font-quicksand">
              Parents / Guardians
            </label>
            <button
              type="button"
              onClick={addParent}
              disabled={formData.parents.length >= 2}
              className="text-[#FF9B85] text-sm font-bold hover:underline flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={16} /> Add Parent
            </button>
          </div>
          <div className="space-y-3">
            {formData.parents.map((parent, i) => (
              <div key={parent.id} className="space-y-2 p-3 bg-[#FFF8F3] rounded-2xl border border-[#FFE5D9]">
                <div className="flex gap-2 items-start">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <div className="relative">
                      <User
                        size={18}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                      />
                      <input
                        type="text"
                        placeholder={`Parent ${i + 1} First Name`}
                        value={parent.firstName}
                        onChange={(e) => updateParent(i, 'firstName', e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white"
                        required={i === 0}
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Last Name"
                      value={parent.lastName}
                      onChange={(e) => updateParent(i, 'lastName', e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white"
                      required={i === 0}
                    />
                  </div>
                  {formData.parents.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeParent(i)}
                      className="w-10 h-10 rounded-xl bg-[#FFE5D9] flex items-center justify-center text-stone-500 hover:bg-red-100 hover:text-red-500 transition-colors"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <Mail
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      value={parent.email}
                      onChange={(e) => updateParent(i, 'email', e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white"
                      required={i === 0}
                    />
                  </div>
                  <div className="relative">
                    <Phone
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                    />
                    <input
                      type="tel"
                      placeholder="Phone"
                      value={parent.phone}
                      onChange={(e) => updateParent(i, 'phone', e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white"
                    />
                  </div>
                </div>
                {i === 0 && (
                  <p className="text-xs text-stone-500 mt-1">Primary Contact</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Children */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-bold text-stone-700 font-quicksand">
              Children
            </label>
            <button
              type="button"
              onClick={addChild}
              className="text-[#FF9B85] text-sm font-bold hover:underline flex items-center gap-1"
            >
              <Plus size={16} /> Add Child
            </button>
          </div>
          <div className="space-y-3">
            {formData.children.map((child, i) => (
              <div key={child.id} className="space-y-4 p-4 bg-[#FFF8F3] rounded-2xl border border-[#FFE5D9]">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-stone-600">Child {i + 1}</p>
                  {formData.children.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeChild(i)}
                      className="text-xs font-bold text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="First Name"
                    value={child.firstName}
                    onChange={(e) => updateChild(i, 'firstName', e.target.value)}
                    className="px-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Last Name"
                    value={child.lastName}
                    onChange={(e) => updateChild(i, 'lastName', e.target.value)}
                    className="px-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white"
                    required
                  />
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
                      Date of Birth
                    </label>
                    <button
                      type="button"
                      onClick={() => openDatePicker(i)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-[#FFE5D9] bg-white text-left hover:border-[#FF9B85] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/40"
                    >
                      <Cake size={18} className="text-stone-400" />
                      <span className={child.dateOfBirth ? 'text-stone-800' : 'text-stone-400'}>
                        {formatDateLabel(child.dateOfBirth)}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="relative">
                    <DollarSign
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                    />
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Monthly Rate"
                      value={child.monthlyRate}
                      onChange={(e) => updateChild(i, 'monthlyRate', e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                    Allergies
                  </label>
                  <div className="flex flex-wrap gap-2 p-3 bg-white rounded-2xl border border-[#FFE5D9]">
                    {COMMON_ALLERGIES.map((allergy) => (
                      <button
                        key={`${child.id}-${allergy}`}
                        type="button"
                        onClick={() => toggleChildAllergy(i, allergy)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                          (child.allergies?.common || []).includes(allergy)
                            ? 'bg-[#FF9B85] text-white'
                            : 'bg-[#FFF8F3] text-stone-600 border border-[#FFE5D9] hover:border-[#FF9B85]'
                        }`}
                      >
                        {allergy}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Other allergies (separated by commas)"
                    value={child.allergies?.other || ''}
                    onChange={(e) => updateChildAllergyOther(i, e.target.value)}
                    className="w-full mt-2 px-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                    Medical Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Any medical conditions, medications, or important health information..."
                    value={child.medicalNotes}
                    onChange={(e) => updateChild(i, 'medicalNotes', e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                    Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Any additional notes about the child..."
                    value={child.notes}
                    onChange={(e) => updateChild(i, 'notes', e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white resize-none"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Emergency Contacts */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-bold text-stone-700 font-quicksand">
              Emergency Contacts
            </label>
            <button
              type="button"
              onClick={handleAddEmergencyContact}
              className="text-[#FF9B85] text-sm font-bold hover:underline flex items-center gap-1"
            >
              <Plus size={16} /> Add Contact
            </button>
          </div>
          {emergencyContacts.length === 0 ? (
            <div className="p-4 bg-[#FFF8F3] rounded-2xl border border-[#FFE5D9] text-sm text-stone-500 text-center">
              No emergency contacts added. Click "Add Contact" to add one.
            </div>
          ) : (
            <div className="space-y-3">
              {emergencyContacts.map((contact, i) => (
                <div key={contact.id || i} className="space-y-2 p-3 bg-[#FFF8F3] rounded-2xl border border-[#FFE5D9]">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!contact.is_primary}
                        onChange={(e) => handleUpdateEmergencyContact(i, 'is_primary', e.target.checked)}
                        className="rounded border-[#FFE5D9] text-[#FF9B85] focus:ring-[#FF9B85]/50"
                      />
                      Primary Contact
                    </label>
                    <button
                      type="button"
                      onClick={() => handleDeleteEmergencyContact(i)}
                      className="text-xs font-bold text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Name *"
                      value={contact.name || ''}
                      onChange={(e) => handleUpdateEmergencyContact(i, 'name', e.target.value)}
                      className="px-4 py-2 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white"
                    />
                    <input
                      type="tel"
                      placeholder="Phone"
                      value={contact.phone || ''}
                      onChange={(e) => handleUpdateEmergencyContact(i, 'phone', e.target.value)}
                      className="px-4 py-2 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white"
                    />
                    <input
                      type="text"
                      placeholder="Relationship"
                      value={contact.relationship || ''}
                      onChange={(e) => handleUpdateEmergencyContact(i, 'relationship', e.target.value)}
                      className="px-4 py-2 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
            Home Address
          </label>
          <div className="space-y-3">
            <div className="relative">
              <MapPin
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
              />
              <input
                type="text"
                placeholder="Address Line 1"
                value={formData.addressLine1}
                onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white"
              />
            </div>
            <input
              type="text"
              placeholder="Address Line 2"
              value={formData.addressLine2}
              onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white"
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="City"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white"
              />
              <input
                type="text"
                placeholder="Province/State"
                value={formData.province}
                onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white"
              />
              <input
                type="text"
                placeholder="Postal Code"
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white"
              />
            </div>
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
            {loading ? 'Adding...' : 'Add Family'}
          </button>
        </div>
      </form>

      <DatePickerModal
        isOpen={isDatePickerOpen}
        onClose={closeDatePicker}
        initialDate={
          activeChildIndex !== null
            ? parseDateInput(formData.children[activeChildIndex]?.dateOfBirth)
            : undefined
        }
        onConfirm={(date) => {
          if (activeChildIndex === null) return;
          updateChild(activeChildIndex, 'dateOfBirth', formatDateInput(date));
          closeDatePicker();
        }}
        onClear={() => {
          if (activeChildIndex === null) return;
          updateChild(activeChildIndex, 'dateOfBirth', '');
          closeDatePicker();
        }}
        title="Select date of birth"
        subtitle="Choose the child's date of birth"
        confirmLabel="Save date"
        clearLabel="Clear date"
      />
    </BaseModal>
  );
}
