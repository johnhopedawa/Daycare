import React, { useEffect, useState, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { BaseModal } from '../components/modals/BaseModal';
import api from '../utils/api';

export function TimeEntriesApprovalPage() {
  const [entries, setEntries] = useState([]);
  const [payPeriods, setPayPeriods] = useState([]);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [payPeriodId, setPayPeriodId] = useState('');
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectEntryId, setRejectEntryId] = useState(null);

  const loadPayPeriods = useCallback(async () => {
    try {
      const response = await api.get('/pay-periods');
      setPayPeriods(response.data.payPeriods || []);
    } catch (error) {
      console.error('Failed to load pay periods:', error);
    }
  }, []);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) {
        params.set('status', statusFilter);
      }

      if (payPeriodId) {
        const period = payPeriods.find(p => String(p.id) === String(payPeriodId));
        if (period) {
          params.set('from', period.start_date);
          params.set('to', period.end_date);
        }
      }

      const query = params.toString() ? `?${params.toString()}` : '';
      const response = await api.get(`/admin/time-entries${query}`);
      setEntries(response.data.timeEntries || []);
      setSelected([]);
    } catch (error) {
      console.error('Failed to load time entries:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, payPeriodId, payPeriods]);

  useEffect(() => {
    loadPayPeriods();
  }, [loadPayPeriods]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const handleApprove = async (id) => {
    try {
      await api.post(`/admin/time-entries/${id}/approve`);
      loadEntries();
    } catch (error) {
      console.error('Failed to approve entry:', error);
      alert('Failed to approve entry');
    }
  };

  const openRejectModal = (id) => {
    setRejectEntryId(id);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const handleReject = async () => {
    if (!rejectEntryId) return;
    if (!rejectReason.trim()) {
      alert('Please provide a rejection reason.');
      return;
    }

    try {
      await api.post(`/admin/time-entries/${rejectEntryId}/reject`, { reason: rejectReason });
      setRejectModalOpen(false);
      setRejectEntryId(null);
      setRejectReason('');
      loadEntries();
    } catch (error) {
      console.error('Failed to reject entry:', error);
      alert('Failed to reject entry');
    }
  };

  const handleBatchApprove = async () => {
    if (selected.length === 0) return;
    try {
      await api.post('/admin/time-entries/batch-approve', { ids: selected });
      loadEntries();
    } catch (error) {
      console.error('Failed to batch approve entries:', error);
      alert('Failed to batch approve entries');
    }
  };

  const toggleSelect = (id) => {
    setSelected(prev => (prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (selected.length === entries.length) {
      setSelected([]);
    } else {
      setSelected(entries.map(entry => entry.id));
    }
  };

  return (
    <Layout title="Time Entries" subtitle="Approve or reject educator time entries">
      <div className="bg-white rounded-3xl shadow-[0_4px_20px_-4px_rgba(255,229,217,0.5)] border border-[#FFE5D9]/30 overflow-hidden">
        <div className="p-6 border-b border-[#FFE5D9]/30 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider font-quicksand mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 rounded-2xl border border-[#FFE5D9] bg-white text-stone-600"
              >
                <option value="">All</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider font-quicksand mb-2">
                Pay Period
              </label>
              <select
                value={payPeriodId}
                onChange={(e) => setPayPeriodId(e.target.value)}
                className="px-4 py-2 rounded-2xl border border-[#FFE5D9] bg-white text-stone-600"
              >
                <option value="">All Periods</option>
                {payPeriods.map((period) => (
                  <option key={period.id} value={period.id}>
                    {period.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {statusFilter === 'PENDING' && selected.length > 0 && (
            <button
              onClick={handleBatchApprove}
              className="px-4 py-2 rounded-2xl bg-[#B8E6D5] text-[#2D6A4F] font-semibold hover:bg-[#9ED9C2] transition-colors"
            >
              Approve Selected ({selected.length})
            </button>
          )}
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <p className="text-stone-500">Loading time entries...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-stone-500">No time entries found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#FFF8F3]">
                <tr>
                  {statusFilter === 'PENDING' && (
                    <th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase tracking-wider font-quicksand">
                      <input
                        type="checkbox"
                        checked={selected.length === entries.length}
                        onChange={toggleSelectAll}
                      />
                    </th>
                  )}
                  <th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase tracking-wider font-quicksand">
                    Educator
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase tracking-wider font-quicksand">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase tracking-wider font-quicksand">
                    Hours
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase tracking-wider font-quicksand">
                    Notes
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase tracking-wider font-quicksand">
                    Status
                  </th>
                  {statusFilter === 'PENDING' && (
                    <th className="px-6 py-4 text-right text-xs font-bold text-stone-500 uppercase tracking-wider font-quicksand">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#FFE5D9]/30">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-[#FFF8F3]/50 transition-colors">
                    {statusFilter === 'PENDING' && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selected.includes(entry.id)}
                          onChange={() => toggleSelect(entry.id)}
                        />
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-stone-800">
                      {entry.first_name} {entry.last_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                      {new Date(entry.entry_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600">
                      {entry.total_hours}
                    </td>
                    <td className="px-6 py-4 text-sm text-stone-500 max-w-xs truncate">
                      {entry.notes || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        entry.status === 'APPROVED'
                          ? 'bg-[#B8E6D5] text-[#2D6A4F]'
                          : entry.status === 'REJECTED'
                          ? 'bg-[#FFE5D9] text-[#C4554D]'
                          : 'bg-[#FFF4CC] text-[#B45309]'
                      }`}>
                        {entry.status}
                      </span>
                    </td>
                    {statusFilter === 'PENDING' && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleApprove(entry.id)}
                            className="px-4 py-2 rounded-xl bg-[#B8E6D5] text-[#2D6A4F] font-semibold hover:bg-[#9ED9C2] transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => openRejectModal(entry.id)}
                            className="px-4 py-2 rounded-xl bg-[#FFE5D9] text-[#C4554D] font-semibold hover:bg-[#FFD5C5] transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <BaseModal
        isOpen={rejectModalOpen}
        onClose={() => {
          setRejectModalOpen(false);
          setRejectEntryId(null);
          setRejectReason('');
        }}
        title="Reject Time Entry"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Rejection Reason
            </label>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setRejectModalOpen(false);
                setRejectEntryId(null);
                setRejectReason('');
              }}
              className="flex-1 px-4 py-2 rounded-xl border border-[#FFE5D9] text-stone-600 font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleReject}
              className="flex-1 px-4 py-2 rounded-xl bg-[#FF9B85] text-white font-semibold"
            >
              Reject Entry
            </button>
          </div>
        </div>
      </BaseModal>
    </Layout>
  );
}
