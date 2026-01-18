import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileDown, ArrowLeft } from 'lucide-react';
import { ParentLayout } from '../components/ParentLayout';
import api from '../utils/api';

function ParentInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadInvoices();
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

  const downloadPDF = async (invoiceId, invoiceNumber) => {
    try {
      const response = await api.get(`/parent/invoices/${invoiceId}/pdf`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Download PDF error:', error);
      alert('Failed to download invoice');
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
              <tbody className="divide-y divide-stone-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[#FFF8F3] transition-colors">
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
                        onClick={() => downloadPDF(inv.id, inv.invoice_number)}
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
