import React, { useState, useEffect } from 'react';
import { BaseModal } from './BaseModal';
import { DollarSign, Calendar, FileText, Plus, X } from 'lucide-react';
import api from '../../utils/api';

export function CreateInvoiceModal({ isOpen, onClose, onSuccess }) {
  const [families, setFamilies] = useState([]);
  const [formData, setFormData] = useState({
    familyId: '',
    parentId: '',
    childId: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    notes: '',
  });
  const [lineItems, setLineItems] = useState([
    { description: 'Monthly Tuition', amount: '' }
  ]);
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

  const getFamilyId = (family) => String(family?.family_id ?? family?.id ?? '');
  const getParentId = (parent) => String(parent?.parent_id ?? parent?.id ?? parent?.parentId ?? '');
  const getParentLabel = (parent) => {
    if (!parent) return '';
    const first = parent.parent_first_name ?? parent.first_name ?? parent.firstName ?? '';
    const last = parent.parent_last_name ?? parent.last_name ?? parent.lastName ?? '';
    const name = `${first} ${last}`.trim();
    return name || parent.parent_email || parent.email || 'Parent';
  };
  const getFamilyDisplayName = (family) => {
    const directName = family?.family_name
      || family?.parents?.map((parent) => parent.family_name).find(Boolean);
    if (directName) return directName;
    const childLastName = family?.children?.[0]?.last_name || family?.children?.[0]?.lastName;
    if (childLastName) return `${childLastName} Family`;
    return family?.family_id ? `Family #${family.family_id}` : 'Family';
  };
  const getChildLabel = (child) => {
    if (!child) return '';
    const first = child.first_name ?? child.firstName ?? '';
    const last = child.last_name ?? child.lastName ?? '';
    const name = `${first} ${last}`.trim();
    return name || 'Child';
  };
  const getBillingParent = (family) => {
    const parents = family?.parents || [];
    return (
      parents.find((parent) => parent.has_billing_responsibility)
      || parents.find((parent) => parent.is_primary_contact)
      || parents[0]
      || null
    );
  };

  const selectedFamily = families.find((family) => getFamilyId(family) === formData.familyId);
  const familyParents = selectedFamily?.parents || [];
  const familyChildren = selectedFamily?.children || [];

  const handleFamilyChange = (familyId) => {
    const family = families.find((item) => getFamilyId(item) === familyId);
    const billingParent = getBillingParent(family);
    const defaultParentId = billingParent ? getParentId(billingParent) : '';
    const defaultChildId = family?.children?.[0]?.id ? String(family.children[0].id) : '';

    setFormData((prev) => ({
      ...prev,
      familyId,
      parentId: defaultParentId,
      childId: defaultChildId
    }));
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', amount: '' }]);
  };

  const removeLineItem = (index) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const updateLineItem = (index, field, value) => {
    const updated = [...lineItems];
    updated[index][field] = value;
    setLineItems(updated);
  };

  const calculateTotal = () => {
    return lineItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!selectedFamily) {
        setError('Please select a family.');
        return;
      }

      const fallbackParent = getBillingParent(selectedFamily);
      const parentId = formData.parentId || (fallbackParent ? getParentId(fallbackParent) : '');
      if (!parentId) {
        setError('Please select a billing parent.');
        return;
      }

      const line_items = lineItems.map((item) => {
        const amount = parseFloat(item.amount) || 0;
        return {
          description: item.description,
          quantity: 1,
          rate: amount,
          amount
        };
      });

      await api.post('/invoices', {
        parent_id: parseInt(parentId, 10),
        child_id: formData.childId ? parseInt(formData.childId, 10) : null,
        invoice_date: formData.invoiceDate,
        due_date: formData.dueDate,
        line_items,
        notes: formData.notes
      });

      setFormData({
        familyId: '',
        parentId: '',
        childId: '',
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        notes: '',
      });
      setLineItems([{ description: 'Monthly Tuition', amount: '' }]);

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to create invoice:', err);
      setError(err.response?.data?.error || 'Failed to create invoice. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Create Invoice">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Family Selection */}
        <div>
          <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
            Bill To
          </label>
          <select
            value={formData.familyId}
            onChange={(e) => handleFamilyChange(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white"
            required
          >
            <option value="">Select Family...</option>
            {families.map((family) => {
              return (
                <option key={family.family_id} value={getFamilyId(family)}>
                  {getFamilyDisplayName(family)}
                </option>
              );
            })}
          </select>
        </div>

        {/* Billing Parent */}
        <div>
          <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
            Billing Parent
          </label>
          <select
            value={formData.parentId}
            onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
            className="w-full px-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white"
            required
            disabled={!selectedFamily}
          >
            <option value="">Select Parent...</option>
            {familyParents.map((parent) => (
              <option key={getParentId(parent)} value={getParentId(parent)}>
                {getParentLabel(parent)}
              </option>
            ))}
          </select>
        </div>

        {/* Child (Optional) */}
        <div>
          <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
            Child (Optional)
          </label>
          <select
            value={formData.childId}
            onChange={(e) => setFormData({ ...formData, childId: e.target.value })}
            className="w-full px-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white"
            disabled={!selectedFamily}
          >
            <option value="">No child selected</option>
            {familyChildren.map((child) => (
              <option key={child.id} value={child.id}>
                {getChildLabel(child)}
              </option>
            ))}
          </select>
        </div>

        {/* Invoice Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Invoice Date
            </label>
            <div className="relative">
              <Calendar
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
              />
              <input
                type="date"
                value={formData.invoiceDate}
                onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Due Date
            </label>
            <div className="relative">
              <Calendar
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
              />
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white"
                required
              />
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div>
          <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
            Line Items
          </label>
          <div className="space-y-3">
            {lineItems.map((item, index) => (
              <div key={index} className="p-4 bg-[#FFF8F3] rounded-2xl border border-[#FFE5D9]">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                    className="px-3 py-2 rounded-xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white text-sm"
                    required
                  />
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <DollarSign
                        size={16}
                        className="absolute left-2 top-1/2 -translate-y-1/2 text-stone-400"
                      />
                      <input
                        type="number"
                        placeholder="Amount"
                        value={item.amount}
                        onChange={(e) => updateLineItem(index, 'amount', e.target.value)}
                        step="0.01"
                        min="0"
                        className="w-full pl-7 pr-3 py-2 rounded-xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white text-sm"
                        required
                      />
                    </div>
                    {lineItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLineItem(index)}
                        className="w-8 h-8 rounded-lg bg-red-100 text-red-500 hover:bg-red-200 transition-colors flex items-center justify-center"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addLineItem}
              className="text-[#FF9B85] text-sm font-bold hover:underline flex items-center gap-1"
            >
              <Plus size={16} /> Add Line Item
            </button>
          </div>
        </div>

        {/* Total */}
        <div className="p-4 bg-[#FFE5D9] rounded-2xl">
          <div className="flex justify-between items-center">
            <span className="font-bold text-stone-700 font-quicksand">
              Total Amount
            </span>
            <span className="text-2xl font-bold text-[#E07A5F] font-quicksand">
              ${calculateTotal().toFixed(2)}
            </span>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
            Notes (Optional)
          </label>
          <div className="relative">
            <FileText
              size={18}
              className="absolute left-3 top-3 text-stone-400"
            />
            <textarea
              placeholder="Payment terms, special instructions..."
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full pl-10 pr-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white resize-none"
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
            {loading ? 'Creating...' : 'Create & Send'}
          </button>
        </div>
      </form>
    </BaseModal>
  );
}
