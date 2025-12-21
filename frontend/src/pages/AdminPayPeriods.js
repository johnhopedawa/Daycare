import { useState, useEffect } from 'react';
import api from '../utils/api';

function AdminPayPeriods() {
  const [periods, setPeriods] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', startDate: '', endDate: '' });
  const [showGenerate, setShowGenerate] = useState(false);
  const [generateData, setGenerateData] = useState({ frequency: 'BI_WEEKLY', startDate: '' });
  const [showPreview, setShowPreview] = useState(false);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    loadPeriods();
  }, []);

  const loadPeriods = async () => {
    try {
      const response = await api.get('/pay-periods');
      setPeriods(response.data.payPeriods);
    } catch (error) {
      console.error('Load periods error:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/pay-periods', formData);
      setShowForm(false);
      setFormData({ name: '', startDate: '', endDate: '' });
      loadPeriods();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to create pay period');
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/pay-periods/generate', generateData);
      alert(response.data.message);
      setShowGenerate(false);
      setGenerateData({ frequency: 'BI_WEEKLY', startDate: '' });
      loadPeriods();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to generate pay periods');
    }
  };

  const handlePreviewClose = async (id) => {
    try {
      const response = await api.get(`/pay-periods/${id}/close-preview`);
      setPreview(response.data);
      setShowPreview(true);
    } catch (error) {
      alert('Failed to load preview');
    }
  };

  const handleConfirmClose = async () => {
    try {
      await api.post(`/pay-periods/${preview.period.id}/close`);
      setShowPreview(false);
      setPreview(null);
      loadPeriods();
    } catch (error) {
      alert('Failed to close pay period');
    }
  };

  const downloadExcel = async (id, name) => {
    try {
      const response = await api.get(`/documents/pay-periods/${id}/export-excel`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payroll-${name}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert('Failed to download Excel');
    }
  };

  return (
    <main className="main">
      <div className="header">
        <h1>Pay Periods</h1>
      </div>
      <div className="flex-between mb-2">
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={() => setShowGenerate(!showGenerate)}>
            {showGenerate ? 'Cancel' : 'Auto-Generate Periods'}
          </button>
          <button onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : 'Create Period'}
          </button>
        </div>
      </div>

      {showGenerate && (
        <div className="card mb-2">
          <h2>Auto-Generate Pay Periods</h2>
          <p style={{ marginBottom: '1rem', color: '#666' }}>
            This will generate the next 6 months of pay periods based on the frequency you select.
          </p>
          <form onSubmit={handleGenerate}>
            <div className="form-group">
              <label>Frequency *</label>
              <select
                value={generateData.frequency}
                onChange={(e) => setGenerateData({ ...generateData, frequency: e.target.value })}
                required
              >
                <option value="BI_WEEKLY">Bi-Weekly (Every 2 weeks)</option>
                <option value="MONTHLY">Monthly</option>
                <option value="SEMI_MONTHLY">Semi-Monthly (1st-15th, 16th-end)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Start Date *</label>
              <input
                type="date"
                value={generateData.startDate}
                onChange={(e) => setGenerateData({ ...generateData, startDate: e.target.value })}
                required
              />
            </div>
            <button type="submit">Generate Periods</button>
          </form>
        </div>
      )}

      {showForm && (
        <div className="card mb-2">
          <h2>Create Pay Period</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., March 2024"
                required
              />
            </div>
            <div className="form-group">
              <label>Start Date *</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>End Date *</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                required
              />
            </div>
            <button type="submit">Create</button>
          </form>
        </div>
      )}

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Start Date</th>
            <th>End Date</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {periods.map((period) => (
            <tr key={period.id}>
              <td>{period.name}</td>
              <td>{new Date(period.start_date).toLocaleDateString()}</td>
              <td>{new Date(period.end_date).toLocaleDateString()}</td>
              <td>
                <span className={`badge ${period.status.toLowerCase()}`}>
                  {period.status}
                </span>
              </td>
              <td>
                {period.status === 'OPEN' ? (
                  <button
                    className="danger"
                    onClick={() => handlePreviewClose(period.id)}
                    style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}
                  >
                    Close Period
                  </button>
                ) : (
                  <button
                    onClick={() => downloadExcel(period.id, period.name)}
                    style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}
                  >
                    Download Excel
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showPreview && preview && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '2rem',
            maxWidth: '800px',
            maxHeight: '80vh',
            overflow: 'auto',
            width: '90%'
          }}>
            <h2>Close Pay Period Preview</h2>
            <p style={{ marginBottom: '1rem' }}>
              <strong>{preview.period.name}</strong> ({new Date(preview.period.start_date).toLocaleDateString()} - {new Date(preview.period.end_date).toLocaleDateString()})
            </p>

            <div style={{ marginBottom: '1.5rem' }}>
              <h3>Summary</h3>
              <p>Total Employees: <strong>{preview.total_count}</strong></p>
              <p>Hourly: {preview.hourly_employees.length} | Salaried: {preview.salaried_employees.length}</p>
            </div>

            {preview.hourly_employees.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h3>Hourly Employees</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Hours</th>
                      <th>Rate</th>
                      <th>Gross Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.hourly_employees.map((emp) => (
                      <tr key={emp.id}>
                        <td>{emp.first_name} {emp.last_name}</td>
                        <td>{parseFloat(emp.total_hours).toFixed(2)}</td>
                        <td>${parseFloat(emp.hourly_rate || 0).toFixed(2)}/hr</td>
                        <td>${emp.gross_amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {preview.salaried_employees.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h3>Salaried Employees</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Salary Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.salaried_employees.map((emp) => (
                      <tr key={emp.id}>
                        <td>{emp.first_name} {emp.last_name}</td>
                        <td>${emp.gross_amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowPreview(false); setPreview(null); }}
                className="secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmClose}
                className="danger"
              >
                Confirm & Close Period
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default AdminPayPeriods;
