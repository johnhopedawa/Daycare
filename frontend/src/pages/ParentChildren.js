import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ArrowLeft } from 'lucide-react';
import { ParentLayout } from '../components/ParentLayout';
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

  const formatAllergies = (allergies) => {
    if (!allergies) return '';
    if (typeof allergies === 'string') return allergies;
    if (Array.isArray(allergies.common)) {
      const common = allergies.common.filter(Boolean).join(', ');
      const other = allergies.other ? `Other: ${allergies.other}` : '';
      return [common, other].filter(Boolean).join(' | ');
    }
    return JSON.stringify(allergies);
  };

  if (loading) {
    return (
      <ParentLayout title="My Children" subtitle="Profiles and details">
        <div className="flex items-center justify-center h-48 parent-text-muted">Loading...</div>
      </ParentLayout>
    );
  }

  return (
    <ParentLayout title="My Children" subtitle="Profiles and details">
      {children.length === 0 ? (
        <div className="parent-card p-8 rounded-xl border border-gray-100 text-center parent-text-muted">
          No children found.
        </div>
      ) : (
        <div className="space-y-6">
          {children.map((child) => {
            const allergyText = formatAllergies(child.allergies);
            const monthlyRate = child.monthly_rate
              ? parseFloat(child.monthly_rate).toFixed(2)
              : '0.00';

            return (
              <div
                key={child.id}
                className="parent-card p-6 rounded-xl border border-gray-100"
              >
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <h3 className="font-bold text-xl parent-text">
                    {child.first_name} {child.last_name}
                  </h3>
                  <span className="parent-pill px-3 py-1 rounded-full text-xs font-medium">
                    {child.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm parent-text-muted">
                  <div className="flex items-start gap-3">
                    <div className="parent-icon-chip w-10 h-10 rounded-lg flex items-center justify-center">
                      <Calendar size={18} />
                    </div>
                    <div>
                      <p className="font-semibold parent-text">Date of Birth</p>
                      <p>{new Date(child.date_of_birth).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="parent-icon-chip w-10 h-10 rounded-lg flex items-center justify-center">
                      <Calendar size={18} />
                    </div>
                    <div>
                      <p className="font-semibold parent-text">Enrollment Date</p>
                      <p>{new Date(child.enrollment_start_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold parent-text">Monthly Rate</p>
                    <p>${monthlyRate}</p>
                  </div>
                </div>

                {allergyText && (
                  <div className="mt-4 p-4 rounded-xl parent-button-soft text-sm">
                    <span className="font-semibold">Allergies:</span> {allergyText}
                  </div>
                )}

                {child.medical_notes && (
                  <div className="mt-4 text-sm parent-text">
                    <p className="font-semibold parent-text">Medical Notes</p>
                    <p>{child.medical_notes}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <button
        onClick={() => navigate('/parent/dashboard')}
        className="mt-6 inline-flex items-center gap-2 text-sm font-semibold parent-text-muted hover:opacity-90 transition-opacity"
      >
        <ArrowLeft size={16} />
        Back to Dashboard
      </button>
    </ParentLayout>
  );
}

export default ParentChildren;
