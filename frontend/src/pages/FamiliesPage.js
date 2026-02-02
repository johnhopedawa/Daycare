import { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { Phone, Mail, Users, Plus, DollarSign, Trash2, FileText, Download, MapPin } from 'lucide-react';
import { AddFamilyModal } from '../components/modals/AddFamilyModal';
import { BaseModal } from '../components/modals/BaseModal';
import api from '../utils/api';

export function FamiliesPage() {
  const [activeTab, setActiveTab] = useState('families');
  const [families, setFamilies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [childrenDirectory, setChildrenDirectory] = useState([]);
  const [parentsDirectory, setParentsDirectory] = useState([]);
  const [childrenLoading, setChildrenLoading] = useState(false);
  const [parentsLoading, setParentsLoading] = useState(false);
  const [childSearch, setChildSearch] = useState('');
  const [childStatusFilter, setChildStatusFilter] = useState('');
  const [childSort, setChildSort] = useState('name');
  const [parentSearch, setParentSearch] = useState('');
  const [parentStatusFilter, setParentStatusFilter] = useState('all');
  const [parentBillingFilter, setParentBillingFilter] = useState('all');
  const [parentHasChildrenFilter, setParentHasChildrenFilter] = useState('all');
  const [isAddFamilyOpen, setIsAddFamilyOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedFamily, setSelectedFamily] = useState(null);
  const [filesModalOpen, setFilesModalOpen] = useState(false);
  const [filesModalType, setFilesModalType] = useState('child');
  const [filesModalOwner, setFilesModalOwner] = useState(null);
  const [linkedDocuments, setLinkedDocuments] = useState([]);
  const [linkedDocumentsLoading, setLinkedDocumentsLoading] = useState(false);
  const [tempPassword, setTempPassword] = useState(null);
  const [tempPasswordParent, setTempPasswordParent] = useState(null);
  const [tempPasswordLoading, setTempPasswordLoading] = useState(false);
  const [tempPasswordError, setTempPasswordError] = useState('');
  const [editEmergencyContacts, setEditEmergencyContacts] = useState([]);
  const [editEmergencyContactIds, setEditEmergencyContactIds] = useState([]);
  const [editForm, setEditForm] = useState({
    familyName: '',
    parent1Id: null,
    parent1FirstName: '',
    parent1LastName: '',
    parent1Email: '',
    parent1Phone: '',
    parentAddressLine1: '',
    parentAddressLine2: '',
    parentCity: '',
    parentProvince: '',
    parentPostalCode: '',
    parent2Id: null,
    parent2FirstName: '',
    parent2LastName: '',
    parent2Email: '',
    parent2Phone: '',
    childId: null,
    childFirstName: '',
    childLastName: '',
    childDob: '',
    childStatus: '',
    childMonthlyRate: '',
    allergies: { common: [], other: '' },
    medical_notes: '',
    notes: ''
  });

  const COMMON_ALLERGIES = [
    'None', 'Milk', 'Eggs', 'Nuts', 'Tree Nuts', 'Soy', 'Wheat (Gluten)',
    'Fish', 'Shellfish', 'Sesame', 'Strawberries', 'Citrus Fruits', 'Bananas',
    'Chocolate/Cocoa', 'Food Dyes', 'Corn', 'Dust Mites', 'Pollen', 'Pet'
  ];

  const loadFamilies = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/families');
      const normalizedFamilies = (response.data.families || []).map((family) => {
        const derivedFamilyName = family.family_name
          || (family.parents || []).map((parent) => parent.family_name).find(Boolean)
          || null;
        return ({
        ...family,
        id: family.family_id || family.id,
        family_name: derivedFamilyName,
        parents: (family.parents || []).map((parent) => ({
          id: parent.parent_id ?? parent.id,
          first_name: parent.parent_first_name ?? parent.first_name ?? '',
          last_name: parent.parent_last_name ?? parent.last_name ?? '',
          email: parent.parent_email ?? parent.email ?? '',
          phone: parent.parent_phone ?? parent.phone ?? '',
          address_line1: parent.parent_address_line1 ?? parent.address_line1 ?? '',
          address_line2: parent.parent_address_line2 ?? parent.address_line2 ?? '',
          city: parent.parent_city ?? parent.city ?? '',
          province: parent.parent_province ?? parent.province ?? '',
          postal_code: parent.parent_postal_code ?? parent.postal_code ?? '',
          family_name: parent.family_name ?? parent.familyName ?? null,
          user_id: parent.user_id ?? null,
          is_primary_contact: parent.is_primary_contact,
          has_billing_responsibility: parent.has_billing_responsibility,
          is_active: parent.is_active
        }))
        });
      });
      setFamilies(normalizedFamilies);
    } catch (error) {
      console.error('Failed to load families:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadChildrenDirectory = useCallback(async () => {
    try {
      setChildrenLoading(true);
      const params = new URLSearchParams();
      if (childStatusFilter) params.append('status', childStatusFilter);
      if (childSearch) params.append('search', childSearch);
      const response = await api.get(`/children?${params.toString()}`);
      setChildrenDirectory(response.data.children || []);
    } catch (error) {
      console.error('Failed to load children directory:', error);
      setChildrenDirectory([]);
    } finally {
      setChildrenLoading(false);
    }
  }, [childSearch, childStatusFilter]);

  const loadParentsDirectory = useCallback(async () => {
    try {
      setParentsLoading(true);
      const response = await api.get('/parents/directory');
      setParentsDirectory(response.data.parents || []);
    } catch (error) {
      console.error('Failed to load parents directory:', error);
      setParentsDirectory([]);
    } finally {
      setParentsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'families') {
      loadFamilies();
    }
  }, [activeTab, loadFamilies]);

  useEffect(() => {
    if (activeTab === 'children') {
      loadChildrenDirectory();
    }
  }, [activeTab, loadChildrenDirectory]);

  useEffect(() => {
    if (activeTab === 'parents') {
      loadParentsDirectory();
    }
  }, [activeTab, loadParentsDirectory]);

  const handleViewProfile = (family) => {
    setSelectedFamily(family);
    setTempPassword(null);
    setTempPasswordParent(null);
    setTempPasswordError('');

    // Populate edit form from family data
    const parent1 = family.parents && family.parents.length > 0 ? family.parents[0] : null;
    const parent2 = family.parents && family.parents.length > 1 ? family.parents[1] : null;
    const child = family.children && family.children.length > 0 ? family.children[0] : null;
    const familyName = family.family_name || parent1?.family_name || parent2?.family_name || '';

    // Parse allergies
    let allergiesData = { common: [], other: '' };
    if (child?.allergies) {
      try {
        allergiesData = typeof child.allergies === 'string'
          ? JSON.parse(child.allergies)
          : child.allergies;
      } catch (e) {
        console.error('Error parsing allergies:', e);
        allergiesData = { common: [], other: child.allergies };
      }
    }

    // Format date for input[type="date"] (YYYY-MM-DD)
    let formattedDob = '';
    if (child?.date_of_birth) {
      const dobDate = new Date(child.date_of_birth);
      if (!Number.isNaN(dobDate.getTime())) {
        formattedDob = dobDate.toISOString().split('T')[0];
      }
    }

    setEditForm({
      familyName,
      parent1Id: parent1?.id || null,
      parent1FirstName: parent1?.first_name || '',
      parent1LastName: parent1?.last_name || '',
      parent1Email: parent1?.email || '',
      parent1Phone: parent1?.phone || '',
      parentAddressLine1: parent1?.address_line1 || '',
      parentAddressLine2: parent1?.address_line2 || '',
      parentCity: parent1?.city || '',
      parentProvince: parent1?.province || '',
      parentPostalCode: parent1?.postal_code || '',
      parent2Id: parent2?.id || null,
      parent2FirstName: parent2?.first_name || '',
      parent2LastName: parent2?.last_name || '',
      parent2Email: parent2?.email || '',
      parent2Phone: parent2?.phone || '',
      childId: child?.id || null,
      childFirstName: child?.first_name || '',
      childLastName: child?.last_name || '',
      childDob: formattedDob,
      childStatus: child?.status || 'ACTIVE',
      childMonthlyRate: child?.monthly_rate || '',
      allergies: allergiesData,
      medical_notes: child?.medical_notes || '',
      notes: child?.notes || ''
    });

    if (child?.id) {
      loadEditEmergencyContacts(child.id);
    } else {
      setEditEmergencyContacts([]);
      setEditEmergencyContactIds([]);
    }

    setIsEditModalOpen(true);
  };

  const loadEditEmergencyContacts = async (childId) => {
    try {
      const response = await api.get(`/children/${childId}/emergency-contacts`);
      const contacts = response.data.emergencyContacts || [];
      setEditEmergencyContacts(contacts);
      setEditEmergencyContactIds(contacts.map((contact) => contact.id));
    } catch (error) {
      console.error('Error loading emergency contacts:', error);
      setEditEmergencyContacts([]);
      setEditEmergencyContactIds([]);
    }
  };

  const handleAddEmergencyContact = () => {
    setEditEmergencyContacts([
      ...editEmergencyContacts,
      {
        id: `new-${Date.now()}`,
        name: '',
        phone: '',
        relationship: '',
        is_primary: editEmergencyContacts.length === 0
      }
    ]);
  };

  const handleUpdateEmergencyContact = (index, field, value) => {
    const updated = [...editEmergencyContacts];
    updated[index] = { ...updated[index], [field]: value };

    if (field === 'is_primary' && value) {
      updated.forEach((contact, i) => {
        if (i !== index) {
          contact.is_primary = false;
        }
      });
    }

    setEditEmergencyContacts(updated);
  };

  const handleDeleteEmergencyContact = (index) => {
    setEditEmergencyContacts(editEmergencyContacts.filter((_, i) => i !== index));
  };

  const saveEmergencyContacts = async (childId) => {
    for (const contactId of editEmergencyContactIds) {
      await api.delete(`/emergency-contacts/${contactId}`);
    }

    for (const contact of editEmergencyContacts) {
      if (contact.name) {
        await api.post(`/children/${childId}/emergency-contacts`, {
          name: contact.name,
          phone: contact.phone || null,
          relationship: contact.relationship || null,
          is_primary: contact.is_primary || false
        });
      }
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    try {
      // Update Parent 1 if exists
      if (editForm.parent1Id) {
        await api.patch(`/parents/${editForm.parent1Id}`, {
          firstName: editForm.parent1FirstName,
          lastName: editForm.parent1LastName,
          email: editForm.parent1Email,
          phone: editForm.parent1Phone,
          address_line1: editForm.parentAddressLine1,
          address_line2: editForm.parentAddressLine2,
          city: editForm.parentCity,
          province: editForm.parentProvince,
          postal_code: editForm.parentPostalCode,
          family_name: editForm.familyName
        });
      }

      // Update Parent 2 if exists
      if (editForm.parent2Id) {
        await api.patch(`/parents/${editForm.parent2Id}`, {
          firstName: editForm.parent2FirstName,
          lastName: editForm.parent2LastName,
          email: editForm.parent2Email,
          phone: editForm.parent2Phone,
          address_line1: editForm.parentAddressLine1,
          address_line2: editForm.parentAddressLine2,
          city: editForm.parentCity,
          province: editForm.parentProvince,
          postal_code: editForm.parentPostalCode,
          family_name: editForm.familyName
        });
      }

      // Update Child if exists
      if (editForm.childId) {
        await api.patch(`/children/${editForm.childId}`, {
          first_name: editForm.childFirstName,
          last_name: editForm.childLastName,
          date_of_birth: editForm.childDob,
          status: editForm.childStatus,
          monthly_rate: editForm.childMonthlyRate,
          allergies: JSON.stringify(editForm.allergies),
          medical_notes: editForm.medical_notes,
          notes: editForm.notes
        });

        await saveEmergencyContacts(editForm.childId);
      }

      setIsEditModalOpen(false);
      setSelectedFamily(null);
      setEditEmergencyContacts([]);
      setEditEmergencyContactIds([]);
      setTempPassword(null);
      setTempPasswordParent(null);
      setTempPasswordError('');
      loadFamilies();
      loadChildrenDirectory();
      loadParentsDirectory();
      alert('Family updated successfully!');
    } catch (error) {
      console.error('Error updating family:', error);
      alert(error.response?.data?.error || 'Failed to update family');
    }
  };

  const handleDeleteFamily = async (deleteAccounts = false) => {
    if (!selectedFamily) return;

    try {
      const url = deleteAccounts
        ? `/families/${selectedFamily.id}?deleteParents=true`
        : `/families/${selectedFamily.id}`;
      await api.delete(url);
      setIsDeleteModalOpen(false);
      setIsEditModalOpen(false);
      setSelectedFamily(null);
      loadFamilies();
      loadChildrenDirectory();
      loadParentsDirectory();
    } catch (error) {
      console.error('Delete family error:', error);
      alert(error.response?.data?.error || 'Failed to delete family');
    }
  };

  const handleAllergyToggle = (allergy) => {
    const current = editForm.allergies.common || [];
    if (current.includes(allergy)) {
      setEditForm({
        ...editForm,
        allergies: {
          ...editForm.allergies,
          common: current.filter(a => a !== allergy)
        }
      });
    } else {
      setEditForm({
        ...editForm,
        allergies: {
          ...editForm.allergies,
          common: [...current, allergy]
        }
      });
    }
  };

  const getFamilyDisplayName = (family) => {
    if (family.family_name) return family.family_name;
    const parentFamilyName = family.parents?.map((parent) => parent.family_name).find(Boolean);
    if (parentFamilyName) return parentFamilyName;
    if (family.parents && family.parents.length > 0) {
      return `The ${family.parents[0].last_name} Family`;
    }
    return 'Family';
  };

  const getParentNames = (family) => {
    if (!family.parents || family.parents.length === 0) return 'No parents listed';
    return family.parents.map(p => `${p.first_name} ${p.last_name}`).join(' & ');
  };

  const getPrimaryContact = (family) => {
    if (!family.parents || family.parents.length === 0) return null;
    return family.parents[0];
  };

  const getMonthlyRate = (family) => {
    if (!family.children || family.children.length === 0) return '$0.00';
    const total = family.children.reduce((sum, child) => {
      return sum + (parseFloat(child.monthly_rate) || 0);
    }, 0);
    return `$${total.toFixed(2)}`;
  };

  const getInitial = (family) => {
    const name = getFamilyDisplayName(family);
    return name.charAt(name.includes('The ') ? 4 : 0).toUpperCase();
  };

  const calculateAgeYears = (dob) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const getSortedChildren = () => {
    const children = [...childrenDirectory];
    if (childSort === 'age') {
      return children.sort((a, b) => {
        const ageA = calculateAgeYears(a.date_of_birth);
        const ageB = calculateAgeYears(b.date_of_birth);
        if (ageA === null) return 1;
        if (ageB === null) return -1;
        return ageB - ageA;
      });
    }
    if (childSort === 'status') {
      const order = ['ACTIVE', 'ENROLLED', 'WAITLIST', 'INACTIVE'];
      return children.sort((a, b) => {
        const indexA = order.indexOf(a.status);
        const indexB = order.indexOf(b.status);
        return (indexA === -1 ? order.length : indexA) - (indexB === -1 ? order.length : indexB);
      });
    }
    return children.sort((a, b) => {
      const lastA = (a.last_name || '').toLowerCase();
      const lastB = (b.last_name || '').toLowerCase();
      if (lastA === lastB) {
        return (a.first_name || '').toLowerCase().localeCompare((b.first_name || '').toLowerCase());
      }
      return lastA.localeCompare(lastB);
    });
  };

  const getFilteredParents = () => {
    return parentsDirectory.filter((parent) => {
      const searchValue = parentSearch.trim().toLowerCase();
      const matchesSearch = !searchValue
        || `${parent.first_name} ${parent.last_name}`.toLowerCase().includes(searchValue)
        || (parent.email || '').toLowerCase().includes(searchValue)
        || (parent.phone || '').toLowerCase().includes(searchValue);

      const matchesStatus = parentStatusFilter === 'all'
        || (parentStatusFilter === 'active' && parent.is_active)
        || (parentStatusFilter === 'inactive' && !parent.is_active);

      const hasChildren = Array.isArray(parent.children) ? parent.children.length > 0 : false;
      const matchesChildren = parentHasChildrenFilter === 'all'
        || (parentHasChildrenFilter === 'yes' && hasChildren)
        || (parentHasChildrenFilter === 'no' && !hasChildren);

      const outstanding = parseFloat(parent.total_outstanding || 0);
      const matchesBilling = parentBillingFilter === 'all'
        || (parentBillingFilter === 'current' && outstanding <= 0)
        || (parentBillingFilter === 'overdue' && outstanding > 0);

      return matchesSearch && matchesStatus && matchesChildren && matchesBilling;
    });
  };

  const handleToggleFamilyStatus = async (family) => {
    if (!family || !family.id || !family.parents || family.parents.length === 0) return;

    const nextStatus = !family.all_accounts_active;
    const confirmMessage = nextStatus
      ? 'Enable all parent login accounts for this family?'
      : 'Disable all parent login accounts for this family?';

    if (!window.confirm(confirmMessage)) return;

    try {
      await api.patch(`/families/${family.id}/toggle-status`, {
        isActive: nextStatus,
      });
      loadFamilies();
      loadParentsDirectory();
    } catch (error) {
      console.error('Failed to toggle family status:', error);
      alert(error.response?.data?.error || 'Failed to update family status');
    }
  };

  const handleUpdateWaitlistPriority = async (child) => {
    if (!child?.id) return;
    const currentPriority = child.waitlist_priority || '';
    const input = window.prompt(
      `Update waitlist priority for ${child.first_name} ${child.last_name}`,
      currentPriority
    );
    if (input === null) return;
    const nextPriority = parseInt(input, 10);
    if (Number.isNaN(nextPriority) || nextPriority < 1) {
      alert('Please enter a valid priority number (1 or higher).');
      return;
    }

    try {
      await api.patch(`/children/${child.id}`, { waitlist_priority: nextPriority });
      loadChildrenDirectory();
    } catch (error) {
      console.error('Failed to update waitlist priority:', error);
      alert(error.response?.data?.error || 'Failed to update priority');
    }
  };

  const loadLinkedDocuments = async (type, ownerId) => {
    if (!ownerId) return;
    try {
      setLinkedDocumentsLoading(true);
      const query = type === 'parent'
        ? `linked_parent_id=${ownerId}`
        : `linked_child_id=${ownerId}`;
      const response = await api.get(`/files?${query}`);
      setLinkedDocuments(response.data.documents || []);
    } catch (error) {
      console.error('Failed to load linked documents:', error);
      setLinkedDocuments([]);
    } finally {
      setLinkedDocumentsLoading(false);
    }
  };

  const handleOpenFilesModal = (type, owner) => {
    setFilesModalType(type);
    setFilesModalOwner(owner);
    setFilesModalOpen(true);
    loadLinkedDocuments(type, owner.id);
  };

  const handleCloseFilesModal = () => {
    setFilesModalOpen(false);
    setFilesModalOwner(null);
    setLinkedDocuments([]);
  };

  const handleDownloadLinkedDocument = async (doc) => {
    try {
      const response = await api.get(`/files/${doc.id}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.original_filename || `document-${doc.id}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download document:', error);
    }
  };

  const handleDeleteLinkedDocument = async (doc) => {
    if (!window.confirm('Delete this document?')) return;
    try {
      await api.delete(`/files/${doc.id}`);
      if (filesModalOwner) {
        loadLinkedDocuments(filesModalType, filesModalOwner.id);
      }
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  };

  const handleGenerateTempPassword = async (parent) => {
    if (!parent?.id) return;
    try {
      setTempPasswordError('');
      setTempPasswordLoading(true);
      const response = await api.post(`/parents/${parent.id}/temp-password`);
      setTempPassword(response.data.temp_password);
      setTempPasswordParent(parent);
    } catch (error) {
      setTempPasswordError(error.response?.data?.error || 'Failed to generate temporary password');
    } finally {
      setTempPasswordLoading(false);
    }
  };

  return (
    <Layout title="Families" subtitle="Manage family profiles and contacts">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex flex-wrap gap-2">
          {['families', 'children', 'parents'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition-colors ${
                activeTab === tab
                  ? 'bg-[var(--primary)] text-white shadow-md shadow-[0_12px_20px_-12px_var(--menu-shadow)]'
                  : 'bg-white border themed-border text-stone-600 hover:bg-[var(--background)]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        {activeTab === 'families' && (
          <button
            onClick={() => setIsAddFamilyOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[var(--primary)] text-white rounded-2xl font-bold shadow-lg shadow-[0_12px_20px_-12px_var(--menu-shadow)] hover:opacity-90 transition-all hover:scale-105"
          >
            <Plus size={20} />
            Add Family
          </button>
        )}
      </div>

      {activeTab === 'families' && (
        <>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-stone-500">Loading families...</div>
            </div>
          ) : families.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl shadow-[0_12px_20px_-12px_var(--menu-shadow)] border themed-border text-center">
              <p className="text-stone-500 mb-4">No families found</p>
              <button
                onClick={() => setIsAddFamilyOpen(true)}
                className="px-5 py-2.5 bg-[var(--primary)] text-white rounded-2xl font-bold shadow-lg shadow-[0_12px_20px_-12px_var(--menu-shadow)] hover:opacity-90 transition-all"
              >
                Add Your First Family
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {families.map((family, i) => (
                <div
                  key={family.family_id || family.id || `family-${i}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleViewProfile(family)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleViewProfile(family);
                    }
                  }}
                  className="bg-white p-6 rounded-3xl shadow-[0_12px_20px_-12px_var(--menu-shadow)] border themed-border hover:border-[var(--primary)]/50 transition-all group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-full bg-[var(--card-4)] flex items-center justify-center text-[var(--primary-dark)] font-bold text-lg group-hover:bg-[var(--primary)] group-hover:text-white transition-colors">
                      {getInitial(family)}
                    </div>
                    {family.parents && family.parents.length > 0 && (
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-bold ${
                          family.all_accounts_active
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {family.all_accounts_active ? 'Active' : 'Inactive'}
                      </span>
                    )}
                  </div>

                  <h3 className="font-quicksand font-bold text-xl text-stone-800 mb-1">
                    {getFamilyDisplayName(family)}
                  </h3>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {family.children && family.children.map((child) => (
                      <span
                        key={child.id}
                        className="px-2 py-1 bg-[var(--background)] text-stone-600 text-xs font-medium rounded-lg border themed-border"
                      >
                        {child.first_name}
                      </span>
                    ))}
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3 text-stone-500 text-sm">
                      <Users size={16} className="text-[var(--primary)]" />
                      <span>{getParentNames(family)}</span>
                    </div>
                    {getPrimaryContact(family) && (
                      <>
                        {getPrimaryContact(family).phone && (
                          <div className="flex items-center gap-3 text-stone-500 text-sm">
                            <Phone size={16} className="text-[var(--primary)]" />
                            <span>{getPrimaryContact(family).phone}</span>
                          </div>
                        )}
                        {(getPrimaryContact(family).address_line1 ||
                          getPrimaryContact(family).address_line2 ||
                          getPrimaryContact(family).city ||
                          getPrimaryContact(family).province ||
                          getPrimaryContact(family).postal_code) && (
                          <div className="flex items-start gap-3 text-stone-500 text-sm">
                            <MapPin size={16} className="text-[var(--primary)] mt-0.5" />
                            <span>
                              {getPrimaryContact(family).address_line1}
                              {getPrimaryContact(family).address_line2
                                ? `, ${getPrimaryContact(family).address_line2}`
                                : ''}
                              <br />
                              {[getPrimaryContact(family).city, getPrimaryContact(family).province, getPrimaryContact(family).postal_code]
                                .filter(Boolean)
                                .join(' ')}
                            </span>
                          </div>
                        )}
                        {getPrimaryContact(family).email && (
                          <div className="flex items-center gap-3 text-stone-500 text-sm">
                            <Mail size={16} className="text-[var(--primary)]" />
                            <span className="truncate">{getPrimaryContact(family).email}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="pt-4 border-t themed-border flex justify-between items-center">
                    <div>
                      <p className="text-xs text-stone-400 font-medium uppercase">
                        Monthly Rate
                      </p>
                      <p className="font-bold text-stone-800">
                        {getMonthlyRate(family)}
                      </p>
                    </div>
                    {family.parents && family.parents.length > 0 && (
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          handleToggleFamilyStatus(family);
                        }}
                        className="text-xs font-bold text-stone-500 hover:text-[var(--primary-dark)]"
                      >
                        {family.all_accounts_active ? 'Disable Logins' : 'Enable Logins'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'children' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-5 shadow-[0_12px_20px_-12px_var(--menu-shadow)] border themed-border">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="font-quicksand font-bold text-xl text-stone-800">Children Directory</h3>
                <p className="text-sm text-stone-500">Quick access to enrolled and waitlisted children.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Search by name..."
                  value={childSearch}
                  onChange={(e) => setChildSearch(e.target.value)}
                  className="px-4 py-2 rounded-xl border themed-border text-sm themed-ring bg-white"
                />
                <select
                  value={childStatusFilter}
                  onChange={(e) => setChildStatusFilter(e.target.value)}
                  className="px-4 py-2 rounded-xl border themed-border text-sm themed-ring bg-white"
                >
                  <option value="">All Statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="WAITLIST">Waitlist</option>
                  <option value="ENROLLED">Enrolled</option>
                </select>
                <select
                  value={childSort}
                  onChange={(e) => setChildSort(e.target.value)}
                  className="px-4 py-2 rounded-xl border themed-border text-sm themed-ring bg-white"
                >
                  <option value="name">Sort: Name</option>
                  <option value="age">Sort: Age</option>
                  <option value="status">Sort: Status</option>
                </select>
              </div>
            </div>
          </div>

          {childrenLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="text-stone-500">Loading children...</div>
            </div>
          ) : getSortedChildren().length === 0 ? (
            <div className="bg-white p-12 rounded-3xl shadow-[0_12px_20px_-12px_var(--menu-shadow)] border themed-border text-center">
              <p className="text-stone-500">No children match the current filters.</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl overflow-hidden shadow-[0_12px_20px_-12px_var(--menu-shadow)] border themed-border">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[var(--background)]">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">Child</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">Age</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">Parents</th>
                      <th className="px-6 py-4 text-right text-sm font-bold text-stone-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y themed-border">
                    {getSortedChildren().map((child) => (
                      <tr key={child.id} className="themed-row transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-stone-800">
                            {child.first_name} {child.last_name}
                          </div>
                          {child.status === 'WAITLIST' && child.waitlist_priority && (
                            <div className="text-xs text-stone-500">
                              Waitlist priority #{child.waitlist_priority}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-stone-600">
                          {calculateAgeYears(child.date_of_birth) !== null
                            ? `${calculateAgeYears(child.date_of_birth)} yrs`
                            : '-'}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-600">
                            {child.status || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-stone-600">
                          {child.parents && child.parents.length > 0 ? (
                            child.parents.map((parent) => parent.parent_name).join(', ')
                          ) : (
                            <span className="text-stone-400">No parents linked</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="inline-flex flex-col items-end gap-2">
                            <button
                              onClick={() => handleOpenFilesModal('child', child)}
                              className="px-3 py-1.5 rounded-xl bg-[var(--background)] text-[var(--primary-dark)] text-xs font-bold themed-hover transition-colors"
                            >
                              View Files
                            </button>
                            {child.status === 'WAITLIST' && (
                              <button
                                onClick={() => handleUpdateWaitlistPriority(child)}
                                className="text-xs font-semibold text-stone-500 hover:text-[var(--primary-dark)]"
                              >
                                Update Priority
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'parents' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-5 shadow-[0_12px_20px_-12px_var(--menu-shadow)] border themed-border">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="font-quicksand font-bold text-xl text-stone-800">Parents Directory</h3>
                <p className="text-sm text-stone-500">Contact and account status for all parents.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Search by name, email..."
                  value={parentSearch}
                  onChange={(e) => setParentSearch(e.target.value)}
                  className="px-4 py-2 rounded-xl border themed-border text-sm themed-ring bg-white"
                />
                <select
                  value={parentStatusFilter}
                  onChange={(e) => setParentStatusFilter(e.target.value)}
                  className="px-4 py-2 rounded-xl border themed-border text-sm themed-ring bg-white"
                >
                  <option value="all">All Accounts</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <select
                  value={parentHasChildrenFilter}
                  onChange={(e) => setParentHasChildrenFilter(e.target.value)}
                  className="px-4 py-2 rounded-xl border themed-border text-sm themed-ring bg-white"
                >
                  <option value="all">All Parents</option>
                  <option value="yes">Has Children</option>
                  <option value="no">No Children</option>
                </select>
                <select
                  value={parentBillingFilter}
                  onChange={(e) => setParentBillingFilter(e.target.value)}
                  className="px-4 py-2 rounded-xl border themed-border text-sm themed-ring bg-white"
                >
                  <option value="all">All Billing</option>
                  <option value="current">Current</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
            </div>
          </div>

          {parentsLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="text-stone-500">Loading parents...</div>
            </div>
          ) : getFilteredParents().length === 0 ? (
            <div className="bg-white p-12 rounded-3xl shadow-[0_12px_20px_-12px_var(--menu-shadow)] border themed-border text-center">
              <p className="text-stone-500">No parents match the current filters.</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl overflow-hidden shadow-[0_12px_20px_-12px_var(--menu-shadow)] border themed-border">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[var(--background)]">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">Parent</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">Contact</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">Children</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">Outstanding</th>
                      <th className="px-6 py-4 text-right text-sm font-bold text-stone-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y themed-border">
                    {getFilteredParents().map((parent) => {
                      const outstanding = parseFloat(parent.total_outstanding || 0);
                      return (
                        <tr key={parent.id} className="themed-row transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-medium text-stone-800">
                              {parent.first_name} {parent.last_name}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-stone-600">
                            <div>{parent.email || '-'}</div>
                            <div>{parent.phone || '-'}</div>
                          </td>
                          <td className="px-6 py-4 text-sm text-stone-600">
                            {Array.isArray(parent.children) && parent.children.length > 0 ? (
                              parent.children.map((child) => `${child.first_name} ${child.last_name}`).join(', ')
                            ) : (
                              <span className="text-stone-400">No children</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold ${
                                parent.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {parent.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-stone-600">
                            {outstanding > 0 ? `$${outstanding.toFixed(2)}` : '$0.00'}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleOpenFilesModal('parent', parent)}
                              className="px-3 py-1.5 rounded-xl bg-[var(--background)] text-[var(--primary-dark)] text-xs font-bold themed-hover transition-colors"
                            >
                              View Files
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      <AddFamilyModal
        isOpen={isAddFamilyOpen}
        onClose={() => setIsAddFamilyOpen(false)}
        onSuccess={loadFamilies}
      />

      <BaseModal
        isOpen={filesModalOpen}
        onClose={handleCloseFilesModal}
        title={
          filesModalOwner
            ? `${filesModalType === 'parent' ? 'Parent' : 'Child'} Files - ${filesModalOwner.first_name} ${filesModalOwner.last_name}`
            : 'Files'
        }
      >
        {linkedDocumentsLoading ? (
          <div className="text-stone-500 text-sm">Loading documents...</div>
        ) : linkedDocuments.length === 0 ? (
          <div className="text-stone-500 text-sm">No documents found.</div>
        ) : (
          <div className="space-y-3">
            {linkedDocuments.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between rounded-2xl border themed-border px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[var(--accent)] flex items-center justify-center">
                    <FileText size={18} className="text-[var(--primary-dark)]" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-stone-800">
                      {doc.original_filename}
                    </div>
                    <div className="text-xs text-stone-500">
                      {doc.category_name || 'Uncategorized'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownloadLinkedDocument(doc)}
                    className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
                  >
                    <Download size={16} className="text-stone-500" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteLinkedDocument(doc)}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} className="text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </BaseModal>

      {/* Edit Family Modal */}
      <BaseModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedFamily(null);
          setEditEmergencyContacts([]);
          setEditEmergencyContactIds([]);
          setTempPassword(null);
          setTempPasswordParent(null);
          setTempPasswordError('');
        }}
        title={`Edit ${selectedFamily ? getFamilyDisplayName(selectedFamily) : 'Family'}`}
        contentClassName="pb-0 sm:pb-0"
      >
        <form onSubmit={handleEditSubmit} className="space-y-6">
          <div>
            <h4 className="font-bold text-stone-700 mb-3 font-quicksand">Family Details</h4>
            <input
              type="text"
              placeholder="Family Name"
              value={editForm.familyName}
              onChange={(e) => setEditForm({ ...editForm, familyName: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
            />
          </div>

          {/* Parent 1 */}
          <div>
            <h4 className="font-bold text-stone-700 mb-3 font-quicksand">Parent/Guardian 1</h4>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="First Name"
                value={editForm.parent1FirstName}
                onChange={(e) => setEditForm({ ...editForm, parent1FirstName: e.target.value })}
                className="px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
              />
              <input
                type="text"
                placeholder="Last Name"
                value={editForm.parent1LastName}
                onChange={(e) => setEditForm({ ...editForm, parent1LastName: e.target.value })}
                className="px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
              />
              <input
                type="email"
                placeholder="Email"
                value={editForm.parent1Email}
                onChange={(e) => setEditForm({ ...editForm, parent1Email: e.target.value })}
                className="px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
              />
              <input
                type="tel"
                placeholder="Phone"
                value={editForm.parent1Phone}
                onChange={(e) => setEditForm({ ...editForm, parent1Phone: e.target.value })}
                className="px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
              />
              <input
                type="text"
                placeholder="Address Line 1"
                value={editForm.parentAddressLine1}
                onChange={(e) => setEditForm({ ...editForm, parentAddressLine1: e.target.value })}
                className="col-span-2 px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
              />
              <input
                type="text"
                placeholder="Address Line 2"
                value={editForm.parentAddressLine2}
                onChange={(e) => setEditForm({ ...editForm, parentAddressLine2: e.target.value })}
                className="col-span-2 px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
              />
              <input
                type="text"
                placeholder="City"
                value={editForm.parentCity}
                onChange={(e) => setEditForm({ ...editForm, parentCity: e.target.value })}
                className="px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
              />
              <input
                type="text"
                placeholder="Province/State"
                value={editForm.parentProvince}
                onChange={(e) => setEditForm({ ...editForm, parentProvince: e.target.value })}
                className="px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
              />
              <input
                type="text"
                placeholder="Postal Code"
                value={editForm.parentPostalCode}
                onChange={(e) => setEditForm({ ...editForm, parentPostalCode: e.target.value })}
                className="px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
              />
            </div>
          </div>

          {/* Parent 2 */}
          {editForm.parent2Id && (
            <div>
              <h4 className="font-bold text-stone-700 mb-3 font-quicksand">Parent/Guardian 2</h4>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="First Name"
                  value={editForm.parent2FirstName}
                  onChange={(e) => setEditForm({ ...editForm, parent2FirstName: e.target.value })}
                  className="px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
                />
                <input
                  type="text"
                  placeholder="Last Name"
                  value={editForm.parent2LastName}
                  onChange={(e) => setEditForm({ ...editForm, parent2LastName: e.target.value })}
                  className="px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={editForm.parent2Email}
                  onChange={(e) => setEditForm({ ...editForm, parent2Email: e.target.value })}
                  className="px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
                />
                <input
                  type="tel"
                  placeholder="Phone"
                  value={editForm.parent2Phone}
                  onChange={(e) => setEditForm({ ...editForm, parent2Phone: e.target.value })}
                  className="px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
                />
              </div>
            </div>
          )}

          {/* Account Access */}
          {selectedFamily?.parents?.some((parent) => parent.user_id) && (
            <div>
              <h4 className="font-bold text-stone-700 mb-3 font-quicksand">Account Access</h4>
              {tempPasswordError && (
                <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2">
                  {tempPasswordError}
                </div>
              )}
              <div className="space-y-3">
                {selectedFamily.parents.filter((parent) => parent.user_id).map((parent) => (
                  <div
                    key={parent.id}
                    className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl border themed-border bg-white"
                  >
                    <div>
                      <p className="text-sm font-semibold text-stone-800">
                        {parent.first_name} {parent.last_name}
                      </p>
                      <p className="text-xs text-stone-500">{parent.email || 'No email on file'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleGenerateTempPassword(parent)}
                      disabled={tempPasswordLoading}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-sm disabled:opacity-60"
                      style={{ backgroundColor: 'var(--primary)' }}
                    >
                      {tempPasswordLoading && tempPasswordParent?.id === parent.id
                        ? 'Generating...'
                        : 'Reset Password'}
                    </button>
                  </div>
                ))}
              </div>

              {tempPassword && tempPasswordParent && (
                <div className="mt-4 p-4 rounded-2xl border themed-border bg-[var(--background)]">
                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
                    Temporary Password for {tempPasswordParent.first_name}
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="px-3 py-2 rounded-xl bg-white border themed-border text-sm font-semibold">
                      {tempPassword}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (navigator?.clipboard) {
                          navigator.clipboard.writeText(tempPassword);
                        }
                      }}
                      className="text-xs font-semibold text-stone-500 hover:text-[var(--primary-dark)]"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="text-xs text-stone-500 mt-2">
                    The parent will be required to set a new password after logging in.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Child Information */}
          {editForm.childId && (
            <div>
              <h4 className="font-bold text-stone-700 mb-3 font-quicksand">Child Information</h4>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <input
                  type="text"
                  placeholder="First Name"
                  value={editForm.childFirstName}
                  onChange={(e) => setEditForm({ ...editForm, childFirstName: e.target.value })}
                  className="px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
                />
                <input
                  type="text"
                  placeholder="Last Name"
                  value={editForm.childLastName}
                  onChange={(e) => setEditForm({ ...editForm, childLastName: e.target.value })}
                  className="px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
                />
                <input
                  type="date"
                  placeholder="Date of Birth"
                  value={editForm.childDob}
                  onChange={(e) => setEditForm({ ...editForm, childDob: e.target.value })}
                  className="px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
                />
                <div className="relative">
                  <DollarSign size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Monthly Rate"
                    value={editForm.childMonthlyRate}
                    onChange={(e) => setEditForm({ ...editForm, childMonthlyRate: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                  Status
                </label>
                <select
                  value={editForm.childStatus}
                  onChange={(e) => setEditForm({ ...editForm, childStatus: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="WAITLIST">Waitlist</option>
                  <option value="GRADUATED">Graduated</option>
                </select>
              </div>

              {/* Allergies */}
              <div className="mb-3">
                <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                  Allergies
                </label>
                <div className="flex flex-wrap gap-2 p-4 bg-[var(--background)] rounded-2xl border themed-border">
                  {COMMON_ALLERGIES.map((allergy) => (
                    <button
                      key={allergy}
                      type="button"
                      onClick={() => handleAllergyToggle(allergy)}
                      className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                        (editForm.allergies.common || []).includes(allergy)
                          ? 'bg-[var(--primary)] text-white shadow-md'
                          : 'bg-white text-stone-600 border themed-border hover:border-[var(--primary)]'
                      }`}
                    >
                      {allergy}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Other allergies (separated by commas)"
                  value={editForm.allergies.other || ''}
                  onChange={(e) => setEditForm({
                    ...editForm,
                    allergies: { ...editForm.allergies, other: e.target.value }
                  })}
                  className="w-full mt-2 px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
                />
              </div>

              {/* Medical Notes */}
              <div className="mb-3">
                <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                  Medical Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Any medical conditions, medications, or important health information..."
                  value={editForm.medical_notes}
                  onChange={(e) => setEditForm({ ...editForm, medical_notes: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white resize-none"
                />
              </div>

              {/* General Notes */}
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                  Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Any additional notes about the child..."
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white resize-none"
                />
              </div>

              {/* Emergency Contacts */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-bold text-stone-700 font-quicksand">
                    Emergency Contacts
                  </label>
                  <button
                    type="button"
                    onClick={handleAddEmergencyContact}
                    className="text-[var(--primary)] text-sm font-bold hover:underline"
                  >
                    + Add Contact
                  </button>
                </div>
                {editEmergencyContacts.length === 0 ? (
                  <div className="p-4 bg-[var(--background)] rounded-2xl border themed-border text-sm text-stone-500 text-center">
                    No emergency contacts added. Click "Add Contact" to add one.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {editEmergencyContacts.map((contact, index) => (
                      <div
                        key={contact.id || index}
                        className="p-3 bg-[var(--background)] rounded-2xl border themed-border space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!contact.is_primary}
                              onChange={(e) => handleUpdateEmergencyContact(index, 'is_primary', e.target.checked)}
                              className="rounded themed-border text-[var(--primary)] themed-ring"
                            />
                            Primary Contact
                          </label>
                          <button
                            type="button"
                            onClick={() => handleDeleteEmergencyContact(index)}
                            className="text-xs font-bold text-red-600 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          <input
                            type="text"
                            placeholder="Name *"
                            value={contact.name || ''}
                            onChange={(e) => handleUpdateEmergencyContact(index, 'name', e.target.value)}
                            className="px-4 py-2 rounded-2xl border themed-border themed-ring bg-white"
                          />
                          <input
                            type="tel"
                            placeholder="Phone"
                            value={contact.phone || ''}
                            onChange={(e) => handleUpdateEmergencyContact(index, 'phone', e.target.value)}
                            className="px-4 py-2 rounded-2xl border themed-border themed-ring bg-white"
                          />
                          <input
                            type="text"
                            placeholder="Relationship"
                            value={contact.relationship || ''}
                            onChange={(e) => handleUpdateEmergencyContact(index, 'relationship', e.target.value)}
                            className="px-4 py-2 rounded-2xl border themed-border themed-ring bg-white"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="sticky bottom-0 z-10 flex gap-3 pt-4 pb-4 border-t themed-border bg-white -mx-4 sm:-mx-6 px-4 sm:px-6">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="px-6 py-3 rounded-2xl border border-red-300 text-red-600 font-bold hover:bg-red-50 transition-colors flex items-center gap-2"
            >
              <Trash2 size={18} />
              Delete
            </button>
            <div className="flex-1"></div>
            <button
              type="button"
              onClick={() => {
                setIsEditModalOpen(false);
                setSelectedFamily(null);
              }}
              className="px-6 py-3 rounded-2xl border themed-border text-stone-600 font-bold hover:bg-[var(--background)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 rounded-2xl bg-[var(--primary)] text-white font-bold shadow-lg shadow-[0_12px_20px_-12px_var(--menu-shadow)] hover:opacity-90 transition-all"
            >
              Save Changes
            </button>
          </div>
        </form>
      </BaseModal>

      {/* Delete Confirmation Modal */}
      <BaseModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Family"
      >
        <div className="space-y-4">
          <p className="text-stone-600">
            Are you sure you want to delete <span className="font-bold">{selectedFamily ? getFamilyDisplayName(selectedFamily) : 'this family'}</span>?
          </p>
          <p className="text-sm text-stone-500 bg-amber-50 border border-amber-200 rounded-2xl p-4">
            This will remove all family information, including children and their records.
          </p>

          <div className="bg-[var(--background)] border themed-border rounded-2xl p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1"
                id="deleteParents"
              />
              <div>
                <div className="font-bold text-stone-700 text-sm">Also delete parent accounts</div>
                <div className="text-xs text-stone-500 mt-1">
                  This will permanently remove parent login accounts. Use this if the family is leaving permanently.
                </div>
              </div>
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              className="flex-1 px-6 py-3 rounded-2xl border themed-border text-stone-600 font-bold hover:bg-[var(--background)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                const deleteAccounts = document.getElementById('deleteParents')?.checked || false;
                handleDeleteFamily(deleteAccounts);
              }}
              className="flex-1 px-6 py-3 rounded-2xl bg-red-500 text-white font-bold shadow-lg shadow-red-500/30 hover:bg-red-600 transition-all"
            >
              Delete Family
            </button>
          </div>
        </div>
      </BaseModal>
    </Layout>
  );
}



