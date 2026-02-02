import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

function AdminParents() {
  const [parents, setParents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form data for creating parent + child
  const [formData, setFormData] = useState({
    // Parent 1 (Required)
    parent1FirstName: '',
    parent1LastName: '',
    parent1Email: '',
    parent1Phone: '',

    // Parent 2 (Optional)
    parent2FirstName: '',
    parent2LastName: '',
    parent2Email: '',
    parent2Phone: '',

    // Child information
    childFirstName: '',
    childLastName: '',
    childDob: '',

    // Additional
    notes: '',
  });

  // Files modal state
  const [showFilesModal, setShowFilesModal] = useState(false);
  const [selectedParent, setSelectedParent] = useState(null);
  const [parentDocuments, setParentDocuments] = useState([]);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadForm, setUploadForm] = useState({
    category_id: '',
    description: '',
    tags: '',
  });

  const [generatedPasswords, setGeneratedPasswords] = useState([]);
  const [resettingId, setResettingId] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    loadParents();
    loadCategories();
  }, []);

  const loadParents = async () => {
    try {
      const response = await api.get('/parents');
      setParents(response.data.parents);
    } catch (error) {
      console.error('Load parents error:', error);
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

  const loadParentDocuments = async (parentId) => {
    try {
      const response = await api.get(`/files?linked_parent_id=${parentId}`);
      setParentDocuments(response.data.documents);
    } catch (error) {
      console.error('Load parent documents error:', error);
    }
  };

  const handleViewFiles = (parent) => {
    setSelectedParent(parent);
    setShowFilesModal(true);
    loadParentDocuments(parent.id);
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

  const handleFileUpload = async (e) => {
    e.preventDefault();

    if (!selectedFile) {
      alert('Please select a file');
      return;
    }

    const formDataObj = new FormData();
    formDataObj.append('file', selectedFile);
    formDataObj.append('category_id', uploadForm.category_id);
    formDataObj.append('description', uploadForm.description);
    formDataObj.append('linked_parent_id', selectedParent.id);

    if (uploadForm.tags) {
      const tagsArray = uploadForm.tags.split(',').map(t => t.trim()).filter(t => t);
      formDataObj.append('tags', JSON.stringify(tagsArray));
    }

    try {
      await api.post('/files/upload', formDataObj, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setShowUploadForm(false);
      setSelectedFile(null);
      setUploadForm({ category_id: '', description: '', tags: '' });
      loadParentDocuments(selectedParent.id);
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to upload file');
    }
  };

  const handleDownloadFile = async (id, filename) => {
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

  const handleDeleteFile = async (id) => {
    if (!window.confirm('Are you sure you want to delete this file?')) return;

    try {
      await api.delete(`/files/${id}`);
      loadParentDocuments(selectedParent.id);
    } catch (error) {
      alert('Failed to delete file');
    }
  };

  const handleSendReset = async (parent) => {
    if (!parent.email || !parent.user_id) {
      alert('Parent does not have login access');
      return;
    }

    try {
      setResettingId(parent.id);
      const response = await api.post(`/parents/${parent.id}/password-reset`);
      const resetUrl = response.data.reset_url;

      if (resetUrl && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(resetUrl);
        alert('Password reset link copied to clipboard');
      } else if (resetUrl) {
        window.prompt('Copy this reset link:', resetUrl);
      } else {
        alert('Password reset link generated');
      }
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to send reset link');
    } finally {
      setResettingId(null);
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingId) {
        // Update existing parent (simple update, no child creation)
        await api.patch(`/parents/${editingId}`, {
          firstName: formData.parent1FirstName,
          lastName: formData.parent1LastName,
          email: formData.parent1Email,
          phone: formData.parent1Phone,
          notes: formData.notes
        });
        setEditingId(null);
      } else {
        // Create new parent(s) and child
        const response = await api.post('/parents/create-family', formData);

        // Display generated passwords
        if (response.data.passwords && response.data.passwords.length > 0) {
          setGeneratedPasswords(response.data.passwords);
        }
      }

      setShowForm(false);
      setFormData({
        parent1FirstName: '',
        parent1LastName: '',
        parent1Email: '',
        parent1Phone: '',
        parent2FirstName: '',
        parent2LastName: '',
        parent2Email: '',
        parent2Phone: '',
        childFirstName: '',
        childLastName: '',
        childDob: '',
        notes: '',
      });
      loadParents();
    } catch (error) {
      console.error('Submit error:', error);
      alert(error.response?.data?.error || (editingId ? 'Failed to update parent' : 'Failed to create family'));
    }
  };

  const handleEdit = (parent) => {
    setEditingId(parent.id);
    setFormData({
      parent1FirstName: parent.first_name || '',
      parent1LastName: parent.last_name || '',
      parent1Email: parent.email || '',
      parent1Phone: parent.phone || '',
      parent2FirstName: '',
      parent2LastName: '',
      parent2Email: '',
      parent2Phone: '',
      childFirstName: '',
      childLastName: '',
      childDob: '',
      notes: parent.notes || '',
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      parent1FirstName: '',
      parent1LastName: '',
      parent1Email: '',
      parent1Phone: '',
      parent2FirstName: '',
      parent2LastName: '',
      parent2Email: '',
      parent2Phone: '',
      childFirstName: '',
      childLastName: '',
      childDob: '',
      notes: '',
    });
  };

  return (
    <main className="main">
      <div className="header">
        <h1>Manage Parents</h1>
      </div>
      <div className="flex-between mb-2">
        <button onClick={() => showForm ? handleCancel() : setShowForm(true)}>
          {showForm ? 'Cancel' : 'Add Parent'}
        </button>
      </div>

      {generatedPasswords.length > 0 && (
        <div className="alert alert-success mb-2" style={{ backgroundColor: '#d4edda', border: '1px solid #c3e6cb', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
          <h3 style={{ marginTop: 0 }}>Family Account Created Successfully</h3>
          {generatedPasswords.map((pwd, idx) => (
            <div key={idx} style={{ marginBottom: '1rem' }}>
              <p style={{ margin: '0.5rem 0' }}>
                <strong>Login Email:</strong> {pwd.email}
              </p>
              <p style={{ margin: '0.5rem 0' }}>
                <strong>Default Password:</strong> <code style={{ backgroundColor: '#fff', padding: '0.25rem 0.5rem', borderRadius: '3px' }}>{pwd.password}</code>
              </p>
            </div>
          ))}
          <p style={{ margin: '0.5rem 0', fontSize: '0.9rem', color: '#856404' }}>
            Please provide these credentials to the parents. They can change their password after logging in.
          </p>
          <button onClick={() => setGeneratedPasswords([])} style={{ marginTop: '0.5rem' }}>Dismiss</button>
        </div>
      )}

      {showForm && (
        <div className="card mb-2">
          <h2>{editingId ? 'Edit Parent' : 'Add New Family'}</h2>
          <form onSubmit={handleSubmit}>
            {/* Parent 1 - Required */}
            <h3 style={{ marginTop: '1.5rem', marginBottom: '1rem', borderBottom: '2px solid #333', paddingBottom: '0.5rem' }}>
              Parent 1 (Required)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>First Name *</label>
                <input
                  type="text"
                  value={formData.parent1FirstName}
                  onChange={(e) => setFormData({ ...formData, parent1FirstName: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Last Name *</label>
                <input
                  type="text"
                  value={formData.parent1LastName}
                  onChange={(e) => setFormData({ ...formData, parent1LastName: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email (Login Username) *</label>
                <input
                  type="email"
                  value={formData.parent1Email}
                  onChange={(e) => setFormData({ ...formData, parent1Email: e.target.value })}
                  required
                />
                <small style={{ color: '#666', fontSize: '0.85rem' }}>This will be used as the parent's login username</small>
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  value={formData.parent1Phone}
                  onChange={(e) => setFormData({ ...formData, parent1Phone: e.target.value })}
                />
              </div>
            </div>

            {!editingId && (
              <>
                {/* Parent 2 - Optional */}
                <h3 style={{ marginTop: '1.5rem', marginBottom: '1rem', borderBottom: '2px solid #333', paddingBottom: '0.5rem' }}>
                  Parent 2 (Optional)
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>First Name</label>
                    <input
                      type="text"
                      value={formData.parent2FirstName}
                      onChange={(e) => setFormData({ ...formData, parent2FirstName: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Last Name</label>
                    <input
                      type="text"
                      value={formData.parent2LastName}
                      onChange={(e) => setFormData({ ...formData, parent2LastName: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Email (Login Username)</label>
                    <input
                      type="email"
                      value={formData.parent2Email}
                      onChange={(e) => setFormData({ ...formData, parent2Email: e.target.value })}
                    />
                    <small style={{ color: '#666', fontSize: '0.85rem' }}>This will be used as the second parent's login username</small>
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="tel"
                      value={formData.parent2Phone}
                      onChange={(e) => setFormData({ ...formData, parent2Phone: e.target.value })}
                    />
                  </div>
                </div>

                {/* Child Information */}
                <h3 style={{ marginTop: '1.5rem', marginBottom: '1rem', borderBottom: '2px solid #333', paddingBottom: '0.5rem' }}>
                  Child Information
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>First Name *</label>
                    <input
                      type="text"
                      value={formData.childFirstName}
                      onChange={(e) => setFormData({ ...formData, childFirstName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Last Name *</label>
                    <input
                      type="text"
                      value={formData.childLastName}
                      onChange={(e) => setFormData({ ...formData, childLastName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Date of Birth (for password generation) *</label>
                    <input
                      type="date"
                      value={formData.childDob}
                      onChange={(e) => setFormData({ ...formData, childDob: e.target.value })}
                      required
                    />
                    <small style={{ color: '#666', fontSize: '0.85rem' }}>Default password will be MMYYYY format (e.g., 082025 for August 2025)</small>
                  </div>
                </div>
              </>
            )}

            <div className="form-group">
              <label>Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="submit">{editingId ? 'Update Parent' : 'Create Family'}</button>
              {editingId && (
                <button type="button" onClick={handleCancel} className="secondary">
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Account Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {parents.map((parent) => (
            <tr key={parent.id}>
              <td>{parent.first_name} {parent.last_name}</td>
              <td>{parent.email || '-'}</td>
              <td>{parent.phone || '-'}</td>
              <td>
                {parent.user_id ? (
                  <span className="badge approved" title="Parent has login access">
                    Has Login
                  </span>
                ) : (
                  <span className="badge" style={{ backgroundColor: '#6c757d' }} title="Parent does not have login access">
                    No Login
                  </span>
                )}
              </td>
              <td>
                <div className="flex" style={{ gap: '0.5rem', flexDirection: 'column' }}>
                  <button
                    onClick={() => handleViewFiles(parent)}
                    className="secondary"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                  >
                    View Files
                  </button>
                  <button
                    onClick={() => handleSendReset(parent)}
                    className="secondary"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                    disabled={resettingId === parent.id || !parent.user_id}
                  >
                    {resettingId === parent.id ? 'Sending...' : 'Send Reset Link'}
                  </button>
                  <button
                    onClick={() => handleEdit(parent)}
                    style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                  >
                    Edit
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Files Modal */}
      {showFilesModal && selectedParent && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '8px',
            padding: '2rem',
            maxWidth: '900px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div className="flex-between mb-2">
              <h2>Files for {selectedParent.first_name} {selectedParent.last_name}</h2>
              <button onClick={() => {
                setShowFilesModal(false);
                setShowUploadForm(false);
                setSelectedParent(null);
              }} className="danger">Close</button>
            </div>

            <button
              onClick={() => setShowUploadForm(!showUploadForm)}
              className="mb-2"
              style={{ marginBottom: '1rem' }}
            >
              {showUploadForm ? 'Cancel Upload' : 'Upload New File'}
            </button>

            {showUploadForm && (
              <div className="card mb-2" style={{ background: '#f5f5f5' }}>
                <h3>Upload File</h3>
                <form onSubmit={handleFileUpload}>
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
                        Selected: {selectedFile.name}
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
                      rows="2"
                      placeholder="Optional description..."
                    />
                  </div>
                  <div className="form-group">
                    <label>Tags (comma-separated)</label>
                    <input
                      type="text"
                      value={uploadForm.tags}
                      onChange={(e) => setUploadForm({ ...uploadForm, tags: e.target.value })}
                      placeholder="e.g., contract, 2024, signed"
                    />
                  </div>
                  <button type="submit">Upload</button>
                </form>
              </div>
            )}

            <div className="card">
              <h3>Documents ({parentDocuments.length})</h3>
              {parentDocuments.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>
                  No documents uploaded yet.
                </p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Filename</th>
                      <th>Category</th>
                      <th>Description</th>
                      <th>Uploaded</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parentDocuments.map(doc => (
                      <tr key={doc.id}>
                        <td>{doc.original_filename}</td>
                        <td>
                          {doc.category_name ? (
                            <span className="badge">{doc.category_name}</span>
                          ) : (
                            <span style={{ color: '#999' }}>None</span>
                          )}
                        </td>
                        <td style={{ maxWidth: '200px' }}>
                          {doc.description || <span style={{ color: '#999' }}>-</span>}
                        </td>
                        <td>{formatDate(doc.created_at)}</td>
                        <td>
                          <div className="flex" style={{ gap: '0.5rem' }}>
                            <button
                              onClick={() => handleDownloadFile(doc.id, doc.original_filename)}
                              style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                            >
                              Download
                            </button>
                            <button
                              onClick={() => handleDeleteFile(doc.id)}
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
        </div>
      )}
    </main>
  );
}

export default AdminParents;
