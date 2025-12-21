import { useState, useEffect } from 'react';
import api from '../utils/api';

function AdminFiles() {
  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [children, setChildren] = useState([]);
  const [parents, setParents] = useState([]);
  const [showUpload, setShowUpload] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadForm, setUploadForm] = useState({
    category_id: '',
    description: '',
    tags: '',
    linked_child_id: '',
    linked_parent_id: '',
  });
  const [newCategoryName, setNewCategoryName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  useEffect(() => {
    loadDocuments();
    loadCategories();
    loadChildren();
    loadParents();
  }, [filterCategory, searchTerm]);

  const loadDocuments = async () => {
    try {
      const params = new URLSearchParams();
      if (filterCategory) params.append('category_id', filterCategory);
      if (searchTerm) params.append('search', searchTerm);

      const response = await api.get(`/files?${params}`);
      setDocuments(response.data.documents);
    } catch (error) {
      console.error('Load documents error:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await api.get('/files/categories');
      setCategories(response.data.categories);
    } catch (error) {
      console.error('Load categories error:', error);
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

  const loadParents = async () => {
    try {
      const response = await api.get('/parents');
      setParents(response.data.parents);
    } catch (error) {
      console.error('Load parents error:', error);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        alert('File size must be less than 20MB');
        e.target.value = '';
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!selectedFile) {
      alert('Please select a file');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('category_id', uploadForm.category_id);
    formData.append('description', uploadForm.description);
    if (uploadForm.linked_child_id) formData.append('linked_child_id', uploadForm.linked_child_id);
    if (uploadForm.linked_parent_id) formData.append('linked_parent_id', uploadForm.linked_parent_id);

    // Parse tags
    if (uploadForm.tags) {
      const tagsArray = uploadForm.tags.split(',').map(t => t.trim()).filter(t => t);
      formData.append('tags', JSON.stringify(tagsArray));
    }

    try {
      await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setShowUpload(false);
      setSelectedFile(null);
      setUploadForm({ category_id: '', description: '', tags: '', linked_child_id: '', linked_parent_id: '' });
      loadDocuments();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to upload file');
    }
  };

  const handleDownload = async (id, filename) => {
    try {
      const response = await api.get(`/files/${id}/download`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert('Failed to download file');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;

    try {
      await api.delete(`/files/${id}`);
      loadDocuments();
    } catch (error) {
      alert('Failed to delete document');
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();

    if (!newCategoryName.trim()) {
      alert('Category name is required');
      return;
    }

    try {
      await api.post('/files/categories', { name: newCategoryName });
      setNewCategoryName('');
      loadCategories();
    } catch (error) {
      alert('Failed to create category');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Delete this category? Documents will not be deleted, just uncategorized.')) return;

    try {
      await api.delete(`/files/categories/${id}`);
      loadCategories();
      loadDocuments();
    } catch (error) {
      alert('Failed to delete category');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <main className="main">
      <div className="header">
        <h1>Documents & Files</h1>
      </div>
      <div className="flex-between mb-2">
        <div className="flex" style={{ gap: '1rem' }}>
          <button onClick={() => {
            setShowUpload(!showUpload);
            if (!showUpload) setShowCategoryManager(false);
          }}>
            {showUpload ? 'Cancel' : 'Upload File'}
          </button>
          <button onClick={() => {
            setShowCategoryManager(!showCategoryManager);
            if (!showCategoryManager) setShowUpload(false);
          }} className="secondary">
            {showCategoryManager ? 'Close' : 'Manage Categories'}
          </button>
        </div>
      </div>

      {showUpload && (
        <div className="card mb-2">
          <h2>Upload Document</h2>
          <form onSubmit={handleUpload}>
            <div className="form-group">
              <label>File (Max 20MB: PDF, JPG, PNG, DOCX) *</label>
              <input
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                required
              />
              {selectedFile && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#666' }}>
                  Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </div>
              )}
            </div>
            <div className="form-group">
              <label>Category</label>
              <select
                value={uploadForm.category_id}
                onChange={(e) => setUploadForm({ ...uploadForm, category_id: e.target.value })}
              >
                <option value="">None</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={uploadForm.description}
                onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                rows="3"
                placeholder="Optional description..."
              />
            </div>
            <div className="form-group">
              <label>Tags (comma-separated)</label>
              <input
                type="text"
                value={uploadForm.tags}
                onChange={(e) => setUploadForm({ ...uploadForm, tags: e.target.value })}
                placeholder="e.g., medical, emergency, 2024"
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Link to Child (Optional)</label>
                <select
                  value={uploadForm.linked_child_id}
                  onChange={(e) => setUploadForm({ ...uploadForm, linked_child_id: e.target.value })}
                >
                  <option value="">None</option>
                  {children.filter(c => c.status === 'ACTIVE').map(child => (
                    <option key={child.id} value={child.id}>
                      {child.first_name} {child.last_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Link to Parent (Optional)</label>
                <select
                  value={uploadForm.linked_parent_id}
                  onChange={(e) => setUploadForm({ ...uploadForm, linked_parent_id: e.target.value })}
                >
                  <option value="">None</option>
                  {parents.map(parent => (
                    <option key={parent.id} value={parent.id}>
                      {parent.first_name} {parent.last_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button type="submit">Upload</button>
          </form>
        </div>
      )}

      {showCategoryManager && (
        <div className="card mb-2">
          <h2>Manage Categories</h2>
          <form onSubmit={handleAddCategory} className="mb-2">
            <div className="flex" style={{ gap: '1rem' }}>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="New category name..."
                style={{ flex: 1 }}
              />
              <button type="submit">Add Category</button>
            </div>
          </form>
          <table>
            <thead>
              <tr>
                <th>Category Name</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map(cat => (
                <tr key={cat.id}>
                  <td>{cat.name}</td>
                  <td>
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="danger"
                      style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
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

      <div className="card">
        <div className="flex-between mb-2">
          <h2>All Documents</h2>
          <div className="flex" style={{ gap: '1rem' }}>
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '200px' }}
            />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>

        {documents.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>
            No documents found. Upload your first document to get started!
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Filename</th>
                <th>Category</th>
                <th>Size</th>
                <th>Uploaded</th>
                <th>Description</th>
                <th>Tags</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map(doc => (
                <tr key={doc.id}>
                  <td>{doc.original_filename}</td>
                  <td>
                    {doc.category_name ? (
                      <span className="badge">{doc.category_name}</span>
                    ) : (
                      <span style={{ color: '#999' }}>None</span>
                    )}
                  </td>
                  <td>{formatFileSize(doc.file_size)}</td>
                  <td>{formatDate(doc.created_at)}</td>
                  <td style={{ maxWidth: '200px' }}>
                    {doc.description || <span style={{ color: '#999' }}></span>}
                  </td>
                  <td style={{ maxWidth: '150px' }}>
                    {doc.tags && doc.tags.length > 0 ? (
                      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                        {doc.tags.map((tag, i) => (
                          <span key={i} style={{
                            fontSize: '0.75rem',
                            background: '#e9ecef',
                            padding: '0.125rem 0.5rem',
                            borderRadius: '4px'
                          }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span style={{ color: '#999' }}></span>
                    )}
                  </td>
                  <td>
                    <div className="flex" style={{ gap: '0.5rem' }}>
                      <button
                        onClick={() => handleDownload(doc.id, doc.original_filename)}
                        style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                      >
                        Download
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
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
    </main>
  );
}

export default AdminFiles;
