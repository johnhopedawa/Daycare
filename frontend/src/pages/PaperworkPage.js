import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { FileText, Download, Upload, Trash2, User, AlertCircle, Bell, ClipboardCheck } from 'lucide-react';
import api from '../utils/api';
import { UploadDocumentModal } from '../components/modals/UploadDocumentModal';

export function PaperworkPage() {
  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [children, setChildren] = useState([]);
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  useEffect(() => {
    loadCategories();
    loadChildren();
    loadParents();
  }, []);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoryFilter) params.append('category_id', categoryFilter);
      if (searchTerm) params.append('search', searchTerm);
      const response = await api.get(`/files?${params.toString()}`);
      setDocuments(response.data.documents || []);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, searchTerm]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const loadCategories = async () => {
    try {
      const response = await api.get('/files/categories');
      setCategories(response.data.categories || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadChildren = async () => {
    try {
      const response = await api.get('/children');
      setChildren(response.data.children || []);
    } catch (error) {
      console.error('Failed to load children:', error);
    }
  };

  const loadParents = async () => {
    try {
      const response = await api.get('/parents');
      setParents(response.data.parents || []);
    } catch (error) {
      console.error('Failed to load parents:', error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 KB';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  const cardStyles = [
    { backgroundColor: 'var(--card-1)', color: 'var(--card-text-1)' },
    { backgroundColor: 'var(--card-2)', color: 'var(--card-text-2)' },
    { backgroundColor: 'var(--card-3)', color: 'var(--card-text-3)' },
    { backgroundColor: 'var(--card-4)', color: 'var(--card-text-4)' },
  ];
  const categoryIndexMap = {
    enrollment: 0,
    medical: 1,
    policy: 2,
    emergency: 3,
  };
  const hashString = (value) => {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash * 31 + value.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  };
  const getCategoryStyle = (category) => {
    const normalized = (category || '').toLowerCase().trim();
    if (!normalized || normalized === 'general') {
      return { backgroundColor: 'var(--background)', color: 'var(--muted)' };
    }
    const mappedIndex = categoryIndexMap[normalized];
    const index = Number.isInteger(mappedIndex)
      ? mappedIndex
      : hashString(normalized) % cardStyles.length;
    return cardStyles[index];
  };

  const getCategoryIcon = (category) => {
    const icons = {
      enrollment: User,
      medical: AlertCircle,
      emergency: Bell,
      policy: ClipboardCheck,
      general: FileText,
    };
    const normalized = (category || '').toLowerCase().trim();
    return icons[normalized] || FileText;
  };
  const handleDownload = async (doc) => {
    try {
      const response = await api.get(`/files/${doc.id}/download`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.original_filename || `document-${doc.id}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download document:', error);
    }
  };

  const handleDelete = async (doc) => {
    if (!window.confirm('Delete this document? This cannot be undone.')) return;

    try {
      await api.delete(`/files/${doc.id}`);
      loadDocuments();
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    try {
      await api.post('/files/categories', { name: newCategoryName.trim() });
      setNewCategoryName('');
      loadCategories();
    } catch (error) {
      console.error('Failed to create category:', error);
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm('Delete this category? Documents will be left uncategorized.')) return;

    try {
      await api.delete(`/files/categories/${categoryId}`);
      if (categoryFilter === String(categoryId)) {
        setCategoryFilter('');
      }
      loadCategories();
      loadDocuments();
    } catch (error) {
      console.error('Failed to delete category:', error);
    }
  };

  if (loading) {
    return (
      <Layout title="Paperwork" subtitle="Document management and uploads">
        <div className="flex items-center justify-center h-64">
          <div className="text-stone-500">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Paperwork" subtitle="Document management and uploads">
      <div className="space-y-8">
        {/* Upload Section */}
        <section
        >
          <button
            onClick={() => setIsUploadOpen(true)}
            className="w-full themed-dashed rounded-3xl flex flex-col items-center justify-center p-12 transition-colors"
            style={{ color: 'var(--menu-accent)' }}
          >
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              <Upload size={32} />
            </div>
            <h3 className="font-quicksand font-bold text-xl mb-2">
              Upload Documents
            </h3>
            <p className="text-stone-500 text-sm">
              Click to upload or drag and drop files here
            </p>
          </button>
        </section>

        {/* Categories Overview */}
        <section
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-quicksand font-bold text-xl text-stone-800">
              Categories
            </h3>
            <button
              onClick={() => setShowCategoryManager((prev) => !prev)}
              className="px-4 py-2 border themed-border text-stone-700 font-medium text-sm rounded-xl themed-hover transition-colors"
              style={{ backgroundColor: 'var(--surface)' }}
            >
              {showCategoryManager ? 'Close Manager' : 'Manage Categories'}
            </button>
          </div>

          {categories.length === 0 ? (
            <div className="themed-surface rounded-2xl p-6 text-stone-500">
              No categories yet. Create one to organize documents.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div
                onClick={() => setCategoryFilter('')}
                className="themed-surface p-5 rounded-2xl transition-transform cursor-pointer"
                style={{
                  borderColor: categoryFilter ? 'var(--border)' : 'var(--primary)',
                  backgroundColor: 'var(--surface)',
                }}
              >
                <div className="mb-2"><FileText size={28} style={{ color: "var(--primary-dark)" }} /></div>
                <h4 className="font-bold text-stone-800 mb-1">All</h4>
                <p className="text-stone-500 text-sm">{documents.length} documents</p>
              </div>

              {categories.map((category, i) => {
                const count = documents.filter(
                  doc => doc.category_id === category.id
                ).length;
                const isActive = categoryFilter === String(category.id);
                const Icon = getCategoryIcon(category.name);
                const categoryStyle = getCategoryStyle(category.name);
                return (
                  <div
                    key={category.id}
                    onClick={() => setCategoryFilter(String(category.id))}
                    className="themed-surface p-5 rounded-2xl hover:translate-y-[-2px] transition-transform cursor-pointer"
                    style={{ borderColor: isActive ? 'var(--primary)' : 'var(--border)' }}
                  >
                    <div className="mb-2"><Icon size={28} style={{ color: categoryStyle.color }} /></div>
                    <h4 className="font-bold text-stone-800 capitalize mb-1">
                      {category.name}
                    </h4>
                    <p className="text-stone-500 text-sm">{count} documents</p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {showCategoryManager && (
          <section
            className="themed-surface rounded-3xl p-6"
          >
            <h3 className="font-quicksand font-bold text-lg text-stone-800 mb-4">
              Category Manager
            </h3>
            <form onSubmit={handleAddCategory} className="flex gap-3 mb-6">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="New category name..."
                className="flex-1 px-4 py-3 rounded-2xl border themed-border focus:outline-none focus:ring-2 bg-white"
              />
              <button
                type="submit"
                className="px-6 py-3 rounded-2xl text-white font-bold shadow-lg transition-all"
                style={{ backgroundColor: 'var(--primary)', boxShadow: '0 12px 20px -12px var(--menu-shadow)' }}
              >
                Add
              </button>
            </form>

            {categories.length === 0 ? (
              <div className="text-stone-500 text-sm">No categories to manage.</div>
            ) : (
              <div className="grid gap-3">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between rounded-2xl border themed-border px-4 py-3"
                  >
                    <div className="font-medium text-stone-700">{category.name}</div>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(category.id)}
                      className="px-3 py-2 rounded-xl border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Documents List */}
        <section
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <h3 className="font-quicksand font-bold text-xl text-stone-800">
              All Documents
            </h3>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 rounded-xl border themed-border text-sm focus:outline-none focus:ring-2 bg-white"
              />
              <div className="flex gap-2">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-4 py-2 rounded-xl border themed-border text-sm focus:outline-none focus:ring-2 bg-white"
                >
                  <option value="">All Categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {(categoryFilter || searchTerm) && (
                  <button
                    onClick={() => {
                      setCategoryFilter('');
                      setSearchTerm('');
                    }}
                    className="px-3 py-2 rounded-xl border themed-border text-stone-600 text-sm themed-hover transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {documents.length === 0 ? (
            <div className="themed-surface rounded-3xl p-12 text-center">
              <FileText size={48} className="mx-auto mb-4 text-stone-300" />
              <h3 className="font-quicksand font-bold text-xl text-stone-800 mb-2">
                No Documents Yet
              </h3>
              <p className="text-stone-500">
                Upload your first document to get started
              </p>
            </div>
          ) : (
            <div className="themed-surface rounded-3xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead style={{ backgroundColor: 'var(--background)' }}>
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">
                        Document Name
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">
                        Category
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">
                        Size
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">
                        Uploaded
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">
                        Description
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">
                        Tags
                      </th>
                      <th className="px-6 py-4 text-right text-sm font-bold text-stone-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y themed-border">
                    {documents.map((doc) => (
                      <tr key={doc.id} className="themed-row transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: 'var(--accent)' }}
                            >
                              <FileText size={18} style={{ color: 'var(--primary-dark)' }} />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-stone-800">
                                {doc.original_filename}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className="px-3 py-1 rounded-full text-xs font-bold capitalize"
                            style={getCategoryStyle(doc.category_name || 'general')}
                          >
                            {doc.category_name || 'Uncategorized'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-stone-600">
                          {formatFileSize(doc.file_size)}
                        </td>
                        <td className="px-6 py-4 text-sm text-stone-600">
                          {formatDate(doc.created_at)}
                        </td>
                        <td className="px-6 py-4 text-sm text-stone-600">
                          {doc.description || <span className="text-stone-400">-</span>}
                        </td>
                        <td className="px-6 py-4">
                          {doc.tags && doc.tags.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {doc.tags.map((tag) => (
                                <span
                                  key={`${doc.id}-${tag}`}
                                  className="px-2 py-1 rounded-full text-xs font-semibold"
                                  style={{ backgroundColor: 'var(--background)', color: 'var(--muted)' }}
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-stone-400 text-sm">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => handleDownload(doc)}
                              className="p-2 themed-hover rounded-lg transition-colors"
                            >
                              <Download size={16} className="text-stone-500" />
                            </button>
                            <button
                              onClick={() => handleDelete(doc)}
                              className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={16} className="text-red-500" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>

      <UploadDocumentModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={loadDocuments}
        categories={categories}
        children={children}
        parents={parents}
      />
    </Layout>
  );
}



