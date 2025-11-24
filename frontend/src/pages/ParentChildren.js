import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

function ParentChildren() {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadChildren();
  }, []);

  const loadChildren = async () => {
    try {
      const response = await api.get('/parent/children');
      setChildren(response.data.children);
    } catch (error) {
      console.error('Load children error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="main-content">Loading...</div>;

  return (
    <div className="main-content">
      <h1>My Children</h1>

      {children.length === 0 ? (
        <div className="card">
          <p>No children found</p>
        </div>
      ) : (
        children.map(child => (
          <div key={child.id} className="card">
            <h2>{child.first_name} {child.last_name}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
              <div>
                <strong>Date of Birth:</strong>
                <p>{new Date(child.date_of_birth).toLocaleDateString()}</p>
              </div>
              <div>
                <strong>Enrollment Date:</strong>
                <p>{new Date(child.enrollment_start_date).toLocaleDateString()}</p>
              </div>
              <div>
                <strong>Status:</strong>
                <p><span className={`badge badge-${child.status.toLowerCase()}`}>{child.status}</span></p>
              </div>
              <div>
                <strong>Monthly Rate:</strong>
                <p>${parseFloat(child.monthly_rate).toFixed(2)}</p>
              </div>
            </div>

            {child.allergies && (
              <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#fff3cd', borderRadius: '4px' }}>
                <strong>⚠️ Allergies:</strong> {child.allergies}
              </div>
            )}

            {child.medical_notes && (
              <div style={{ marginTop: '1rem' }}>
                <strong>Medical Notes:</strong>
                <p>{child.medical_notes}</p>
              </div>
            )}
          </div>
        ))
      )}

      <button onClick={() => navigate('/parent/dashboard')} className="btn-secondary">
        Back to Dashboard
      </button>
    </div>
  );
}

export default ParentChildren;
