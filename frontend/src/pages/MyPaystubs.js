import React, { useState, useEffect } from 'react';
import api from '../utils/api';

function MyPaystubs() {
  const [paystubs, setPaystubs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPaystubs();
  }, []);

  const loadPaystubs = async () => {
    try {
      const response = await api.get('/documents/paystubs/mine');
      setPaystubs(response.data.paystubs);
    } catch (error) {
      console.error('Load paystubs error:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async (id, stubNumber) => {
    try {
      const response = await api.get(`/documents/paystubs/${id}/pdf`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `paystub-${stubNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert('Failed to download paystub');
    }
  };

  if (loading) return <div className="main-content">Loading...</div>;

  return (
    <div className="main-content">
      <h1>My Paystubs</h1>

      {paystubs.length === 0 ? (
        <div className="card">
          <p>No paystubs available yet</p>
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Pay Period</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Net Pay</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {paystubs.map((stub) => (
              <tr key={stub.id}>
                <td>{stub.period_name}</td>
                <td>{new Date(stub.start_date).toLocaleDateString()}</td>
                <td>{new Date(stub.end_date).toLocaleDateString()}</td>
                <td>${parseFloat(stub.net_amount).toFixed(2)}</td>
                <td>
                  <button
                    onClick={() => downloadPDF(stub.id, stub.stub_number)}
                    style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                  >
                    Download PDF
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default MyPaystubs;
