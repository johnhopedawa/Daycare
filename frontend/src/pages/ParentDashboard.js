import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, CreditCard, Mail, ArrowUpRight, Wallet } from 'lucide-react';
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
        <div className="flex items-center justify-center h-48 text-stone-500">Loading...</div>
      </ParentLayout>
    );
  }

  return (
    <ParentLayout
      title={`Welcome back, ${user.first_name}`}
      subtitle="Here is a snapshot of your family account"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_-4px_rgba(255,229,217,0.5)] border border-[#FFE5D9]/30">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#E5D4ED] text-[#8E55A5] flex items-center justify-center">
              <Users size={20} />
            </div>
            <div>
              <p className="text-stone-500 text-sm">Children Enrolled</p>
              <p className="font-quicksand font-bold text-2xl text-stone-800">
                {dashboard?.children_count || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_-4px_rgba(255,229,217,0.5)] border border-[#FFE5D9]/30">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FFDCC8] text-[#E07A5F] flex items-center justify-center">
              <CreditCard size={20} />
            </div>
            <div>
              <p className="text-stone-500 text-sm">Outstanding Balance</p>
              <p className="font-quicksand font-bold text-2xl text-stone-800">
                ${dashboard?.outstanding_balance?.toFixed(2) || '0.00'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_-4px_rgba(255,229,217,0.5)] border border-[#FFE5D9]/30">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#B8E6D5] text-[#2D6A4F] flex items-center justify-center">
              <Wallet size={20} />
            </div>
            <div>
              <p className="text-stone-500 text-sm">Credit Balance</p>
              <p className="font-quicksand font-bold text-2xl text-stone-800">
                ${dashboard?.credit_balance?.toFixed(2) || '0.00'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_-4px_rgba(255,229,217,0.5)] border border-[#FFE5D9]/30">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#B8E6D5] text-[#2D6A4F] flex items-center justify-center">
              <Mail size={20} />
            </div>
            <div>
              <p className="text-stone-500 text-sm">Unread Messages</p>
              <p className="font-quicksand font-bold text-2xl text-stone-800">
                {dashboard?.unread_messages_count || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_-4px_rgba(255,229,217,0.5)] border border-[#FFE5D9]/30 mb-8">
        <h3 className="font-quicksand font-bold text-xl text-stone-800 mb-4">Quick Links</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => navigate('/parent/children')}
            className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-[#FFF8F3] text-[#E07A5F] font-semibold hover:bg-[#FFE5D9] transition-colors"
          >
            My Children
            <ArrowUpRight size={16} />
          </button>
          <button
            onClick={() => navigate('/parent/invoices')}
            className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-[#FFF8F3] text-[#E07A5F] font-semibold hover:bg-[#FFE5D9] transition-colors"
          >
            Invoices
            <ArrowUpRight size={16} />
          </button>
          <button
            onClick={() => navigate('/parent/messages')}
            className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-[#FFF8F3] text-[#E07A5F] font-semibold hover:bg-[#FFE5D9] transition-colors"
          >
            Messages
            <ArrowUpRight size={16} />
          </button>
        </div>
      </div>

      {dashboard?.recent_invoices && dashboard.recent_invoices.length > 0 && (
        <div className="bg-white rounded-3xl shadow-[0_4px_20px_-4px_rgba(255,229,217,0.5)] border border-[#FFE5D9]/30 overflow-hidden">
          <div className="px-6 py-4 border-b border-[#FFE5D9]/60">
            <h3 className="font-quicksand font-bold text-xl text-stone-800">Recent Invoices</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#FFF8F3]">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">Invoice #</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">Date</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">Amount</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">Balance</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y themed-border">
                {dashboard.recent_invoices.map((inv) => (
                  <tr key={inv.id} className="themed-row transition-colors">
                    <td className="px-6 py-4 text-sm font-semibold text-stone-800">{inv.invoice_number}</td>
                    <td className="px-6 py-4 text-sm text-stone-600">
                      {new Date(inv.invoice_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-stone-600">
                      ${parseFloat(inv.total_amount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-stone-600">
                      ${parseFloat(inv.balance_due).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#FFE5D9] text-[#C4554D]">
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </ParentLayout>
  );
}

export default ParentDashboard;
