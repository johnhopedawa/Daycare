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
      return [common, other].filter(Boolean).join(' · ');
    }
    return JSON.stringify(allergies);
  };

  if (loading) {
    return (
      <ParentLayout title="My Children" subtitle="Profiles and details">
        <div className="flex items-center justify-center h-48 text-stone-500">Loading...</div>
      </ParentLayout>
    );
  }

  return (
    <ParentLayout title="My Children" subtitle="Profiles and details">
      {children.length === 0 ? (
        <div className="bg-white p-8 rounded-3xl shadow-[0_4px_20px_-4px_rgba(255,229,217,0.5)] border border-[#FFE5D9]/30 text-center text-stone-500">
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
                className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_-4px_rgba(255,229,217,0.5)] border border-[#FFE5D9]/30"
              >
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <h3 className="font-quicksand font-bold text-xl text-stone-800">
                    {child.first_name} {child.last_name}
                  </h3>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#E5D4ED] text-[#8E55A5]">
                    {child.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-stone-600">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#FFF4CC] text-[#B45309] flex items-center justify-center">
                      <Calendar size={18} />
                    </div>
                    <div>
                      <p className="font-semibold text-stone-700">Date of Birth</p>
                      <p>{new Date(child.date_of_birth).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#B8E6D5] text-[#2D6A4F] flex items-center justify-center">
                      <Calendar size={18} />
                    </div>
                    <div>
                      <p className="font-semibold text-stone-700">Enrollment Date</p>
                      <p>{new Date(child.enrollment_start_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-stone-700">Monthly Rate</p>
                    <p>${monthlyRate}</p>
                  </div>
                </div>

                {allergyText && (
                  <div className="mt-4 p-4 rounded-2xl bg-[#FFF4CC]/60 text-sm text-stone-700">
                    <span className="font-semibold">Allergies:</span> {allergyText}
                  </div>
                )}

                {child.medical_notes && (
                  <div className="mt-4 text-sm text-stone-700">
                    <p className="font-semibold text-stone-700">Medical Notes</p>
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
        className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-stone-500 hover:text-[#E07A5F]"
      >
        <ArrowLeft size={16} />
        Back to Dashboard
      </button>
    </ParentLayout>
  );
}

export default ParentChildren;
