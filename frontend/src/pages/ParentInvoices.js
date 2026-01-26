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
        <div className="flex items-center justify-center h-48 text-stone-500">Loading...</div>
      </ParentLayout>
    );
  }

  return (
    <ParentLayout title="My Invoices" subtitle="Review and download your invoices">
      <div className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_-4px_rgba(255,229,217,0.5)] border border-[#FFE5D9]/30 mb-6">
        <h3 className="text-lg font-semibold text-stone-800 mb-2">Credit Balance</h3>
        <p className="text-sm text-stone-500">
          Available credits are applied by your daycare to future invoices.
        </p>
        <p className="mt-3 text-2xl font-quicksand font-bold text-stone-800">
          ${creditBalance.toFixed(2)}
        </p>
      </div>

      {invoices.length === 0 ? (
        <div className="bg-white p-8 rounded-3xl shadow-[0_4px_20px_-4px_rgba(255,229,217,0.5)] border border-[#FFE5D9]/30 text-center text-stone-500">
          No invoices found.
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-[0_4px_20px_-4px_rgba(255,229,217,0.5)] border border-[#FFE5D9]/30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#FFF8F3]">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">Invoice #</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">Date</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">Due Date</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">Child</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">Total</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">Paid</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">Balance</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y themed-border">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="themed-row transition-colors">
                    <td className="px-6 py-4 text-sm font-semibold text-stone-800">
                      {inv.invoice_number}
                    </td>
                    <td className="px-6 py-4 text-sm text-stone-600">
                      {new Date(inv.invoice_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-stone-600">
                      {new Date(inv.due_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-stone-600">
                      {inv.child_first_name} {inv.child_last_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-stone-600">
                      ${parseFloat(inv.total_amount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-stone-600">
                      ${parseFloat(inv.amount_paid).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-stone-600">
                      ${parseFloat(inv.balance_due).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#FFE5D9] text-[#C4554D]">
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => downloadPDF(inv)}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-[#E07A5F] bg-[#FFF8F3] hover:bg-[#FFE5D9] transition-colors"
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

      <div className="mt-10 bg-white p-6 rounded-3xl shadow-[0_4px_20px_-4px_rgba(255,229,217,0.5)] border border-[#FFE5D9]/30">
        <h3 className="text-lg font-semibold text-stone-800 mb-4">Payment Receipts</h3>
        {paymentsLoading ? (
          <div className="text-stone-500">Loading receipts...</div>
        ) : payments.length === 0 ? (
          <div className="text-stone-500">No payments recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#FFF8F3]">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">Receipt #</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">Invoice #</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">Date</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">Amount</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y themed-border">
                {payments.map((payment) => (
                  <tr key={payment.id} className="themed-row transition-colors">
                    <td className="px-6 py-4 text-sm text-stone-600">
                      {payment.receipt_number || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-stone-600">
                      {payment.invoice_number || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-stone-600">
                      {new Date(payment.payment_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-stone-600">
                      ${parseFloat(payment.amount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-stone-600">
                      {payment.status}
                    </td>
                    <td className="px-6 py-4">
                      {payment.status === 'PAID' ? (
                        <button
                          onClick={() => downloadReceipt(payment)}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-[#E07A5F] bg-[#FFF8F3] hover:bg-[#FFE5D9] transition-colors"
                        >
                          <FileDown size={16} />
                          Download
                        </button>
                      ) : (
                        <span className="text-xs font-semibold text-stone-400">Pending</span>
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
        className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-stone-500 hover:text-[#E07A5F]"
      >
        <ArrowLeft size={16} />
        Back to Dashboard
      </button>
    </ParentLayout>
  );
}

export default ParentInvoices;
