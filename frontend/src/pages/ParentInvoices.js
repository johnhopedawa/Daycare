import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileDown, ArrowLeft } from 'lucide-react';
import { ParentLayout } from '../components/ParentLayout';
import api from '../utils/api';
import { buildPdfFileName } from '../utils/fileName';

function ParentInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [creditBalance, setCreditBalance] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    loadInvoices();
    loadPayments();
    loadCreditBalance();
  }, []);

  const loadInvoices = async () => {
    try {
      const response = await api.get('/parent/invoices');
      setInvoices(response.data.invoices);
    } catch (error) {
      console.error('Load invoices error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPayments = async () => {
    try {
      const response = await api.get('/parent/invoices/payments/history');
      setPayments(response.data.payments);
    } catch (error) {
      console.error('Load payments error:', error);
    } finally {
      setPaymentsLoading(false);
    }
  };

  const loadCreditBalance = async () => {
    try {
      const response = await api.get('/parent/dashboard');
      setCreditBalance(parseFloat(response.data.credit_balance || 0));
    } catch (error) {
      console.error('Load credit balance error:', error);
    }
  };

  const downloadPDF = async (invoice) => {
    try {
      const response = await api.get(`/parent/invoices/${invoice.id}/pdf`, {
        responseType: 'blob'
      });

      const childName = [invoice.child_first_name, invoice.child_last_name].filter(Boolean).join(' ').trim();
      const filename = buildPdfFileName('Invoice', invoice.invoice_date || invoice.due_date, childName);
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Download PDF error:', error);
      alert('Failed to download invoice');
    }
  };

  const downloadReceipt = async (payment) => {
    try {
      const response = await api.get(`/parent/invoices/payments/${payment.id}/receipt-pdf`, {
        responseType: 'blob'
      });

      const receiptLabel = payment.receipt_number || payment.invoice_number || 'Receipt';
      const filename = buildPdfFileName('Receipt', payment.payment_date, receiptLabel);
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Download receipt error:', error);
      alert('Failed to download receipt');
    }
  };

  if (loading) {
    return (
      <ParentLayout title="My Invoices" subtitle="Review and download your invoices">
        <div className="flex items-center justify-center h-48 parent-text-muted">Loading...</div>
      </ParentLayout>
    );
  }

  return (
    <ParentLayout title="My Invoices" subtitle="Review and download your invoices">
      <div className="parent-card p-6 rounded-xl border border-gray-100 mb-6">
        <h3 className="text-lg font-semibold parent-text mb-2">Credit Balance</h3>
        <p className="text-sm parent-text-muted">
          Available credits are applied by your daycare to future invoices.
        </p>
        <p className="mt-3 text-2xl font-bold parent-text">
          ${creditBalance.toFixed(2)}
        </p>
      </div>

      {invoices.length === 0 ? (
        <div className="parent-card p-8 rounded-xl border border-gray-100 text-center parent-text-muted">
          No invoices found.
        </div>
      ) : (
        <div className="parent-card rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="parent-table-head">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold parent-text">Invoice #</th>
                  <th className="px-6 py-4 text-left text-sm font-bold parent-text">Date</th>
                  <th className="px-6 py-4 text-left text-sm font-bold parent-text">Due Date</th>
                  <th className="px-6 py-4 text-left text-sm font-bold parent-text">Child</th>
                  <th className="px-6 py-4 text-left text-sm font-bold parent-text">Total</th>
                  <th className="px-6 py-4 text-left text-sm font-bold parent-text">Paid</th>
                  <th className="px-6 py-4 text-left text-sm font-bold parent-text">Balance</th>
                  <th className="px-6 py-4 text-left text-sm font-bold parent-text">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-bold parent-text">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y themed-border">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="parent-table-row transition-colors">
                    <td className="px-6 py-4 text-sm font-semibold parent-text">
                      {inv.invoice_number}
                    </td>
                    <td className="px-6 py-4 text-sm parent-text-muted">
                      {new Date(inv.invoice_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm parent-text-muted">
                      {new Date(inv.due_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm parent-text-muted">
                      {inv.child_first_name} {inv.child_last_name}
                    </td>
                    <td className="px-6 py-4 text-sm parent-text-muted">
                      ${parseFloat(inv.total_amount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm parent-text-muted">
                      ${parseFloat(inv.amount_paid).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm parent-text-muted">
                      ${parseFloat(inv.balance_due).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="parent-pill px-3 py-1 rounded-full text-xs font-bold">
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => downloadPDF(inv)}
                        className="parent-button-soft inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-colors"
                      >
                        <FileDown size={16} />
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-10 parent-card p-6 rounded-xl border border-gray-100">
        <h3 className="text-lg font-semibold parent-text mb-4">Payment Receipts</h3>
        {paymentsLoading ? (
          <div className="parent-text-muted">Loading receipts...</div>
        ) : payments.length === 0 ? (
          <div className="parent-text-muted">No payments recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="parent-table-head">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold parent-text">Receipt #</th>
                  <th className="px-6 py-4 text-left text-sm font-bold parent-text">Invoice #</th>
                  <th className="px-6 py-4 text-left text-sm font-bold parent-text">Date</th>
                  <th className="px-6 py-4 text-left text-sm font-bold parent-text">Amount</th>
                  <th className="px-6 py-4 text-left text-sm font-bold parent-text">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-bold parent-text">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y themed-border">
                {payments.map((payment) => (
                  <tr key={payment.id} className="parent-table-row transition-colors">
                    <td className="px-6 py-4 text-sm parent-text-muted">
                      {payment.receipt_number || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm parent-text-muted">
                      {payment.invoice_number || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm parent-text-muted">
                      {new Date(payment.payment_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm parent-text-muted">
                      ${parseFloat(payment.amount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm parent-text-muted">
                      {payment.status}
                    </td>
                    <td className="px-6 py-4">
                      {payment.status === 'PAID' ? (
                        <button
                          onClick={() => downloadReceipt(payment)}
                          className="parent-button-soft inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-colors"
                        >
                          <FileDown size={16} />
                          Download
                        </button>
                      ) : (
                        <span className="text-xs font-semibold parent-text-muted">Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <button
        onClick={() => navigate('/parent/dashboard')}
        className="mt-6 inline-flex items-center gap-2 text-sm font-semibold parent-text-muted hover:opacity-90 transition-opacity"
      >
        <ArrowLeft size={16} />
        Back to Dashboard
      </button>
    </ParentLayout>
  );
}

export default ParentInvoices;
