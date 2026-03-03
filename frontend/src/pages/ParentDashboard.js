import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  CreditCard,
  Mail,
  ArrowUpRight,
  Banknote,
  FileText,
  MessageSquare,
  Baby,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ParentLayout } from '../components/ParentLayout';
import api from '../utils/api';

function todayKey() {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

function ParentDashboard() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [newsletters, setNewsletters] = useState([]);
  const [careLogs, setCareLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [careError, setCareError] = useState('');
  const navigate = useNavigate();

  const sortedCareLogs = useMemo(
    () =>
      [...careLogs].sort((a, b) => {
        const aKey = `${a.log_date || ''} ${a.occurred_at || ''} ${a.created_at || ''}`;
        const bKey = `${b.log_date || ''} ${b.occurred_at || ''} ${b.created_at || ''}`;
        return aKey < bKey ? 1 : -1;
      }),
    [careLogs]
  );

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setCareError('');

      const date = todayKey();
      const [dashboardRes, newslettersRes, careRes] = await Promise.all([
        api.get('/parent/dashboard'),
        api.get('/newsletters', { params: { limit: 6 } }),
        api.get('/care-logs', { params: { date } }),
      ]);

      setDashboard(dashboardRes.data || null);
      setNewsletters(newslettersRes.data.newsletters || []);
      setCareLogs(careRes.data.logs || []);
    } catch (error) {
      console.error('Load parent dashboard error:', error);
      setCareError(error.response?.data?.error || '');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ParentLayout title="Dashboard" subtitle="Your family overview">
        <div className="flex h-48 items-center justify-center parent-text-muted">Loading...</div>
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
      subtitle="Here is what is happening today for your family"
    >
      <section className="mb-8 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold text-gray-800">Newsletters</h3>
            <p className="text-sm text-gray-500">Latest updates from admins and educators.</p>
          </div>
        </div>
        {newsletters.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-500">
            No newsletters have been posted yet.
          </div>
        ) : (
          <div className="space-y-4">
            {newsletters.map((newsletter) => (
              <article key={newsletter.id} className="rounded-xl border border-gray-100 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-lg font-semibold text-gray-800">{newsletter.title}</h4>
                  <span className="text-xs font-semibold text-teal-700">
                    {new Date(newsletter.published_at || newsletter.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{newsletter.body}</p>
                {newsletter.image_url ? (
                  <img
                    src={newsletter.image_url}
                    alt={newsletter.title}
                    className="mt-3 max-h-64 w-full rounded-lg border border-gray-100 object-cover"
                  />
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mb-8 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold text-gray-800">Today&apos;s Naps, Pees, and Poos</h3>
            <p className="text-sm text-gray-500">Track entries shared by your daycare team today.</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
            <Baby className="h-3.5 w-3.5" />
            {todayKey()}
          </span>
        </div>

        <div className="mb-5 rounded-xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-800">
          Educators and admins post these updates throughout the day. Parents can view logs here.
        </div>

        {careError ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {careError}
          </div>
        ) : null}

        {sortedCareLogs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-500">
            No care logs recorded yet today.
          </div>
        ) : (
          <div className="space-y-2">
            {sortedCareLogs.map((log) => (
              <div key={log.id} className="rounded-xl border border-gray-100 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-800">
                    {log.child_name} - {log.log_type}
                  </p>
                  <p className="text-xs text-gray-500">
                    {log.occurred_at ? `${String(log.occurred_at).slice(0, 5)} ` : ''}
                    ({new Date(log.created_at).toLocaleTimeString()})
                  </p>
                </div>
                {log.notes ? <p className="mt-1 text-sm text-gray-600">{log.notes}</p> : null}
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <div className="group rounded-xl border border-gray-100 p-6 transition-all duration-300 hover:shadow-md parent-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="mb-1 text-sm font-medium text-gray-500">Children Enrolled</p>
              <h3 className="text-2xl font-bold tracking-tight text-gray-800 transition-colors group-hover:text-teal-600">
                {dashboard?.children_count || 0}
              </h3>
            </div>
            <div className="rounded-full bg-teal-50 p-3 transition-colors group-hover:bg-teal-100">
              <Users className="h-6 w-6 text-teal-400 transition-colors group-hover:text-teal-600" />
            </div>
          </div>
        </div>

        <div className="group rounded-xl border border-gray-100 p-6 transition-all duration-300 hover:shadow-md parent-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="mb-1 text-sm font-medium text-gray-500">Outstanding Balance</p>
              <h3 className="text-2xl font-bold tracking-tight text-gray-800 transition-colors group-hover:text-teal-600">
                ${dashboard?.outstanding_balance?.toFixed(2) || '0.00'}
              </h3>
            </div>
            <div className="rounded-full bg-teal-50 p-3 transition-colors group-hover:bg-teal-100">
              <CreditCard className="h-6 w-6 text-teal-400 transition-colors group-hover:text-teal-600" />
            </div>
          </div>
        </div>

        <div className="group rounded-xl border border-gray-100 p-6 transition-all duration-300 hover:shadow-md parent-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="mb-1 text-sm font-medium text-gray-500">Credit Balance</p>
              <h3 className="text-2xl font-bold tracking-tight text-gray-800 transition-colors group-hover:text-teal-600">
                ${dashboard?.credit_balance?.toFixed(2) || '0.00'}
              </h3>
            </div>
            <div className="rounded-full bg-teal-50 p-3 transition-colors group-hover:bg-teal-100">
              <Banknote className="h-6 w-6 text-teal-400 transition-colors group-hover:text-teal-600" />
            </div>
          </div>
        </div>

        <div className="group rounded-xl border border-gray-100 p-6 transition-all duration-300 hover:shadow-md parent-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="mb-1 text-sm font-medium text-gray-500">Unread Messages</p>
              <h3 className="text-2xl font-bold tracking-tight text-gray-800 transition-colors group-hover:text-teal-600">
                {dashboard?.unread_messages_count || 0}
              </h3>
            </div>
            <div className="rounded-full bg-teal-50 p-3 transition-colors group-hover:bg-teal-100">
              <Mail className="h-6 w-6 text-teal-400 transition-colors group-hover:text-teal-600" />
            </div>
          </div>
        </div>
      </div>

      <section className="mb-10 mt-10">
        <h3 className="mb-6 flex items-center gap-2 text-xl font-semibold text-gray-800">Quick Links</h3>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <button
            onClick={() => navigate('/parent/children')}
            className="group flex items-center justify-between rounded-xl p-6 text-left transition-all duration-300 hover:border-teal-200 hover:shadow-md parent-card"
          >
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-teal-50 p-2 transition-colors group-hover:bg-teal-100">
                <Users className="h-5 w-5 text-teal-500 transition-colors group-hover:text-teal-700" />
              </div>
              <span className="font-medium text-gray-700 transition-colors group-hover:text-teal-700">
                My Children
              </span>
            </div>
            <ArrowUpRight className="h-4 w-4 text-gray-400 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-teal-500" />
          </button>
          <button
            onClick={() => navigate('/parent/invoices')}
            className="group flex items-center justify-between rounded-xl p-6 text-left transition-all duration-300 hover:border-teal-200 hover:shadow-md parent-card"
          >
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-teal-50 p-2 transition-colors group-hover:bg-teal-100">
                <FileText className="h-5 w-5 text-teal-500 transition-colors group-hover:text-teal-700" />
              </div>
              <span className="font-medium text-gray-700 transition-colors group-hover:text-teal-700">
                Invoices
              </span>
            </div>
            <ArrowUpRight className="h-4 w-4 text-gray-400 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-teal-500" />
          </button>
          <button
            onClick={() => navigate('/parent/messages')}
            className="group flex items-center justify-between rounded-xl p-6 text-left transition-all duration-300 hover:border-teal-200 hover:shadow-md parent-card"
          >
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-teal-50 p-2 transition-colors group-hover:bg-teal-100">
                <MessageSquare className="h-5 w-5 text-teal-500 transition-colors group-hover:text-teal-700" />
              </div>
              <span className="font-medium text-gray-700 transition-colors group-hover:text-teal-700">
                Messages
              </span>
            </div>
            <ArrowUpRight className="h-4 w-4 text-gray-400 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-teal-500" />
          </button>
        </div>
      </section>

      {dashboard?.recent_invoices && dashboard.recent_invoices.length > 0 ? (
        <section className="mt-10 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 p-6">
            <h3 className="text-xl font-semibold text-gray-800">Recent Invoices</h3>
            <button
              type="button"
              onClick={() => navigate('/parent/invoices')}
              className="text-sm font-medium text-teal-600 transition-colors hover:text-teal-700"
            >
              View All
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Invoice #</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Date</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Amount</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Balance</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {dashboard.recent_invoices.map((inv) => (
                  <tr key={inv.id} className="group transition-colors hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono text-sm font-medium text-gray-900">{inv.invoice_number}</td>
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
                      <span className="inline-flex items-center rounded-full border border-teal-200 bg-teal-100 px-3 py-1 text-xs font-medium text-teal-700">
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </ParentLayout>
  );
}

export default ParentDashboard;
