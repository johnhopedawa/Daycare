import React, { useState, useEffect } from 'react';
import api from '../utils/api';

function AdminChildren() {
  const [children, setChildren] = useState([]);
  const [parents, setParents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingChild, setEditingChild] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Files modal state
  const [showFilesModal, setShowFilesModal] = useState(false);
  const [selectedChild, setSelectedChild] = useState(null);
  const [childDocuments, setChildDocuments] = useState([]);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadForm, setUploadForm] = useState({
    category_id: '',
    description: '',
    tags: '',
  });

  const [childForm, setChildForm] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    enrollment_start_date: '',
    enrollment_end_date: '',
    status: 'ACTIVE',
    monthly_rate: '',
    billing_cycle: 'MONTHLY',
    allergies: { common: [], other: '' },
    medical_notes: '',
    notes: '',
    parent_ids: []
  });

  const COMMON_ALLERGIES = [
    'Milk', 'Eggs', 'Nuts', 'Tree Nuts', 'Soy', 'Wheat (Gluten)',
    'Fish', 'Shellfish', 'Sesame', 'Strawberries', 'Citrus Fruits', 'Bananas',
    'Chocolate/Cocoa', 'Food Dyes', 'Corn', 'Dust Mites', 'Pollen', 'Pet'
  ];

  useEffect(() => {
    loadChildren();
    loadParents();
    loadCategories();
  }, [searchTerm, filterStatus]);

  const loadChildren = async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      if (searchTerm) params.append('search', searchTerm);

      const response = await api.get(`/children?${params}`);
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

  const loadCategories = async () => {
    try {
      const response = await api.get('/files/categories');
      setCategories(response.data.categories);
    } catch (error) {
      console.error('Load categories error:', error);
    }
  };

  const loadChildDocuments = async (childId) => {
    try {
      const response = await api.get(`/files?linked_child_id=${childId}`);
      setChildDocuments(response.data.documents);
    } catch (error) {
      console.error('Load child documents error:', error);
    }
  };

  const handleViewFiles = (child) => {
    setSelectedChild(child);
    setShowFilesModal(true);
    loadChildDocuments(child.id);
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

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('category_id', uploadForm.category_id);
    formData.append('description', uploadForm.description);
    formData.append('linked_child_id', selectedChild.id);

    if (uploadForm.tags) {
      const tagsArray = uploadForm.tags.split(',').map(t => t.trim()).filter(t => t);
      formData.append('tags', JSON.stringify(tagsArray));
    }

    try {
      await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setShowUploadForm(false);
      setSelectedFile(null);
      setUploadForm({ category_id: '', description: '', tags: '' });
      loadChildDocuments(selectedChild.id);
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
      loadChildDocuments(selectedChild.id);
    } catch (error) {
      alert('Failed to delete file');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingChild) {
        await api.patch(`/children/${editingChild.id}`, childForm);
      } else {
        await api.post('/children', childForm);
      }

      setShowForm(false);
      setEditingChild(null);
      resetForm();
      loadChildren();
      alert(editingChild ? 'Child updated successfully!' : 'Child added successfully!');
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to save child');
    }
  };

  const handleEdit = (child) => {
    setEditingChild(child);

    // Parse allergies - handle both old string format and new JSONB format
    let allergiesData = { common: [], other: '' };
    if (child.allergies) {
      if (typeof child.allergies === 'string') {
        // Old format - just put in "other"
        allergiesData = { common: [], other: child.allergies };
      } else if (typeof child.allergies === 'object') {
        // New JSONB format
        allergiesData = {
          common: child.allergies.common || [],
          other: child.allergies.other || ''
        };
      }
    }

    setChildForm({
      first_name: child.first_name || '',
      last_name: child.last_name || '',
      date_of_birth: child.date_of_birth ? child.date_of_birth.split('T')[0] : '',
      enrollment_start_date: child.enrollment_start_date ? child.enrollment_start_date.split('T')[0] : '',
      enrollment_end_date: child.enrollment_end_date ? child.enrollment_end_date.split('T')[0] : '',
      status: child.status || 'ACTIVE',
      monthly_rate: child.monthly_rate || '',
      billing_cycle: child.billing_cycle || 'MONTHLY',
      allergies: allergiesData,
      medical_notes: child.medical_notes || '',
      notes: child.notes || '',
      parent_ids: []
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this child? This will also remove parent relationships.')) {
      return;
    }

    try {
      await api.delete(`/children/${id}`);
      loadChildren();
    } catch (error) {
      alert('Failed to delete child');
    }
  };

  const handleUpdatePriority = async (child) => {
    const newPriority = prompt(
      `Update waitlist priority for ${child.first_name} ${child.last_name}\n\nCurrent priority: #${child.waitlist_priority}\n\nEnter new priority (1 = first in line):`,
      child.waitlist_priority
    );

    if (newPriority === null) return; // User cancelled

    const priorityNum = parseInt(newPriority);
    if (isNaN(priorityNum) || priorityNum < 1) {
      alert('Please enter a valid priority number (1 or higher)');
      return;
    }

    try {
      await api.patch(`/children/${child.id}`, { waitlist_priority: priorityNum });
      loadChildren();
    } catch (error) {
      alert('Failed to update priority');
    }
  };

  const resetForm = () => {
    setChildForm({
      first_name: '',
      last_name: '',
      date_of_birth: '',
      enrollment_start_date: '',
      enrollment_end_date: '',
      status: 'ACTIVE',
      monthly_rate: '',
      billing_cycle: 'MONTHLY',
      allergies: { common: [], other: '' },
      medical_notes: '',
      notes: '',
      parent_ids: []
    });
  };

  const handleAllergyToggle = (allergy) => {
    const current = childForm.allergies.common || [];
    if (current.includes(allergy)) {
      setChildForm({
        ...childForm,
        allergies: {
          ...childForm.allergies,
          common: current.filter(a => a !== allergy)
        }
      });
    } else {
      setChildForm({
        ...childForm,
        allergies: {
          ...childForm.allergies,
          common: [...current, allergy]
        }
      });
    }
  };

  const handleParentSelection = (parentId) => {
    const currentIds = childForm.parent_ids || [];
    if (currentIds.includes(parentId)) {
      setChildForm({
        ...childForm,
        parent_ids: currentIds.filter(id => id !== parentId)
      });
    } else {
      setChildForm({
        ...childForm,
        parent_ids: [...currentIds, parentId]
      });
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

  const calculateAge = (dob) => {
    if (!dob) return 'N/A';
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div className="main-content">
      <div className="flex-between mb-2">
        <h1>Children Management</h1>
        <button onClick={() => {
          setShowForm(!showForm);
          if (!showForm) {
            setEditingChild(null);
            resetForm();
          }
        }}>
          {showForm ? 'Cancel' : 'Add Child'}
        </button>
      </div>

      {showForm && (
        <div className="card mb-2">
          <h2>{editingChild ? 'Edit Child' : 'Add New Child'}</h2>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>First Name *</label>
                <input
                  type="text"
                  value={childForm.first_name}
                  onChange={(e) => setChildForm({ ...childForm, first_name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Last Name *</label>
                <input
                  type="text"
                  value={childForm.last_name}
                  onChange={(e) => setChildForm({ ...childForm, last_name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Date of Birth *</label>
                <input
                  type="date"
                  value={childForm.date_of_birth}
                  onChange={(e) => setChildForm({ ...childForm, date_of_birth: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Enrollment Start Date {childForm.status !== 'WAITLIST' && '*'}</label>
                <input
                  type="date"
                  value={childForm.enrollment_start_date}
                  onChange={(e) => setChildForm({ ...childForm, enrollment_start_date: e.target.value })}
                  required={childForm.status !== 'WAITLIST'}
                  disabled={childForm.status === 'WAITLIST'}
                />
                {childForm.status === 'WAITLIST' && (
                  <small style={{ color: '#666', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>
                    Not applicable for waitlist children
                  </small>
                )}
              </div>
              <div className="form-group">
                <label>Enrollment End Date</label>
                <input
                  type="date"
                  value={childForm.enrollment_end_date}
                  onChange={(e) => setChildForm({ ...childForm, enrollment_end_date: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={childForm.status}
                  onChange={(e) => setChildForm({ ...childForm, status: e.target.value })}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="WAITLIST">Waitlist</option>
                </select>
              </div>
              <div className="form-group">
                <label>Monthly Rate ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={childForm.monthly_rate}
                  onChange={(e) => setChildForm({ ...childForm, monthly_rate: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="form-group">
                <label>Billing Cycle</label>
                <select
                  value={childForm.billing_cycle}
                  onChange={(e) => setChildForm({ ...childForm, billing_cycle: e.target.value })}
                >
                  <option value="WEEKLY">Weekly</option>
                  <option value="BI_WEEKLY">Bi-Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Allergies</label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.75rem',
                padding: '1rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                backgroundColor: '#f9f9f9'
              }}>
                {COMMON_ALLERGIES.map(allergy => (
                  <label key={allergy} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={(childForm.allergies.common || []).includes(allergy)}
                      onChange={() => handleAllergyToggle(allergy)}
                      style={{ marginRight: '0.5rem' }}
                    />
                    <span style={{ fontSize: '0.9rem' }}>{allergy}</span>
                  </label>
                ))}
              </div>
              <div style={{ marginTop: '0.75rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'normal' }}>
                  Other Allergies
                </label>
                <input
                  type="text"
                  value={childForm.allergies.other || ''}
                  onChange={(e) => setChildForm({
                    ...childForm,
                    allergies: { ...childForm.allergies, other: e.target.value }
                  })}
                  placeholder="Any other allergies not listed above..."
                />
              </div>
            </div>

            <div className="form-group">
              <label>Medical Notes</label>
              <textarea
                value={childForm.medical_notes}
                onChange={(e) => setChildForm({ ...childForm, medical_notes: e.target.value })}
                rows="2"
                placeholder="Medical conditions, medications, etc..."
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            </div>

            <div className="form-group">
              <label>Additional Notes</label>
              <textarea
                value={childForm.notes}
                onChange={(e) => setChildForm({ ...childForm, notes: e.target.value })}
                rows="3"
                placeholder="Any additional information..."
              />
            </div>

            {!editingChild && (
              <div className="form-group">
                <label>Link to Parents (select multiple)</label>
                <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '4px', padding: '0.5rem' }}>
                  {parents.map(parent => (
                    <label key={parent.id} style={{ display: 'block', padding: '0.25rem 0', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={childForm.parent_ids.includes(parent.id)}
                        onChange={() => handleParentSelection(parent.id)}
                        style={{ marginRight: '0.5rem' }}
                      />
                      {parent.first_name} {parent.last_name} {parent.email && `(${parent.email})`}
                    </label>
                  ))}
                </div>
                <small style={{ color: '#666' }}>First selected parent will be set as primary contact</small>
              </div>
            )}

            <button type="submit">{editingChild ? 'Update Child' : 'Add Child'}</button>
          </form>
        </div>
      )}

      <div className="card">
        <div className="flex-between mb-2">
          <h2>All Children</h2>
          <div className="flex" style={{ gap: '1rem' }}>
            <input
              type="text"
              placeholder="Search by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '200px' }}
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="WAITLIST">Waitlist</option>
            </select>
          </div>
        </div>

        {children.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>
            No children found. Add your first child to get started!
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Age</th>
                <th>Status</th>
                <th>Enrollment</th>
                <th>Monthly Rate</th>
                <th>Parents</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {children.map(child => (
                <tr key={child.id}>
                  <td>
                    <strong>{child.first_name} {child.last_name}</strong>
                    {child.allergies && (
                      (() => {
                        const hasAllergies =
                          (typeof child.allergies === 'string' && child.allergies.trim()) ||
                          (typeof child.allergies === 'object' && (
                            (child.allergies.common && child.allergies.common.length > 0) ||
                            (child.allergies.other && child.allergies.other.trim())
                          ));

                        if (!hasAllergies) return null;

                        let allergyText = '';
                        if (typeof child.allergies === 'string') {
                          allergyText = child.allergies;
                        } else {
                          const parts = [];
                          if (child.allergies.common && child.allergies.common.length > 0) {
                            parts.push(child.allergies.common.join(', '));
                          }
                          if (child.allergies.other && child.allergies.other.trim()) {
                            parts.push(child.allergies.other);
                          }
                          allergyText = parts.join(', ');
                        }

                        return (
                          <div style={{ fontSize: '0.75rem', color: '#d32f2f', marginTop: '0.25rem' }}>
                            ⚠️ Allergies: {allergyText}
                          </div>
                        );
                      })()
                    )}
                  </td>
                  <td>{calculateAge(child.date_of_birth)} years</td>
                  <td>
                    <span className={`badge ${child.status === 'ACTIVE' ? 'success' : ''}`}>
                      {child.status}
                    </span>
                    {child.status === 'WAITLIST' && child.waitlist_priority && (
                      <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                        Priority: #{child.waitlist_priority}
                      </div>
                    )}
                  </td>
                  <td>
                    {child.status === 'WAITLIST' ? (
                      <span style={{ color: '#666', fontSize: '0.875rem' }}>On Waitlist</span>
                    ) : (
                      <div style={{ fontSize: '0.875rem' }}>
                        {formatDate(child.enrollment_start_date)}
                        {child.enrollment_end_date && (
                          <div style={{ color: '#666' }}>to {formatDate(child.enrollment_end_date)}</div>
                        )}
                      </div>
                    )}
                  </td>
                  <td>
                    {child.monthly_rate ? `$${parseFloat(child.monthly_rate).toFixed(2)}` : 'N/A'}
                    <div style={{ fontSize: '0.75rem', color: '#666' }}>
                      {child.billing_cycle?.replace('_', ' ')}
                    </div>
                  </td>
                  <td>
                    {child.parents && child.parents.length > 0 ? (
                      <div style={{ fontSize: '0.875rem' }}>
                        {child.parents.map((parent, idx) => (
                          <div key={idx}>
                            {parent.parent_name}
                            {parent.is_primary_contact && <span style={{ color: '#1976d2' }}> (Primary)</span>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span style={{ color: '#999' }}>No parents linked</span>
                    )}
                  </td>
                  <td>
                    <div className="flex" style={{ gap: '0.5rem', flexDirection: 'column' }}>
                      <button
                        onClick={() => handleViewFiles(child)}
                        className="secondary"
                        style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                      >
                        View Files
                      </button>
                      {child.status === 'WAITLIST' && (
                        <button
                          onClick={() => handleUpdatePriority(child)}
                          className="secondary"
                          style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                        >
                          Update Priority
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(child)}
                        style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(child.id)}
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

      {/* Files Modal */}
      {showFilesModal && selectedChild && (
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
              <h2>Files for {selectedChild.first_name} {selectedChild.last_name}</h2>
              <button onClick={() => {
                setShowFilesModal(false);
                setShowUploadForm(false);
                setSelectedChild(null);
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
                      placeholder="e.g., medical, vaccination, 2024"
                    />
                  </div>
                  <button type="submit">Upload</button>
                </form>
              </div>
            )}

            <div className="card">
              <h3>Documents ({childDocuments.length})</h3>
              {childDocuments.length === 0 ? (
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
                    {childDocuments.map(doc => (
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
    </div>
  );
}

export default AdminChildren;
