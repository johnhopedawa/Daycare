import { useState, useEffect } from 'react';
import api from '../utils/api';

function AdminTimeEntries() {
  const [entries, setEntries] = useState([]);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadEntries();
  }, [statusFilter]);

  const loadEntries = async () => {
    setLoading(true);
    try {
      const params = statusFilter ? `?status=${statusFilter}` : '';
      const response = await api.get(`/admin/time-entries${params}`);
      setEntries(response.data.timeEntries);
      setSelected([]);
    } catch (error) {
      console.error('Load entries error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await api.post(`/admin/time-entries/${id}/approve`);
      loadEntries();
    } catch (error) {
      alert('Failed to approve entry');
    }
  };

  const handleReject = async (id) => {
    const reason = prompt('Reason for rejection:');
    if (!reason) return;

    try {
      await api.post(`/admin/time-entries/${id}/reject`, { reason });
      loadEntries();
    } catch (error) {
      alert('Failed to reject entry');
    }
  };

  const handleBatchApprove = async () => {
    if (selected.length === 0) return;

    try {
      await api.post('/admin/time-entries/batch-approve', { ids: selected });
      loadEntries();
    } catch (error) {
      alert('Failed to batch approve');
    }
  };

  const toggleSelect = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selected.length === entries.length) {
      setSelected([]);
    } else {
      setSelected(entries.map(e => e.id));
    }
  };

  return (
    <main className="main">
      <div className="header">
        <h1>Review Time Entries</h1>
      </div>

      <div className="filters">
        <div className="form-group">
          <label>Filter by Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        {selected.length > 0 && statusFilter === 'PENDING' && (
          <button className="success" onClick={handleBatchApprove}>
            Approve Selected ({selected.length})
          </button>
        )}
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : entries.length === 0 ? (
        <div className="card">
          <p>No time entries found</p>
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              {statusFilter === 'PENDING' && (
                <th>
                  <input
                    type="checkbox"
                    checked={selected.length === entries.length}
                    onChange={toggleSelectAll}
                  />
                </th>
              )}
              <th>Educator</th>
              <th>Date</th>
              <th>Hours</th>
              <th>Notes</th>
              <th>Status</th>
              {statusFilter === 'PENDING' && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                {statusFilter === 'PENDING' && (
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.includes(entry.id)}
                      onChange={() => toggleSelect(entry.id)}
                    />
                  </td>
                )}
                <td>
                  {entry.first_name} {entry.last_name}
                </td>
                <td>{new Date(entry.entry_date).toLocaleDateString()}</td>
                <td>{entry.total_hours}</td>
                <td>{entry.notes || '-'}</td>
                <td>
                  <span className={`badge ${entry.status.toLowerCase()}`}>
                    {entry.status}
                  </span>
                </td>
                {statusFilter === 'PENDING' && (
                  <td>
                    <div className="flex" style={{ gap: '0.5rem' }}>
                      <button
                        className="success"
                        onClick={() => handleApprove(entry.id)}
                        style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', flex: 1 }}
                      >
                        Approve
                      </button>
                      <button
                        className="danger"
                        onClick={() => handleReject(entry.id)}
                        style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', flex: 1 }}
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

export default AdminTimeEntries;
