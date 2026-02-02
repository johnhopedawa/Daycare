import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { DollarSign, Download } from 'lucide-react';
import api from '../utils/api';
import { BaseModal } from '../components/modals/BaseModal';

export function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [parents, setParents] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
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

  const loadData = async () => {
    try {
      const [paymentsRes, parentsRes, invoicesRes] = await Promise.all([
        api.get('/parents/payments'),
        api.get('/parents'),
        api.get('/invoices'),
      ]);
      setPayments(paymentsRes.data.payments || []);
      setParents(parentsRes.data.parents || []);
      setInvoices(invoicesRes.data.invoices || []);
    } catch (error) {
      console.error('Failed to load payments data:', error);
    } finally {
      setLoading(false);
    }
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
      await api.post('/parents/payments', paymentForm);
      setIsRecordOpen(false);
      setPaymentForm({
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

  const formatCurrency = (value) => {
    const amount = parseFloat(value || 0);
    return `$${amount.toFixed(2)}`;
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
  const invoiceStatusStyles = {
    DRAFT: { backgroundColor: 'var(--background)', color: 'var(--muted)' },
    SENT: cardStyles[0],
    PARTIAL: cardStyles[2],
    PAID: cardStyles[1],
    OVERDUE: cardStyles[3],
  };
  const getPaymentStatusStyle = (status) => paymentStatusStyles[status] || {
    backgroundColor: 'var(--background)',
    color: 'var(--muted)',
  };
  const getInvoiceStatusStyle = (status) => invoiceStatusStyles[status] || {
    backgroundColor: 'var(--background)',
    color: 'var(--muted)',
  };

  if (loading) {
    return (
      <Layout title="Payments" subtitle="Record and manage parent payments">
        <div className="flex items-center justify-center h-64">
          <div className="text-stone-500">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Payments" subtitle="Record and manage parent payments">
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

        <section
        >
          <h3 className="font-quicksand font-bold text-xl text-stone-800 mb-4">
            Payment History
          </h3>
          {payments.length === 0 ? (
            <div className="themed-surface rounded-3xl p-10 text-center">
              <p className="text-stone-500">No payments recorded yet.</p>
            </div>
          ) : (
            <div className="themed-surface rounded-3xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead style={{ backgroundColor: 'var(--background)' }}>
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">Parent</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">Invoice</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">Amount</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">Date</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">Method</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">Status</th>
                      <th className="px-6 py-4 text-right text-sm font-bold text-stone-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y themed-border">
                    {payments.map((payment) => (
                      <tr key={payment.id} className="themed-row transition-colors">
                        <td className="px-6 py-4 text-sm text-stone-700">
                          {payment.first_name} {payment.last_name}
                        </td>
                        <td className="px-6 py-4 text-sm text-stone-600">
                          {payment.invoice_number || '-'}
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
                          {payment.status === 'PENDING' ? (
                            <button
                              onClick={() => handleMarkPaymentPaid(payment.id)}
                              className="px-3 py-2 rounded-xl text-xs font-bold themed-hover transition-colors"
                              style={{ backgroundColor: 'var(--background)', color: 'var(--primary-dark)' }}
                            >
                              Mark Paid
                            </button>
                          ) : (
                            <button
                              onClick={() => handleDownloadReceipt(payment)}
                              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-white border themed-border text-stone-600 text-xs font-bold themed-hover transition-colors"
                            >
                              <Download size={14} />
                              Receipt
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        <section
        >
          <h3 className="font-quicksand font-bold text-xl text-stone-800 mb-4">
            Invoices
          </h3>
          {invoices.length === 0 ? (
            <div className="themed-surface rounded-3xl p-10 text-center">
              <p className="text-stone-500">No invoices found.</p>
            </div>
          ) : (
            <div className="themed-surface rounded-3xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead style={{ backgroundColor: 'var(--background)' }}>
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">Invoice #</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">Parent</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">Due</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">Balance</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">Status</th>
                      <th className="px-6 py-4 text-right text-sm font-bold text-stone-700">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y themed-border">
                    {invoices.map((invoice) => (
                      <tr key={invoice.id} className="themed-row transition-colors">
                        <td className="px-6 py-4 text-sm text-stone-700">
                          {invoice.invoice_number}
                        </td>
                        <td className="px-6 py-4 text-sm text-stone-600">
                          {invoice.parent_name || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-stone-600">
                          {new Date(invoice.due_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-stone-700">
                          {formatCurrency(invoice.balance_due)}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className="px-3 py-1 rounded-full text-xs font-bold"
                            style={getInvoiceStatusStyle(invoice.status)}
                          >
                            {invoice.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-xs text-stone-400">-</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
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
              Parent
            </label>
            <select
              value={paymentForm.parentId}
              onChange={(e) => setPaymentForm({ ...paymentForm, parentId: e.target.value, invoiceId: '' })}
              required
              className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
            >
              <option value="">Select parent...</option>
              {parents.map((parent) => (
                <option key={parent.id} value={parent.id}>
                  {parent.first_name} {parent.last_name}
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

