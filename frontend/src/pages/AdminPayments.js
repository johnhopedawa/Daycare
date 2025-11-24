import React, { useState, useEffect } from 'react';
import api from '../utils/api';

function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [parents, setParents] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    parentId: '',
    invoiceId: '',
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    status: 'COMPLETED',
    paymentMethod: '',
    notes: '',
  });

  useEffect(() => {
    loadPayments();
    loadParents();
    loadInvoices();
  }, []);

  const loadPayments = async () => {
    try {
      const response = await api.get('/parents/payments');
      setPayments(response.data.payments);
    } catch (error) {
      console.error('Load payments error:', error);
    }
  };

  const loadParents = async () => {
    try {
      const response = await api.get('/parents');
      setParents(response.data.parents);
    } catch (error) {
      console.error('Load parents error:', error);
    }
  };

  const loadInvoices = async () => {
    try {
      const response = await api.get('/invoices');
      setInvoices(response.data.invoices);
    } catch (error) {
      console.error('Load invoices error:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/parents/payments', formData);
      setShowForm(false);
      setFormData({
        parentId: '',
        invoiceId: '',
        amount: '',
        paymentDate: new Date().toISOString().split('T')[0],
        status: 'COMPLETED',
        paymentMethod: '',
        notes: '',
      });
      loadPayments();
      loadInvoices(); // Reload invoices to update balance_due
    } catch (error) {
      alert('Failed to create payment');
    }
  };

  const handleParentChange = (parentId) => {
    setFormData({ ...formData, parentId, invoiceId: '' });
  };

  const handleInvoiceChange = (invoiceId) => {
    const selectedInvoice = invoices.find(inv => inv.id === parseInt(invoiceId));
    if (selectedInvoice) {
      setFormData({
        ...formData,
        invoiceId,
        amount: selectedInvoice.balance_due || ''
      });
    } else {
      setFormData({ ...formData, invoiceId, amount: '' });
    }
  };

  const markAsPaid = async (id) => {
    try {
      await api.patch(`/parents/payments/${id}`, { status: 'PAID' });
      // Generate receipt
      await api.post(`/documents/parent-payments/${id}/generate-receipt`);
      loadPayments();
    } catch (error) {
      alert('Failed to mark as paid');
    }
  };

  const downloadReceipt = async (id) => {
    try {
      const response = await api.get(`/documents/parent-payments/${id}/receipt-pdf`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `receipt-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert('Failed to download receipt');
    }
  };

  const markInvoiceAsPaid = async (invoiceId) => {
    if (!window.confirm('Mark this invoice as paid? This will update the invoice status to PAID.')) {
      return;
    }

    try {
      await api.patch(`/invoices/${invoiceId}`, { status: 'PAID' });
      loadInvoices();
    } catch (error) {
      alert('Failed to mark invoice as paid');
    }
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      DRAFT: 'badge-draft',
      SENT: 'badge-sent',
      PARTIAL: 'badge-partial',
      PAID: 'badge-approved',
      OVERDUE: 'badge-overdue',
    };
    return <span className={`badge ${statusColors[status] || ''}`}>{status}</span>;
  };

  return (
    <div className="main-content">
      <div className="flex-between mb-2">
        <h1>Parent Payments</h1>
        <button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Add Payment'}
        </button>
      </div>

      <div className="card mb-2">
        <h2>Invoices</h2>
        <table>
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Parent</th>
              <th>Invoice Date</th>
              <th>Due Date</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Balance</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td>{invoice.invoice_number}</td>
                <td>{invoice.parent_name || '-'}</td>
                <td>{new Date(invoice.invoice_date).toLocaleDateString()}</td>
                <td>{new Date(invoice.due_date).toLocaleDateString()}</td>
                <td>${parseFloat(invoice.total_amount || 0).toFixed(2)}</td>
                <td>${parseFloat(invoice.amount_paid || 0).toFixed(2)}</td>
                <td>${parseFloat(invoice.balance_due || 0).toFixed(2)}</td>
                <td>{getStatusBadge(invoice.status)}</td>
                <td>
                  {invoice.status !== 'PAID' && parseFloat(invoice.balance_due || 0) > 0 && (
                    <button
                      onClick={() => markInvoiceAsPaid(invoice.id)}
                      style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                    >
                      Mark as Paid
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="card mb-2">
          <h2>Log Payment</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Parent *</label>
              <select
                value={formData.parentId}
                onChange={(e) => handleParentChange(e.target.value)}
                required
              >
                <option value="">Select parent</option>
                {parents.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.first_name} {p.last_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Invoice (Optional)</label>
              <select
                value={formData.invoiceId}
                onChange={(e) => handleInvoiceChange(e.target.value)}
              >
                <option value="">No invoice (general payment)</option>
                {invoices
                  .filter(inv => inv.status !== 'PAID' && parseFloat(inv.balance_due || 0) > 0)
                  .filter(inv => !formData.parentId || inv.parent_id === parseInt(formData.parentId))
                  .map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoice_number} - ${parseFloat(inv.balance_due || 0).toFixed(2)} due
                      {inv.parent_name ? ` (${inv.parent_name})` : ''}
                    </option>
                  ))}
              </select>
              <small style={{ display: 'block', marginTop: '0.25rem', color: '#666' }}>
                Select an open invoice to link this payment. The amount will auto-fill with the balance due.
              </small>
            </div>

            <div className="form-group">
              <label>Amount *</label>
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
              {formData.invoiceId && (
                <small style={{ display: 'block', marginTop: '0.25rem', color: '#666' }}>
                  You can adjust the amount for partial payments
                </small>
              )}
            </div>
            <div className="form-group">
              <label>Payment Date *</label>
              <input
                type="date"
                value={formData.paymentDate}
                onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="PENDING">Pending</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
            <div className="form-group">
              <label>Payment Method</label>
              <input
                type="text"
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                placeholder="e.g., Cash, Check, Card"
              />
            </div>
            <div className="form-group">
              <label>Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
            <button type="submit">Create Payment</button>
          </form>
        </div>
      )}

      <div className="card">
        <h2>Payment History</h2>
      <table>
        <thead>
          <tr>
            <th>Parent</th>
            <th>Invoice</th>
            <th>Amount</th>
            <th>Date</th>
            <th>Method</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => (
            <tr key={payment.id}>
              <td>{payment.first_name} {payment.last_name}</td>
              <td>
                {payment.invoice_number ? (
                  <span style={{ fontSize: '0.875rem' }}>{payment.invoice_number}</span>
                ) : (
                  <span style={{ fontSize: '0.875rem', color: '#999' }}>-</span>
                )}
              </td>
              <td>${parseFloat(payment.amount).toFixed(2)}</td>
              <td>{new Date(payment.payment_date).toLocaleDateString()}</td>
              <td>{payment.payment_method || '-'}</td>
              <td>
                <span className={`badge ${payment.status.toLowerCase()}`}>
                  {payment.status}
                </span>
              </td>
              <td>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {payment.status === 'PENDING' ? (
                    <button
                      className="success"
                      onClick={() => markAsPaid(payment.id)}
                      style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                    >
                      Mark Completed
                    </button>
                  ) : (
                    <button
                      onClick={() => downloadReceipt(payment.id)}
                      style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                    >
                      Receipt
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
}

export default AdminPayments;
