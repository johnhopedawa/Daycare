import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { MetricCard } from '../components/DashboardWidgets';
import { BaseModal } from '../components/modals/BaseModal';
import { DollarSign, Clock, AlertCircle, Download, Send } from 'lucide-react';
import api from '../utils/api';
import { CreateInvoiceModal } from '../components/modals/CreateInvoiceModal';

export function BillingPage() {
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    pending: 0,
    overdue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
  const [isDeleteInvoiceOpen, setIsDeleteInvoiceOpen] = useState(false);
  const [selectedInvoiceForDelete, setSelectedInvoiceForDelete] = useState(null);
  const [openInvoiceSort, setOpenInvoiceSort] = useState({ key: 'invoice_date', direction: 'desc' });
  const [closedInvoiceSort, setClosedInvoiceSort] = useState({ key: 'invoice_date', direction: 'desc' });

  useEffect(() => {
    loadBillingData();
  }, []);

  const loadBillingData = async () => {
    try {
      setLoading(true);
      const [invoicesResponse] = await Promise.all([
        api.get('/invoices'),
      ]);
      const invoicesData = invoicesResponse.data.invoices || [];
      setInvoices(invoicesData);

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

  const openInvoicePdf = async (invoice) => {
    try {
      const response = await api.post(`/invoices/${invoice.id}/pdf-link`);
      if (response.data?.url) {
        window.open(response.data.url, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('Failed to open invoice PDF:', error);
      alert(error.response?.data?.error || 'Failed to open invoice PDF');
    }
  };

  const cardStyles = [
    { backgroundColor: 'var(--card-1)', color: 'var(--card-text-1)' },
    { backgroundColor: 'var(--card-2)', color: 'var(--card-text-2)' },
    { backgroundColor: 'var(--card-3)', color: 'var(--card-text-3)' },
    { backgroundColor: 'var(--card-4)', color: 'var(--card-text-4)' },
  ];

  const getStatusBadge = (status) => {
    const styles = {
      PAID: cardStyles[1],
      SENT: cardStyles[2],
      PARTIAL: cardStyles[0],
      OVERDUE: cardStyles[3],
      DRAFT: { backgroundColor: 'var(--background)', color: 'var(--muted)' },
    };
    const style = styles[status] || { backgroundColor: 'var(--background)', color: 'var(--muted)' };
    return (
      <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full" style={style}>
        {status}
      </span>
    );
  };

  const getInvoiceFamilyLabel = (invoice) => {
    if (invoice.family_name) return invoice.family_name;
    const lastName = invoice.parent_last_name || (invoice.parent_name ? invoice.parent_name.split(' ').slice(-1)[0] : '');
    if (lastName) return `${lastName} Family`;
    return invoice.parent_name || 'Family';
  };

  const handleInvoiceSort = (setter, key) => {
    setter((prev) => {
      const isSameKey = prev.key === key;
      const nextDirection = isSameKey
        ? (prev.direction === 'asc' ? 'desc' : 'asc')
        : (key === 'invoice_date' ? 'desc' : 'asc');
      return { key, direction: nextDirection };
    });
  };

  const getInvoiceSortValue = (invoice, key) => {
    switch (key) {
      case 'invoice_number':
        return (invoice.invoice_number || '').toString().toLowerCase();
      case 'family':
        return getInvoiceFamilyLabel(invoice).toLowerCase();
      case 'invoice_date':
        return new Date(invoice.invoice_date).getTime();
      case 'total_amount':
        return parseFloat(invoice.total_amount || 0);
      case 'balance_due':
        return parseFloat(invoice.balance_due || 0);
      case 'status':
        return (invoice.status || '').toString().toLowerCase();
      default:
        return '';
    }
  };

  const sortInvoices = (list, sortConfig) => {
    const direction = sortConfig.direction === 'asc' ? 1 : -1;
    const key = sortConfig.key;
    return [...list].sort((a, b) => {
      const valueA = getInvoiceSortValue(a, key);
      const valueB = getInvoiceSortValue(b, key);
      if (typeof valueA === 'number' && typeof valueB === 'number') {
        return (valueA - valueB) * direction;
      }
      return String(valueA).localeCompare(String(valueB)) * direction;
    });
  };

  const renderInvoiceHeader = (label, key, sortConfig, setSort) => {
    const isActive = sortConfig.key === key;
    const indicator = isActive ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '';
    return (
      <button
        type="button"
        onClick={() => handleInvoiceSort(setSort, key)}
        className="inline-flex items-center gap-1 text-left"
      >
        <span>{label}</span>
        <span className="text-[10px] text-stone-400">{indicator}</span>
      </button>
    );
  };

  const openInvoices = sortInvoices(invoices.filter((invoice) => invoice.status !== 'PAID'), openInvoiceSort);
  const closedInvoices = sortInvoices(invoices.filter((invoice) => invoice.status === 'PAID'), closedInvoiceSort);

  if (loading) {
    return (
      <Layout title="Billing & Invoices" subtitle="Manage invoices and billing records">
        <div className="flex items-center justify-center h-64">
          <div className="text-stone-500">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Billing & Invoices" subtitle="Manage invoices and billing records">
      {/* Financial Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <MetricCard
          title="Revenue This Month"
          value={`$${stats.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={DollarSign}
          themeIndex={2}
          delay={0.1}
        />
        <MetricCard
          title="Pending Payments"
          value={`$${stats.pending.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={Clock}
          themeIndex={3}
          delay={0.2}
        />
        <MetricCard
          title="Overdue"
          value={`$${stats.overdue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={AlertCircle}
          themeIndex={4}
          delay={0.3}
        />
      </div>

      {/* Invoices Table */}
      <div className="themed-surface rounded-3xl overflow-hidden">
        <div className="p-6 border-b themed-border flex flex-wrap justify-between items-center gap-3">
          <h3 className="font-quicksand font-bold text-xl text-stone-800">
            Open Invoices
          </h3>
          <div className="flex gap-2">
            <button
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl border themed-border text-stone-600 font-bold hover:bg-[var(--background)] transition-colors"
            >
              <Download size={16} /> Export
            </button>
            <button
              onClick={() => setIsCreateInvoiceOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[var(--primary)] text-white rounded-2xl font-bold shadow-lg shadow-[0_12px_20px_-12px_var(--menu-shadow)] hover:opacity-90 transition-all hover:scale-105"
            >
              <Send size={16} /> Create Invoice
            </button>
          </div>
        </div>

        {openInvoices.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-stone-500">No open invoices found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ backgroundColor: 'var(--background)' }}>
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase tracking-wider font-quicksand">
                    {renderInvoiceHeader('Invoice #', 'invoice_number', openInvoiceSort, setOpenInvoiceSort)}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase tracking-wider font-quicksand">
                    {renderInvoiceHeader('Family', 'family', openInvoiceSort, setOpenInvoiceSort)}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase tracking-wider font-quicksand">
                    {renderInvoiceHeader('Date Issued', 'invoice_date', openInvoiceSort, setOpenInvoiceSort)}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase tracking-wider font-quicksand">
                    {renderInvoiceHeader('Amount', 'total_amount', openInvoiceSort, setOpenInvoiceSort)}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase tracking-wider font-quicksand">
                    {renderInvoiceHeader('Balance Due', 'balance_due', openInvoiceSort, setOpenInvoiceSort)}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase tracking-wider font-quicksand">
                    {renderInvoiceHeader('Status', 'status', openInvoiceSort, setOpenInvoiceSort)}
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-stone-500 uppercase tracking-wider font-quicksand">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y themed-border">
                {openInvoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="themed-row transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        type="button"
                        onClick={() => openInvoicePdf(invoice)}
                        className="text-[var(--primary-dark)] hover:text-[var(--primary)] font-semibold"
                      >
                        {invoice.invoice_number}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-stone-800">
                      {getInvoiceFamilyLabel(invoice)}
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
                      <button
                        onClick={() => openDeleteInvoiceModal(invoice)}
                        className="px-3 py-2 rounded-xl text-xs font-bold text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
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

      {/* Closed Invoices */}
      <div className="themed-surface rounded-3xl overflow-hidden mt-8">
        <div className="p-6 border-b themed-border">
          <h3 className="font-quicksand font-bold text-xl text-stone-800">
            Closed Invoices
          </h3>
        </div>

        {closedInvoices.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-stone-500">No closed invoices</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ backgroundColor: 'var(--background)' }}>
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase tracking-wider font-quicksand">
                    {renderInvoiceHeader('Invoice #', 'invoice_number', closedInvoiceSort, setClosedInvoiceSort)}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase tracking-wider font-quicksand">
                    {renderInvoiceHeader('Family', 'family', closedInvoiceSort, setClosedInvoiceSort)}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase tracking-wider font-quicksand">
                    {renderInvoiceHeader('Date Issued', 'invoice_date', closedInvoiceSort, setClosedInvoiceSort)}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase tracking-wider font-quicksand">
                    {renderInvoiceHeader('Amount', 'total_amount', closedInvoiceSort, setClosedInvoiceSort)}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase tracking-wider font-quicksand">
                    {renderInvoiceHeader('Balance Due', 'balance_due', closedInvoiceSort, setClosedInvoiceSort)}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase tracking-wider font-quicksand">
                    {renderInvoiceHeader('Status', 'status', closedInvoiceSort, setClosedInvoiceSort)}
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-stone-500 uppercase tracking-wider font-quicksand">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y themed-border">
                {closedInvoices.map((invoice) => (
                  <tr key={invoice.id} className="themed-row transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        type="button"
                        onClick={() => openInvoicePdf(invoice)}
                        className="text-[var(--primary-dark)] hover:text-[var(--primary)] font-semibold"
                      >
                        {invoice.invoice_number}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-stone-800">
                      {getInvoiceFamilyLabel(invoice)}
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
                      <button
                        onClick={() => openDeleteInvoiceModal(invoice)}
                        className="px-3 py-2 rounded-xl text-xs font-bold text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
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
              className="flex-1 px-6 py-3 rounded-2xl border themed-border text-stone-600 font-bold themed-hover transition-colors"
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
