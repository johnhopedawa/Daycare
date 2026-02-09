import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  CreditCard,
  Mail,
  ArrowUpRight,
  Banknote,
  FileText,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ParentLayout } from '../components/ParentLayout';
import api from '../utils/api';

function ParentDashboard() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await api.get('/parent/dashboard');
      setDashboard(response.data);
    } catch (error) {
      console.error('Load dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ParentLayout title="Dashboard" subtitle="Your family overview">
        <div className="flex items-center justify-center h-48 parent-text-muted">Loading...</div>
      </ParentLayout>
    );
  }

  return (
    <ParentLayout
      title={(
        <>
          Welcome back, <span className="text-teal-500">{user.first_name}</span>
        </>
      )}
      subtitle="Here is a snapshot of your family account"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <div className="parent-card rounded-xl p-6 border border-gray-100 hover:shadow-md transition-all duration-300 group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Children Enrolled</p>
              <h3 className="text-2xl font-bold text-gray-800 tracking-tight group-hover:text-teal-600 transition-colors">
                {dashboard?.children_count || 0}
              </h3>
            </div>
            <div className="p-3 bg-teal-50 rounded-full group-hover:bg-teal-100 transition-colors">
              <Users className="w-6 h-6 text-teal-400 group-hover:text-teal-600 transition-colors" />
            </div>
          </div>
        </div>

        <div className="parent-card rounded-xl p-6 border border-gray-100 hover:shadow-md transition-all duration-300 group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Outstanding Balance</p>
              <h3 className="text-2xl font-bold text-gray-800 tracking-tight group-hover:text-teal-600 transition-colors">
                ${dashboard?.outstanding_balance?.toFixed(2) || '0.00'}
              </h3>
            </div>
            <div className="p-3 bg-teal-50 rounded-full group-hover:bg-teal-100 transition-colors">
              <CreditCard className="w-6 h-6 text-teal-400 group-hover:text-teal-600 transition-colors" />
            </div>
          </div>
        </div>

        <div className="parent-card rounded-xl p-6 border border-gray-100 hover:shadow-md transition-all duration-300 group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Credit Balance</p>
              <h3 className="text-2xl font-bold text-gray-800 tracking-tight group-hover:text-teal-600 transition-colors">
                ${dashboard?.credit_balance?.toFixed(2) || '0.00'}
              </h3>
            </div>
            <div className="p-3 bg-teal-50 rounded-full group-hover:bg-teal-100 transition-colors">
              <Banknote className="w-6 h-6 text-teal-400 group-hover:text-teal-600 transition-colors" />
            </div>
          </div>
        </div>

        <div className="parent-card rounded-xl p-6 border border-gray-100 hover:shadow-md transition-all duration-300 group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Unread Messages</p>
              <h3 className="text-2xl font-bold text-gray-800 tracking-tight group-hover:text-teal-600 transition-colors">
                {dashboard?.unread_messages_count || 0}
              </h3>
            </div>
            <div className="p-3 bg-teal-50 rounded-full group-hover:bg-teal-100 transition-colors">
              <Mail className="w-6 h-6 text-teal-400 group-hover:text-teal-600 transition-colors" />
            </div>
          </div>
        </div>
      </div>

      <section className="mt-10 mb-10">
        <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">Quick Links</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button
            onClick={() => navigate('/parent/children')}
            className="parent-card group flex items-center justify-between p-6 rounded-xl hover:shadow-md hover:border-teal-200 transition-all duration-300 text-left"
          >
            <div className="flex items-center gap-4">
              <div className="p-2 bg-teal-50 rounded-lg group-hover:bg-teal-100 transition-colors">
                <Users className="w-5 h-5 text-teal-500 group-hover:text-teal-700 transition-colors" />
              </div>
              <span className="font-medium text-gray-700 group-hover:text-teal-700 transition-colors">
                My Children
              </span>
            </div>
            <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-teal-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </button>
          <button
            onClick={() => navigate('/parent/invoices')}
            className="parent-card group flex items-center justify-between p-6 rounded-xl hover:shadow-md hover:border-teal-200 transition-all duration-300 text-left"
          >
            <div className="flex items-center gap-4">
              <div className="p-2 bg-teal-50 rounded-lg group-hover:bg-teal-100 transition-colors">
                <FileText className="w-5 h-5 text-teal-500 group-hover:text-teal-700 transition-colors" />
              </div>
              <span className="font-medium text-gray-700 group-hover:text-teal-700 transition-colors">
                Invoices
              </span>
            </div>
            <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-teal-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </button>
          <button
            onClick={() => navigate('/parent/messages')}
            className="parent-card group flex items-center justify-between p-6 rounded-xl hover:shadow-md hover:border-teal-200 transition-all duration-300 text-left"
          >
            <div className="flex items-center gap-4">
              <div className="p-2 bg-teal-50 rounded-lg group-hover:bg-teal-100 transition-colors">
                <MessageSquare className="w-5 h-5 text-teal-500 group-hover:text-teal-700 transition-colors" />
              </div>
              <span className="font-medium text-gray-700 group-hover:text-teal-700 transition-colors">
                Messages
              </span>
            </div>
            <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-teal-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </button>
        </div>
      </section>

      {dashboard?.recent_invoices && dashboard.recent_invoices.length > 0 && (
        <section className="mt-10 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-xl font-semibold text-gray-800">Recent Invoices</h3>
            <button
              type="button"
              onClick={() => navigate('/parent/invoices')}
              className="text-sm text-teal-600 hover:text-teal-700 font-medium transition-colors"
            >
              View All
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Invoice #</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Balance</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {dashboard.recent_invoices.map((inv) => (
                  <tr key={inv.id} className="group hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 font-mono">{inv.invoice_number}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(inv.invoice_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      ${parseFloat(inv.total_amount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      ${parseFloat(inv.balance_due).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-700 border border-teal-200">
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </ParentLayout>
  );
}

export default ParentDashboard;
