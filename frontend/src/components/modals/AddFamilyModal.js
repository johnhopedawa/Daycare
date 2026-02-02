import React, { useState } from 'react';
import { BaseModal } from './BaseModal';
import { User, Mail, Phone, MapPin, Plus, X } from 'lucide-react';
import api from '../../utils/api';

export function AddFamilyModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    familyName: '',
    parents: [{ id: Date.now(), name: '', email: '', phone: '' }],
    children: [{ id: Date.now(), firstName: '', lastName: '', dateOfBirth: '' }],
    addressLine1: '',
    addressLine2: '',
    city: '',
    province: '',
    postalCode: '',
  });
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addChild = () => {
    if (formData.children.length >= 1) return;
    setFormData({
      ...formData,
      children: [{ id: Date.now(), firstName: '', lastName: '', dateOfBirth: '' }],
    });
  };

  const removeChild = (index) => {
    setFormData({
      ...formData,
      children: formData.children.filter((_, i) => i !== index),
    });
  };

  const updateChild = (index, field, value) => {
    const updated = [...formData.children];
    updated[index][field] = value;
    setFormData({ ...formData, children: updated });
  };

  const addParent = () => {
    if (formData.parents.length >= 2) return;
    setFormData({
      ...formData,
      parents: [...formData.parents, { id: Date.now(), name: '', email: '', phone: '' }],
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
      const parent1 = formData.parents[0] || {};
      const parent2 = formData.parents[1] || {};
      const child = formData.children[0] || {};

      const parent1NameParts = (parent1.name || '').trim().split(' ').filter(Boolean);
      const parent2NameParts = (parent2.name || '').trim().split(' ').filter(Boolean);

      const response = await api.post('/families', {
        parent1FirstName: parent1NameParts[0] || '',
        parent1LastName: parent1NameParts.slice(1).join(' ') || '',
        parent1Email: parent1.email || '',
        parent1Phone: parent1.phone || '',
        parent2FirstName: parent2NameParts[0] || '',
        parent2LastName: parent2NameParts.slice(1).join(' ') || '',
        parent2Email: parent2.email || '',
        parent2Phone: parent2.phone || '',
        address_line1: formData.addressLine1 || '',
        address_line2: formData.addressLine2 || '',
        city: formData.city || '',
        province: formData.province || '',
        postal_code: formData.postalCode || '',
        childFirstName: child.firstName || '',
        childLastName: child.lastName || '',
        childDob: child.dateOfBirth || '',
        childStatus: 'ACTIVE'
      });

      if (response.data.child?.id && emergencyContacts.length > 0) {
        const childId = response.data.child.id;
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

      // Reset form and close modal
      setFormData({
        familyName: '',
        parents: [{ id: Date.now(), name: '', email: '', phone: '' }],
        children: [{ id: Date.now(), firstName: '', lastName: '', dateOfBirth: '' }],
        addressLine1: '',
        addressLine2: '',
        city: '',
        province: '',
        postalCode: '',
      });
      setEmergencyContacts([]);

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to create family:', err);
      setError(err.response?.data?.error || 'Failed to create family. Please try again.');
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
                  <div className="flex-1 relative">
                    <User
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                    />
                    <input
                      type="text"
                      placeholder={`Parent ${i + 1} Full Name`}
                      value={parent.name}
                      onChange={(e) => updateParent(i, 'name', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white"
                      required
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
              disabled={formData.children.length >= 1}
              className="text-[#FF9B85] text-sm font-bold hover:underline flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={16} /> Add Child
            </button>
          </div>
          <div className="space-y-3">
            {formData.children.map((child, i) => (
              <div key={child.id} className="flex gap-2">
                <div className="flex-1 grid grid-cols-2 gap-2">
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
                  <input
                    type="date"
                    placeholder="Date of Birth"
                    value={child.dateOfBirth}
                    onChange={(e) => updateChild(i, 'dateOfBirth', e.target.value)}
                    className="col-span-2 px-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white"
                    required
                  />
                </div>
                {formData.children.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeChild(i)}
                    className="w-10 h-10 rounded-xl bg-[#FFE5D9] flex items-center justify-center text-stone-500 hover:bg-red-100 hover:text-red-500 transition-colors"
                  >
                    <X size={18} />
                  </button>
                )}
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
    </BaseModal>
  );
}
