import React, { useMemo, useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { DollarSign } from 'lucide-react';
import api from '../utils/api';
import { BaseModal } from '../components/modals/BaseModal';

export function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [families, setFamilies] = useState([]);
  const [parents, setParents] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paymentsSort, setPaymentsSort] = useState({ key: 'date', direction: 'desc' });
  const [paymentForm, setPaymentForm] = useState({
    familyId: '',
    parentId: '',
    invoiceId: '',
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    status: 'PAID',
    paymentMethod: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const selectedParent = parents.find((parent) => parent.id === parseInt(paymentForm.parentId, 10));
  const selectedInvoice = invoices.find((inv) => inv.id === parseInt(paymentForm.invoiceId, 10));
  const availableCredit = parseFloat(selectedParent?.credit_balance || 0);
  const maxCredit = selectedInvoice
    ? Math.min(availableCredit, parseFloat(selectedInvoice.balance_due || 0))
    : 0;

  const familyByParentId = useMemo(() => {
    const map = new Map();
    families.forEach((family) => {
      (family.parents || []).forEach((parent) => {
        const parentId = parent.parent_id ?? parent.id;
        if (parentId !== undefined && parentId !== null) {
          map.set(parseInt(parentId, 10), family);
        }
      });
    });
    return map;
  }, [families]);

  const loadData = async () => {
    try {
      const [paymentsRes, parentsRes, invoicesRes, familiesRes] = await Promise.all([
        api.get('/parents/payments'),
        api.get('/parents'),
        api.get('/invoices'),
        api.get('/families'),
      ]);
      setPayments(paymentsRes.data.payments || []);
      setParents(parentsRes.data.parents || []);
      setInvoices(invoicesRes.data.invoices || []);
      setFamilies(familiesRes.data.families || []);
    } catch (error) {
      console.error('Failed to load payments data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFamilyId = (family) => String(family?.family_id ?? family?.id ?? '');

  const getPrimaryParent = (family) => {
    const parentsList = family?.parents || [];
    return parentsList[0] || null;
  };

  const getPrimaryParentId = (family) => {
    const parent = getPrimaryParent(family);
    if (!parent) return '';
    const parentId = parent.parent_id ?? parent.id;
    return parentId !== undefined && parentId !== null ? String(parentId) : '';
  };

  const getFamilyDisplayName = (family) => {
    const directName = family?.family_name
      || family?.parents?.map((parent) => parent.family_name).find(Boolean);
    if (directName) return directName;
    const parent = getPrimaryParent(family);
    const lastName = parent?.parent_last_name ?? parent?.last_name ?? '';
    if (lastName) return `${lastName} Family`;
    const childLastName = family?.children?.[0]?.last_name || family?.children?.[0]?.lastName;
    if (childLastName) return `${childLastName} Family`;
    return family?.family_id ? `Family #${family.family_id}` : 'Family';
  };

  const getPaymentFamilyLabel = (payment) => {
    const family = familyByParentId.get(parseInt(payment.parent_id, 10));
    if (family) return getFamilyDisplayName(family);
    const lastName = payment.last_name || payment.parent_last_name;
    if (lastName) return `${lastName} Family`;
    const fullName = [payment.first_name, payment.last_name].filter(Boolean).join(' ').trim();
    return fullName || 'Family';
  };

  const getPaymentNumber = (payment) => {
    const number = payment.receipt_number
      || payment.receiptNumber
      || payment.payment_number
      || payment.paymentNumber;
    if (number) return number;
    if (payment.id) return `PAY-${payment.id}`;
    return '-';
  };

  const handleFamilyChange = (familyId) => {
    const family = families.find((item) => getFamilyId(item) === familyId);
    const parentId = getPrimaryParentId(family);
    setPaymentForm((prev) => ({
      ...prev,
      familyId,
      parentId,
      invoiceId: '',
      amount: ''
    }));
  };

  const handleInvoiceChange = (invoiceId) => {
    const selectedInvoice = invoices.find((inv) => inv.id === parseInt(invoiceId, 10));
    if (selectedInvoice) {
      setPaymentForm((prev) => ({
        ...prev,
        invoiceId,
        amount: selectedInvoice.balance_due || '',
      }));
    } else {
      setPaymentForm((prev) => ({
        ...prev,
        invoiceId: '',
        amount: '',
      }));
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        parentId: paymentForm.parentId,
        invoiceId: paymentForm.invoiceId || '',
        amount: paymentForm.amount,
        paymentDate: paymentForm.paymentDate,
        status: paymentForm.status,
        paymentMethod: paymentForm.paymentMethod,
        notes: paymentForm.notes,
      };
      await api.post('/parents/payments', payload);
      setIsRecordOpen(false);
      setPaymentForm({
        familyId: '',
        parentId: '',
        invoiceId: '',
        amount: '',
        paymentDate: new Date().toISOString().split('T')[0],
        status: 'PAID',
        paymentMethod: '',
        notes: '',
      });
      loadData();
    } catch (error) {
      console.error('Failed to record payment:', error);
      alert(error.response?.data?.error || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkPaymentPaid = async (paymentId) => {
    try {
      await api.patch(`/parents/payments/${paymentId}`, { status: 'PAID' });
      await api.post(`/documents/parent-payments/${paymentId}/generate-receipt`);
      loadData();
    } catch (error) {
      console.error('Failed to mark payment paid:', error);
      alert(error.response?.data?.error || 'Failed to update payment');
    }
  };

  const handleDownloadReceipt = async (payment) => {
    try {
      await api.post(`/documents/parent-payments/${payment.id}/generate-receipt`);
      const response = await api.post(`/documents/parent-payments/${payment.id}/receipt-link`);
      window.open(response.data.url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Failed to download receipt:', error);
      alert(error.response?.data?.error || 'Failed to download receipt');
    }
  };

  const openInvoicePdf = async (invoiceId) => {
    if (!invoiceId) return;
    try {
      const response = await api.post(`/invoices/${invoiceId}/pdf-link`);
      if (response.data?.url) {
        window.open(response.data.url, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('Failed to open invoice PDF:', error);
      alert(error.response?.data?.error || 'Failed to open invoice PDF');
    }
  };

  const formatCurrency = (value) => {
    const amount = parseFloat(value || 0);
    return `$${amount.toFixed(2)}`;
  };

  const handlePaymentsSort = (key) => {
    setPaymentsSort((prev) => {
      const isSameKey = prev.key === key;
      const nextDirection = isSameKey
        ? (prev.direction === 'asc' ? 'desc' : 'asc')
        : (key === 'date' ? 'desc' : 'asc');
      return { key, direction: nextDirection };
    });
  };

  const getPaymentSortValue = (payment, key) => {
    switch (key) {
      case 'family':
        return getPaymentFamilyLabel(payment).toLowerCase();
      case 'payment':
        return getPaymentNumber(payment).toString().toLowerCase();
      case 'amount':
        return parseFloat(payment.amount || 0);
      case 'date':
        return new Date(payment.payment_date).getTime();
      case 'method':
        return (payment.payment_method || '').toString().toLowerCase();
      case 'status':
        return (payment.status || '').toString().toLowerCase();
      default:
        return '';
    }
  };

  const sortPayments = (list) => {
    const direction = paymentsSort.direction === 'asc' ? 1 : -1;
    const key = paymentsSort.key;
    return [...list].sort((a, b) => {
      const valueA = getPaymentSortValue(a, key);
      const valueB = getPaymentSortValue(b, key);
      if (typeof valueA === 'number' && typeof valueB === 'number') {
        return (valueA - valueB) * direction;
      }
      return String(valueA).localeCompare(String(valueB)) * direction;
    });
  };

  const renderPaymentHeader = (label, key, align = 'left') => {
    const isActive = paymentsSort.key === key;
    const indicator = isActive ? (paymentsSort.direction === 'asc' ? '▲' : '▼') : '';
    return (
      <button
        type="button"
        onClick={() => handlePaymentsSort(key)}
        className={`inline-flex items-center gap-1 text-left ${align === 'right' ? 'justify-end w-full' : ''}`}
      >
        <span>{label}</span>
        <span className="text-[10px] text-stone-400">{indicator}</span>
      </button>
    );
  };

  const handleApplyCredit = () => {
    if (!selectedInvoice || maxCredit <= 0) {
      return;
    }
    setPaymentForm((prev) => ({
      ...prev,
      paymentMethod: 'Credit',
      status: 'PAID',
      amount: maxCredit.toFixed(2),
    }));
  };

  const cardStyles = [
    { backgroundColor: 'var(--card-1)', color: 'var(--card-text-1)' },
    { backgroundColor: 'var(--card-2)', color: 'var(--card-text-2)' },
    { backgroundColor: 'var(--card-3)', color: 'var(--card-text-3)' },
    { backgroundColor: 'var(--card-4)', color: 'var(--card-text-4)' },
  ];
  const paymentStatusStyles = {
    PENDING: cardStyles[2],
    PAID: cardStyles[1],
  };
  const getPaymentStatusStyle = (status) => paymentStatusStyles[status] || {
    backgroundColor: 'var(--background)',
    color: 'var(--muted)',
  };

  if (loading) {
    return (
      <Layout title="Payments" subtitle="Record and manage family payments">
        <div className="flex items-center justify-center h-64">
          <div className="text-stone-500">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Payments" subtitle="Record and manage family payments">
      <div className="space-y-8">
        <div className="flex justify-end">
          <button
            onClick={() => setIsRecordOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 text-white rounded-2xl font-bold shadow-lg hover:opacity-90 transition-all"
            style={{ backgroundColor: 'var(--primary)', boxShadow: '0 12px 20px -12px var(--menu-shadow)' }}
          >
            <DollarSign size={18} />
            Record Payment
          </button>
        </div>

        <section>
          <h3 className="font-quicksand font-bold text-xl text-stone-800 mb-4">
            Recent Payments
          </h3>
          {(() => {
            const now = new Date();
            const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            const recentPayments = payments.filter((payment) => {
              const date = new Date(payment.payment_date);
              if (Number.isNaN(date.getTime())) return false;
              const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
              return key === currentMonthKey;
            });
            const sortedRecent = sortPayments(recentPayments);
            const monthLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

            return recentPayments.length === 0 ? (
            <div className="themed-surface rounded-3xl p-10 text-center">
              <p className="text-stone-500">No payments recorded for {monthLabel}.</p>
            </div>
            ) : (
            <div className="themed-surface rounded-3xl overflow-hidden">
              <div className="px-6 py-3 border-b themed-border text-sm font-semibold text-stone-600">
                {monthLabel}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead style={{ backgroundColor: 'var(--background)' }}>
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">{renderPaymentHeader('Family', 'family')}</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">{renderPaymentHeader('Payment #', 'payment')}</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">{renderPaymentHeader('Amount', 'amount')}</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">{renderPaymentHeader('Date', 'date')}</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">{renderPaymentHeader('Method', 'method')}</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">{renderPaymentHeader('Status', 'status')}</th>
                      <th className="px-6 py-4 text-right text-sm font-bold text-stone-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y themed-border">
                    {sortedRecent.map((payment) => (
                      <tr key={payment.id} className="themed-row transition-colors">
                        <td className="px-6 py-4 text-sm text-stone-700">
                          {getPaymentFamilyLabel(payment)}
                        </td>
                        <td className="px-6 py-4 text-sm text-stone-600">
                          <button
                            type="button"
                            onClick={() => handleDownloadReceipt(payment)}
                            className="text-[var(--primary-dark)] hover:text-[var(--primary)] font-semibold"
                          >
                            {getPaymentNumber(payment)}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-sm text-stone-700">
                          {formatCurrency(payment.amount)}
                        </td>
                        <td className="px-6 py-4 text-sm text-stone-600">
                          {new Date(payment.payment_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-stone-600">
                          {payment.payment_method || '-'}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className="px-3 py-1 rounded-full text-xs font-bold"
                            style={getPaymentStatusStyle(payment.status)}
                          >
                            {payment.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            {payment.invoice_id ? (
                              <button
                                onClick={() => openInvoicePdf(payment.invoice_id)}
                                className="px-3 py-2 rounded-xl text-xs font-bold themed-hover transition-colors"
                                style={{ backgroundColor: 'var(--background)', color: 'var(--primary-dark)' }}
                              >
                                Invoice
                              </button>
                            ) : (
                              <span className="text-xs font-semibold text-stone-400">No invoice</span>
                            )}
                            {payment.status === 'PENDING' && (
                              <button
                                onClick={() => handleMarkPaymentPaid(payment.id)}
                                className="px-3 py-2 rounded-xl text-xs font-bold themed-hover transition-colors"
                                style={{ backgroundColor: 'var(--background)', color: 'var(--primary-dark)' }}
                              >
                                Mark Paid
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            );
          })()}
        </section>

        <section>
          <h3 className="font-quicksand font-bold text-xl text-stone-800 mb-4">
            Past Payments
          </h3>
          {(() => {
            const now = new Date();
            const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            const pastPayments = payments.filter((payment) => {
              const date = new Date(payment.payment_date);
              if (Number.isNaN(date.getTime())) return true;
              const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
              return key !== currentMonthKey;
            });

            const grouped = pastPayments.reduce((acc, payment) => {
              const date = new Date(payment.payment_date);
              const key = Number.isNaN(date.getTime())
                ? 'unknown'
                : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
              if (!acc[key]) acc[key] = [];
              acc[key].push(payment);
              return acc;
            }, {});

            const groups = Object.keys(grouped)
              .sort((a, b) => {
                if (a === 'unknown') return 1;
                if (b === 'unknown') return -1;
                return b.localeCompare(a);
              })
              .map((key) => {
                const dateParts = key.split('-');
                const label = key === 'unknown'
                  ? 'Unknown date'
                  : new Date(parseInt(dateParts[0], 10), parseInt(dateParts[1], 10) - 1, 1)
                    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                return { key, label, payments: sortPayments(grouped[key]) };
              });

            if (groups.length === 0) {
              return (
                <div className="themed-surface rounded-3xl p-10 text-center">
                  <p className="text-stone-500">No past payments recorded.</p>
                </div>
              );
            }

            return (
              <div className="space-y-6">
                {groups.map((group) => (
                  <div key={group.key} className="themed-surface rounded-3xl overflow-hidden">
                    <div className="px-6 py-3 border-b themed-border text-sm font-semibold text-stone-600">
                      {group.label}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead style={{ backgroundColor: 'var(--background)' }}>
                          <tr>
                            <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">{renderPaymentHeader('Family', 'family')}</th>
                            <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">{renderPaymentHeader('Payment #', 'payment')}</th>
                            <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">{renderPaymentHeader('Amount', 'amount')}</th>
                            <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">{renderPaymentHeader('Date', 'date')}</th>
                            <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">{renderPaymentHeader('Method', 'method')}</th>
                            <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">{renderPaymentHeader('Status', 'status')}</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-stone-700">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y themed-border">
                          {group.payments.map((payment) => (
                            <tr key={payment.id} className="themed-row transition-colors">
                              <td className="px-6 py-4 text-sm text-stone-700">
                                {getPaymentFamilyLabel(payment)}
                              </td>
                              <td className="px-6 py-4 text-sm text-stone-600">
                                <button
                                  type="button"
                                  onClick={() => handleDownloadReceipt(payment)}
                                  className="text-[var(--primary-dark)] hover:text-[var(--primary)] font-semibold"
                                >
                                  {getPaymentNumber(payment)}
                                </button>
                              </td>
                              <td className="px-6 py-4 text-sm text-stone-700">
                                {formatCurrency(payment.amount)}
                              </td>
                              <td className="px-6 py-4 text-sm text-stone-600">
                                {new Date(payment.payment_date).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 text-sm text-stone-600">
                                {payment.payment_method || '-'}
                              </td>
                              <td className="px-6 py-4">
                                <span
                                  className="px-3 py-1 rounded-full text-xs font-bold"
                                  style={getPaymentStatusStyle(payment.status)}
                                >
                                  {payment.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="inline-flex items-center gap-2">
                                  {payment.invoice_id ? (
                                    <button
                                      onClick={() => openInvoicePdf(payment.invoice_id)}
                                      className="px-3 py-2 rounded-xl text-xs font-bold themed-hover transition-colors"
                                      style={{ backgroundColor: 'var(--background)', color: 'var(--primary-dark)' }}
                                    >
                                      Invoice
                                    </button>
                                  ) : (
                                    <span className="text-xs font-semibold text-stone-400">No invoice</span>
                                  )}
                                  {payment.status === 'PENDING' && (
                                    <button
                                      onClick={() => handleMarkPaymentPaid(payment.id)}
                                      className="px-3 py-2 rounded-xl text-xs font-bold themed-hover transition-colors"
                                      style={{ backgroundColor: 'var(--background)', color: 'var(--primary-dark)' }}
                                    >
                                      Mark Paid
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </section>
      </div>

      <BaseModal
        isOpen={isRecordOpen}
        onClose={() => setIsRecordOpen(false)}
        title="Record Payment"
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Family
            </label>
            <select
              value={paymentForm.familyId}
              onChange={(e) => handleFamilyChange(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
            >
              <option value="">Select family...</option>
              {families.map((family) => (
                <option key={getFamilyId(family)} value={getFamilyId(family)}>
                  {getFamilyDisplayName(family)}
                </option>
              ))}
            </select>
          </div>

          {selectedParent && (
            <div className="p-4 rounded-2xl bg-[#FFF8F3] border border-[#FFE5D9]/60 text-sm text-stone-600">
              <div className="flex items-center justify-between">
                <span>Available Credit</span>
                <span className="font-bold text-stone-800">{formatCurrency(availableCredit)}</span>
              </div>
              <p className="mt-2 text-xs text-stone-500">
                Credits can be applied only to a selected invoice.
              </p>
              <button
                type="button"
                onClick={handleApplyCredit}
                disabled={!selectedInvoice || maxCredit <= 0}
                className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-[#2D6A4F] bg-[#B8E6D5] disabled:opacity-50"
              >
                Apply Credit
              </button>
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Invoice (Optional)
            </label>
            <select
              value={paymentForm.invoiceId}
              onChange={(e) => handleInvoiceChange(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
              disabled={!paymentForm.parentId}
            >
              <option value="">No invoice</option>
              {invoices
                .filter((inv) => inv.status !== 'PAID' && parseFloat(inv.balance_due || 0) > 0)
                .filter((inv) => !paymentForm.parentId || inv.parent_id === parseInt(paymentForm.parentId, 10))
                .map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoice_number} - {formatCurrency(inv.balance_due)}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Amount
            </label>
            <input
              type="number"
              step="0.01"
              value={paymentForm.amount}
              onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
              required
              className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                Payment Date
              </label>
              <input
                type="date"
                value={paymentForm.paymentDate}
                onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                required
                className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                Status
              </label>
              <select
                value={paymentForm.status}
                onChange={(e) => setPaymentForm({ ...paymentForm, status: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
              >
                <option value="PENDING">Pending</option>
                <option value="PAID">Paid</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Payment Method
            </label>
            <select
              value={paymentForm.paymentMethod}
              onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
            >
              <option value="">Select method</option>
              <option value="E-Transfer">E-Transfer</option>
              <option value="Credit">Credit</option>
              <option value="Cheque">Cheque</option>
              <option value="Cash">Cash</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Notes
            </label>
            <textarea
              rows={3}
              value={paymentForm.notes}
              onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsRecordOpen(false)}
              disabled={submitting}
              className="flex-1 px-6 py-3 rounded-2xl border themed-border text-stone-600 font-bold themed-hover transition-colors disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-6 py-3 rounded-2xl text-white font-bold shadow-lg hover:opacity-90 transition-all disabled:opacity-60"
              style={{ backgroundColor: 'var(--primary)', boxShadow: '0 12px 20px -12px var(--menu-shadow)' }}
            >
              {submitting ? 'Saving...' : 'Save Payment'}
            </button>
          </div>
        </form>
      </BaseModal>
    </Layout>
  );
}

