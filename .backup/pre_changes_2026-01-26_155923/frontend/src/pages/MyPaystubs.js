import { useState, useEffect } from 'react';
import api from '../utils/api';
import { EducatorLayout } from '../components/EducatorLayout';

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

  if (loading) {
    return (
      <EducatorLayout title="My Paystubs" subtitle="Download your pay statements">
        <div className="themed-surface p-6 rounded-3xl text-center">Loading...</div>
      </EducatorLayout>
    );
  }

  return (
    <EducatorLayout title="My Paystubs" subtitle="Download your pay statements">

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
    </EducatorLayout>
  );
}

export default MyPaystubs;
