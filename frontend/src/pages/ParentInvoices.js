import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

  if (loading) return <main className="main"><div className="loading">Loading...</div></main>;

  return (
    <main className="main">
      <div className="header">
        <h1>My Invoices</h1>
      </div>

      {invoices.length === 0 ? (
        <div className="card">
          <p>No invoices found</p>
        </div>
      ) : (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Date</th>
                <th>Due Date</th>
                <th>Child</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id}>
                  <td>{inv.invoice_number}</td>
                  <td>{new Date(inv.invoice_date).toLocaleDateString()}</td>
                  <td>{new Date(inv.due_date).toLocaleDateString()}</td>
                  <td>{inv.child_first_name} {inv.child_last_name}</td>
                  <td>${parseFloat(inv.total_amount).toFixed(2)}</td>
                  <td>${parseFloat(inv.amount_paid).toFixed(2)}</td>
                  <td>${parseFloat(inv.balance_due).toFixed(2)}</td>
                  <td><span className={`badge badge-${inv.status.toLowerCase()}`}>{inv.status}</span></td>
                  <td>
                    <button
                      onClick={() => downloadPDF(inv.id, inv.invoice_number)}
                      className="btn-sm secondary"
                    >
                      Download PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button onClick={() => navigate('/parent/dashboard')} className="secondary">
        Back to Dashboard
      </button>
    </main>
  );
}

export default ParentInvoices;
