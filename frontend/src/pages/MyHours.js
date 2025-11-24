import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

function MyHours() {
  const [entries, setEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    loadEntries();
  }, []);

  useEffect(() => {
    if (statusFilter) {
      setFilteredEntries(entries.filter(e => e.status === statusFilter));
    } else {
      setFilteredEntries(entries);
    }
  }, [statusFilter, entries]);

  const loadEntries = async () => {
    try {
      const response = await api.get('/time-entries/mine');
      setEntries(response.data.timeEntries);
      setFilteredEntries(response.data.timeEntries);
    } catch (error) {
      console.error('Load entries error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return;

    try {
      await api.delete(`/time-entries/${id}`);
      loadEntries();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete entry');
    }
  };

  if (loading) return <div className="main-content">Loading...</div>;

  return (
    <div className="main-content">
      <div className="flex-between mb-2">
        <h1>My Hours</h1>
        <button onClick={() => navigate('/log-hours')}>Log New Hours</button>
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
      </div>

      {filteredEntries.length === 0 ? (
        <div className="card">
          <p>No time entries found</p>
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Start</th>
              <th>End</th>
              <th>Hours</th>
              <th>Notes</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.map((entry) => (
              <tr key={entry.id}>
                <td>{new Date(entry.entry_date).toLocaleDateString()}</td>
                <td>{entry.start_time || '-'}</td>
                <td>{entry.end_time || '-'}</td>
                <td>{entry.total_hours}</td>
                <td>{entry.notes || '-'}</td>
                <td>
                  <span className={`badge ${entry.status.toLowerCase()}`}>
                    {entry.status}
                  </span>
                  {entry.status === 'REJECTED' && entry.rejection_reason && (
                    <div style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                      Reason: {entry.rejection_reason}
                    </div>
                  )}
                </td>
                <td>
                  {entry.status === 'PENDING' && (
                    <button
                      className="danger"
                      onClick={() => handleDelete(entry.id)}
                      style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default MyHours;
