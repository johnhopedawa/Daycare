import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Layout } from '../components/Layout';
import { Calendar, Check, CheckCircle, ChevronDown, Clock, DollarSign, Download, Eye, FileText, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { BaseModal } from '../components/modals/BaseModal';
import { DatePickerModal } from '../components/modals/DatePickerModal';
import api from '../utils/api';

const FREQUENCY_OPTIONS = [
  { value: 'BI_WEEKLY', label: 'Bi-Weekly (Every 2 weeks)' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'SEMI_MONTHLY', label: 'Semi-Monthly (1st-15th, 16th-end)' },
];

export function PayPeriodsPage() {
  const [payPeriods, setPayPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFrequencyMenuOpen, setIsFrequencyMenuOpen] = useState(false);
  const [datePickerState, setDatePickerState] = useState({ isOpen: false, scope: 'create', field: 'startDate' });
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [summaryPreviewPeriod, setSummaryPreviewPeriod] = useState(null);
  const [summaryPreviewPayouts, setSummaryPreviewPayouts] = useState([]);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [isDownloadingSummaryPdf, setIsDownloadingSummaryPdf] = useState(false);
  const [isPaystubsOpen, setIsPaystubsOpen] = useState(false);
  const [selectedPayPeriod, setSelectedPayPeriod] = useState(null);
  const [paystubPayouts, setPaystubPayouts] = useState([]);
  const [isPaystubsLoading, setIsPaystubsLoading] = useState(false);
  const [paystubActionId, setPaystubActionId] = useState(null);
  const [isPaystubPreviewOpen, setIsPaystubPreviewOpen] = useState(false);
  const [isPaystubPreviewLoading, setIsPaystubPreviewLoading] = useState(false);
  const [isDownloadingPaystubPdf, setIsDownloadingPaystubPdf] = useState(false);
  const [paystubPreview, setPaystubPreview] = useState(null);
  const [isEditPayoutOpen, setIsEditPayoutOpen] = useState(false);
  const [editingPayout, setEditingPayout] = useState(null);
  const [editPayoutForm, setEditPayoutForm] = useState({ totalHours: '' });
  const [isSavingPayout, setIsSavingPayout] = useState(false);
  const [preview, setPreview] = useState(null);
  const [formData, setFormData] = useState({ name: '', startDate: '', endDate: '', payDate: '' });
  const [generateData, setGenerateData] = useState({ frequency: 'BI_WEEKLY', startDate: '' });
  const frequencyMenuRef = useRef(null);

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

  useEffect(() => {
    if (!isFrequencyMenuOpen) return undefined;

    const handlePointerDown = (event) => {
      if (frequencyMenuRef.current && !frequencyMenuRef.current.contains(event.target)) {
        setIsFrequencyMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsFrequencyMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isFrequencyMenuOpen]);

  useEffect(() => {
    if (!isGenerateOpen) {
      setIsFrequencyMenuOpen(false);
    }
  }, [isGenerateOpen]);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const parseDateInput = (value) => {
    if (!value) return null;
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  };

  const formatDateInput = (value) => {
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) return '';
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDateLabel = (value, fallback) => {
    if (!value) return fallback;
    return formatDate(value);
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
  const formatCurrency = (value) => `$${parseFloat(value || 0).toFixed(2)}`;
  const formatHours = (value) => parseFloat(value || 0).toFixed(2);
  const safeNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const roundCurrency = (value) => Math.round((safeNumber(value) + Number.EPSILON) * 100) / 100;
  const getPaymentTypeLabel = (paymentType) => (paymentType === 'SALARY' ? 'Salary' : 'Hourly');
  const getCompensationLabel = (payout) => (
    payout?.payment_type === 'SALARY'
      ? `${formatCurrency(payout.profile_salary_amount)} per pay period`
      : `${formatCurrency(payout.profile_hourly_rate || payout.hourly_rate)}/hr`
  );
  const calculatePayoutPreview = (payout, totalHoursInput) => {
    const paymentType = payout?.payment_type === 'SALARY' ? 'SALARY' : 'HOURLY';
    const totalHours = safeNumber(totalHoursInput, 0);
    const deductions = roundCurrency(payout?.deductions);

    if (paymentType === 'SALARY') {
      const grossAmount = roundCurrency(payout?.profile_salary_amount ?? payout?.gross_amount);
      return {
        paymentType,
        totalHours,
        hourlyRate: 0,
        grossAmount,
        deductions,
        netAmount: roundCurrency(grossAmount - deductions),
      };
    }

    const hourlyRate = roundCurrency(payout?.profile_hourly_rate ?? payout?.hourly_rate);
    const grossAmount = roundCurrency(totalHours * hourlyRate);
    return {
      paymentType,
      totalHours,
      hourlyRate,
      grossAmount,
      deductions,
      netAmount: roundCurrency(grossAmount - deductions),
    };
  };
  const selectedFrequencyLabel = FREQUENCY_OPTIONS.find(
    (option) => option.value === generateData.frequency
  )?.label || 'Select frequency';
  const summaryTotals = summaryPreviewPayouts.reduce((totals, payout) => ({
    totalHours: totals.totalHours + parseFloat(payout.total_hours || 0),
    grossAmount: totals.grossAmount + parseFloat(payout.gross_amount || 0),
    deductions: totals.deductions + parseFloat(payout.deductions || 0),
    netAmount: totals.netAmount + parseFloat(payout.net_amount || 0),
  }), {
    totalHours: 0,
    grossAmount: 0,
    deductions: 0,
    netAmount: 0,
  });
  const editedPayoutPreview = editingPayout
    ? calculatePayoutPreview(editingPayout, editPayoutForm.totalHours)
    : null;

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/pay-periods', formData);
      setIsCreateOpen(false);
      setFormData({ name: '', startDate: '', endDate: '', payDate: '' });
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
      setIsFrequencyMenuOpen(false);
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

  const openDeleteModal = (period) => {
    setDeleteTarget(period);
    setIsDeleteOpen(true);
  };

  const openDatePicker = (scope, field) => {
    setDatePickerState({ isOpen: true, scope, field });
  };

  const closeDatePicker = () => {
    setDatePickerState((current) => ({ ...current, isOpen: false }));
  };

  const handleDateConfirm = (date) => {
    const nextValue = formatDateInput(date);

    if (datePickerState.scope === 'create') {
      setFormData((current) => ({ ...current, [datePickerState.field]: nextValue }));
    } else {
      setGenerateData((current) => ({ ...current, [datePickerState.field]: nextValue }));
    }

    closeDatePicker();
  };

  const handleDateClear = () => {
    if (datePickerState.scope === 'create') {
      setFormData((current) => ({ ...current, [datePickerState.field]: '' }));
    } else {
      setGenerateData((current) => ({ ...current, [datePickerState.field]: '' }));
    }

    closeDatePicker();
  };

  const getDateFieldConfig = () => {
    if (datePickerState.scope === 'create') {
      switch (datePickerState.field) {
        case 'startDate':
          return {
            value: formData.startDate,
            title: 'Select Start Date',
            subtitle: 'Choose the first date included in this pay period.',
            confirmLabel: 'Save start date',
          };
        case 'endDate':
          return {
            value: formData.endDate,
            title: 'Select End Date',
            subtitle: 'Choose the last working date included in this pay period.',
            confirmLabel: 'Save end date',
          };
        case 'payDate':
          return {
            value: formData.payDate,
            title: 'Select Pay Date',
            subtitle: 'Choose when employees are paid for this period.',
            confirmLabel: 'Save pay date',
          };
        default:
          break;
      }
    }

    return {
      value: generateData.startDate,
      title: 'Select Generation Start Date',
      subtitle: 'Choose the first date used when generating upcoming pay periods.',
      confirmLabel: 'Save start date',
    };
  };

  const currentDateField = getDateFieldConfig();

  const closeDeleteModal = () => {
    if (isDeleting) return;
    setIsDeleteOpen(false);
    setDeleteTarget(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;

    try {
      setIsDeleting(true);
      await api.delete(`/pay-periods/${deleteTarget.id}`);
      setIsDeleteOpen(false);
      setDeleteTarget(null);
      await loadPayPeriods();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete pay period');
    } finally {
      setIsDeleting(false);
    }
  };

  const downloadBlob = async (endpoint, filename, errorMessage, setLoading) => {
    try {
      if (setLoading) {
        setLoading(true);
      }
      const response = await api.get(endpoint, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert(error.response?.data?.error || errorMessage);
    } finally {
      if (setLoading) {
        setLoading(false);
      }
    }
  };

  const closeSummaryModal = () => {
    setIsSummaryOpen(false);
    setSummaryPreviewPeriod(null);
    setSummaryPreviewPayouts([]);
  };

  const handleOpenPayrollSummary = async (period) => {
    try {
      setSummaryPreviewPeriod(period);
      setIsSummaryOpen(true);
      setIsSummaryLoading(true);
      const response = await api.get(`/pay-periods/${period.id}/payouts`);
      setSummaryPreviewPayouts(response.data.payouts || []);
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to open payroll summary');
      setIsSummaryOpen(false);
      setSummaryPreviewPeriod(null);
    } finally {
      setIsSummaryLoading(false);
    }
  };

  const handleDownloadPayrollSummaryPdf = async () => {
    if (!summaryPreviewPeriod) return;
    await downloadBlob(
      `/documents/pay-periods/${summaryPreviewPeriod.id}/export-pdf`,
      `payroll-${summaryPreviewPeriod.name || `period-${summaryPreviewPeriod.id}`}.pdf`,
      'Failed to download payroll PDF',
      setIsDownloadingSummaryPdf
    );
  };

  const closePaystubsModal = () => {
    if (paystubActionId || isSavingPayout) return;
    setIsPaystubsOpen(false);
    setSelectedPayPeriod(null);
    setPaystubPayouts([]);
  };

  const refreshSelectedPayPeriodPayouts = useCallback(async (periodId) => {
    const response = await api.get(`/pay-periods/${periodId}/payouts`);
    return response.data.payouts || [];
  }, []);

  const handleOpenPaystubs = async (period) => {
    try {
      setSelectedPayPeriod(period);
      setIsPaystubsOpen(true);
      setIsPaystubsLoading(true);
      const payouts = await refreshSelectedPayPeriodPayouts(period.id);
      setPaystubPayouts(payouts);
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to load paystubs for this pay period');
      setIsPaystubsOpen(false);
      setSelectedPayPeriod(null);
    } finally {
      setIsPaystubsLoading(false);
    }
  };

  const handleOpenPaystub = async (payout) => {
    try {
      setPaystubActionId(payout.id);
      setIsPaystubPreviewLoading(true);
      let paystubId = payout.paystub_id;
      let stubNumber = payout.stub_number;

      if (!paystubId) {
        const response = await api.post(`/documents/payouts/${payout.id}/generate-paystub`);
        paystubId = response.data.paystubId;
        stubNumber = response.data.stubNumber;
        setPaystubPayouts((current) => current.map((item) => (
          item.id === payout.id
            ? { ...item, paystub_id: paystubId, stub_number: stubNumber }
            : item
        )));
      }

      const detailResponse = await api.get(`/documents/paystubs/${paystubId}/details`);
      setPaystubPreview({
        ...detailResponse.data,
        paystubId,
        stubNumber: stubNumber || detailResponse.data.paystub?.stub_number,
      });
      setIsPaystubsOpen(false);
      setIsPaystubPreviewOpen(true);
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to open paystub');
    } finally {
      setIsPaystubPreviewLoading(false);
      setPaystubActionId(null);
    }
  };

  const closePaystubPreview = () => {
    if (isSavingPayout) return;
    setIsPaystubPreviewOpen(false);
    setPaystubPreview(null);
  };

  const handleDownloadPaystubPdf = async () => {
    if (!paystubPreview?.paystubId) return;
    await downloadBlob(
      `/documents/paystubs/${paystubPreview.paystubId}/pdf`,
      `paystub-${paystubPreview.stubNumber}.pdf`,
      'Failed to download paystub PDF',
      setIsDownloadingPaystubPdf
    );
  };

  const openEditPayout = (payout) => {
    setEditingPayout(payout);
    setEditPayoutForm({ totalHours: formatHours(payout.total_hours) });
    setIsEditPayoutOpen(true);
  };

  const closeEditPayout = () => {
    if (isSavingPayout) return;
    setIsEditPayoutOpen(false);
    setEditingPayout(null);
    setEditPayoutForm({ totalHours: '' });
  };

  const handleSavePayout = async (e) => {
    e.preventDefault();
    if (!editingPayout?.id || !selectedPayPeriod?.id) return;

    try {
      setIsSavingPayout(true);
      const response = await api.patch(`/pay-periods/payouts/${editingPayout.id}`, {
        totalHours: editPayoutForm.totalHours,
      });

      const updatedPayout = response.data.payout;
      setPaystubPayouts((current) => current.map((item) => (
        item.id === updatedPayout.id ? { ...item, ...updatedPayout } : item
      )));
      setSummaryPreviewPayouts((current) => current.map((item) => (
        item.id === updatedPayout.id ? { ...item, ...updatedPayout } : item
      )));

      if (paystubPreview?.paystub?.payout_id === updatedPayout.id && paystubPreview.paystubId) {
        const detailResponse = await api.get(`/documents/paystubs/${paystubPreview.paystubId}/details`);
        setPaystubPreview((current) => ({
          ...detailResponse.data,
          paystubId: current?.paystubId || detailResponse.data.paystub?.id,
          stubNumber: current?.stubNumber || detailResponse.data.paystub?.stub_number,
        }));
      }

      closeEditPayout();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to update payout');
    } finally {
      setIsSavingPayout(false);
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
                  <p className="text-stone-500 text-sm">
                    Pay date: {formatDate(period.pay_date)}
                  </p>
                </div>
                <div className="flex gap-2">
                  {period.status === 'OPEN' && (
                    <>
                      <button
                        onClick={() => openDeleteModal(period)}
                        className="px-4 py-2 font-bold text-sm rounded-xl transition-colors flex items-center gap-2"
                        style={{ backgroundColor: '#FFF1ED', color: '#C2410C' }}
                      >
                        <Trash2 size={16} /> Delete
                      </button>
                      <button
                        onClick={() => handlePreviewClose(period.id)}
                        className="px-4 py-2 text-white font-bold text-sm rounded-xl shadow-md hover:opacity-90 transition-colors"
                        style={{ backgroundColor: 'var(--primary)' }}
                      >
                        Close Period
                      </button>
                    </>
                  )}
                  {period.status === 'CLOSED' && (
                    <>
                      <button
                        onClick={() => handleOpenPayrollSummary(period)}
                        disabled={isSummaryLoading && summaryPreviewPeriod?.id === period.id}
                        className="px-4 py-2 font-bold text-sm rounded-xl themed-hover transition-colors flex items-center gap-2 disabled:opacity-60"
                        style={{ backgroundColor: 'var(--background)', color: 'var(--primary-dark)' }}
                      >
                        <Eye size={16} /> Open
                      </button>
                      <button
                        onClick={() => handleOpenPaystubs(period)}
                        disabled={isPaystubsLoading && selectedPayPeriod?.id === period.id}
                        className="px-4 py-2 font-bold text-sm rounded-xl themed-hover transition-colors flex items-center gap-2 disabled:opacity-60"
                        style={{ backgroundColor: '#FFF8F3', color: 'var(--primary-dark)' }}
                      >
                        <FileText size={16} /> Paystubs
                      </button>
                    </>
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
                    <span>{period.status === 'OPEN' ? 'Scheduled Shifts' : 'Approved Entries'}</span>
                  </div>
                  <p className="font-bold text-lg" style={{ color: cardStyles[3].color }}>
                    {period.status === 'OPEN' ? (period.scheduled_shifts || 0) : (period.approved_entries || 0)}
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
            <button
              type="button"
              onClick={() => openDatePicker('create', 'startDate')}
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
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              End Date *
            </label>
            <button
              type="button"
              onClick={() => openDatePicker('create', 'endDate')}
              className="w-full flex items-center justify-between gap-3 pl-4 pr-3 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white hover:border-[#FF9B85]"
            >
              <span className="flex items-center gap-3">
                <Calendar size={18} className="text-stone-400" />
                <span className={formData.endDate ? 'text-stone-800' : 'text-stone-400'}>
                  {formatDateLabel(formData.endDate, 'Select end date')}
                </span>
              </span>
              <ChevronDown size={16} className="text-stone-400" />
            </button>
          </div>
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Pay Date *
            </label>
            <button
              type="button"
              onClick={() => openDatePicker('create', 'payDate')}
              className="w-full flex items-center justify-between gap-3 pl-4 pr-3 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white hover:border-[#FF9B85]"
            >
              <span className="flex items-center gap-3">
                <Calendar size={18} className="text-stone-400" />
                <span className={formData.payDate ? 'text-stone-800' : 'text-stone-400'}>
                  {formatDateLabel(formData.payDate, 'Select pay date')}
                </span>
              </span>
              <ChevronDown size={16} className="text-stone-400" />
            </button>
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
        onClose={() => {
          setIsGenerateOpen(false);
          setIsFrequencyMenuOpen(false);
        }}
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
            <div ref={frequencyMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setIsFrequencyMenuOpen((prev) => !prev)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white text-sm text-left text-stone-700"
                aria-haspopup="listbox"
                aria-expanded={isFrequencyMenuOpen}
              >
                <span>{selectedFrequencyLabel}</span>
                <ChevronDown
                  size={16}
                  className={`text-stone-400 transition-transform ${isFrequencyMenuOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {isFrequencyMenuOpen && (
                <div className="absolute z-30 mt-2 w-full rounded-2xl border border-[#FFE5D9] bg-white shadow-lg shadow-[#FF9B85]/10">
                  <div className="max-h-56 overflow-y-auto p-2 space-y-1" role="listbox">
                    {FREQUENCY_OPTIONS.map((option) => {
                      const isSelected = generateData.frequency === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setGenerateData((prev) => ({ ...prev, frequency: option.value }));
                            setIsFrequencyMenuOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center justify-between gap-2 ${
                            isSelected ? 'bg-[#FF9B85] text-white' : 'text-stone-700 hover:bg-[#FFF8F3]'
                          }`}
                          role="option"
                          aria-selected={isSelected}
                        >
                          <span>{option.label}</span>
                          {isSelected && <Check size={16} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Start Date *
            </label>
            <button
              type="button"
              onClick={() => openDatePicker('generate', 'startDate')}
              className="w-full flex items-center justify-between gap-3 pl-4 pr-3 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white hover:border-[#FF9B85]"
            >
              <span className="flex items-center gap-3">
                <Calendar size={18} className="text-stone-400" />
                <span className={generateData.startDate ? 'text-stone-800' : 'text-stone-400'}>
                  {formatDateLabel(generateData.startDate, 'Select generation start date')}
                </span>
              </span>
              <ChevronDown size={16} className="text-stone-400" />
            </button>
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
              <p className="text-sm text-stone-500">Pay Date: {formatDate(preview.period.pay_date)}</p>
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

      <BaseModal
        isOpen={isPaystubsOpen}
        onClose={closePaystubsModal}
        title={selectedPayPeriod ? `Paystubs for ${selectedPayPeriod.name || `Period ${selectedPayPeriod.id}`}` : 'Paystubs'}
        maxWidth="max-w-5xl"
      >
        {selectedPayPeriod ? (
          <div className="space-y-5">
            <div>
              <p className="text-stone-600">
                {formatDate(selectedPayPeriod.start_date)} - {formatDate(selectedPayPeriod.end_date)}
              </p>
              <p className="text-sm text-stone-500">
                Pay Date: {formatDate(selectedPayPeriod.pay_date)}
              </p>
            </div>

            {isPaystubsLoading ? (
              <div className="rounded-2xl border themed-border px-4 py-8 text-center text-stone-500">
                Loading paystubs...
              </div>
            ) : paystubPayouts.length === 0 ? (
              <div className="rounded-2xl border themed-border px-4 py-8 text-center text-stone-500">
                No employee payouts exist for this pay period yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead style={{ backgroundColor: 'var(--background)' }}>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Employee</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Hours</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Compensation</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Net Pay</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Paystub</th>
                      <th className="px-4 py-2 text-right text-xs font-bold text-stone-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y themed-border">
                    {paystubPayouts.map((payout) => (
                      <tr key={payout.id} className="themed-row">
                        <td className="px-4 py-3 text-sm text-stone-700">
                          {payout.first_name} {payout.last_name}
                        </td>
                        <td className="px-4 py-3 text-sm text-stone-600">
                          {parseFloat(payout.total_hours || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-stone-600">
                          {getCompensationLabel(payout)}
                        </td>
                        <td className="px-4 py-3 text-sm text-stone-700">
                          {formatCurrency(payout.net_amount)}
                        </td>
                        <td className="px-4 py-3 text-sm text-stone-600">
                          {payout.stub_number || 'Not generated'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEditPayout(payout)}
                              disabled={paystubActionId === payout.id || isPaystubPreviewLoading || isSavingPayout}
                              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold themed-hover transition-colors disabled:opacity-60"
                              style={{ backgroundColor: 'var(--background)', color: 'var(--primary-dark)' }}
                            >
                              <Pencil size={16} />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenPaystub(payout)}
                              disabled={paystubActionId === payout.id || isPaystubPreviewLoading || isSavingPayout}
                              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white shadow-md hover:opacity-90 disabled:opacity-60"
                              style={{ backgroundColor: 'var(--primary)' }}
                            >
                              <Eye size={16} />
                              {paystubActionId === payout.id ? 'Opening...' : (payout.paystub_id ? 'Open' : 'Create & Open')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t themed-border">
              <button
                type="button"
                onClick={closePaystubsModal}
                disabled={!!paystubActionId}
                className="px-6 py-3 rounded-2xl border themed-border text-stone-600 font-bold themed-hover transition-colors disabled:opacity-60"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <div className="text-stone-500">Loading...</div>
        )}
      </BaseModal>

      <BaseModal
        isOpen={isSummaryOpen}
        onClose={closeSummaryModal}
        title={summaryPreviewPeriod ? `${summaryPreviewPeriod.name || `Pay Period ${summaryPreviewPeriod.id}`} Summary` : 'Payroll Summary'}
        maxWidth="max-w-6xl"
      >
        {summaryPreviewPeriod ? (
          <div className="space-y-6">
            <div className="flex flex-wrap justify-between gap-4">
              <div>
                <p className="text-stone-700 font-bold">
                  {formatDate(summaryPreviewPeriod.start_date)} - {formatDate(summaryPreviewPeriod.end_date)}
                </p>
                <p className="text-sm text-stone-500">Pay Date: {formatDate(summaryPreviewPeriod.pay_date)}</p>
              </div>
              <button
                type="button"
                onClick={handleDownloadPayrollSummaryPdf}
                disabled={isDownloadingSummaryPdf}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold themed-hover transition-colors disabled:opacity-60"
                style={{ backgroundColor: 'var(--background)', color: 'var(--primary-dark)' }}
              >
                <Download size={16} /> {isDownloadingSummaryPdf ? 'Downloading...' : 'Download PDF'}
              </button>
            </div>

            {isSummaryLoading ? (
              <div className="rounded-2xl border themed-border px-4 py-8 text-center text-stone-500">
                Loading payroll summary...
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl" style={cardStyles[0]}>
                    <div className="flex items-center gap-2 text-sm mb-1" style={{ color: cardStyles[0].color }}>
                      <Users size={16} />
                      <span>Employees</span>
                    </div>
                    <p className="font-bold text-lg" style={{ color: cardStyles[0].color }}>
                      {summaryPreviewPayouts.length}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl" style={cardStyles[1]}>
                    <div className="flex items-center gap-2 text-sm mb-1" style={{ color: cardStyles[1].color }}>
                      <Clock size={16} />
                      <span>Total Hours</span>
                    </div>
                    <p className="font-bold text-lg" style={{ color: cardStyles[1].color }}>
                      {formatHours(summaryTotals.totalHours)}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl" style={cardStyles[2]}>
                    <div className="flex items-center gap-2 text-sm mb-1" style={{ color: cardStyles[2].color }}>
                      <DollarSign size={16} />
                      <span>Gross Payroll</span>
                    </div>
                    <p className="font-bold text-lg" style={{ color: cardStyles[2].color }}>
                      {formatCurrency(summaryTotals.grossAmount)}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl" style={cardStyles[3]}>
                    <div className="flex items-center gap-2 text-sm mb-1" style={{ color: cardStyles[3].color }}>
                      <FileText size={16} />
                      <span>Net Payroll</span>
                    </div>
                    <p className="font-bold text-lg" style={{ color: cardStyles[3].color }}>
                      {formatCurrency(summaryTotals.netAmount)}
                    </p>
                  </div>
                </div>

                {summaryPreviewPayouts.length === 0 ? (
                  <div className="rounded-2xl border themed-border px-4 py-8 text-center text-stone-500">
                    No payouts were found for this pay period yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead style={{ backgroundColor: 'var(--background)' }}>
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Employee</th>
                          <th className="px-4 py-2 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Hours</th>
                          <th className="px-4 py-2 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Rate</th>
                          <th className="px-4 py-2 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Gross</th>
                          <th className="px-4 py-2 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Deductions</th>
                          <th className="px-4 py-2 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Net</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y themed-border">
                        {summaryPreviewPayouts.map((payout) => (
                          <tr key={payout.id} className="themed-row">
                            <td className="px-4 py-3 text-sm text-stone-700">{payout.first_name} {payout.last_name}</td>
                            <td className="px-4 py-3 text-sm text-stone-600">{formatHours(payout.total_hours)}</td>
                            <td className="px-4 py-3 text-sm text-stone-600">
                              {getCompensationLabel(payout)}
                            </td>
                            <td className="px-4 py-3 text-sm text-stone-700">{formatCurrency(payout.gross_amount)}</td>
                            <td className="px-4 py-3 text-sm text-stone-600">{formatCurrency(payout.deductions)}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-stone-700">{formatCurrency(payout.net_amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border themed-border px-4 py-8 text-center text-stone-500">
            Loading payroll summary...
          </div>
        )}
      </BaseModal>

      <BaseModal
        isOpen={isPaystubPreviewOpen}
        onClose={closePaystubPreview}
        title={paystubPreview ? `${paystubPreview.user.first_name} ${paystubPreview.user.last_name} Paystub` : 'Paystub Preview'}
        maxWidth="max-w-5xl"
      >
        {paystubPreview ? (
          <div className="space-y-6">
            <div className="flex flex-wrap justify-between gap-4">
              <div>
                <p className="font-bold text-stone-800">{paystubPreview.payPeriod.name}</p>
                <p className="text-sm text-stone-500">
                  {formatDate(paystubPreview.payPeriod.start_date)} - {formatDate(paystubPreview.payPeriod.end_date)}
                </p>
                <p className="text-sm text-stone-500">Pay Date: {formatDate(paystubPreview.payPeriod.pay_date)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-stone-700">Stub #{paystubPreview.paystub.stub_number}</p>
                <div className="mt-3 inline-flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditPayout({
                      ...paystubPreview.payout,
                      first_name: paystubPreview.user.first_name,
                      last_name: paystubPreview.user.last_name,
                      email: paystubPreview.user.email,
                      payment_type: paystubPreview.user.payment_type,
                      profile_hourly_rate: paystubPreview.user.profile_hourly_rate,
                      profile_salary_amount: paystubPreview.user.salary_amount,
                      employment_type: paystubPreview.user.employment_type,
                      paystub_id: paystubPreview.paystubId,
                      stub_number: paystubPreview.stubNumber,
                    })}
                    disabled={isSavingPayout}
                    className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold themed-hover transition-colors disabled:opacity-60"
                    style={{ backgroundColor: '#FFF8F3', color: 'var(--primary-dark)' }}
                  >
                    <Pencil size={16} /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadPaystubPdf}
                    disabled={isDownloadingPaystubPdf || isSavingPayout}
                    className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold themed-hover transition-colors disabled:opacity-60"
                    style={{ backgroundColor: 'var(--background)', color: 'var(--primary-dark)' }}
                  >
                    <Download size={16} /> {isDownloadingPaystubPdf ? 'Downloading...' : 'Download PDF'}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl" style={cardStyles[0]}>
                <div className="text-sm mb-1" style={{ color: cardStyles[0].color }}>Hours</div>
                <p className="font-bold text-lg" style={{ color: cardStyles[0].color }}>{formatHours(paystubPreview.payout.total_hours)}</p>
              </div>
              <div className="p-4 rounded-xl" style={cardStyles[1]}>
                <div className="text-sm mb-1" style={{ color: cardStyles[1].color }}>Rate</div>
                <p className="font-bold text-lg" style={{ color: cardStyles[1].color }}>
                  {getCompensationLabel({
                    payment_type: paystubPreview.user.payment_type,
                    profile_hourly_rate: paystubPreview.user.profile_hourly_rate,
                    profile_salary_amount: paystubPreview.user.salary_amount,
                    hourly_rate: paystubPreview.payout.hourly_rate,
                  })}
                </p>
              </div>
              <div className="p-4 rounded-xl" style={cardStyles[2]}>
                <div className="text-sm mb-1" style={{ color: cardStyles[2].color }}>Gross Pay</div>
                <p className="font-bold text-lg" style={{ color: cardStyles[2].color }}>{formatCurrency(paystubPreview.payout.gross_amount)}</p>
              </div>
              <div className="p-4 rounded-xl" style={cardStyles[3]}>
                <div className="text-sm mb-1" style={{ color: cardStyles[3].color }}>Net Pay</div>
                <p className="font-bold text-lg" style={{ color: cardStyles[3].color }}>{formatCurrency(paystubPreview.payout.net_amount)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border themed-border p-4" style={{ backgroundColor: 'var(--background)' }}>
                <h4 className="font-bold text-stone-800 mb-3">Employee</h4>
                <div className="space-y-1 text-sm text-stone-600">
                  <p>{paystubPreview.user.first_name} {paystubPreview.user.last_name}</p>
                  <p>{paystubPreview.user.email}</p>
                  <p>{getPaymentTypeLabel(paystubPreview.user.payment_type)} compensation</p>
                  <p>{paystubPreview.user.employment_type || 'Employment type not set'}</p>
                </div>
              </div>
              <div className="rounded-2xl border themed-border p-4" style={{ backgroundColor: 'var(--background)' }}>
                <h4 className="font-bold text-stone-800 mb-3">Year To Date</h4>
                <div className="grid grid-cols-2 gap-3 text-sm text-stone-600">
                  <p>Gross: {formatCurrency(paystubPreview.user.ytd_gross)}</p>
                  <p>Hours: {formatHours(paystubPreview.user.ytd_hours)}</p>
                  <p>CPP: {formatCurrency(paystubPreview.user.ytd_cpp)}</p>
                  <p>EI: {formatCurrency(paystubPreview.user.ytd_ei)}</p>
                  <p>Tax: {formatCurrency(paystubPreview.user.ytd_tax)}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border themed-border p-4" style={{ backgroundColor: 'var(--background)' }}>
              <h4 className="font-bold text-stone-800 mb-3">Balances</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm text-stone-600">
                <p>Vacation Annual: {formatHours(paystubPreview.user.annual_vacation_days)}</p>
                <p>Vacation Remaining: {formatHours(paystubPreview.user.vacation_days_remaining)}</p>
                <p>Sick Annual: {formatHours(paystubPreview.user.annual_sick_days)}</p>
                <p>Sick Remaining: {formatHours(paystubPreview.user.sick_days_remaining)}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border themed-border px-4 py-8 text-center text-stone-500">
            Loading paystub preview...
          </div>
        )}
      </BaseModal>

      <BaseModal
        isOpen={isEditPayoutOpen}
        onClose={closeEditPayout}
        title={editingPayout ? `Edit ${editingPayout.first_name} ${editingPayout.last_name} Payout` : 'Edit Payout'}
        maxWidth="max-w-3xl"
      >
        {editingPayout && editedPayoutPreview ? (
          <form onSubmit={handleSavePayout} className="space-y-6">
            <div className="rounded-2xl border themed-border p-4" style={{ backgroundColor: 'var(--background)' }}>
              <p className="font-bold text-stone-800">{editingPayout.first_name} {editingPayout.last_name}</p>
              <p className="text-sm text-stone-600">{editingPayout.email}</p>
              <p className="mt-2 text-sm text-stone-500">
                Monetary values are recalculated from the educator profile compensation settings.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                  Total Hours
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editPayoutForm.totalHours}
                  onChange={(event) => setEditPayoutForm({ totalHours: event.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
                  required
                />
              </div>
              <div className="rounded-2xl border themed-border p-4" style={{ backgroundColor: 'var(--background)' }}>
                <p className="text-sm font-bold text-stone-700">Compensation Source</p>
                <p className="mt-2 text-sm text-stone-600">{getPaymentTypeLabel(editingPayout.payment_type)}</p>
                <p className="text-sm text-stone-600">{getCompensationLabel(editingPayout)}</p>
                <p className="text-sm text-stone-500">
                  {editingPayout.employment_type || 'Employment type not set'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl" style={cardStyles[0]}>
                <div className="text-sm mb-1" style={{ color: cardStyles[0].color }}>Hours</div>
                <p className="font-bold text-lg" style={{ color: cardStyles[0].color }}>
                  {formatHours(editedPayoutPreview.totalHours)}
                </p>
              </div>
              <div className="p-4 rounded-xl" style={cardStyles[1]}>
                <div className="text-sm mb-1" style={{ color: cardStyles[1].color }}>Rate</div>
                <p className="font-bold text-lg" style={{ color: cardStyles[1].color }}>
                  {editedPayoutPreview.paymentType === 'SALARY'
                    ? getCompensationLabel(editingPayout)
                    : `${formatCurrency(editedPayoutPreview.hourlyRate)}/hr`}
                </p>
              </div>
              <div className="p-4 rounded-xl" style={cardStyles[2]}>
                <div className="text-sm mb-1" style={{ color: cardStyles[2].color }}>Gross Pay</div>
                <p className="font-bold text-lg" style={{ color: cardStyles[2].color }}>
                  {formatCurrency(editedPayoutPreview.grossAmount)}
                </p>
              </div>
              <div className="p-4 rounded-xl" style={cardStyles[3]}>
                <div className="text-sm mb-1" style={{ color: cardStyles[3].color }}>Net Pay</div>
                <p className="font-bold text-lg" style={{ color: cardStyles[3].color }}>
                  {formatCurrency(editedPayoutPreview.netAmount)}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border themed-border p-4 text-sm text-stone-600" style={{ backgroundColor: 'var(--background)' }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <p>Deductions: {formatCurrency(editedPayoutPreview.deductions)}</p>
                <p>Paystub: {editingPayout.stub_number || 'Not generated yet'}</p>
              </div>
            </div>

            <div className="flex gap-3 pt-2 border-t themed-border">
              <button
                type="button"
                onClick={closeEditPayout}
                disabled={isSavingPayout}
                className="flex-1 px-6 py-3 rounded-2xl border themed-border text-stone-600 font-bold themed-hover transition-colors disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingPayout}
                className="flex-1 px-6 py-3 rounded-2xl text-white font-bold shadow-lg hover:opacity-90 transition-all disabled:opacity-60"
                style={{ backgroundColor: 'var(--primary)', boxShadow: '0 12px 20px -12px var(--menu-shadow)' }}
              >
                {isSavingPayout ? 'Saving...' : 'Save Payout'}
              </button>
            </div>
          </form>
        ) : (
          <div className="rounded-2xl border themed-border px-4 py-8 text-center text-stone-500">
            Loading payout editor...
          </div>
        )}
      </BaseModal>

      <BaseModal
        isOpen={isDeleteOpen}
        onClose={closeDeleteModal}
        title="Delete Pay Period"
      >
        <div className="space-y-5">
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-4">
            <p className="font-bold text-red-900">
              Delete {deleteTarget?.name || 'this pay period'}?
            </p>
            <p className="mt-2 text-sm text-red-800">
              This permanently removes the open pay period. Closed periods cannot be deleted because they lock payroll history.
            </p>
          </div>

          {deleteTarget && (
            <div
              className="rounded-2xl border themed-border px-4 py-4 text-sm text-stone-600"
              style={{ backgroundColor: 'var(--background)' }}
            >
              {formatDate(deleteTarget.start_date)} - {formatDate(deleteTarget.end_date)}
            </div>
          )}

          <div className="flex gap-3 pt-2 border-t themed-border">
            <button
              type="button"
              onClick={closeDeleteModal}
              disabled={isDeleting}
              className="flex-1 px-6 py-3 rounded-2xl border themed-border text-stone-600 font-bold themed-hover transition-colors disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex-1 px-6 py-3 rounded-2xl bg-red-500 text-white font-bold shadow-lg shadow-red-500/30 hover:bg-red-600 transition-all disabled:opacity-60"
            >
              {isDeleting ? 'Deleting...' : 'Delete Pay Period'}
            </button>
          </div>
        </div>
      </BaseModal>

      <DatePickerModal
        isOpen={datePickerState.isOpen}
        onClose={closeDatePicker}
        initialDate={parseDateInput(currentDateField.value) || undefined}
        onConfirm={handleDateConfirm}
        onClear={handleDateClear}
        title={currentDateField.title}
        subtitle={currentDateField.subtitle}
        confirmLabel={currentDateField.confirmLabel}
        clearLabel="Clear date"
      />
    </Layout>
  );
}

