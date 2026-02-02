import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { Calendar, DollarSign, Users, CheckCircle, Clock, Download, Plus } from 'lucide-react';
import { BaseModal } from '../components/modals/BaseModal';
import api from '../utils/api';

export function PayPeriodsPage() {
  const [payPeriods, setPayPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [formData, setFormData] = useState({ name: '', startDate: '', endDate: '' });
  const [generateData, setGenerateData] = useState({ frequency: 'BI_WEEKLY', startDate: '' });

  const loadPayPeriods = useCallback(async () => {
    try {
      const response = await api.get('/pay-periods');
      setPayPeriods(response.data.payPeriods || []);
    } catch (error) {
      console.error('Failed to load pay periods:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPayPeriods();
  }, [loadPayPeriods]);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const cardStyles = [
    { backgroundColor: 'var(--card-1)', color: 'var(--card-text-1)' },
    { backgroundColor: 'var(--card-2)', color: 'var(--card-text-2)' },
    { backgroundColor: 'var(--card-3)', color: 'var(--card-text-3)' },
    { backgroundColor: 'var(--card-4)', color: 'var(--card-text-4)' },
  ];
  const statusStyles = {
    OPEN: cardStyles[0],
    PROCESSING: cardStyles[2],
    PAID: cardStyles[1],
    CLOSED: { backgroundColor: 'var(--background)', color: 'var(--muted)' },
  };
  const getStatusStyle = (status) => statusStyles[status] || {
    backgroundColor: 'var(--background)',
    color: 'var(--muted)',
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/pay-periods', formData);
      setIsCreateOpen(false);
      setFormData({ name: '', startDate: '', endDate: '' });
      loadPayPeriods();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to create pay period');
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/pay-periods/generate', generateData);
      alert(response.data.message);
      setIsGenerateOpen(false);
      setGenerateData({ frequency: 'BI_WEEKLY', startDate: '' });
      loadPayPeriods();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to generate pay periods');
    }
  };

  const handlePreviewClose = async (id) => {
    try {
      const response = await api.get(`/pay-periods/${id}/close-preview`);
      setPreview(response.data);
      setIsPreviewOpen(true);
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to load preview');
    }
  };

  const handleConfirmClose = async () => {
    if (!preview?.period?.id) return;
    try {
      await api.post(`/pay-periods/${preview.period.id}/close`);
      setIsPreviewOpen(false);
      setPreview(null);
      loadPayPeriods();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to close pay period');
    }
  };

  const downloadExcel = async (id, name) => {
    try {
      const response = await api.get(`/documents/pay-periods/${id}/export-excel`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payroll-${name}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to download Excel');
    }
  };

  if (loading) {
    return (
      <Layout title="Pay Periods" subtitle="Manage payroll cycles and payments">
        <div className="flex items-center justify-center h-64">
          <div className="text-stone-500">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Pay Periods" subtitle="Manage payroll cycles and payments">
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={() => setIsGenerateOpen(true)}
          className="px-4 py-2 rounded-xl font-medium text-sm themed-hover transition-colors"
          style={{ backgroundColor: 'var(--background)', color: 'var(--primary-dark)' }}
        >
          Auto-Generate Periods
        </button>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2 rounded-xl text-white font-medium text-sm hover:opacity-90 transition-colors shadow-lg flex items-center gap-2"
          style={{ backgroundColor: 'var(--primary)', boxShadow: '0 12px 20px -12px var(--menu-shadow)' }}
        >
          <Plus size={16} /> Create Period
        </button>
      </div>

      {payPeriods.length === 0 ? (
        <div className="themed-surface rounded-3xl p-12 text-center">
          <Calendar size={48} className="mx-auto mb-4 text-stone-300" />
          <h3 className="font-quicksand font-bold text-xl text-stone-800 mb-2">
            No Pay Periods Yet
          </h3>
          <p className="text-stone-500 mb-6">
            Create your first pay period to start tracking payroll
          </p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-6 py-3 text-white font-bold rounded-xl shadow-md hover:opacity-90 transition-colors"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            Create Pay Period
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {payPeriods.map((period, i) => (
            <div
              key={period.id}
              className="themed-surface p-6 rounded-3xl"
            >
              <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
                <div>
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <h3 className="font-quicksand font-bold text-xl text-stone-800">
                      {period.name || `${formatDate(period.start_date)} - ${formatDate(period.end_date)}`}
                    </h3>
                    <span
                      className="px-3 py-1 rounded-full text-xs font-bold"
                      style={getStatusStyle(period.status)}
                    >
                      {period.status}
                    </span>
                  </div>
                  <p className="text-stone-500 text-sm">
                    {formatDate(period.start_date)} - {formatDate(period.end_date)}
                  </p>
                </div>
                <div className="flex gap-2">
                  {period.status === 'OPEN' ? (
                    <button
                      onClick={() => handlePreviewClose(period.id)}
                      className="px-4 py-2 text-white font-bold text-sm rounded-xl shadow-md hover:opacity-90 transition-colors"
                      style={{ backgroundColor: 'var(--primary)' }}
                    >
                      Close Period
                    </button>
                  ) : (
                    <button
                      onClick={() => downloadExcel(period.id, period.name || `period-${period.id}`)}
                      className="px-4 py-2 font-bold text-sm rounded-xl themed-hover transition-colors flex items-center gap-2"
                      style={{ backgroundColor: 'var(--background)', color: 'var(--primary-dark)' }}
                    >
                      <Download size={16} /> Export Excel
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl" style={cardStyles[0]}>
                  <div className="flex items-center gap-2 text-sm mb-1" style={{ color: cardStyles[0].color }}>
                    <DollarSign size={16} />
                    <span>Total Amount</span>
                  </div>
                  <p className="font-bold text-lg" style={{ color: cardStyles[0].color }}>
                    ${period.total_amount ? parseFloat(period.total_amount).toFixed(2) : '0.00'}
                  </p>
                </div>

                <div className="p-4 rounded-xl" style={cardStyles[1]}>
                  <div className="flex items-center gap-2 text-sm mb-1" style={{ color: cardStyles[1].color }}>
                    <Users size={16} />
                    <span>Employees</span>
                  </div>
                  <p className="font-bold text-lg" style={{ color: cardStyles[1].color }}>
                    {period.employee_count || 0}
                  </p>
                </div>

                <div className="p-4 rounded-xl" style={cardStyles[2]}>
                  <div className="flex items-center gap-2 text-sm mb-1" style={{ color: cardStyles[2].color }}>
                    <Clock size={16} />
                    <span>Total Hours</span>
                  </div>
                  <p className="font-bold text-lg" style={{ color: cardStyles[2].color }}>
                    {period.total_hours ? parseFloat(period.total_hours).toFixed(1) : '0.0'}
                  </p>
                </div>

                <div className="p-4 rounded-xl" style={cardStyles[3]}>
                  <div className="flex items-center gap-2 text-sm mb-1" style={{ color: cardStyles[3].color }}>
                    <CheckCircle size={16} />
                    <span>Approved Entries</span>
                  </div>
                  <p className="font-bold text-lg" style={{ color: cardStyles[3].color }}>
                    {period.approved_entries || 0}
                  </p>
                </div>
              </div>

              {period.notes && (
                <div
                  className="mt-4 p-4 rounded-xl border themed-border"
                  style={{ backgroundColor: 'var(--background)' }}
                >
                  <p className="text-sm text-stone-600">{period.notes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <BaseModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Pay Period"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., March 2024"
              className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Start Date *
            </label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              End Date *
            </label>
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
              required
            />
          </div>
          <div className="flex gap-3 pt-4 border-t themed-border">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="flex-1 px-6 py-3 rounded-2xl border themed-border text-stone-600 font-bold themed-hover transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 rounded-2xl text-white font-bold shadow-lg hover:opacity-90 transition-all"
              style={{ backgroundColor: 'var(--primary)', boxShadow: '0 12px 20px -12px var(--menu-shadow)' }}
            >
              Create
            </button>
          </div>
        </form>
      </BaseModal>

      <BaseModal
        isOpen={isGenerateOpen}
        onClose={() => setIsGenerateOpen(false)}
        title="Auto-Generate Pay Periods"
      >
        <form onSubmit={handleGenerate} className="space-y-4">
          <p className="text-sm text-stone-500">
            This will generate the next 6 months of pay periods based on the frequency you select.
          </p>
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Frequency *
            </label>
            <select
              value={generateData.frequency}
              onChange={(e) => setGenerateData({ ...generateData, frequency: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
              required
            >
              <option value="BI_WEEKLY">Bi-Weekly (Every 2 weeks)</option>
              <option value="MONTHLY">Monthly</option>
              <option value="SEMI_MONTHLY">Semi-Monthly (1st-15th, 16th-end)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Start Date *
            </label>
            <input
              type="date"
              value={generateData.startDate}
              onChange={(e) => setGenerateData({ ...generateData, startDate: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
              required
            />
          </div>
          <div className="flex gap-3 pt-4 border-t themed-border">
            <button
              type="button"
              onClick={() => setIsGenerateOpen(false)}
              className="flex-1 px-6 py-3 rounded-2xl border themed-border text-stone-600 font-bold themed-hover transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 rounded-2xl text-white font-bold shadow-lg hover:opacity-90 transition-all"
              style={{ backgroundColor: 'var(--primary)', boxShadow: '0 12px 20px -12px var(--menu-shadow)' }}
            >
              Generate
            </button>
          </div>
        </form>
      </BaseModal>

      <BaseModal
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          setPreview(null);
        }}
        title="Close Pay Period Preview"
        maxWidth="max-w-4xl"
      >
        {preview ? (
          <div className="space-y-6">
            <div>
              <p className="text-stone-600">
                <span className="font-bold text-stone-800">{preview.period.name}</span> ({formatDate(preview.period.start_date)} - {formatDate(preview.period.end_date)})
              </p>
              <p className="text-sm text-stone-500">Total Employees: {preview.total_count}</p>
            </div>

            {preview.hourly_employees?.length > 0 && (
              <div>
                <h4 className="font-bold text-stone-700 mb-2">Hourly Employees</h4>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead style={{ backgroundColor: 'var(--background)' }}>
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Name</th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Hours</th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Rate</th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Gross</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y themed-border">
                      {preview.hourly_employees.map((emp) => (
                        <tr key={emp.id} className="themed-row">
                          <td className="px-4 py-2 text-sm text-stone-700">{emp.first_name} {emp.last_name}</td>
                          <td className="px-4 py-2 text-sm text-stone-600">{parseFloat(emp.total_hours || 0).toFixed(2)}</td>
                          <td className="px-4 py-2 text-sm text-stone-600">${parseFloat(emp.hourly_rate || 0).toFixed(2)}/hr</td>
                          <td className="px-4 py-2 text-sm text-stone-700">${parseFloat(emp.gross_amount || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {preview.salaried_employees?.length > 0 && (
              <div>
                <h4 className="font-bold text-stone-700 mb-2">Salaried Employees</h4>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead style={{ backgroundColor: 'var(--background)' }}>
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Name</th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Gross</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y themed-border">
                      {preview.salaried_employees.map((emp) => (
                        <tr key={emp.id} className="themed-row">
                          <td className="px-4 py-2 text-sm text-stone-700">{emp.first_name} {emp.last_name}</td>
                          <td className="px-4 py-2 text-sm text-stone-700">${parseFloat(emp.gross_amount || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t themed-border">
              <button
                type="button"
                onClick={() => {
                  setIsPreviewOpen(false);
                  setPreview(null);
                }}
                className="flex-1 px-6 py-3 rounded-2xl border themed-border text-stone-600 font-bold themed-hover transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClose}
                className="flex-1 px-6 py-3 rounded-2xl bg-red-500 text-white font-bold shadow-lg shadow-red-500/30 hover:bg-red-600 transition-all"
              >
                Confirm & Close Period
              </button>
            </div>
          </div>
        ) : (
          <div className="text-stone-500">Loading preview...</div>
        )}
      </BaseModal>
    </Layout>
  );
}

