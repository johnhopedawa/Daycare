import React, { useEffect, useState } from 'react';
import { BaseModal } from './BaseModal';
import { Users, Mail } from 'lucide-react';
import api from '../../utils/api';

export function SendMessageModal({ isOpen, onClose }) {
  const [formData, setFormData] = useState({
    recipientType: 'all',
    parentId: '',
    subject: '',
    message: '',
    sendEmail: true,
  });
  const [loading, setLoading] = useState(false);
  const [loadingParents, setLoadingParents] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [parents, setParents] = useState([]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const loadParents = async () => {
      setLoadingParents(true);
      setError('');
      try {
        const response = await api.get('/parents');
        setParents(response.data.parents || []);
      } catch (err) {
        console.error('Failed to load parents:', err);
        setError('Failed to load parent list.');
      } finally {
        setLoadingParents(false);
      }
    };

    loadParents();
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('/messages/send', {
        recipientType: formData.recipientType,
        parentId: formData.recipientType === 'parent' ? formData.parentId : null,
        subject: formData.subject,
        message: formData.message,
        sendEmail: formData.sendEmail,
      });

      setSuccess(true);
      setTimeout(() => {
        setFormData({
          recipientType: 'all',
          parentId: '',
          subject: '',
          message: '',
          sendEmail: true,
        });
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Send Message">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-2xl text-green-700 text-sm">
            Message sent successfully!
          </div>
        )}

        {/* Recipients */}
        <div>
          <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
            Send To
          </label>
          <div className="relative">
            <Users
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
            />
            <select
              value={formData.recipientType}
              onChange={(e) => setFormData({
                ...formData,
                recipientType: e.target.value,
                parentId: e.target.value === 'parent' ? formData.parentId : '',
              })}
              className="w-full pl-10 pr-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white appearance-none"
              required
            >
              <option value="all">All Families</option>
              <option value="parent">Single Family</option>
            </select>
          </div>
        </div>

        {formData.recipientType === 'parent' && (
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Choose Family
            </label>
            <select
              value={formData.parentId}
              onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white"
              required
              disabled={loadingParents}
            >
              <option value="">
                {loadingParents ? 'Loading families...' : 'Select a family'}
              </option>
              {parents.map((parent) => (
                <option key={parent.id} value={parent.id}>
                  {parent.first_name} {parent.last_name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Subject */}
        <div>
          <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
            Subject
          </label>
          <input
            type="text"
            placeholder="Important Update"
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            className="w-full px-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white"
            required
          />
        </div>

        {/* Message */}
        <div>
          <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
            Message
          </label>
          <textarea
            placeholder="Type your message here..."
            rows={6}
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            className="w-full px-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white resize-none"
            required
          />
        </div>

        {/* Send Options */}
        <div className="flex items-center gap-3 p-4 bg-[#FFF8F3] rounded-2xl">
          <input
            type="checkbox"
            id="send-email"
            checked={formData.sendEmail}
            onChange={(e) => setFormData({ ...formData, sendEmail: e.target.checked })}
            className="w-5 h-5 rounded border-[#FFE5D9] text-[#FF9B85] focus:ring-[#FF9B85]"
          />
          <label
            htmlFor="send-email"
            className="text-sm text-stone-600 font-medium flex items-center gap-2"
          >
            <Mail size={16} className="text-[#FF9B85]" />
            Also send via email
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
            {loading ? 'Sending...' : 'Send Message'}
          </button>
        </div>
      </form>
    </BaseModal>
  );
}
