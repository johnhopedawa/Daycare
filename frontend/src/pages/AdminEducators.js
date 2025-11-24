import React, { useState, useEffect } from 'react';
import api from '../utils/api';

function AdminEducators() {
  const [educators, setEducators] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    paymentType: 'HOURLY',
    payFrequency: 'BI_WEEKLY',
    hourlyRate: '',
    salaryAmount: '',
    annualSickDays: '10',
    annualVacationDays: '10',
    carryoverEnabled: false,
    dateEmployed: '',
    sin: '',
    ytdGross: '0',
    ytdCpp: '0',
    ytdEi: '0',
    ytdTax: '0',
    ytdHours: '0',
  });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadEducators();
  }, []);

  const loadEducators = async () => {
    try {
      const response = await api.get('/admin/users?role=EDUCATOR');
      setEducators(response.data.users);
    } catch (error) {
      console.error('Load educators error:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post('/admin/users', {
        ...formData,
        // Set initial remaining days to annual days
        sickDaysRemaining: formData.annualSickDays,
        vacationDaysRemaining: formData.annualVacationDays,
      });
      setShowForm(false);
      setFormData({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        paymentType: 'HOURLY',
        payFrequency: 'BI_WEEKLY',
        hourlyRate: '',
        salaryAmount: '',
        annualSickDays: '10',
        annualVacationDays: '10',
        carryoverEnabled: false,
        dateEmployed: '',
        sin: '',
        ytdGross: '0',
        ytdCpp: '0',
        ytdEi: '0',
        ytdTax: '0',
        ytdHours: '0',
      });
      loadEducators();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to create educator');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (educator) => {
    setEditingId(educator.id);
    setEditForm({
      paymentType: educator.payment_type || 'HOURLY',
      payFrequency: educator.pay_frequency || 'BI_WEEKLY',
      hourlyRate: educator.hourly_rate || '',
      salaryAmount: educator.salary_amount || '',
      annualSickDays: educator.annual_sick_days || 10,
      annualVacationDays: educator.annual_vacation_days || 10,
      sickDaysRemaining: educator.sick_days_remaining || 0,
      vacationDaysRemaining: educator.vacation_days_remaining || 0,
      carryoverEnabled: educator.carryover_enabled || false,
      dateEmployed: educator.date_employed || '',
      sin: educator.sin || '',
      ytdGross: educator.ytd_gross || 0,
      ytdCpp: educator.ytd_cpp || 0,
      ytdEi: educator.ytd_ei || 0,
      ytdTax: educator.ytd_tax || 0,
      ytdHours: educator.ytd_hours || 0,
    });
  };

  const handleEditSubmit = async (e, id) => {
    e.preventDefault();
    try {
      await api.patch(`/admin/users/${id}`, editForm);
      setEditingId(null);
      loadEducators();
    } catch (error) {
      alert('Failed to update educator');
    }
  };

  const toggleActive = async (id, currentStatus) => {
    try {
      await api.patch(`/admin/users/${id}`, { isActive: !currentStatus });
      loadEducators();
    } catch (error) {
      alert('Failed to update educator');
    }
  };

  const updateRate = async (id, currentRate) => {
    const newRate = prompt('Enter new hourly rate:', currentRate || '');
    if (!newRate) return;

    try {
      await api.patch(`/admin/users/${id}`, { hourlyRate: parseFloat(newRate) });
      loadEducators();
    } catch (error) {
      alert('Failed to update rate');
    }
  };

  return (
    <div className="main-content">
      <div className="flex-between mb-2">
        <h1>Manage Educators</h1>
        <button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Add Educator'}
        </button>
      </div>

      {showForm && (
        <div className="card mb-2">
          <h2>Add New Educator</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Password *</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>First Name *</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Last Name *</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Payment Type *</label>
              <select
                value={formData.paymentType}
                onChange={(e) => setFormData({ ...formData, paymentType: e.target.value })}
                required
              >
                <option value="HOURLY">Hourly</option>
                <option value="SALARY">Salary</option>
              </select>
            </div>

            <div className="form-group">
              <label>Pay Frequency *</label>
              <select
                value={formData.payFrequency}
                onChange={(e) => setFormData({ ...formData, payFrequency: e.target.value })}
                required
              >
                <option value="BI_WEEKLY">Bi-Weekly (Every 2 weeks)</option>
                <option value="MONTHLY">Monthly</option>
                <option value="SEMI_MONTHLY">Semi-Monthly (1st-15th, 16th-end)</option>
              </select>
            </div>

            {formData.paymentType === 'HOURLY' ? (
              <div className="form-group">
                <label>Hourly Rate</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.hourlyRate}
                  onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            ) : (
              <div className="form-group">
                <label>Salary Amount (per pay period)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.salaryAmount}
                  onChange={(e) => setFormData({ ...formData, salaryAmount: e.target.value })}
                  placeholder="0.00"
                />
                <small style={{ display: 'block', marginTop: '0.25rem', color: '#666' }}>
                  Enter amount per {formData.payFrequency === 'BI_WEEKLY' ? 'bi-weekly period' : formData.payFrequency === 'MONTHLY' ? 'month' : 'semi-monthly period'}
                </small>
              </div>
            )}

            <div className="form-group">
              <label>Annual Sick Days</label>
              <input
                type="number"
                value={formData.annualSickDays}
                onChange={(e) => setFormData({ ...formData, annualSickDays: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Annual Vacation Days</label>
              <input
                type="number"
                value={formData.annualVacationDays}
                onChange={(e) => setFormData({ ...formData, annualVacationDays: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.carryoverEnabled}
                  onChange={(e) => setFormData({ ...formData, carryoverEnabled: e.target.checked })}
                  style={{ width: 'auto', marginRight: '0.5rem' }}
                />
                Allow unused days to carry over to next year
              </label>
            </div>

            <div className="form-group">
              <label>Date Employed</label>
              <input
                type="date"
                value={formData.dateEmployed}
                onChange={(e) => setFormData({ ...formData, dateEmployed: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>SIN (Social Insurance Number)</label>
              <input
                type="text"
                value={formData.sin}
                maxLength="11"
                placeholder="123-456-789"
                onChange={(e) => setFormData({ ...formData, sin: e.target.value })}
              />
            </div>

            <h3 style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>Starting YTD Values (for employees transitioning from QuickBooks)</h3>

            <div className="form-group">
              <label>YTD Gross Income</label>
              <input
                type="number"
                step="0.01"
                value={formData.ytdGross}
                onChange={(e) => setFormData({ ...formData, ytdGross: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>YTD CPP</label>
              <input
                type="number"
                step="0.01"
                value={formData.ytdCpp}
                onChange={(e) => setFormData({ ...formData, ytdCpp: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>YTD EI</label>
              <input
                type="number"
                step="0.01"
                value={formData.ytdEi}
                onChange={(e) => setFormData({ ...formData, ytdEi: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>YTD Income Tax</label>
              <input
                type="number"
                step="0.01"
                value={formData.ytdTax}
                onChange={(e) => setFormData({ ...formData, ytdTax: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>YTD Hours</label>
              <input
                type="number"
                step="0.01"
                value={formData.ytdHours}
                onChange={(e) => setFormData({ ...formData, ytdHours: e.target.value })}
              />
            </div>

            <button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Educator'}
            </button>
          </form>
        </div>
      )}

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Rate</th>
            <th>Sick/Vacation Days</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {educators.map((educator) => (
            <React.Fragment key={educator.id}>
              <tr>
                <td>
                  {educator.first_name} {educator.last_name}
                </td>
                <td>{educator.email}</td>
                <td>
                  <div style={{ fontSize: '0.875rem' }}>
                    <div>
                      <span className="badge">{educator.payment_type || 'HOURLY'}</span>
                    </div>
                    <div style={{ marginTop: '0.25rem' }}>
                      {educator.payment_type === 'SALARY' ? (
                        `$${educator.salary_amount ? parseFloat(educator.salary_amount).toFixed(2) : '0.00'} / period`
                      ) : (
                        `$${educator.hourly_rate ? parseFloat(educator.hourly_rate).toFixed(2) : '0.00'} / hr`
                      )}
                    </div>
                    <div style={{ color: '#666', fontSize: '0.75rem' }}>
                      {(educator.pay_frequency || 'BI_WEEKLY').replace('_', ' ')}
                    </div>
                  </div>
                </td>
                <td>
                  <div style={{ fontSize: '0.875rem' }}>
                    <div>Sick: {parseFloat(educator.sick_days_remaining || 0).toFixed(1)} / {educator.annual_sick_days || 0}</div>
                    <div>Vacation: {parseFloat(educator.vacation_days_remaining || 0).toFixed(1)} / {educator.annual_vacation_days || 0}</div>
                  </div>
                </td>
                <td>
                  <span className={`badge ${educator.is_active ? 'approved' : 'rejected'}`}>
                    {educator.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <div className="flex" style={{ gap: '0.5rem' }}>
                    <button
                      onClick={() => handleEditClick(educator)}
                      style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}
                    >
                      Edit
                    </button>
                    <button
                      className={educator.is_active ? 'danger' : 'success'}
                      onClick={() => toggleActive(educator.id, educator.is_active)}
                      style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}
                    >
                      {educator.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </td>
              </tr>
              {editingId === educator.id && (
                <tr>
                  <td colSpan="6" style={{ background: '#f8f9fa', padding: '1.5rem' }}>
                    <form onSubmit={(e) => handleEditSubmit(e, educator.id)}>
                      <h3>Edit Educator Details</h3>
                      <h4 style={{ marginTop: '1rem' }}>Payment Information</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '0.5rem' }}>
                        <div className="form-group">
                          <label>Payment Type</label>
                          <select
                            value={editForm.paymentType}
                            onChange={(e) => setEditForm({ ...editForm, paymentType: e.target.value })}
                          >
                            <option value="HOURLY">Hourly</option>
                            <option value="SALARY">Salary</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Pay Frequency</label>
                          <select
                            value={editForm.payFrequency}
                            onChange={(e) => setEditForm({ ...editForm, payFrequency: e.target.value })}
                          >
                            <option value="BI_WEEKLY">Bi-Weekly</option>
                            <option value="MONTHLY">Monthly</option>
                            <option value="SEMI_MONTHLY">Semi-Monthly</option>
                          </select>
                        </div>
                        {editForm.paymentType === 'HOURLY' ? (
                          <div className="form-group">
                            <label>Hourly Rate</label>
                            <input
                              type="number"
                              step="0.01"
                              value={editForm.hourlyRate}
                              onChange={(e) => setEditForm({ ...editForm, hourlyRate: e.target.value })}
                            />
                          </div>
                        ) : (
                          <div className="form-group">
                            <label>Salary Amount (per period)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={editForm.salaryAmount}
                              onChange={(e) => setEditForm({ ...editForm, salaryAmount: e.target.value })}
                            />
                          </div>
                        )}
                      </div>
                      <h4 style={{ marginTop: '1rem' }}>Time Off</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '0.5rem' }}>
                        <div className="form-group">
                          <label>Annual Sick Days</label>
                          <input
                            type="number"
                            value={editForm.annualSickDays}
                            onChange={(e) => setEditForm({ ...editForm, annualSickDays: e.target.value })}
                          />
                        </div>
                        <div className="form-group">
                          <label>Annual Vacation Days</label>
                          <input
                            type="number"
                            value={editForm.annualVacationDays}
                            onChange={(e) => setEditForm({ ...editForm, annualVacationDays: e.target.value })}
                          />
                        </div>
                        <div className="form-group">
                          <label>
                            <input
                              type="checkbox"
                              checked={editForm.carryoverEnabled}
                              onChange={(e) => setEditForm({ ...editForm, carryoverEnabled: e.target.checked })}
                              style={{ width: 'auto', marginRight: '0.5rem' }}
                            />
                            Carryover Enabled
                          </label>
                        </div>
                        <div className="form-group">
                          <label>Sick Days Remaining</label>
                          <input
                            type="number"
                            step="0.5"
                            value={editForm.sickDaysRemaining}
                            onChange={(e) => setEditForm({ ...editForm, sickDaysRemaining: e.target.value })}
                          />
                        </div>
                        <div className="form-group">
                          <label>Vacation Days Remaining</label>
                          <input
                            type="number"
                            step="0.5"
                            value={editForm.vacationDaysRemaining}
                            onChange={(e) => setEditForm({ ...editForm, vacationDaysRemaining: e.target.value })}
                          />
                        </div>
                        <div className="form-group">
                          <label>Date Employed</label>
                          <input
                            type="date"
                            value={editForm.dateEmployed}
                            onChange={(e) => setEditForm({ ...editForm, dateEmployed: e.target.value })}
                          />
                        </div>
                        <div className="form-group">
                          <label>SIN</label>
                          <input
                            type="text"
                            maxLength="11"
                            value={editForm.sin}
                            onChange={(e) => setEditForm({ ...editForm, sin: e.target.value })}
                          />
                        </div>
                      </div>
                      <h4 style={{ marginTop: '1rem' }}>YTD Values</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginTop: '0.5rem' }}>
                        <div className="form-group">
                          <label>YTD Gross</label>
                          <input
                            type="number"
                            step="0.01"
                            value={editForm.ytdGross}
                            onChange={(e) => setEditForm({ ...editForm, ytdGross: e.target.value })}
                          />
                        </div>
                        <div className="form-group">
                          <label>YTD CPP</label>
                          <input
                            type="number"
                            step="0.01"
                            value={editForm.ytdCpp}
                            onChange={(e) => setEditForm({ ...editForm, ytdCpp: e.target.value })}
                          />
                        </div>
                        <div className="form-group">
                          <label>YTD EI</label>
                          <input
                            type="number"
                            step="0.01"
                            value={editForm.ytdEi}
                            onChange={(e) => setEditForm({ ...editForm, ytdEi: e.target.value })}
                          />
                        </div>
                        <div className="form-group">
                          <label>YTD Tax</label>
                          <input
                            type="number"
                            step="0.01"
                            value={editForm.ytdTax}
                            onChange={(e) => setEditForm({ ...editForm, ytdTax: e.target.value })}
                          />
                        </div>
                        <div className="form-group">
                          <label>YTD Hours</label>
                          <input
                            type="number"
                            step="0.01"
                            value={editForm.ytdHours}
                            onChange={(e) => setEditForm({ ...editForm, ytdHours: e.target.value })}
                          />
                        </div>
                      </div>
                      <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                        <button type="submit" className="success" style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}>
                          Save Changes
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => setEditingId(null)}
                          style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdminEducators;
