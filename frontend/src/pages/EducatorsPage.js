import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { FileText, Phone, UserPlus, Calendar, DollarSign, Briefcase, Trash2, X } from 'lucide-react';
import { BaseModal } from '../components/modals/BaseModal';
import api from '../utils/api';

export function EducatorsPage() {
  const [educators, setEducators] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEducator, setSelectedEducator] = useState(null);
  const [paystubLoadingId, setPaystubLoadingId] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    province: '',
    postalCode: '',
    paymentType: 'HOURLY',
    payFrequency: 'BI_WEEKLY',
    hourlyRate: '',
    salaryAmount: '',
    annualSickDays: '80',
    annualVacationDays: '80',
    carryoverEnabled: false,
    dateEmployed: '',
    sin: '',
    ytdGross: '0',
    ytdCpp: '0',
    ytdEi: '0',
    ytdTax: '0',
    ytdHours: '0',
  });
  const [editForm, setEditForm] = useState({});

  const avatarStyles = [
    { backgroundColor: 'var(--card-1)', color: 'var(--card-text-1)' },
    { backgroundColor: 'var(--card-2)', color: 'var(--card-text-2)' },
    { backgroundColor: 'var(--card-3)', color: 'var(--card-text-3)' },
    { backgroundColor: 'var(--card-4)', color: 'var(--card-text-4)' },
  ];

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

  const getInitials = (firstName, lastName) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const getAvatarStyle = (index) => {
    return avatarStyles[index % avatarStyles.length];
  };

  const handleAddEducator = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post('/admin/users', {
        ...formData,
        sickDaysRemaining: formData.annualSickDays,
        vacationDaysRemaining: formData.annualVacationDays,
      });
      setShowAddModal(false);
      setFormData({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        province: '',
        postalCode: '',
        paymentType: 'HOURLY',
        payFrequency: 'BI_WEEKLY',
        hourlyRate: '',
        salaryAmount: '',
        annualSickDays: '80',
        annualVacationDays: '80',
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
    setSelectedEducator(educator);
    setEditForm({
      paymentType: educator.payment_type || 'HOURLY',
      payFrequency: educator.pay_frequency || 'BI_WEEKLY',
      hourlyRate: educator.hourly_rate || '',
      salaryAmount: educator.salary_amount || '',
      addressLine1: educator.address_line1 || '',
      addressLine2: educator.address_line2 || '',
      city: educator.city || '',
      province: educator.province || '',
      postalCode: educator.postal_code || '',
      annualSickDays: educator.annual_sick_days || 80,
      annualVacationDays: educator.annual_vacation_days || 80,
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
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.patch(`/admin/users/${selectedEducator.id}`, editForm);
      setShowEditModal(false);
      setSelectedEducator(null);
      loadEducators();
    } catch (error) {
      alert('Failed to update educator');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedEducator.first_name} ${selectedEducator.last_name}?`)) {
      return;
    }

    try {
      await api.delete(`/admin/users/${selectedEducator.id}`);
      setShowEditModal(false);
      setSelectedEducator(null);
      loadEducators();
    } catch (error) {
      alert('Failed to delete educator');
    }
  };

  const toggleActive = async (id, currentStatus) => {
    try {
      await api.patch(`/admin/users/${id}`, { isActive: !currentStatus });
      loadEducators();
    } catch (error) {
      alert('Failed to update educator status');
    }
  };

  const openPaystub = async (educator) => {
    if (!educator?.id) {
      return;
    }
    setPaystubLoadingId(educator.id);
    try {
      const paystubRes = await api.get('/documents/paystubs', {
        params: { user_id: educator.id },
      });
      let paystubs = paystubRes.data?.paystubs || [];

      if (paystubs.length === 0) {
        const periodsRes = await api.get('/pay-periods');
        const periods = (periodsRes.data?.payPeriods || [])
          .filter((period) => period.status === 'CLOSED')
          .sort((a, b) => new Date(b.end_date) - new Date(a.end_date));

        for (const period of periods) {
          const payoutsRes = await api.get(`/pay-periods/${period.id}/payouts`);
          const payout = (payoutsRes.data?.payouts || []).find(
            (entry) => entry.user_id === educator.id
          );
          if (payout) {
            await api.post(`/documents/payouts/${payout.id}/generate-paystub`);
            break;
          }
        }

        const refreshedRes = await api.get('/documents/paystubs', {
          params: { user_id: educator.id },
        });
        paystubs = refreshedRes.data?.paystubs || [];
      }

      let pdfRes;
      if (paystubs.length === 0) {
        pdfRes = await api.get('/documents/paystubs/sample', {
          params: { user_id: educator.id },
          responseType: 'blob',
        });
      } else {
        const latest = paystubs[0];
        pdfRes = await api.get(`/documents/paystubs/${latest.id}/pdf`, {
          responseType: 'blob',
        });
      }
      const pdfUrl = URL.createObjectURL(new Blob([pdfRes.data], { type: 'application/pdf' }));
      window.open(pdfUrl, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(pdfUrl), 10000);
    } catch (error) {
      console.error('Open paystub error:', error);
      alert('Failed to open paystub.');
    } finally {
      setPaystubLoadingId(null);
    }
  };

  return (
    <Layout title="Educators" subtitle="Staff profiles and management">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {educators.map((educator, i) => (
          <div
            key={educator.id}
            className="bg-white p-6 rounded-3xl shadow-[0_12px_20px_-12px_var(--menu-shadow)] border themed-border flex flex-col items-center text-center hover:translate-y-[-4px] transition-transform duration-300"
          >
            {/* Avatar */}
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center text-2xl font-bold mb-4 shadow-inner"
                style={getAvatarStyle(i)}
              >
                {getInitials(educator.first_name, educator.last_name)}
              </div>

            {/* Name */}
            <h3 className="font-quicksand font-bold text-xl text-stone-800 mb-1">
              {educator.first_name} {educator.last_name}
            </h3>

            {/* Role Badge */}
            <p className="text-[var(--primary)] font-medium text-sm mb-4">
              {educator.role === 'ADMIN' ? 'Administrator' : 'Educator'}
            </p>

            {/* Info Boxes */}
            <div className="w-full space-y-3 mb-6">
              {/* Hourly Rate / Salary */}
              <div className="flex justify-between items-center p-3 bg-[var(--background)] rounded-xl">
                <div className="flex items-center gap-2 text-stone-500 text-sm">
                  <DollarSign size={16} />
                  <span>Rate</span>
                </div>
                <span className="font-bold text-stone-700 text-sm">
                  {educator.payment_type === 'SALARY'
                    ? `$${parseFloat(educator.salary_amount || 0).toFixed(2)}/period`
                    : `$${parseFloat(educator.hourly_rate || 0).toFixed(2)}/hr`}
                </span>
              </div>

              {/* Sick Hours */}
              <div className="flex justify-between items-center p-3 bg-[var(--background)] rounded-xl">
                <div className="flex items-center gap-2 text-stone-500 text-sm">
                  <Briefcase size={16} />
                  <span>Sick Hours</span>
                </div>
                <span className="font-bold text-stone-700 text-sm">
                  {parseFloat(educator.sick_days_remaining || 0).toFixed(1)} / {educator.annual_sick_days || 0}
                </span>
              </div>

              {/* Vacation Hours */}
              <div className="flex justify-between items-center p-3 bg-[var(--background)] rounded-xl">
                <div className="flex items-center gap-2 text-stone-500 text-sm">
                  <Calendar size={16} />
                  <span>Vacation Hours</span>
                </div>
                <span className="font-bold text-stone-700 text-sm">
                  {parseFloat(educator.vacation_days_remaining || 0).toFixed(1)} / {educator.annual_vacation_days || 0}
                </span>
              </div>

              {/* Active Status */}
              <div className="flex justify-between items-center p-3 bg-[var(--background)] rounded-xl">
                <span className="text-stone-500 text-sm">Status</span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    educator.is_active
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {educator.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 w-full">
              <button
                type="button"
                onClick={() => openPaystub(educator)}
                disabled={paystubLoadingId === educator.id}
                className="flex-1 py-2 rounded-xl border themed-border text-stone-500 themed-hover hover:text-[var(--primary-dark)] transition-colors flex justify-center disabled:opacity-60"
                title="View paystub"
              >
                <FileText size={18} />
              </button>
              <button
                onClick={() => toggleActive(educator.id, educator.is_active)}
                className="flex-1 py-2 rounded-xl border themed-border text-stone-500 themed-hover hover:text-[var(--primary-dark)] transition-colors flex justify-center"
                title={educator.is_active ? 'Deactivate' : 'Activate'}
              >
                <Phone size={18} />
              </button>
              <button
                onClick={() => handleEditClick(educator)}
                className="flex-1 py-2 rounded-xl bg-[var(--primary)] text-white font-bold text-sm shadow-md hover:opacity-90 transition-colors"
              >
                Profile
              </button>
            </div>
          </div>
        ))}

        {/* Add New Card */}
        <button
          onClick={() => setShowAddModal(true)}
          className="border-2 border-dashed themed-border rounded-3xl flex flex-col items-center justify-center p-6 text-[var(--primary)] hover:bg-[var(--background)] transition-colors min-h-[300px]"
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            <UserPlus size={32} />
          </div>
          <span className="font-bold font-quicksand text-lg">Add New Educator</span>
        </button>
      </div>

      {/* Add Educator Modal */}
      <BaseModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Educator"
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleAddEducator} className="space-y-6">
          {/* Personal Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                First Name *
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                Last Name *
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
                required
              />
            </div>
          </div>

          {/* Email & Password */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                Password *
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
                required
              />
            </div>
          </div>

          {/* Address */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                Address Line 1
              </label>
              <input
                type="text"
                value={formData.addressLine1}
                onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                Address Line 2
              </label>
              <input
                type="text"
                value={formData.addressLine2}
                onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                City
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                Province
              </label>
              <input
                type="text"
                value={formData.province}
                onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                Postal Code
              </label>
              <input
                type="text"
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
              />
            </div>
          </div>

          {/* Payment Type & Frequency */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                Payment Type *
              </label>
              <select
                value={formData.paymentType}
                onChange={(e) => setFormData({ ...formData, paymentType: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
                required
              >
                <option value="HOURLY">Hourly</option>
                <option value="SALARY">Salary</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                Pay Frequency *
              </label>
              <select
                value={formData.payFrequency}
                onChange={(e) => setFormData({ ...formData, payFrequency: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
                required
              >
                <option value="BI_WEEKLY">Bi-Weekly (Every 2 weeks)</option>
                <option value="MONTHLY">Monthly</option>
                <option value="SEMI_MONTHLY">Semi-Monthly (1st-15th, 16th-end)</option>
              </select>
            </div>
          </div>

          {/* Rate or Salary */}
          {formData.paymentType === 'HOURLY' ? (
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                Hourly Rate
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.hourlyRate}
                onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
                placeholder="0.00"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                Salary Amount (per pay period)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.salaryAmount}
                onChange={(e) => setFormData({ ...formData, salaryAmount: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
                placeholder="0.00"
              />
            </div>
          )}

          {/* Time Off */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                Annual Sick Hours
              </label>
              <input
                type="number"
                value={formData.annualSickDays}
                onChange={(e) => setFormData({ ...formData, annualSickDays: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                Annual Vacation Hours
              </label>
              <input
                type="number"
                value={formData.annualVacationDays}
                onChange={(e) => setFormData({ ...formData, annualVacationDays: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
              />
            </div>
          </div>

          {/* Carryover & Date Employed */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.carryoverEnabled}
                  onChange={(e) => setFormData({ ...formData, carryoverEnabled: e.target.checked })}
                  className="w-5 h-5 rounded themed-border text-[var(--primary)] themed-ring"
                />
                <span className="ml-2 text-sm font-bold text-stone-700 font-quicksand">
                  Allow carryover to next year
                </span>
              </label>
            </div>
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                Date Employed
              </label>
              <input
                type="date"
                value={formData.dateEmployed}
                onChange={(e) => setFormData({ ...formData, dateEmployed: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
              />
            </div>
          </div>

          {/* SIN */}
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              SIN (Social Insurance Number)
            </label>
            <input
              type="text"
              value={formData.sin}
              maxLength="11"
              placeholder="123-456-789"
              onChange={(e) => setFormData({ ...formData, sin: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
            />
          </div>

          {/* YTD Section */}
          <div className="border-t themed-border pt-6">
            <h3 className="font-quicksand font-bold text-lg text-stone-800 mb-4">
              Starting YTD Values (for employees transitioning from QuickBooks)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                  YTD Gross
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.ytdGross}
                  onChange={(e) => setFormData({ ...formData, ytdGross: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                  YTD CPP
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.ytdCpp}
                  onChange={(e) => setFormData({ ...formData, ytdCpp: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                  YTD EI
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.ytdEi}
                  onChange={(e) => setFormData({ ...formData, ytdEi: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                  YTD Tax
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.ytdTax}
                  onChange={(e) => setFormData({ ...formData, ytdTax: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                  YTD Hours
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.ytdHours}
                  onChange={(e) => setFormData({ ...formData, ytdHours: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              disabled={loading}
              className="flex-1 px-6 py-3 rounded-2xl border themed-border text-stone-600 font-bold hover:bg-[var(--background)] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 rounded-2xl bg-[var(--primary)] text-white font-bold shadow-lg shadow-[0_12px_20px_-12px_var(--menu-shadow)] hover:opacity-90 transition-all disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Educator'}
            </button>
          </div>
        </form>
      </BaseModal>

      {/* Edit Educator Modal */}
      <BaseModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedEducator(null);
        }}
        title={`Edit ${selectedEducator?.first_name} ${selectedEducator?.last_name}`}
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleEditSubmit} className="space-y-6">
          {/* Payment Information */}
          <div className="space-y-4">
            <h3 className="font-quicksand font-bold text-lg text-stone-800">Payment Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                  Payment Type
                </label>
                <select
                  value={editForm.paymentType}
                  onChange={(e) => setEditForm({ ...editForm, paymentType: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
                >
                  <option value="HOURLY">Hourly</option>
                  <option value="SALARY">Salary</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                  Pay Frequency
                </label>
                <select
                  value={editForm.payFrequency}
                  onChange={(e) => setEditForm({ ...editForm, payFrequency: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
                >
                  <option value="BI_WEEKLY">Bi-Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="SEMI_MONTHLY">Semi-Monthly</option>
                </select>
              </div>
              {editForm.paymentType === 'HOURLY' ? (
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                    Hourly Rate
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.hourlyRate}
                    onChange={(e) => setEditForm({ ...editForm, hourlyRate: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                    Salary Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.salaryAmount}
                    onChange={(e) => setEditForm({ ...editForm, salaryAmount: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Address */}
          <div className="space-y-4">
            <h3 className="font-quicksand font-bold text-lg text-stone-800">Address</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                  Address Line 1
                </label>
                <input
                  type="text"
                  value={editForm.addressLine1}
                  onChange={(e) => setEditForm({ ...editForm, addressLine1: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                  Address Line 2
                </label>
                <input
                  type="text"
                  value={editForm.addressLine2}
                  onChange={(e) => setEditForm({ ...editForm, addressLine2: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                  City
                </label>
                <input
                  type="text"
                  value={editForm.city}
                  onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                  Province
                </label>
                <input
                  type="text"
                  value={editForm.province}
                  onChange={(e) => setEditForm({ ...editForm, province: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                  Postal Code
                </label>
                <input
                  type="text"
                  value={editForm.postalCode}
                  onChange={(e) => setEditForm({ ...editForm, postalCode: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
                />
              </div>
            </div>
          </div>

          {/* Time Off */}
          <div className="space-y-4">
            <h3 className="font-quicksand font-bold text-lg text-stone-800">Time Off</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                  Annual Sick Hours
                </label>
                <input
                  type="number"
                  value={editForm.annualSickDays}
                  onChange={(e) => setEditForm({ ...editForm, annualSickDays: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                  Annual Vacation Hours
                </label>
                <input
                  type="number"
                  value={editForm.annualVacationDays}
                  onChange={(e) => setEditForm({ ...editForm, annualVacationDays: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
                />
              </div>
              <div className="flex items-center">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.carryoverEnabled}
                    onChange={(e) => setEditForm({ ...editForm, carryoverEnabled: e.target.checked })}
                    className="w-5 h-5 rounded themed-border text-[var(--primary)] themed-ring"
                  />
                  <span className="ml-2 text-sm font-bold text-stone-700 font-quicksand">
                    Carryover Enabled
                  </span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                  Sick Hours Remaining
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={editForm.sickDaysRemaining}
                  onChange={(e) => setEditForm({ ...editForm, sickDaysRemaining: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                  Vacation Hours Remaining
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={editForm.vacationDaysRemaining}
                  onChange={(e) => setEditForm({ ...editForm, vacationDaysRemaining: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                  Date Employed
                </label>
                <input
                  type="date"
                  value={editForm.dateEmployed}
                  onChange={(e) => setEditForm({ ...editForm, dateEmployed: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                  SIN
                </label>
                <input
                  type="text"
                  maxLength="11"
                  value={editForm.sin}
                  onChange={(e) => setEditForm({ ...editForm, sin: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
                />
              </div>
            </div>
          </div>

          {/* YTD Values */}
          <div className="space-y-4">
            <h3 className="font-quicksand font-bold text-lg text-stone-800">YTD Values</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                  YTD Gross
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editForm.ytdGross}
                  onChange={(e) => setEditForm({ ...editForm, ytdGross: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                  YTD CPP
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editForm.ytdCpp}
                  onChange={(e) => setEditForm({ ...editForm, ytdCpp: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                  YTD EI
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editForm.ytdEi}
                  onChange={(e) => setEditForm({ ...editForm, ytdEi: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                  YTD Tax
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editForm.ytdTax}
                  onChange={(e) => setEditForm({ ...editForm, ytdTax: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                  YTD Hours
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editForm.ytdHours}
                  onChange={(e) => setEditForm({ ...editForm, ytdHours: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleDelete}
              className="px-6 py-3 rounded-2xl border border-red-300 text-red-600 font-bold hover:bg-red-50 transition-colors flex items-center gap-2"
            >
              <Trash2 size={18} />
              Delete
            </button>
            <div className="flex-1"></div>
            <button
              type="button"
              onClick={() => {
                setShowEditModal(false);
                setSelectedEducator(null);
              }}
              disabled={loading}
              className="px-6 py-3 rounded-2xl border themed-border text-stone-600 font-bold hover:bg-[var(--background)] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-2xl bg-[var(--primary)] text-white font-bold shadow-lg shadow-[0_12px_20px_-12px_var(--menu-shadow)] hover:opacity-90 transition-all disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </BaseModal>
    </Layout>
  );
}


