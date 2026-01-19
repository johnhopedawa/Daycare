import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { MetricCard } from '../components/DashboardWidgets';
import { BaseModal } from '../components/modals/BaseModal';
import { DollarSign, Clock, AlertCircle, Download, Send, Wallet } from 'lucide-react';
import api from '../utils/api';
import { buildPdfFileName } from '../utils/fileName';
import { CreateInvoiceModal } from '../components/modals/CreateInvoiceModal';

export function BillingPage() {
  const [invoices, setInvoices] = useState([]);
  const [parents, setParents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    pending: 0,
    overdue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [showClosedInvoices, setShowClosedInvoices] = useState(false);
  const [isEditInvoiceOpen, setIsEditInvoiceOpen] = useState(false);
  const [isDeleteInvoiceOpen, setIsDeleteInvoiceOpen] = useState(false);
  const [selectedInvoiceForEdit, setSelectedInvoiceForEdit] = useState(null);
  const [selectedInvoiceForDelete, setSelectedInvoiceForDelete] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    parentId: '',
    invoiceId: '',
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: '',
    notes: '',
  });
  const [currentPaymentsPage, setCurrentPaymentsPage] = useState(1);
  const paymentsPerPage = 10;
  const [invoiceEditForm, setInvoiceEditForm] = useState({
    due_date: '',
    status: 'DRAFT',
    notes: '',
    payment_terms: '',
  });

  useEffect(() => {
    loadBillingData();
  }, []);

  const loadBillingData = async () => {
    try {
      setLoading(true);
      const [invoicesResponse, parentsResponse, paymentsResponse] = await Promise.all([
        api.get('/invoices'),
        api.get('/parents'),
        api.get('/parents/payments'),
      ]);
      const invoicesData = invoicesResponse.data.invoices || [];
      setInvoices(invoicesData);
      setParents(parentsResponse.data.parents || []);
      setPayments(paymentsResponse.data.payments || []);

      // Calculate stats
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      const monthlyRevenue = invoicesData
        .filter(inv => {
          const invDate = new Date(inv.invoice_date);
          return invDate.getMonth() === currentMonth &&
                 invDate.getFullYear() === currentYear &&
                 inv.status === 'PAID';
        })
        .reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0);

      const pendingAmount = invoicesData
        .filter(inv => inv.status === 'SENT' || inv.status === 'PARTIAL')
        .reduce((sum, inv) => sum + parseFloat(inv.balance_due || 0), 0);

      const overdueAmount = invoicesData
        .filter(inv => inv.status === 'OVERDUE')
        .reduce((sum, inv) => sum + parseFloat(inv.balance_due || 0), 0);

      setStats({
        totalRevenue: monthlyRevenue,
        pending: pendingAmount,
        overdue: overdueAmount,
      });
    } catch (error) {
      console.error('Failed to load billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetPaymentForm = () => {
    setPaymentForm({
      parentId: '',
      invoiceId: '',
      amount: '',
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: '',
      notes: '',
    });
  };

  const openPaymentModal = (invoice = null) => {
    if (invoice) {
      setSelectedInvoice(invoice);
      setPaymentForm({
        parentId: invoice.parent_id ? String(invoice.parent_id) : '',
        invoiceId: invoice.id ? String(invoice.id) : '',
        amount: invoice.balance_due ? String(invoice.balance_due) : '',
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'E-Transfer',
        notes: 'Manual payment entry',
      });
    } else {
      setSelectedInvoice(null);
      resetPaymentForm();
    }
    setIsPaymentModalOpen(true);
  };

  const handlePaymentInvoiceChange = (invoiceId) => {
    const selected = invoices.find((inv) => inv.id === parseInt(invoiceId, 10));
    if (selected) {
      setPaymentForm({
        ...paymentForm,
        invoiceId,
        amount: selected.balance_due || '',
      });
    } else {
      setPaymentForm({ ...paymentForm, invoiceId, amount: '' });
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...paymentForm,
        status: 'PAID',
      };
      await api.post('/parents/payments', payload);

      setIsPaymentModalOpen(false);
      setSelectedInvoice(null);
      resetPaymentForm();
      loadBillingData();
    } catch (error) {
      console.error('Failed to record payment:', error);
      alert(error.response?.data?.error || 'Failed to record payment');
    }
  };

  const openEditInvoiceModal = (invoice) => {
    setSelectedInvoiceForEdit(invoice);
    setInvoiceEditForm({
      due_date: invoice.due_date ? invoice.due_date.split('T')[0] : '',
      status: invoice.status || 'DRAFT',
      notes: invoice.notes || '',
      payment_terms: invoice.payment_terms || '',
    });
    setIsEditInvoiceOpen(true);
  };

  const handleEditInvoiceSubmit = async (e) => {
    e.preventDefault();
    if (!selectedInvoiceForEdit) return;

    if (['PAID', 'PARTIAL'].includes(invoiceEditForm.status)) {
      alert('Record a payment to mark an invoice as paid or partial.');
      return;
    }

    try {
      await api.patch(`/invoices/${selectedInvoiceForEdit.id}`, invoiceEditForm);
      setIsEditInvoiceOpen(false);
      setSelectedInvoiceForEdit(null);
      loadBillingData();
    } catch (error) {
      console.error('Failed to update invoice:', error);
      alert(error.response?.data?.error || 'Failed to update invoice');
    }
  };

  const openDeleteInvoiceModal = (invoice) => {
    setSelectedInvoiceForDelete(invoice);
    setIsDeleteInvoiceOpen(true);
  };

  const handleDeleteInvoice = async () => {
    if (!selectedInvoiceForDelete) return;
    try {
      await api.delete(`/invoices/${selectedInvoiceForDelete.id}`);
      setIsDeleteInvoiceOpen(false);
      setSelectedInvoiceForDelete(null);
      loadBillingData();
    } catch (error) {
      console.error('Failed to delete invoice:', error);
      alert(error.response?.data?.error || 'Failed to delete invoice');
    }
  };

  const downloadInvoice = async (invoice) => {
    try {
      const response = await api.get(`/invoices/${invoice.id}/pdf`, {
        responseType: 'blob',
      });

      const childName = [invoice.child_first_name, invoice.child_last_name].filter(Boolean).join(' ').trim();
      const nameFallback = invoice.parent_name || childName || 'Unknown';
      const filename = buildPdfFileName('Invoice', invoice.invoice_date || invoice.due_date, childName || nameFallback);
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to download invoice:', error);
      alert(error.response?.data?.error || 'Failed to download invoice');
    }
  };

  const handleMarkPaymentCompleted = async (paymentId) => {
    try {
      await api.patch(`/parents/payments/${paymentId}`, { status: 'PAID' });
      await api.post(`/documents/parent-payments/${paymentId}/generate-receipt`);
      loadBillingData();
    } catch (error) {
      console.error('Failed to mark payment completed:', error);
      alert(error.response?.data?.error || 'Failed to mark payment completed');
    }
  };

  const downloadReceipt = async (payment) => {
    try {
      await api.post(`/documents/parent-payments/${payment.id}/generate-receipt`);
      const response = await api.post(`/documents/parent-payments/${payment.id}/receipt-link`);
      window.open(response.data.url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Failed to download receipt:', error);
      alert(error.response?.data?.error || 'Failed to download receipt');
    }
  };

  const getPaymentStatusBadge = (status) => {
    const badges = {
      PAID: 'px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-[#B8E6D5] text-[#2D6A4F]',
      PENDING: 'px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-[#FFF4CC] text-[#B45309]',
    };
    return <span className={badges[status] || badges.PENDING}>{status}</span>;
  };

  const indexOfLastPayment = currentPaymentsPage * paymentsPerPage;
  const indexOfFirstPayment = indexOfLastPayment - paymentsPerPage;
  const currentPayments = payments.slice(indexOfFirstPayment, indexOfLastPayment);
  const totalPaymentPages = Math.ceil(payments.length / paymentsPerPage);

  const getStatusBadge = (status) => {
    const badges = {
      PAID: 'px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-[#B8E6D5] text-[#2D6A4F]',
      SENT: 'px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-[#FFF4CC] text-[#B45309]',
      PARTIAL: 'px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-[#E5D4ED] text-[#8E55A5]',
      OVERDUE: 'px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-[#FFE5D9] text-[#C4554D]',
      DRAFT: 'px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-stone-200 text-stone-600',
    };
    return <span className={badges[status] || badges.DRAFT}>{status}</span>;
  };

  if (loading) {
    return (
      <Layout title="Billing & Invoices" subtitle="Manage payments and financial records">
        <div className="flex items-center justify-center h-64">
          <div className="text-stone-500">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Billing & Invoices" subtitle="Manage payments and financial records">
      {/* Financial Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <MetricCard
          title="Revenue This Month"
          value={`$${stats.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={DollarSign}
          color="bg-[#B8E6D5]"
          delay={0.1}
        />
        <MetricCard
          title="Pending Payments"
          value={`$${stats.pending.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={Clock}
          color="bg-[#FFF4CC]"
          delay={0.2}
        />
        <MetricCard
          title="Overdue"
          value={`$${stats.overdue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={AlertCircle}
          color="bg-[#FFE5D9]"
          delay={0.3}
        />
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-3xl shadow-[0_4px_20px_-4px_rgba(255,229,217,0.5)] border border-[#FFE5D9]/30 overflow-hidden">
        <div className="p-6 border-b border-[#FFE5D9]/30 flex flex-wrap justify-between items-center gap-3">
          <h3 className="font-quicksand font-bold text-xl text-stone-800">
            Recent Invoices
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => setShowClosedInvoices(!showClosedInvoices)}
              className="px-4 py-2 rounded-xl border border-[#FFE5D9] text-stone-600 font-medium text-sm hover:bg-[#FFF8F3] transition-colors"
            >
              {showClosedInvoices ? 'Hide Closed' : 'Show Closed'}
            </button>
            <button
              onClick={() => openPaymentModal()}
              className="px-4 py-2 rounded-xl bg-[#FFF8F3] text-[#E07A5F] font-medium text-sm hover:bg-[#FFE5D9] transition-colors flex items-center gap-2"
            >
              <Wallet size={16} /> Record Payment
            </button>
            <button className="px-4 py-2 rounded-xl bg-[#FFF8F3] text-[#E07A5F] font-medium text-sm hover:bg-[#FFE5D9] transition-colors flex items-center gap-2">
              <Download size={16} /> Export
            </button>
            <button
              onClick={() => setIsCreateInvoiceOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#FF9B85] text-white font-medium text-sm hover:bg-[#E07A5F] transition-colors shadow-lg shadow-[#FF9B85]/30 flex items-center gap-2"
            >
              <Send size={16} /> Create Invoice
            </button>
          </div>
        </div>

        {invoices.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-stone-500">No invoices found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#FFF8F3]">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase tracking-wider font-quicksand">
                    Invoice #
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase tracking-wider font-quicksand">
                    Parent
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase tracking-wider font-quicksand">
                    Date Issued
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase tracking-wider font-quicksand">
                    Amount
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase tracking-wider font-quicksand">
                    Balance Due
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase tracking-wider font-quicksand">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-stone-500 uppercase tracking-wider font-quicksand">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#FFE5D9]/30">
                {invoices
                  .filter((invoice) => (showClosedInvoices ? true : invoice.status !== 'PAID'))
                  .map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="hover:bg-[#FFF8F3]/50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-stone-600">
                      {invoice.invoice_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-stone-800">
                      {invoice.parent_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                      {new Date(invoice.invoice_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-stone-800">
                      ${parseFloat(invoice.total_amount || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600">
                      ${parseFloat(invoice.balance_due || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(invoice.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {invoice.status !== 'PAID' && parseFloat(invoice.balance_due || 0) > 0 && (
                        <button
                          onClick={() => openPaymentModal(invoice)}
                          className="text-[#E07A5F] hover:text-[#C4554D] mr-4"
                        >
                          Mark Paid
                        </button>
                      )}
                      <button
                        onClick={() => openEditInvoiceModal(invoice)}
                        className="text-[#FF9B85] hover:text-[#E07A5F] mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => downloadInvoice(invoice)}
                        className="text-stone-400 hover:text-stone-600 mr-4"
                      >
                        Download
                      </button>
                      <button
                        onClick={() => openDeleteInvoiceModal(invoice)}
                        className="text-red-500 hover:text-red-600"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment History */}
      <div className="bg-white rounded-3xl shadow-[0_4px_20px_-4px_rgba(255,229,217,0.5)] border border-[#FFE5D9]/30 overflow-hidden mt-8">
        <div className="p-6 border-b border-[#FFE5D9]/30">
          <h3 className="font-quicksand font-bold text-xl text-stone-800">
            Payment History
          </h3>
        </div>

        {payments.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-stone-500">No payments recorded</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#FFF8F3]">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase tracking-wider font-quicksand">
                      Parent
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase tracking-wider font-quicksand">
                      Invoice
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase tracking-wider font-quicksand">
                      Amount
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase tracking-wider font-quicksand">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase tracking-wider font-quicksand">
                      Method
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase tracking-wider font-quicksand">
                      Status
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-stone-500 uppercase tracking-wider font-quicksand">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FFE5D9]/30">
                  {currentPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-[#FFF8F3]/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-stone-800">
                        {payment.first_name} {payment.last_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                        {payment.invoice_number || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-stone-800">
                        ${parseFloat(payment.amount || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                        {new Date(payment.payment_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                        {payment.payment_method || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getPaymentStatusBadge(payment.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {payment.status === 'PENDING' ? (
                          <button
                            onClick={() => handleMarkPaymentCompleted(payment.id)}
                            className="text-[#E07A5F] hover:text-[#C4554D]"
                          >
                            Mark Completed
                          </button>
                        ) : (
                          <button
                            onClick={() => downloadReceipt(payment)}
                            className="text-[#FF9B85] hover:text-[#E07A5F]"
                          >
                            Receipt
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPaymentPages > 1 && (
              <div className="flex items-center justify-center gap-3 p-4">
                <button
                  onClick={() => setCurrentPaymentsPage(currentPaymentsPage - 1)}
                  disabled={currentPaymentsPage === 1}
                  className="px-4 py-2 rounded-xl border border-[#FFE5D9] text-stone-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-stone-500">
                  Page {currentPaymentsPage} of {totalPaymentPages}
                </span>
                <button
                  onClick={() => setCurrentPaymentsPage(currentPaymentsPage + 1)}
                  disabled={currentPaymentsPage === totalPaymentPages}
                  className="px-4 py-2 rounded-xl border border-[#FFE5D9] text-stone-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Record Payment Modal */}
      <BaseModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSelectedInvoice(null);
          resetPaymentForm();
        }}
        title={selectedInvoice ? `Record Payment - ${selectedInvoice.invoice_number}` : 'Record Payment'}
      >
        <form onSubmit={handlePaymentSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Parent *
            </label>
            <select
              value={paymentForm.parentId}
              onChange={(e) => setPaymentForm({ ...paymentForm, parentId: e.target.value, invoiceId: '', amount: '' })}
              className="w-full px-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white"
              required
            >
              <option value="">Select parent</option>
              {parents.map((parent) => (
                <option key={parent.id} value={parent.id}>
                  {parent.first_name} {parent.last_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Invoice (Optional)
            </label>
            <select
              value={paymentForm.invoiceId}
              onChange={(e) => handlePaymentInvoiceChange(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white"
            >
              <option value="">No invoice (general payment)</option>
              {invoices
                .filter((inv) => inv.status !== 'PAID' && parseFloat(inv.balance_due || 0) > 0)
                .filter((inv) => !paymentForm.parentId || inv.parent_id === parseInt(paymentForm.parentId, 10))
                .map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoice_number} - ${parseFloat(inv.balance_due || 0).toFixed(2)} due
                  </option>
                ))}
            </select>
            <p className="text-xs text-stone-500 mt-1">
              Selecting an invoice will auto-fill the current balance due.
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Amount *
            </label>
            <input
              type="number"
              step="0.01"
              value={paymentForm.amount}
              onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Payment Date *
            </label>
            <input
              type="date"
              value={paymentForm.paymentDate}
              onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Payment Method
            </label>
            <select
              value={paymentForm.paymentMethod}
              onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white"
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
              className="w-full px-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white resize-none"
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-[#FFE5D9]">
            <button
              type="button"
              onClick={() => {
                setIsPaymentModalOpen(false);
                setSelectedInvoice(null);
                resetPaymentForm();
              }}
              className="flex-1 px-6 py-3 rounded-2xl border border-[#FFE5D9] text-stone-600 font-bold hover:bg-[#FFF8F3] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 rounded-2xl bg-[#FF9B85] text-white font-bold shadow-lg shadow-[#FF9B85]/30 hover:bg-[#E07A5F] transition-all"
            >
              Record Payment
            </button>
          </div>
        </form>
      </BaseModal>

      <BaseModal
        isOpen={isEditInvoiceOpen}
        onClose={() => {
          setIsEditInvoiceOpen(false);
          setSelectedInvoiceForEdit(null);
        }}
        title={selectedInvoiceForEdit ? `Edit Invoice ${selectedInvoiceForEdit.invoice_number}` : 'Edit Invoice'}
      >
        <form onSubmit={handleEditInvoiceSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Due Date
            </label>
            <input
              type="date"
              value={invoiceEditForm.due_date}
              onChange={(e) => setInvoiceEditForm({ ...invoiceEditForm, due_date: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Status
            </label>
            <select
              value={invoiceEditForm.status}
              onChange={(e) => setInvoiceEditForm({ ...invoiceEditForm, status: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl border border-[#FFE5D9] bg-white"
            >
              <option value="DRAFT">Draft</option>
              <option value="SENT">Sent</option>
              <option value="PARTIAL" disabled>Partial</option>
              <option value="PAID" disabled>Paid</option>
              <option value="OVERDUE">Overdue</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Payment Terms
            </label>
            <input
              type="text"
              value={invoiceEditForm.payment_terms}
              onChange={(e) => setInvoiceEditForm({ ...invoiceEditForm, payment_terms: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl border border-[#FFE5D9] bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Notes
            </label>
            <textarea
              rows={3}
              value={invoiceEditForm.notes}
              onChange={(e) => setInvoiceEditForm({ ...invoiceEditForm, notes: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl border border-[#FFE5D9] bg-white resize-none"
            />
          </div>
          <div className="flex gap-3 pt-4 border-t border-[#FFE5D9]">
            <button
              type="button"
              onClick={() => {
                setIsEditInvoiceOpen(false);
                setSelectedInvoiceForEdit(null);
              }}
              className="flex-1 px-6 py-3 rounded-2xl border border-[#FFE5D9] text-stone-600 font-bold hover:bg-[#FFF8F3] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 rounded-2xl bg-[#FF9B85] text-white font-bold shadow-lg shadow-[#FF9B85]/30 hover:bg-[#E07A5F] transition-all"
            >
              Save Changes
            </button>
          </div>
        </form>
      </BaseModal>

      <BaseModal
        isOpen={isDeleteInvoiceOpen}
        onClose={() => {
          setIsDeleteInvoiceOpen(false);
          setSelectedInvoiceForDelete(null);
        }}
        title="Delete Invoice"
      >
        <div className="space-y-4">
          <p className="text-stone-600">
            Are you sure you want to delete{' '}
            <span className="font-bold">
              {selectedInvoiceForDelete?.invoice_number || 'this invoice'}
            </span>
            ?
          </p>
          <p className="text-sm text-stone-500 bg-amber-50 border border-amber-200 rounded-2xl p-4">
            This action cannot be undone.
          </p>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsDeleteInvoiceOpen(false);
                setSelectedInvoiceForDelete(null);
              }}
              className="flex-1 px-6 py-3 rounded-2xl border border-[#FFE5D9] text-stone-600 font-bold hover:bg-[#FFF8F3] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteInvoice}
              className="flex-1 px-6 py-3 rounded-2xl bg-red-500 text-white font-bold shadow-lg shadow-red-500/30 hover:bg-red-600 transition-all"
            >
              Delete Invoice
            </button>
          </div>
        </div>
      </BaseModal>

      <CreateInvoiceModal
        isOpen={isCreateInvoiceOpen}
        onClose={() => setIsCreateInvoiceOpen(false)}
        onSuccess={loadBillingData}
      />
    </Layout>
  );
}
