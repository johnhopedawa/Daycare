import React, { useState, useEffect } from 'react';
import api from '../utils/api';

function AdminInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [parents, setParents] = useState([]);
  const [children, setChildren] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterParent, setFilterParent] = useState('');

  const [invoiceForm, setInvoiceForm] = useState({
    parent_id: '',
    child_id: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    tax_enabled: true,
    tax_rate: 0.05,
    pricing_mode: 'BASE_PLUS_TAX',
    notes: '',
    payment_terms: 'Due upon receipt',
    line_items: [{ description: '', quantity: 1, rate: '', amount: 0 }]
  });

  useEffect(() => {
    loadInvoices();
    loadParents();
    loadChildren();
  }, [searchTerm, filterStatus, filterParent]);

  const loadInvoices = async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      if (filterParent) params.append('parent_id', filterParent);
      if (searchTerm) params.append('search', searchTerm);

      const response = await api.get(`/invoices?${params}`);
      setInvoices(response.data.invoices);
    } catch (error) {
      console.error('Load invoices error:', error);
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

  const loadChildren = async () => {
    try {
      const response = await api.get('/children');
      setChildren(response.data.children);
    } catch (error) {
      console.error('Load children error:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingInvoice) {
        await api.patch(`/invoices/${editingInvoice.id}`, invoiceForm);
      } else {
        await api.post('/invoices', invoiceForm);
      }

      setShowForm(false);
      setEditingInvoice(null);
      resetForm();
      loadInvoices();
      alert(editingInvoice ? 'Invoice updated successfully!' : 'Invoice created successfully!');
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to save invoice');
    }
  };

  const handleEdit = (invoice) => {
    setEditingInvoice(invoice);
    setInvoiceForm({
      parent_id: invoice.parent_id || '',
      child_id: invoice.child_id || '',
      invoice_date: invoice.invoice_date ? invoice.invoice_date.split('T')[0] : '',
      due_date: invoice.due_date ? invoice.due_date.split('T')[0] : '',
      tax_enabled: invoice.tax_enabled !== undefined ? invoice.tax_enabled : true,
      tax_rate: invoice.tax_rate !== undefined ? invoice.tax_rate : 0.05,
      pricing_mode: invoice.pricing_mode || 'BASE_PLUS_TAX',
      notes: invoice.notes || '',
      payment_terms: invoice.payment_terms || 'Due upon receipt',
      line_items: invoice.line_items || [{ description: '', quantity: 1, rate: '', amount: 0 }]
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this invoice?')) {
      return;
    }

    try {
      await api.delete(`/invoices/${id}`);
      loadInvoices();
    } catch (error) {
      alert('Failed to delete invoice');
    }
  };

  const handleDownloadPDF = async (id, invoiceNumber) => {
    try {
      const response = await api.get(`/invoices/${id}/pdf`, {
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
      alert('Failed to download PDF');
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.patch(`/invoices/${id}`, { status: newStatus });
      loadInvoices();
    } catch (error) {
      alert('Failed to update status');
    }
  };

  const resetForm = () => {
    setInvoiceForm({
      parent_id: '',
      child_id: '',
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: '',
      tax_enabled: true,
      tax_rate: 0.05,
      pricing_mode: 'BASE_PLUS_TAX',
      notes: '',
      payment_terms: 'Due upon receipt',
      line_items: [{ description: '', quantity: 1, rate: '', amount: 0 }]
    });
  };

  const addLineItem = () => {
    setInvoiceForm({
      ...invoiceForm,
      line_items: [...invoiceForm.line_items, { description: '', quantity: 1, rate: '', amount: 0 }]
    });
  };

  const removeLineItem = (index) => {
    const newLineItems = invoiceForm.line_items.filter((_, i) => i !== index);
    setInvoiceForm({ ...invoiceForm, line_items: newLineItems });
  };

  const updateLineItem = (index, field, value) => {
    const newLineItems = [...invoiceForm.line_items];
    newLineItems[index][field] = value;

    // Auto-calculate amount
    if (field === 'quantity' || field === 'rate') {
      const quantity = parseFloat(newLineItems[index].quantity) || 0;
      const rate = parseFloat(newLineItems[index].rate) || 0;
      newLineItems[index].amount = quantity * rate;
    }

    setInvoiceForm({ ...invoiceForm, line_items: newLineItems });
  };

  const calculateSubtotal = () => {
    return invoiceForm.line_items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  };

  const calculateTax = () => {
    if (!invoiceForm.tax_enabled) return 0;

    if (invoiceForm.pricing_mode === 'TOTAL_INCLUDES_TAX') {
      // Back-calculate tax from total
      const totalWithTax = calculateSubtotal();
      const taxRate = parseFloat(invoiceForm.tax_rate) || 0;
      const subtotal = totalWithTax / (1 + taxRate);
      return totalWithTax - subtotal;
    } else {
      // Standard: tax on subtotal
      return calculateSubtotal() * (parseFloat(invoiceForm.tax_rate) || 0);
    }
  };

  const calculateTotal = () => {
    if (invoiceForm.pricing_mode === 'TOTAL_INCLUDES_TAX') {
      // Total is the subtotal (which includes tax)
      return calculateSubtotal();
    } else {
      // Standard: subtotal + tax
      return calculateSubtotal() + calculateTax();
    }
  };

  const calculateDisplaySubtotal = () => {
    if (invoiceForm.pricing_mode === 'TOTAL_INCLUDES_TAX' && invoiceForm.tax_enabled) {
      // Back-calculate subtotal from total
      const totalWithTax = calculateSubtotal();
      const taxRate = parseFloat(invoiceForm.tax_rate) || 0;
      return totalWithTax / (1 + taxRate);
    } else {
      return calculateSubtotal();
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return `$${parseFloat(amount || 0).toFixed(2)}`;
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'PAID': return 'success';
      case 'PARTIAL': return 'warning';
      case 'OVERDUE': return 'danger';
      case 'SENT': return 'info';
      default: return '';
    }
  };

  return (
    <div className="main-content">
      <div className="flex-between mb-2">
        <h1>Invoices</h1>
        <button onClick={() => {
          setShowForm(!showForm);
          if (!showForm) {
            setEditingInvoice(null);
            resetForm();
          }
        }}>
          {showForm ? 'Cancel' : 'Create Invoice'}
        </button>
      </div>

      {showForm && (
        <div className="card mb-2">
          <h2>{editingInvoice ? 'Edit Invoice' : 'Create New Invoice'}</h2>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Parent *</label>
                <select
                  value={invoiceForm.parent_id}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, parent_id: e.target.value })}
                  required
                >
                  <option value="">Select Parent</option>
                  {parents.map(parent => (
                    <option key={parent.id} value={parent.id}>
                      {parent.first_name} {parent.last_name} {parent.email && `(${parent.email})`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Child (Optional)</label>
                <select
                  value={invoiceForm.child_id}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, child_id: e.target.value })}
                >
                  <option value="">Select Child</option>
                  {children.filter(c => c.status === 'ACTIVE').map(child => (
                    <option key={child.id} value={child.id}>
                      {child.first_name} {child.last_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Invoice Date *</label>
                <input
                  type="date"
                  value={invoiceForm.invoice_date}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, invoice_date: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Due Date *</label>
                <input
                  type="date"
                  value={invoiceForm.due_date}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, due_date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Line Items *</label>
              {invoiceForm.line_items.map((item, index) => (
                <div key={index} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                    required
                  />
                  <input
                    type="number"
                    step="1"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                    required
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Rate"
                    value={item.rate}
                    onChange={(e) => updateLineItem(index, 'rate', e.target.value)}
                    required
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Amount"
                    value={item.amount}
                    readOnly
                    style={{ background: '#f5f5f5' }}
                  />
                  {invoiceForm.line_items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLineItem(index)}
                      className="danger"
                      style={{ padding: '0.5rem' }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addLineItem} className="secondary" style={{ marginTop: '0.5rem' }}>
                + Add Line Item
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={invoiceForm.tax_enabled}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, tax_enabled: e.target.checked })}
                    style={{ marginRight: '0.5rem' }}
                  />
                  Enable Tax (GST)
                </label>
                {invoiceForm.tax_enabled && (
                  <input
                    type="number"
                    step="0.0001"
                    value={invoiceForm.tax_rate}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, tax_rate: e.target.value })}
                    placeholder="0.05"
                    style={{ marginTop: '0.5rem' }}
                  />
                )}
                {invoiceForm.tax_enabled && (
                  <small style={{ display: 'block', marginTop: '0.25rem', color: '#666' }}>
                    Default: 0.05 (5% GST for BC)
                  </small>
                )}
              </div>
              <div className="form-group">
                <label>Pricing Mode</label>
                <select
                  value={invoiceForm.pricing_mode}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, pricing_mode: e.target.value })}
                >
                  <option value="BASE_PLUS_TAX">Base Price + Tax</option>
                  <option value="TOTAL_INCLUDES_TAX">Total Includes Tax</option>
                </select>
                <small style={{ display: 'block', marginTop: '0.25rem', color: '#666' }}>
                  {invoiceForm.pricing_mode === 'BASE_PLUS_TAX'
                    ? 'Tax is added to base price'
                    : 'Tax is included in line item amounts'}
                </small>
              </div>
              <div className="form-group">
                <label>Payment Terms</label>
                <input
                  type="text"
                  value={invoiceForm.payment_terms}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, payment_terms: e.target.value })}
                  placeholder="Due upon receipt"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Notes</label>
              <textarea
                value={invoiceForm.notes}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
                rows="3"
                placeholder="Additional notes for the invoice..."
              />
            </div>

            <div style={{ background: '#f5f5f5', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>
                  {invoiceForm.pricing_mode === 'TOTAL_INCLUDES_TAX' ? 'Line Items Total:' : 'Subtotal:'}
                </span>
                <strong>{formatCurrency(calculateSubtotal())}</strong>
              </div>
              {invoiceForm.pricing_mode === 'TOTAL_INCLUDES_TAX' && invoiceForm.tax_enabled && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#666' }}>
                    <span>Subtotal (before tax):</span>
                    <span>{formatCurrency(calculateDisplaySubtotal())}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#666' }}>
                    <span>Tax ({(parseFloat(invoiceForm.tax_rate) * 100).toFixed(2)}%):</span>
                    <span>{formatCurrency(calculateTax())}</span>
                  </div>
                </>
              )}
              {invoiceForm.pricing_mode === 'BASE_PLUS_TAX' && invoiceForm.tax_enabled && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span>Tax ({(parseFloat(invoiceForm.tax_rate) * 100).toFixed(2)}%):</span>
                  <strong>{formatCurrency(calculateTax())}</strong>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', paddingTop: '0.5rem', borderTop: '2px solid #ddd' }}>
                <strong>Total:</strong>
                <strong>{formatCurrency(calculateTotal())}</strong>
              </div>
            </div>

            <button type="submit">{editingInvoice ? 'Update Invoice' : 'Create Invoice'}</button>
          </form>
        </div>
      )}

      <div className="card">
        <div className="flex-between mb-2">
          <h2>All Invoices</h2>
          <div className="flex" style={{ gap: '1rem' }}>
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '200px' }}
            />
            <select
              value={filterParent}
              onChange={(e) => setFilterParent(e.target.value)}
            >
              <option value="">All Parents</option>
              {parents.map(parent => (
                <option key={parent.id} value={parent.id}>
                  {parent.first_name} {parent.last_name}
                </option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="SENT">Sent</option>
              <option value="UNPAID">Unpaid</option>
              <option value="PARTIAL">Partial</option>
              <option value="PAID">Paid</option>
              <option value="OVERDUE">Overdue</option>
            </select>
          </div>
        </div>

        {invoices.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>
            No invoices found. Create your first invoice to get started!
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Parent</th>
                <th>Child</th>
                <th>Date</th>
                <th>Due Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(invoice => (
                <tr key={invoice.id}>
                  <td><strong>{invoice.invoice_number}</strong></td>
                  <td>
                    {invoice.parent_first_name} {invoice.parent_last_name}
                    {invoice.parent_email && (
                      <div style={{ fontSize: '0.75rem', color: '#666' }}>{invoice.parent_email}</div>
                    )}
                  </td>
                  <td>
                    {invoice.child_first_name ? (
                      `${invoice.child_first_name} ${invoice.child_last_name}`
                    ) : (
                      <span style={{ color: '#999' }}>N/A</span>
                    )}
                  </td>
                  <td>{formatDate(invoice.invoice_date)}</td>
                  <td>{formatDate(invoice.due_date)}</td>
                  <td>
                    <div>{formatCurrency(invoice.total_amount)}</div>
                    {parseFloat(invoice.amount_paid) > 0 && (
                      <div style={{ fontSize: '0.75rem', color: '#666' }}>
                        Paid: {formatCurrency(invoice.amount_paid)}
                      </div>
                    )}
                    {parseFloat(invoice.balance_due) > 0 && (
                      <div style={{ fontSize: '0.75rem', color: '#d32f2f' }}>
                        Due: {formatCurrency(invoice.balance_due)}
                      </div>
                    )}
                  </td>
                  <td>
                    <select
                      value={invoice.status}
                      onChange={(e) => handleStatusChange(invoice.id, e.target.value)}
                      className={getStatusBadgeClass(invoice.status)}
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="SENT">Sent</option>
                      <option value="UNPAID">Unpaid</option>
                      <option value="PARTIAL">Partial</option>
                      <option value="PAID">Paid</option>
                      <option value="OVERDUE">Overdue</option>
                    </select>
                  </td>
                  <td>
                    <div className="flex" style={{ gap: '0.5rem', flexDirection: 'column' }}>
                      <button
                        onClick={() => handleDownloadPDF(invoice.id, invoice.invoice_number)}
                        style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                      >
                        Download PDF
                      </button>
                      <button
                        onClick={() => handleEdit(invoice)}
                        className="secondary"
                        style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(invoice.id)}
                        className="danger"
                        style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default AdminInvoices;
