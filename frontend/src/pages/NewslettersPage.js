import { useEffect, useMemo, useState } from 'react';
import { Layout } from '../components/Layout';
import { EducatorLayout } from '../components/EducatorLayout';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';

const EMPTY_FORM = {
  title: '',
  body: '',
  image_url: '',
  is_published: true,
};

function formatDateTime(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

export function NewslettersPage() {
  const { user } = useAuth();
  const [newsletters, setNewsletters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  const isEducatorView = user?.role === 'EDUCATOR';
  const LayoutComponent = isEducatorView ? EducatorLayout : Layout;

  const orderedNewsletters = useMemo(
    () => [...newsletters].sort((a, b) => new Date(b.published_at || b.created_at) - new Date(a.published_at || a.created_at)),
    [newsletters]
  );

  useEffect(() => {
    loadNewsletters();
  }, []);

  const loadNewsletters = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/newsletters', { params: { limit: 100 } });
      setNewsletters(response.data.newsletters || []);
    } catch (err) {
      console.error('Load newsletters error:', err);
      setError(err.response?.data?.error || 'Failed to load newsletters');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.title.trim() || !form.body.trim()) {
      setError('Title and message are required');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const payload = {
        title: form.title.trim(),
        body: form.body.trim(),
        image_url: form.image_url.trim() || null,
        is_published: form.is_published,
      };

      if (editingId) {
        await api.patch(`/newsletters/${editingId}`, payload);
      } else {
        await api.post('/newsletters', payload);
      }

      resetForm();
      await loadNewsletters();
    } catch (err) {
      console.error('Save newsletter error:', err);
      setError(err.response?.data?.error || 'Failed to save newsletter');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (newsletter) => {
    setEditingId(newsletter.id);
    setForm({
      title: newsletter.title || '',
      body: newsletter.body || '',
      image_url: newsletter.image_url || '',
      is_published: Boolean(newsletter.is_published),
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this newsletter?')) {
      return;
    }
    try {
      setError('');
      await api.delete(`/newsletters/${id}`);
      await loadNewsletters();
      if (editingId === id) {
        resetForm();
      }
    } catch (err) {
      console.error('Delete newsletter error:', err);
      setError(err.response?.data?.error || 'Failed to delete newsletter');
    }
  };

  return (
    <LayoutComponent
      title="Newsletters"
      subtitle="Share updates with families and publish what is happening in the daycare"
    >
      <section className="rounded-3xl border themed-border bg-white p-6 shadow-sm">
        <h3 className="font-quicksand text-xl font-bold text-stone-800">
          {editingId ? 'Edit Newsletter' : 'Create Newsletter'}
        </h3>
        <p className="mt-1 text-sm text-stone-500">
          Admins and educators can create or update parent-facing updates here.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-[0.2em] text-stone-500">
              Title
            </label>
            <input
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full rounded-2xl border themed-border px-4 py-3"
              placeholder="Weekly classroom update"
              maxLength={180}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-[0.2em] text-stone-500">
              Message
            </label>
            <textarea
              value={form.body}
              onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
              className="h-40 w-full rounded-2xl border themed-border px-4 py-3"
              placeholder="Write what parents should know today..."
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-[0.2em] text-stone-500">
              Image URL (Optional)
            </label>
            <input
              value={form.image_url}
              onChange={(e) => setForm((prev) => ({ ...prev, image_url: e.target.value }))}
              className="w-full rounded-2xl border themed-border px-4 py-3"
              placeholder="https://..."
            />
          </div>

          <label className="inline-flex items-center gap-2 text-sm font-medium text-stone-700">
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={(e) => setForm((prev) => ({ ...prev, is_published: e.target.checked }))}
            />
            Published to parents
          </label>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={saving}
            >
              {saving ? 'Saving...' : editingId ? 'Update Newsletter' : 'Publish Newsletter'}
            </button>
            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border themed-border px-4 py-2 text-sm font-semibold text-stone-600"
              >
                Cancel Edit
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="mt-6 rounded-3xl border themed-border bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-quicksand text-xl font-bold text-stone-800">Published Feed</h3>
          <button
            type="button"
            onClick={loadNewsletters}
            className="rounded-xl border themed-border px-3 py-1.5 text-xs font-semibold text-stone-600"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="text-sm text-stone-500">Loading newsletters...</div>
        ) : orderedNewsletters.length === 0 ? (
          <div className="text-sm text-stone-500">No newsletters yet.</div>
        ) : (
          <div className="space-y-4">
            {orderedNewsletters.map((newsletter) => (
              <article key={newsletter.id} className="rounded-2xl border themed-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-base font-bold text-stone-800">{newsletter.title}</h4>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      newsletter.is_published
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    {newsletter.is_published ? 'Published' : 'Draft'}
                  </span>
                </div>

                <p className="mt-2 whitespace-pre-wrap text-sm text-stone-700">{newsletter.body}</p>

                {newsletter.image_url ? (
                  <img
                    src={newsletter.image_url}
                    alt={newsletter.title}
                    className="mt-3 max-h-60 w-full rounded-xl border object-cover"
                  />
                ) : null}

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
                  <span>Published: {formatDateTime(newsletter.published_at || newsletter.created_at)}</span>
                  <span>
                    By: {newsletter.created_by_first_name || ''} {newsletter.created_by_last_name || ''}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(newsletter)}
                    className="rounded-xl border themed-border px-3 py-1.5 text-xs font-semibold text-stone-700"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(newsletter.id)}
                    className="rounded-xl border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </LayoutComponent>
  );
}

export default NewslettersPage;
