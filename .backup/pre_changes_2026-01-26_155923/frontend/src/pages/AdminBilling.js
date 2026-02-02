import { useState, useEffect } from 'react';
import api from '../utils/api';
import { buildPdfFileName } from '../utils/fileName';

function AdminBilling() {
  const [invoices, setInvoices] = useState([]);
  const [parents, setParents] = useState([]);
  const [children, setChildren] = useState([]);
  const [payments, setPayments] = useState([]);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showClosedInvoices, setShowClosedInvoices] = useState(false);
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [taxSettings, setTaxSettings] = useState({ tax_rate: 0.05, tax_enabled: true });
  const [markPaidForm, setMarkPaidForm] = useState({
    paymentDate: new Date().toISOString().split('T')[0],
    amount: '',
    paymentMethod: 'E-Transfer'
  });

  // Pagination for payment history
  const [currentPage, setCurrentPage] = useState(1);
  const paymentsPerPage = 10;

  // Invoice form state
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

  // Payment form state
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
    loadInvoices();
    loadParents();
    loadChildren();
    loadPayments();
    loadTaxSettings();
  }, []);

  const loadInvoices = async () => {
    try {
      const response = await api.get('/invoices');
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

  const loadTaxSettings = async () => {
    try {
      const response = await api.get('/settings');
      setTaxSettings({
        tax_rate: response.data.settings?.tax_rate ?? 0.05,
        tax_enabled: response.data.settings?.tax_enabled ?? true,
      });
      setInvoiceForm((prev) => ({
        ...prev,
        tax_rate: response.data.settings?.tax_rate ?? 0.05,
        tax_enabled: response.data.settings?.tax_enabled ?? true,
      }));
    } catch (error) {
      console.error('Load tax settings error:', error);
    }
  };
  const loadPayments = async () => {
    try {
      const response = await api.get('/parents/payments');
      setPayments(response.data.payments);
    } catch (error) {
      console.error('Load payments error:', error);
    }
  };

  // Invoice form handlers
  const handleInvoiceSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/invoices', invoiceForm);
      setShowInvoiceForm(false);
      resetInvoiceForm();
      loadInvoices();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to create invoice');
    }
  };

  const resetInvoiceForm = () => {
    setInvoiceForm({
      parent_id: '',
      child_id: '',
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: '',
      tax_enabled: taxSettings.tax_enabled,
      tax_rate: taxSettings.tax_rate,
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
      const totalWithTax = calculateSubtotal();
      const taxRate = parseFloat(invoiceForm.tax_rate) || 0;
      const subtotal = totalWithTax / (1 + taxRate);
      return totalWithTax - subtotal;
    } else {
      return calculateSubtotal() * (parseFloat(invoiceForm.tax_rate) || 0);
    }
  };

  const calculateTotal = () => {
    if (invoiceForm.pricing_mode === 'TOTAL_INCLUDES_TAX') {
      return calculateSubtotal();
    } else {
      return calculateSubtotal() + calculateTax();
    }
  };

  const formatCurrency = (amount) => {
    return `$${parseFloat(amount || 0).toFixed(2)}`;
  };

  // Payment form handlers
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/parents/payments', paymentForm);
      setShowPaymentForm(false);
      setPaymentForm({
        parentId: '',
        invoiceId: '',
        amount: '',
        paymentDate: new Date().toISOString().split('T')[0],
        status: 'PAID',
        paymentMethod: '',
        notes: '',
      });
      loadPayments();
      loadInvoices();
    } catch (error) {
      alert('Failed to create payment');
    }
  };

  const handleInvoiceChange = (invoiceId) => {
    const selectedInvoice = invoices.find(inv => inv.id === parseInt(invoiceId));
    if (selectedInvoice) {
      setPaymentForm({
        ...paymentForm,
        invoiceId,
        amount: selectedInvoice.balance_due || ''
      });
    } else {
      setPaymentForm({ ...paymentForm, invoiceId, amount: '' });
    }
  };

  const openMarkPaidModal = (invoice) => {
    setSelectedInvoice(invoice);
    setMarkPaidForm({
      paymentDate: new Date().toISOString().split('T')[0],
      amount: invoice.balance_due || '',
      paymentMethod: 'E-Transfer'
    });
    setShowMarkPaidModal(true);
  };

  const handleMarkAsPaid = async () => {
    if (!markPaidForm.amount || parseFloat(markPaidForm.amount) <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }

    try {
      // Create payment record
      await api.post('/parents/payments', {
        parentId: selectedInvoice.parent_id,
        invoiceId: selectedInvoice.id,
        amount: markPaidForm.amount,
        paymentDate: markPaidForm.paymentDate,
        status: 'PAID',
        paymentMethod: markPaidForm.paymentMethod,
        notes: 'Manual payment entry'
      });

      setShowMarkPaidModal(false);
      setSelectedInvoice(null);
      loadInvoices();
      loadPayments();
    } catch (error) {
      alert('Failed to record payment');
    }
  };

  const downloadInvoice = async (invoice) => {
    try {
      const response = await api.get(`/invoices/${invoice.id}/pdf`, {
        responseType: 'blob',
      });

      const childName = [invoice.child_first_name, invoice.child_last_name]
        .filter(Boolean)
        .join(' ')
        .trim();
      const parentName = `${invoice.parent_first_name || ''} ${invoice.parent_last_name || ''}`.trim();
      const namePart = childName || parentName || 'Unknown';
      const filename = buildPdfFileName('Invoice', invoice.invoice_date, namePart);

      const file = new File([response.data], filename, { type: 'application/pdf' });
      const url = window.URL.createObjectURL(file);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (error) {
      alert('Failed to download invoice');
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

  // Pagination
  const indexOfLastPayment = currentPage * paymentsPerPage;
  const indexOfFirstPayment = indexOfLastPayment - paymentsPerPage;
  const currentPayments = payments.slice(indexOfFirstPayment, indexOfLastPayment);
  const totalPages = Math.ceil(payments.length / paymentsPerPage);

  return (
    <main className="main">
      <div className="header">
        <h1>Billing</h1>
      </div>
      <div className="flex-between mb-2">
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={() => setShowInvoiceForm(!showInvoiceForm)}>
            {showInvoiceForm ? 'Cancel' : 'Create Invoice'}
          </button>
          <button onClick={() => setShowPaymentForm(!showPaymentForm)} className="secondary">
            {showPaymentForm ? 'Cancel' : 'Record Payment'}
          </button>
        </div>
      </div>

      {/* Invoice Creation Form */}
      {showInvoiceForm && (
        <div className="card mb-2">
          <h2>Create New Invoice</h2>
          <form onSubmit={handleInvoiceSubmit}>
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
                      {parent.first_name} {parent.last_name}
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={invoiceForm.tax_enabled}
                    disabled
                    style={{ marginRight: '0.5rem' }}
                  />
                  Enable Tax (GST)
                </label>
                <small style={{ display: 'block', marginTop: '0.25rem', color: '#666' }}>
                  Managed in Settings
                </small>
                {invoiceForm.tax_enabled && (
                  <input
                    type="number"
                    step="0.0001"
                    value={invoiceForm.tax_rate}
                    disabled
                    placeholder="0.05"
                    style={{ marginTop: '0.5rem' }}
                  />
                )}
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
                rows="2"
              />
            </div>

            <div style={{ background: '#f5f5f5', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Subtotal:</span>
                <strong>{formatCurrency(calculateSubtotal())}</strong>
              </div>
              {invoiceForm.tax_enabled && (
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

            <button type="submit">Create Invoice</button>
          </form>
        </div>
      )}

      {/* Payment Form */}
      {showPaymentForm && (
        <div className="card mb-2">
          <h2>Record Payment</h2>
          <form onSubmit={handlePaymentSubmit}>
            <div className="form-group">
              <label>Parent *</label>
              <select
                value={paymentForm.parentId}
                onChange={(e) => setPaymentForm({ ...paymentForm, parentId: e.target.value, invoiceId: '' })}
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
                value={paymentForm.invoiceId}
                onChange={(e) => handleInvoiceChange(e.target.value)}
              >
                <option value="">No invoice (general payment)</option>
                {invoices
                  .filter(inv => inv.status !== 'PAID' && parseFloat(inv.balance_due || 0) > 0)
                  .filter(inv => !paymentForm.parentId || inv.parent_id === parseInt(paymentForm.parentId))
                  .map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoice_number} - ${parseFloat(inv.balance_due || 0).toFixed(2)} due
                    </option>
                  ))}
              </select>
            </div>

            <div className="form-group">
              <label>Amount *</label>
              <input
                type="number"
                step="0.01"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Payment Date *</label>
              <input
                type="date"
                value={paymentForm.paymentDate}
                onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Payment Method</label>
              <select
                value={paymentForm.paymentMethod}
                onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
              >
                <option value="">Select method</option>
                <option value="E-Transfer">E-Transfer</option>
                <option value="Credit">Credit</option>
                <option value="Cheque">Cheque</option>
                <option value="Cash">Cash</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label>Notes</label>
              <textarea
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
              />
            </div>
            <button type="submit">Record Payment</button>
          </form>
        </div>
      )}

      {/* Invoices Table */}
      <div className="card mb-2">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0 }}>Invoices</h2>
          <button
            onClick={() => setShowClosedInvoices(!showClosedInvoices)}
            className="secondary"
            style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
          >
            {showClosedInvoices ? 'Hide Closed Invoices' : 'Show Closed Invoices'}
          </button>
        </div>
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
            {invoices
              .filter(invoice => showClosedInvoices ? true : invoice.status !== 'PAID')
              .map((invoice) => (
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
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => downloadInvoice(invoice)}
                      style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                      className="secondary"
                    >
                      Invoice PDF
                    </button>
                    {invoice.status !== 'PAID' && parseFloat(invoice.balance_due || 0) > 0 && (
                      <button
                        onClick={() => openMarkPaidModal(invoice)}
                        style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                      >
                        Mark as Paid
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Payment History with Pagination */}
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
            </tr>
          </thead>
          <tbody>
            {currentPayments.map((payment) => (
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
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1rem', padding: '1rem' }}>
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              style={{ padding: '0.5rem 1rem' }}
            >
              ← Previous
            </button>
            <span style={{ color: '#666' }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              style={{ padding: '0.5rem 1rem' }}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Mark as Paid Modal */}
      {showMarkPaidModal && selectedInvoice && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div className="card" style={{ maxWidth: '500px', margin: '1rem', width: '100%' }}>
            <h2>Record Payment</h2>
            <p style={{ marginBottom: '1rem', color: '#666' }}>
              Invoice #{selectedInvoice.invoice_number} - {selectedInvoice.parent_name}
            </p>

            <div className="form-group">
              <label>Payment Date *</label>
              <input
                type="date"
                value={markPaidForm.paymentDate}
                onChange={(e) => setMarkPaidForm({ ...markPaidForm, paymentDate: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Amount Paid *</label>
              <input
                type="number"
                step="0.01"
                value={markPaidForm.amount}
                onChange={(e) => setMarkPaidForm({ ...markPaidForm, amount: e.target.value })}
                placeholder="Enter amount"
              />
              <small style={{ display: 'block', marginTop: '0.25rem', color: '#666' }}>
                Balance due: ${parseFloat(selectedInvoice.balance_due || 0).toFixed(2)}
              </small>
            </div>

            <div className="form-group">
              <label>Payment Method</label>
              <select
                value={markPaidForm.paymentMethod}
                onChange={(e) => setMarkPaidForm({ ...markPaidForm, paymentMethod: e.target.value })}
              >
                <option value="E-Transfer">E-Transfer</option>
                <option value="Credit">Credit</option>
                <option value="Cheque">Cheque</option>
                <option value="Cash">Cash</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button onClick={handleMarkAsPaid}>
                Record Payment
              </button>
              <button
                className="secondary"
                onClick={() => {
                  setShowMarkPaidModal(false);
                  setSelectedInvoice(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default AdminBilling;
