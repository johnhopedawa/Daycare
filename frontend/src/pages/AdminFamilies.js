import React, { useState, useEffect } from 'react';
import api from '../utils/api';

function AdminFamilies() {
  // Tab state - default to Children (educator-focused view)
  const [activeTab, setActiveTab] = useState('children');

  // Families tab state
  const [families, setFamilies] = useState([]);
  const [familiesLoading, setFamiliesLoading] = useState(true);
  const [familiesError, setFamiliesError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingFamily, setDeletingFamily] = useState(null);
  const [generatedPasswords, setGeneratedPasswords] = useState([]);
  const [expandedChildren, setExpandedChildren] = useState({});
  const [expandedParents, setExpandedParents] = useState({});
  const [familyFilters, setFamilyFilters] = useState({
    search: ''
  });
  const [selectedFamily, setSelectedFamily] = useState(null);
  const [showFamilyDetails, setShowFamilyDetails] = useState(false);
  const [editForm, setEditForm] = useState({
    parent1Id: null,
    parent1FirstName: '',
    parent1LastName: '',
    parent1Email: '',
    parent1Phone: '',
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
  const [editEmergencyContacts, setEditEmergencyContacts] = useState([]);

  // Children tab state
  const [showFilesModal, setShowFilesModal] = useState(false);
  const [selectedChild, setSelectedChild] = useState(null);
  const [childDocuments, setChildDocuments] = useState([]);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadForm, setUploadForm] = useState({
    category: 'MEDICAL',
    description: '',
    tags: ''
  });
  const [editingChild, setEditingChild] = useState(null);
  const [childEditForm, setChildEditForm] = useState({});
  const [showAllergyEdit, setShowAllergyEdit] = useState(false);
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [childDirectory, setChildDirectory] = useState([]);
  const [childDirectoryLoading, setChildDirectoryLoading] = useState(true);
  const [childDirectoryError, setChildDirectoryError] = useState(null);
  const [showDirectoryEditModal, setShowDirectoryEditModal] = useState(false);
  const [directoryEditingChild, setDirectoryEditingChild] = useState(null);
  const [directoryFilters, setDirectoryFilters] = useState({
    status: 'enrolled', // Default to showing enrolled children
    hasAllergies: 'all',
    search: ''
  });
  const [childSort, setChildSort] = useState('alpha'); // 'alpha' or 'age'
  const [expandedChildRows, setExpandedChildRows] = useState({});
  const [formEmergencyContacts, setFormEmergencyContacts] = useState([]);

  // Parents tab state
  const [parentDirectory, setParentDirectory] = useState([]);
  const [parentDirectoryLoading, setParentDirectoryLoading] = useState(true);
  const [parentDirectoryError, setParentDirectoryError] = useState(null);
  const [parentFilters, setParentFilters] = useState({
    status: 'all',
    hasChildren: 'all',
    billingStatus: 'all',
    search: ''
  });
  const [expandedParentRows, setExpandedParentRows] = useState({});

  const [formData, setFormData] = useState({
    parent1FirstName: '',
    parent1LastName: '',
    parent1Email: '',
    parent1Phone: '',
    parent2FirstName: '',
    parent2LastName: '',
    parent2Email: '',
    parent2Phone: '',
    childFirstName: '',
    childLastName: '',
    childDob: '',
    childStatus: 'ACTIVE',
    childMonthlyRate: '',
    allergies: { common: [], other: '' },
    medical_notes: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
    notes: '',
  });

  const COMMON_ALLERGIES = [
    'None', 'Milk', 'Eggs', 'Nuts', 'Tree Nuts', 'Soy', 'Wheat (Gluten)',
    'Fish', 'Shellfish', 'Sesame', 'Strawberries', 'Citrus Fruits', 'Bananas',
    'Chocolate/Cocoa', 'Food Dyes', 'Corn', 'Dust Mites', 'Pollen', 'Pet'
  ];

  useEffect(() => {
    if (activeTab === 'families') {
      loadFamilies();
    } else if (activeTab === 'children') {
      loadChildDirectory();
    } else if (activeTab === 'parents') {
      loadParentDirectory();
    }
  }, [activeTab]);

  const loadFamilies = async () => {
    try {
      setFamiliesLoading(true);
      setFamiliesError(null);
      const response = await api.get('/families');
      const familiesData = response.data.families;

      // Load emergency contacts for each child
      for (const family of familiesData) {
        for (const child of family.children) {
          try {
            const contactsResponse = await api.get(`/children/${child.id}/emergency-contacts`);
            child.emergency_contacts = contactsResponse.data.emergencyContacts || [];
          } catch (error) {
            console.error(`Error loading emergency contacts for child ${child.id}:`, error);
            child.emergency_contacts = [];
          }
        }
      }

      setFamilies(familiesData);
      setFamiliesLoading(false);
    } catch (error) {
      console.error('Load families error:', error);
      setFamiliesError(error.response?.data?.error || 'Failed to load families');
      setFamiliesLoading(false);
    }
  };

  const loadChildDirectory = async () => {
    try {
      setChildDirectoryLoading(true);
      setChildDirectoryError(null);
      const response = await api.get('/children');
      console.log('loadChildDirectory response:', response.data);
      const childrenData = response.data.children || [];
      console.log('Children data count:', childrenData.length);
      if (childrenData.length > 0) {
        console.log('First child sample:', childrenData[0]);
      }
      const sorted = [...childrenData].sort((a, b) => {
        const lastA = (a.last_name || a.lastName || '').toLowerCase();
        const lastB = (b.last_name || b.lastName || '').toLowerCase();
        if (lastA === lastB) {
          const firstA = (a.first_name || a.firstName || '').toLowerCase();
          const firstB = (b.first_name || b.firstName || '').toLowerCase();
          return firstA.localeCompare(firstB);
        }
        return lastA.localeCompare(lastB);
      });
      setChildDirectory(sorted);
    } catch (error) {
      console.error('Load child directory error:', error);
      setChildDirectoryError('Failed to load child list. Please try again.');
    } finally {
      setChildDirectoryLoading(false);
    }
  };

  const loadParentDirectory = async () => {
    try {
      setParentDirectoryLoading(true);
      setParentDirectoryError(null);
      const response = await api.get('/parents/directory');
      console.log('loadParentDirectory response:', response.data);
      const parentsData = response.data.parents || [];
      setParentDirectory(parentsData);
    } catch (error) {
      console.error('Load parent directory error:', error);
      setParentDirectoryError('Failed to load parent list. Please try again.');
    } finally {
      setParentDirectoryLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await api.post('/families', formData);

      // Save emergency contacts if the child was created
      if (response.data.child && response.data.child.id && formEmergencyContacts.length > 0) {
        const childId = response.data.child.id;
        for (const contact of formEmergencyContacts) {
          if (contact.name) {  // Only save contacts with a name
            await api.post(`/children/${childId}/emergency-contacts`, {
              name: contact.name,
              phone: contact.phone || null,
              relationship: contact.relationship || null,
              is_primary: contact.is_primary || false
            });
          }
        }
      }

      if (response.data.passwords && response.data.passwords.length > 0) {
        setGeneratedPasswords(response.data.passwords);
      }

      setShowForm(false);
      resetForm();
      loadFamilies();
      loadChildDirectory();
    } catch (error) {
      console.error('Submit error:', error);
      alert(error.response?.data?.error || 'Failed to create family');
    }
  };

  const handleToggleStatus = async (familyId, currentStatus) => {
    const action = currentStatus ? 'disable' : 'enable';
    const confirmMessage = currentStatus
      ? 'Disable all parent login accounts for this family?\n\nParents will not be able to log in until re-enabled.'
      : 'Enable all parent login accounts for this family?\n\nParents will be able to log in again.';

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      await api.patch(`/families/${familyId}/toggle-status`, {
        isActive: !currentStatus
      });

      loadFamilies();
      loadChildDirectory();
    } catch (error) {
      console.error('Toggle status error:', error);
      alert(error.response?.data?.error || 'Failed to toggle family status');
    }
  };

  const handleDeleteFamily = async (familyId, deleteAccounts = false) => {
    try {
      const url = deleteAccounts ? `/families/${familyId}?deleteParents=true` : `/families/${familyId}`;
      await api.delete(url);
      setShowDeleteModal(false);
      setDeletingFamily(null);
      loadFamilies();
      loadChildDirectory();
    } catch (error) {
      console.error('Delete family error:', error);
      alert(error.response?.data?.error || 'Failed to delete family');
    }
  };

  const openDeleteModal = (family) => {
    setDeletingFamily(family);
    setShowDeleteModal(true);
  };

  const resetForm = () => {
    setFormData({
      parent1FirstName: '',
      parent1LastName: '',
      parent1Email: '',
      parent1Phone: '',
      parent2FirstName: '',
      parent2LastName: '',
      parent2Email: '',
      parent2Phone: '',
      childFirstName: '',
      childLastName: '',
      childDob: '',
      childStatus: 'ACTIVE',
      childMonthlyRate: '',
      allergies: { common: [], other: '' },
      medical_notes: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      emergency_contact_relationship: '',
      notes: '',
    });
    setFormEmergencyContacts([]);
  };

  const handleOpenEditFamily = (family) => {
    setSelectedFamily(family);

    // Populate edit form from family data
    const parent1 = family.parents && family.parents.length > 0 ? family.parents[0] : null;
    const parent2 = family.parents && family.parents.length > 1 ? family.parents[1] : null;
    const child = family.children && family.children.length > 0 ? family.children[0] : null;

    // Parse allergies
    let allergiesData = { common: [], other: '' };
    if (child && child.allergies) {
      try {
        if (typeof child.allergies === 'string') {
          allergiesData = JSON.parse(child.allergies);
        } else {
          allergiesData = child.allergies;
        }
      } catch (e) {
        allergiesData = { common: [], other: child.allergies };
      }
    }

    // Format date properly for input[type="date"] (YYYY-MM-DD)
    let formattedDob = '';
    if (child?.date_of_birth) {
      const dobDate = new Date(child.date_of_birth);
      formattedDob = dobDate.toISOString().split('T')[0];
    }

    setEditForm({
      parent1Id: parent1?.parent_id || null,
      parent1FirstName: parent1?.parent_first_name || '',
      parent1LastName: parent1?.parent_last_name || '',
      parent1Email: parent1?.parent_email || '',
      parent1Phone: parent1?.parent_phone || '',
      parent2Id: parent2?.parent_id || null,
      parent2FirstName: parent2?.parent_first_name || '',
      parent2LastName: parent2?.parent_last_name || '',
      parent2Email: parent2?.parent_email || '',
      parent2Phone: parent2?.parent_phone || '',
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

    // Load emergency contacts for the child
    if (child?.id) {
      loadEditEmergencyContacts(child.id);
    } else {
      setEditEmergencyContacts([]);
    }

    setShowFamilyDetails(true);
  };

  const loadEditEmergencyContacts = async (childId) => {
    try {
      const response = await api.get(`/children/${childId}/emergency-contacts`);
      setEditEmergencyContacts(response.data.emergency_contacts || []);
    } catch (error) {
      console.error('Error loading emergency contacts:', error);
      setEditEmergencyContacts([]);
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
          phone: editForm.parent1Phone
        });
      }

      // Update Parent 2 if exists
      if (editForm.parent2Id) {
        await api.patch(`/parents/${editForm.parent2Id}`, {
          firstName: editForm.parent2FirstName,
          lastName: editForm.parent2LastName,
          email: editForm.parent2Email,
          phone: editForm.parent2Phone
        });
      }

      // Update Child if exists (backend expects snake_case fields)
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
      }

      // Close modal and refresh
      setShowFamilyDetails(false);
      setSelectedFamily(null);
      loadFamilies();
      loadChildDirectory();
      loadParentDirectory();

      alert('Family updated successfully!');
    } catch (error) {
      console.error('Error updating family:', error);
      alert(error.response?.data?.error || 'Failed to update family');
    }
  };

  const handleEditAllergyToggle = (allergy) => {
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

  const handleAllergyToggle = (allergy) => {
    const current = formData.allergies.common || [];
    if (current.includes(allergy)) {
      setFormData({
        ...formData,
        allergies: {
          ...formData.allergies,
          common: current.filter(a => a !== allergy)
        }
      });
    } else {
      setFormData({
        ...formData,
        allergies: {
          ...formData.allergies,
          common: [...current, allergy]
        }
      });
    }
  };

  const formatWaitlistPosition = (priority) => {
    if (!priority) return '';
    const suffix = priority === 1 ? 'st' : priority === 2 ? 'nd' : priority === 3 ? 'rd' : 'th';
    return `${priority}${suffix}`;
  };

  const calculateAge = (dob) => {
    if (!dob) return 'N/A';
    const today = new Date();
    const birthDate = new Date(dob);

    // Calculate total months
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    let days = today.getDate() - birthDate.getDate();

    if (days < 0) {
      months--;
    }
    if (months < 0) {
      years--;
      months += 12;
    }

    const totalMonths = years * 12 + months;

    // Under 12 months: show weeks
    if (totalMonths < 12) {
      const millisecondsPerWeek = 1000 * 60 * 60 * 24 * 7;
      const weeks = Math.floor((today - birthDate) / millisecondsPerWeek);
      return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} old`;
    }

    // 12-24 months: show months
    if (totalMonths < 24) {
      return `${totalMonths} ${totalMonths === 1 ? 'month' : 'months'} old`;
    }

    // Over 24 months: show years and months
    if (months === 0) {
      return `${years} ${years === 1 ? 'year' : 'years'}`;
    }
    return `${years} ${years === 1 ? 'year' : 'years'} ${months} ${months === 1 ? 'month' : 'months'}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const toggleChildDetails = (childId) => {
    setExpandedChildren(prev => ({
      ...prev,
      [childId]: !prev[childId]
    }));
  };

  const toggleParentDetails = (familyId) => {
    setExpandedParents(prev => ({
      ...prev,
      [familyId]: !prev[familyId]
    }));
  };

  const handleEditChild = async (child, fromDirectory = false) => {
    // Parse allergies properly
    let allergiesData = { common: [], other: '' };
    if (child.allergies) {
      if (typeof child.allergies === 'string') {
        try {
          allergiesData = JSON.parse(child.allergies);
        } catch (e) {
          allergiesData = { common: [], other: child.allergies };
        }
      } else if (typeof child.allergies === 'object') {
        allergiesData = {
          common: child.allergies.common || [],
          other: child.allergies.other || ''
        };
      }
    }

    setChildEditForm({
      allergies: allergiesData,
      medical_notes: child.medical_notes || '',
      notes: child.notes || ''
    });

    // Load emergency contacts for this child
    await loadEmergencyContacts(child.id);

    if (fromDirectory) {
      // Open modal for directory editing
      setDirectoryEditingChild(child);
      setShowDirectoryEditModal(true);
      setShowAllergyEdit(false);
    } else {
      // Inline editing for family list
      setEditingChild(child.id);
      setShowAllergyEdit(false);
    }
  };

  const loadEmergencyContacts = async (childId) => {
    try {
      const response = await api.get(`/children/${childId}/emergency-contacts`);
      setEmergencyContacts(response.data.emergencyContacts || []);
    } catch (error) {
      console.error('Load emergency contacts error:', error);
      setEmergencyContacts([]);
    }
  };

  const handleAddEmergencyContact = () => {
    setEmergencyContacts([...emergencyContacts, {
      id: `new-${Date.now()}`,
      name: '',
      phone: '',
      relationship: '',
      is_primary: emergencyContacts.length === 0
    }]);
  };

  const handleUpdateEmergencyContact = (index, field, value) => {
    const updated = [...emergencyContacts];
    updated[index] = { ...updated[index], [field]: value };

    // If setting this as primary, unset others
    if (field === 'is_primary' && value) {
      updated.forEach((contact, i) => {
        if (i !== index) {
          contact.is_primary = false;
        }
      });
    }

    setEmergencyContacts(updated);
  };

  const handleDeleteEmergencyContact = (index) => {
    const updated = emergencyContacts.filter((_, i) => i !== index);
    setEmergencyContacts(updated);
  };

  // Form emergency contact handlers
  const handleAddFormEmergencyContact = () => {
    setFormEmergencyContacts([...formEmergencyContacts, {
      id: `new-${Date.now()}`,
      name: '',
      phone: '',
      relationship: '',
      is_primary: formEmergencyContacts.length === 0
    }]);
  };

  const handleUpdateFormEmergencyContact = (index, field, value) => {
    const updated = [...formEmergencyContacts];
    updated[index] = { ...updated[index], [field]: value };

    // If setting this as primary, unset others
    if (field === 'is_primary' && value) {
      updated.forEach((contact, i) => {
        if (i !== index) {
          contact.is_primary = false;
        }
      });
    }

    setFormEmergencyContacts(updated);
  };

  const handleDeleteFormEmergencyContact = (index) => {
    const updated = formEmergencyContacts.filter((_, i) => i !== index);
    setFormEmergencyContacts(updated);
  };

  const saveEmergencyContacts = async (childId) => {
    try {
      console.log('Starting saveEmergencyContacts for child:', childId);
      console.log('Current emergency contacts:', emergencyContacts);

      // Delete all existing emergency contacts (exclude 'new-' prefixed IDs which are new entries)
      const existing = emergencyContacts.filter(c => !c.id.toString().startsWith('new-'));
      console.log('Deleting existing contacts:', existing);
      for (const contact of existing) {
        await api.delete(`/emergency-contacts/${contact.id}`);
        console.log('Deleted contact:', contact.id);
      }

      // Create all contacts (both new and modified)
      for (const contact of emergencyContacts) {
        if (contact.name) {  // Only save if name is provided
          console.log('Creating contact:', contact);
          const response = await api.post(`/children/${childId}/emergency-contacts`, {
            name: contact.name,
            phone: contact.phone,
            relationship: contact.relationship,
            is_primary: contact.is_primary
          });
          console.log('Created contact response:', response.data);
        }
      }
      console.log('All emergency contacts saved successfully');
    } catch (error) {
      console.error('Save emergency contacts error:', error);
      console.error('Error details:', error.response?.data);
      throw error;
    }
  };

  const handleChildAllergyToggle = (allergy) => {
    const current = childEditForm.allergies?.common || [];

    // Handle "None" option - if selected, clear all others
    if (allergy === 'None') {
      setChildEditForm({
        ...childEditForm,
        allergies: {
          ...childEditForm.allergies,
          common: current.includes('None') ? [] : ['None']
        }
      });
      return;
    }

    // If toggling another allergy, remove "None" if it's selected
    const filteredCurrent = current.filter(a => a !== 'None');

    if (filteredCurrent.includes(allergy)) {
      setChildEditForm({
        ...childEditForm,
        allergies: {
          ...childEditForm.allergies,
          common: filteredCurrent.filter(a => a !== allergy)
        }
      });
    } else {
      setChildEditForm({
        ...childEditForm,
        allergies: {
          ...childEditForm.allergies,
          common: [...filteredCurrent, allergy]
        }
      });
    }
  };

  const handleSaveChild = async (childId) => {
    try {
      await api.patch(`/children/${childId}`, childEditForm);
      await saveEmergencyContacts(childId);
      setEditingChild(null);
      setEmergencyContacts([]);
      loadFamilies();
      loadChildDirectory();
    } catch (error) {
      console.error('Update child error:', error);
      alert('Failed to update child information');
    }
  };

  const handleCancelEdit = () => {
    setEditingChild(null);
    setChildEditForm({});
    setEmergencyContacts([]);
  };

  const handleSaveDirectoryChild = async () => {
    if (!directoryEditingChild) return;

    try {
      // Prepare the payload - convert allergies object to JSON string
      const payload = {
        ...childEditForm,
        allergies: childEditForm.allergies ? JSON.stringify(childEditForm.allergies) : null
      };

      console.log('Saving child data:', payload);
      console.log('Emergency contacts:', emergencyContacts);

      const childResponse = await api.patch(`/children/${directoryEditingChild.id}`, payload);
      console.log('Child update response:', childResponse.data);

      await saveEmergencyContacts(directoryEditingChild.id);
      console.log('Emergency contacts saved successfully');

      setShowDirectoryEditModal(false);
      setDirectoryEditingChild(null);
      setEmergencyContacts([]);
      await loadChildDirectory();
      console.log('Child directory reloaded');
    } catch (error) {
      console.error('Update child error:', error);
      console.error('Error details:', error.response?.data);
      alert('Failed to update child information: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleCancelDirectoryEdit = () => {
    setShowDirectoryEditModal(false);
    setDirectoryEditingChild(null);
    setChildEditForm({});
    setEmergencyContacts([]);
  };

  const handleDeleteChildFamily = async () => {
    if (!directoryEditingChild) return;

    // Find the family this child belongs to
    const family = families.find(f =>
      f.children.some(c => c.id === directoryEditingChild.id)
    );

    if (!family) {
      alert('Could not find family for this child');
      return;
    }

    // Close the modal first
    handleCancelDirectoryEdit();

    // Delete the entire family with all parent accounts
    await handleDeleteFamily(family.family_id, true);
  };

  const handleViewFiles = async (child) => {
    setSelectedChild(child);
    setShowFilesModal(true);
    await loadChildDocuments(child.id);
  };

  const loadChildDocuments = async (childId) => {
    try {
      const response = await api.get(`/files?linked_child_id=${childId}`);
      setChildDocuments(response.data.documents || []);
    } catch (error) {
      console.error('Load documents error:', error);
      setChildDocuments([]);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();

    if (!selectedFile) {
      alert('Please select a file to upload');
      return;
    }

    const formDataToSend = new FormData();
    formDataToSend.append('file', selectedFile);
    formDataToSend.append('category', uploadForm.category);
    formDataToSend.append('description', uploadForm.description);
    formDataToSend.append('linked_child_id', selectedChild.id);

    if (uploadForm.tags) {
      formDataToSend.append('tags', uploadForm.tags);
    }

    try {
      await api.post('/files/upload', formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSelectedFile(null);
      setUploadForm({ category: 'MEDICAL', description: '', tags: '' });
      setShowUploadForm(false);
      loadChildDocuments(selectedChild.id);
    } catch (error) {
      console.error('Upload error:', error);
      alert(error.response?.data?.error || 'Failed to upload file');
    }
  };

  const handleDownloadFile = async (fileId, fileName) => {
    try {
      const response = await api.get(`/files/${fileId}/download`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download file');
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (!window.confirm('Are you sure you want to delete this file?')) {
      return;
    }

    try {
      await api.delete(`/files/${fileId}`);
      loadChildDocuments(selectedChild.id);
    } catch (error) {
      console.error('Delete file error:', error);
      alert('Failed to delete file');
    }
  };

  const formatAllergies = (allergies) => {
    if (!allergies) return 'None';

    if (typeof allergies === 'string') {
      try {
        allergies = JSON.parse(allergies);
      } catch (e) {
        return allergies;
      }
    }

    const parts = [];
    if (allergies.common && allergies.common.length > 0) {
      parts.push(allergies.common.join(', '));
    }
    if (allergies.other) {
      parts.push(allergies.other);
    }

    return parts.length > 0 ? parts.join('; ') : 'None';
  };

  const getChildFullName = (child) => {
    const first = child.first_name || child.firstName || '';
    const last = child.last_name || child.lastName || '';
    return `${first} ${last}`.trim() || 'Unnamed Child';
  };

  const getChildAgeDisplay = (child) => {
    if (child.age !== undefined && child.age !== null) {
      return typeof child.age === 'number' ? `${child.age}` : child.age;
    }
    if (child.date_of_birth) {
      return calculateAge(child.date_of_birth);
    }
    return 'N/A';
  };

  const formatStatusLabel = (status) => {
    if (!status) return 'Unknown';
    const normalized = status.toString().replace(/_/g, ' ').toLowerCase();
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  };

  const getStatusBadgeClass = (status) => {
    if (!status) return 'badge-draft';
    const normalized = status.toString().toUpperCase();
    if (normalized === 'ACTIVE' || normalized === 'ENROLLED') return 'badge-approved';
    if (normalized === 'WAITLIST') return 'badge-pending';
    return 'badge-draft';
  };

  const formatAuthorizedPickup = (pickup) => {
    if (!pickup) return '—';
    if (Array.isArray(pickup)) {
      const filtered = pickup.filter(Boolean);
      return filtered.length ? filtered.join(', ') : '—';
    }
    if (typeof pickup === 'object') {
      const values = Object.values(pickup).filter(Boolean);
      return values.length ? values.join(', ') : '—';
    }
    return pickup;
  };

  const formatEmergencyContact = (child) => {
    // Use new emergency_contacts array if available
    if (child.emergency_contacts && Array.isArray(child.emergency_contacts) && child.emergency_contacts.length > 0) {
      const primary = child.emergency_contacts.find(c => c.is_primary) || child.emergency_contacts[0];
      if (primary.name && primary.phone) return `${primary.name} (${primary.phone})`;
      return primary.name || primary.phone || '—';
    }

    // Fall back to old fields for backwards compatibility
    const name = child.emergency_contact_name || child.emergencyContactName;
    const phone = child.emergency_contact_phone || child.emergencyContactPhone;
    if (!name && !phone) return '—';
    if (name && phone) return `${name} (${phone})`;
    return name || phone || '—';
  };

  const toggleChildRow = (childId) => {
    setExpandedChildRows(prev => {
      const isCurrentlyExpanded = prev[childId];
      // Close all rows and toggle the clicked one
      return { [childId]: !isCurrentlyExpanded };
    });
  };

  const getFilteredChildren = () => {
    let filtered = [...childDirectory];

    // Filter by status - handle enrolled (ACTIVE + ENROLLED) separately
    if (directoryFilters.status !== 'all') {
      if (directoryFilters.status === 'enrolled') {
        filtered = filtered.filter(child => {
          const status = child.status?.toUpperCase();
          return status === 'ACTIVE' || status === 'ENROLLED';
        });
      } else if (directoryFilters.status === 'waitlist') {
        filtered = filtered.filter(child =>
          child.status?.toUpperCase() === 'WAITLIST'
        );
      } else if (directoryFilters.status === 'inactive') {
        filtered = filtered.filter(child =>
          child.status?.toUpperCase() === 'INACTIVE'
        );
      }
    }

    // Filter by allergies
    if (directoryFilters.hasAllergies === 'yes') {
      filtered = filtered.filter(child => {
        const allergiesText = formatAllergies(child.allergies);
        return allergiesText && allergiesText.toLowerCase() !== 'none';
      });
    } else if (directoryFilters.hasAllergies === 'no') {
      filtered = filtered.filter(child => {
        const allergiesText = formatAllergies(child.allergies);
        return !allergiesText || allergiesText.toLowerCase() === 'none';
      });
    }

    // Filter by search
    if (directoryFilters.search.trim()) {
      const searchLower = directoryFilters.search.toLowerCase();
      filtered = filtered.filter(child => {
        const fullName = getChildFullName(child).toLowerCase();
        const allergiesText = formatAllergies(child.allergies).toLowerCase();
        const emergencyContact = formatEmergencyContact(child).toLowerCase();
        return fullName.includes(searchLower) ||
               allergiesText.includes(searchLower) ||
               emergencyContact.includes(searchLower);
      });
    }

    // Apply sorting based on childSort state
    if (childSort === 'age') {
      // Sort by age (youngest first)
      filtered.sort((a, b) => {
        const dobA = a.date_of_birth ? new Date(a.date_of_birth) : new Date(0);
        const dobB = b.date_of_birth ? new Date(b.date_of_birth) : new Date(0);
        return dobB - dobA; // More recent dates first (younger children)
      });
    } else {
      // Sort alphabetically by last name, then first name
      filtered.sort((a, b) => {
        const lastA = (a.last_name || '').toLowerCase();
        const lastB = (b.last_name || '').toLowerCase();
        if (lastA !== lastB) {
          return lastA.localeCompare(lastB);
        }
        const firstA = (a.first_name || '').toLowerCase();
        const firstB = (b.first_name || '').toLowerCase();
        return firstA.localeCompare(firstB);
      });
    }

    // For waitlist children, maintain priority order within their group
    if (directoryFilters.status === 'waitlist') {
      filtered.sort((a, b) => {
        const priorityA = a.waitlist_priority || 9999;
        const priorityB = b.waitlist_priority || 9999;
        return priorityA - priorityB;
      });
    }

    return filtered;
  };

  // Get child counts for summary
  const getChildCounts = () => {
    const enrolled = childDirectory.filter(c => {
      const status = c.status?.toUpperCase();
      return status === 'ACTIVE' || status === 'ENROLLED';
    }).length;
    const waitlist = childDirectory.filter(c =>
      c.status?.toUpperCase() === 'WAITLIST'
    ).length;
    const inactive = childDirectory.filter(c =>
      c.status?.toUpperCase() === 'INACTIVE'
    ).length;
    return { enrolled, waitlist, inactive, total: childDirectory.length };
  };

  // Parent Directory Helper Functions
  const getParentFullName = (parent) => {
    return `${parent.first_name || ''} ${parent.last_name || ''}`.trim() || 'Unnamed Parent';
  };

  const getParentChildren = (parent) => {
    if (!parent.children || parent.children.length === 0) return '—';
    const childrenArray = typeof parent.children === 'string' ? JSON.parse(parent.children) : parent.children;
    return childrenArray
      .map(c => `${c.first_name} ${c.last_name}`)
      .join(', ') || '—';
  };

  const getParentChildrenWithStatus = (parent) => {
    if (!parent.children || parent.children.length === 0) return [];
    return typeof parent.children === 'string' ? JSON.parse(parent.children) : parent.children;
  };

  // Family Helper Functions
  const getFilteredFamilies = () => {
    let filtered = [...families];

    // Search filter
    if (familyFilters.search) {
      const searchLower = familyFilters.search.toLowerCase();
      filtered = filtered.filter(family => {
        const primaryParent = family.primary_parent || (family.parents && family.parents[0]);
        const parentName = primaryParent
          ? `${primaryParent.parent_first_name} ${primaryParent.parent_last_name}`.toLowerCase()
          : '';
        const parentEmail = primaryParent?.parent_email?.toLowerCase() || '';
        const childNames = family.children.map(c => `${c.first_name} ${c.last_name}`.toLowerCase()).join(' ');

        return parentName.includes(searchLower) ||
               parentEmail.includes(searchLower) ||
               childNames.includes(searchLower);
      });
    }

    return filtered;
  };

  const getFamilyCounts = () => {
    const totalFamilies = families.length;
    let totalEnrolled = 0;
    let totalWaitlist = 0;

    families.forEach(family => {
      family.children.forEach(child => {
        const status = child.status?.toUpperCase();
        if (status === 'ACTIVE' || status === 'ENROLLED') {
          totalEnrolled++;
        } else if (status === 'WAITLIST') {
          totalWaitlist++;
        }
      });
    });

    return { totalFamilies, totalEnrolled, totalWaitlist };
  };

  const getBillingStatusBadge = (parent) => {
    const outstanding = parseFloat(parent.total_outstanding || 0);
    if (outstanding > 0) {
      return { label: `$${outstanding.toFixed(2)} Due`, class: 'badge-overdue' };
    }
    return { label: 'Current', class: 'badge-approved' };
  };

  const toggleParentRow = (parentId) => {
    setExpandedParentRows(prev => {
      const isCurrentlyExpanded = prev[parentId];
      return { [parentId]: !isCurrentlyExpanded };
    });
  };

  const getFilteredParents = () => {
    let filtered = [...parentDirectory];

    // Filter by account status
    if (parentFilters.status !== 'all') {
      const isActive = parentFilters.status === 'active';
      filtered = filtered.filter(parent => parent.is_active === isActive);
    }

    // Filter by has children
    if (parentFilters.hasChildren === 'yes') {
      filtered = filtered.filter(parent => {
        const childrenArray = typeof parent.children === 'string' ? JSON.parse(parent.children) : parent.children;
        return childrenArray && childrenArray.length > 0;
      });
    } else if (parentFilters.hasChildren === 'no') {
      filtered = filtered.filter(parent => {
        const childrenArray = typeof parent.children === 'string' ? JSON.parse(parent.children) : parent.children;
        return !childrenArray || childrenArray.length === 0;
      });
    }

    // Filter by billing status
    if (parentFilters.billingStatus === 'overdue') {
      filtered = filtered.filter(parent => parseFloat(parent.total_outstanding || 0) > 0);
    } else if (parentFilters.billingStatus === 'current') {
      filtered = filtered.filter(parent => parseFloat(parent.total_outstanding || 0) === 0);
    }

    // Filter by search
    if (parentFilters.search.trim()) {
      const searchLower = parentFilters.search.toLowerCase();
      filtered = filtered.filter(parent => {
        const fullName = getParentFullName(parent).toLowerCase();
        const email = (parent.email || '').toLowerCase();
        const phone = (parent.phone || '').toLowerCase();
        const children = getParentChildren(parent).toLowerCase();
        return fullName.includes(searchLower) ||
               email.includes(searchLower) ||
               phone.includes(searchLower) ||
               children.includes(searchLower);
      });
    }

    return filtered;
  };

  return (
    <div className="main-content">
      <h1>Family Management</h1>

      {/* Tab Navigation - Children first (educator workflow) */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <button
          onClick={() => setActiveTab('children')}
          className={activeTab === 'children' ? 'btn' : 'btn-secondary'}
        >
          Children
        </button>
        <button
          onClick={() => setActiveTab('parents')}
          className={activeTab === 'parents' ? 'btn' : 'btn-secondary'}
        >
          Parents
        </button>
        <button
          onClick={() => setActiveTab('families')}
          className={activeTab === 'families' ? 'btn' : 'btn-secondary'}
        >
          Family Accounts
        </button>
      </div>

      {/* FAMILIES TAB */}
      {activeTab === 'families' && (
        <>
          <div className="card">
            <div className="report-card-header">
              <div>
                <h2 className="report-card-title">Family Accounts</h2>
                <p className="report-card-subtitle">Households combining parents, children, and parent logins</p>
              </div>
              {!familiesLoading && (() => {
                const counts = getFamilyCounts();
                return (
                  <div className="report-card-actions">
                    <span className="badge open" style={{ marginRight: '0.5rem' }}>
                      {counts.totalFamilies} {counts.totalFamilies === 1 ? 'Family' : 'Families'}
                    </span>
                    {counts.totalEnrolled > 0 && (
                      <span className="badge badge-approved" style={{ marginRight: '0.5rem' }}>
                        {counts.totalEnrolled} Enrolled
                      </span>
                    )}
                    {counts.totalWaitlist > 0 && (
                      <span className="badge badge-pending">
                        {counts.totalWaitlist} Waitlist
                      </span>
                    )}
                    <button
                      onClick={() => {
                        setShowForm(true);
                        resetForm();
                      }}
                    >
                      Add New Family
                    </button>
                  </div>
                );
              })()}
            </div>

            {!familiesLoading && families.length > 0 && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr',
                gap: '1rem',
                marginBottom: '1.5rem',
                padding: '1rem',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Search Families</label>
                  <input
                    type="text"
                    placeholder="Search by parent name, email, or child name..."
                    value={familyFilters.search}
                    onChange={(e) => setFamilyFilters({ ...familyFilters, search: e.target.value })}
                    style={{ fontSize: '0.9rem' }}
                  />
                </div>
              </div>
            )}

            {familiesLoading ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: '#666' }}>
                Loading families...
              </div>
            ) : familiesError ? (
              <div
                className="alert alert-error"
                style={{
                  marginBottom: '1rem',
                  padding: '1rem',
                  backgroundColor: '#f8d7da',
                  color: '#721c24',
                  border: '1px solid #f5c6cb',
                  borderRadius: '4px',
                }}
              >
                <strong>Error:</strong> {familiesError}
                <button
                  onClick={loadFamilies}
                  style={{
                    marginLeft: '1rem',
                    padding: '0.5rem 1rem',
                    fontSize: '0.875rem'
                  }}
                >
                  Retry
                </button>
              </div>
            ) : families.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                <p>No families yet. Use "Add New Family" above to create a family with parents and a child.</p>
              </div>
            ) : getFilteredFamilies().length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                <p>No families match your search.</p>
                <button
                  onClick={() => setFamilyFilters({ search: '' })}
                  className="secondary"
                  style={{ marginTop: '1rem' }}
                >
                  Clear Search
                </button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Family</th>
                      <th>Primary Contact</th>
                      <th>Children</th>
                      <th>Parents</th>
                      <th>Monthly Rate</th>
                      <th>Login Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredFamilies().map((family) => {
                      const primaryParent = family.primary_parent || (family.parents && family.parents[0]);
                      const enrolledChildren = family.children.filter(c => {
                        const status = c.status?.toUpperCase();
                        return status === 'ACTIVE' || status === 'ENROLLED';
                      });
                      const waitlistChildren = family.children.filter(c => c.status?.toUpperCase() === 'WAITLIST');

                      return (
                        <tr key={family.family_id}>
                          <td>
                            <div>
                              {primaryParent ? (
                                `${primaryParent.parent_last_name} Family`
                              ) : family.children && family.children.length > 0 ? (
                                `${family.children[0].last_name} (Child-only record)`
                              ) : (
                                'Unlinked Family'
                              )}
                            </div>
                          </td>
                          <td>
                            {primaryParent ? (
                              <div>
                                <div>
                                  {primaryParent.parent_first_name} {primaryParent.parent_last_name}
                                </div>
                                <div style={{ fontSize: '0.85rem', color: '#666' }}>
                                  {primaryParent.parent_email || '—'}
                                </div>
                                <div style={{ fontSize: '0.85rem', color: '#666' }}>
                                  {primaryParent.parent_phone || '—'}
                                </div>
                              </div>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                              {family.children.map((child) => (
                                <span
                                  key={child.id}
                                  className={`badge ${child.status?.toUpperCase() === 'WAITLIST' ? 'badge-pending' : 'badge-approved'}`}
                                  style={{
                                    fontSize: '0.95rem',
                                    fontWeight: 'normal',
                                    padding: '0.25rem 0.6rem',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  {child.first_name} {child.last_name}
                                  {child.status?.toUpperCase() === 'WAITLIST' && ' (Waitlist)'}
                                </span>
                              ))}
                            </div>
                            <div style={{ marginTop: '0.25rem', fontSize: '0.85rem', color: '#666' }}>
                              {enrolledChildren.length > 0 && `${enrolledChildren.length} enrolled`}
                              {enrolledChildren.length > 0 && waitlistChildren.length > 0 && ', '}
                              {waitlistChildren.length > 0 && `${waitlistChildren.length} waitlist`}
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                              {family.parents && family.parents.map((parent, idx) => (
                                <span
                                  key={idx}
                                  className="badge"
                                  style={{
                                    fontSize: '0.95rem',
                                    fontWeight: 'normal',
                                    padding: '0.25rem 0.6rem',
                                    backgroundColor: '#fff',
                                    border: '1px solid #dee2e6',
                                    borderRadius: '3px',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  {parent.parent_first_name} {parent.parent_last_name}
                                  {parent.is_primary_contact && ' (Primary)'}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td>
                            {family.total_monthly_rate > 0 ? (
                              <span className="badge badge-approved" style={{
                                fontSize: '0.95rem',
                                fontWeight: 'normal',
                                padding: '0.25rem 0.6rem'
                              }}>
                                ${family.total_monthly_rate.toFixed(2)}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td>
                            <span className={`badge ${family.all_accounts_active ? 'badge-approved' : 'badge-draft'}`} style={{
                              fontSize: '0.95rem',
                              fontWeight: 'normal',
                              padding: '0.25rem 0.6rem'
                            }}>
                              {family.all_accounts_active ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                          <td>
                            <div className="flex" style={{ gap: '0.5rem' }}>
                              <button
                                onClick={() => handleOpenEditFamily(family)}
                                style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}
                              >
                                Edit
                              </button>
                              <button
                                className={family.all_accounts_active ? 'danger' : 'success'}
                                onClick={() => handleToggleStatus(family.family_id, family.all_accounts_active)}
                                style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}
                              >
                                {family.all_accounts_active ? 'Disable' : 'Enable'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {generatedPasswords.length > 0 && (
            <div className="alert alert-success" style={{
              marginTop: '1rem',
              padding: '1rem',
              backgroundColor: '#d4edda',
              border: '1px solid #c3e6cb',
              borderRadius: '4px'
            }}>
              <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Family Created Successfully</h3>
              <p style={{ margin: '0 0 1rem 0', color: '#155724' }}>
                Parent login accounts have been created. Please provide these credentials to the parents securely.
              </p>
              {generatedPasswords.map((pwd, idx) => (
                <div key={idx} style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#fff', borderRadius: '4px' }}>
                  <p style={{ margin: '0.25rem 0' }}>
                    <strong>Login Email:</strong> {pwd.email}
                  </p>
                  <p style={{ margin: '0.25rem 0' }}>
                    <strong>Default Password:</strong>{' '}
                    <code style={{
                      backgroundColor: '#f8f9fa',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '3px',
                      border: '1px solid #dee2e6'
                    }}>
                      {pwd.password}
                    </code>
                  </p>
                </div>
              ))}
              <p style={{ margin: '0.5rem 0 1rem 0', fontSize: '0.875rem', color: '#155724' }}>
                Parents can change their password after first login.
              </p>
              <button onClick={() => setGeneratedPasswords([])} className="btn-sm secondary">
                Dismiss
              </button>
            </div>
          )}

      {showForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '8px',
            padding: '2rem',
            maxWidth: '900px',
            width: '95%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>Add New Family</h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                style={{
                  fontSize: '1.5rem',
                  padding: '0.25rem 0.75rem',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Ã—
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <h3 style={{
                marginTop: '1rem',
                marginBottom: '1rem',
                borderBottom: '2px solid #333',
                paddingBottom: '0.5rem'
              }}>
                Parent 1 (Required)
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>First Name *</label>
                  <input
                    type="text"
                    value={formData.parent1FirstName}
                    onChange={(e) => setFormData({ ...formData, parent1FirstName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Last Name *</label>
                  <input
                    type="text"
                    value={formData.parent1LastName}
                    onChange={(e) => setFormData({ ...formData, parent1LastName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email (Login Username) *</label>
                  <input
                    type="email"
                    value={formData.parent1Email}
                    onChange={(e) => setFormData({ ...formData, parent1Email: e.target.value })}
                    required
                  />
                  <small style={{ color: '#666', fontSize: '0.85rem' }}>
                    This will be used as the parent's login username
                  </small>
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={formData.parent1Phone}
                    onChange={(e) => setFormData({ ...formData, parent1Phone: e.target.value })}
                  />
                </div>
              </div>

              <h3 style={{
                marginTop: '1.5rem',
                marginBottom: '1rem',
                borderBottom: '2px solid #333',
                paddingBottom: '0.5rem'
              }}>
                Parent 2 (Optional)
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>First Name</label>
                  <input
                    type="text"
                    value={formData.parent2FirstName}
                    onChange={(e) => setFormData({ ...formData, parent2FirstName: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input
                    type="text"
                    value={formData.parent2LastName}
                    onChange={(e) => setFormData({ ...formData, parent2LastName: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Email (Login Username)</label>
                  <input
                    type="email"
                    value={formData.parent2Email}
                    onChange={(e) => setFormData({ ...formData, parent2Email: e.target.value })}
                  />
                  <small style={{ color: '#666', fontSize: '0.85rem' }}>
                    This will be used as the second parent's login username
                  </small>
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={formData.parent2Phone}
                    onChange={(e) => setFormData({ ...formData, parent2Phone: e.target.value })}
                  />
                </div>
              </div>

              <h3 style={{
                marginTop: '1.5rem',
                marginBottom: '1rem',
                borderBottom: '2px solid #333',
                paddingBottom: '0.5rem'
              }}>
                Child Information
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label>First Name *</label>
                  <input
                    type="text"
                    value={formData.childFirstName}
                    onChange={(e) => setFormData({ ...formData, childFirstName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Last Name *</label>
                  <input
                    type="text"
                    value={formData.childLastName}
                    onChange={(e) => setFormData({ ...formData, childLastName: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Date of Birth (for password generation) *</label>
                  <input
                    type="date"
                    value={formData.childDob}
                    onChange={(e) => setFormData({ ...formData, childDob: e.target.value })}
                    required
                  />
                  <small style={{ color: '#666', fontSize: '0.85rem' }}>
                    Default password will be MMYYYY format (e.g., 082025)
                  </small>
                </div>
                <div className="form-group">
                  <label>Enrollment Status *</label>
                  <select
                    value={formData.childStatus}
                    onChange={(e) => setFormData({ ...formData, childStatus: e.target.value })}
                    required
                    style={{ padding: '0.5rem', fontSize: '1rem' }}
                  >
                    <option value="ACTIVE">Active - Enrolled</option>
                    <option value="WAITLIST">Waitlist - Pending Enrollment</option>
                  </select>
                  <small style={{ color: '#666', fontSize: '0.85rem' }}>
                    {formData.childStatus === 'WAITLIST' ? 'Child will be added to waitlist with automatic priority' : 'Child will be enrolled immediately'}
                  </small>
                </div>
                <div className="form-group">
                  <label>Monthly Rate</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.childMonthlyRate}
                    onChange={(e) => setFormData({ ...formData, childMonthlyRate: e.target.value })}
                    onWheel={(e) => e.target.blur()}
                  />
                  <small style={{ color: '#666', fontSize: '0.85rem' }}>
                    Monthly tuition amount for this child
                  </small>
                </div>
              </div>

              <div className="form-group">
                <label>Allergies</label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '0.75rem',
                  padding: '1rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: '#f9f9f9'
                }}>
                  {COMMON_ALLERGIES.map(allergy => (
                    <label key={allergy} style={{
                      display: 'flex',
                      alignItems: 'center',
                      cursor: 'pointer',
                      minHeight: '24px'
                    }}>
                      <input
                        type="checkbox"
                        checked={(formData.allergies.common || []).includes(allergy)}
                        onChange={() => handleAllergyToggle(allergy)}
                        style={{
                          marginRight: '0.5rem',
                          flexShrink: 0,
                          width: '16px',
                          height: '16px'
                        }}
                      />
                      <span style={{ fontSize: '0.9rem', lineHeight: '1.2' }}>{allergy}</span>
                    </label>
                  ))}
                </div>
                <div style={{ marginTop: '0.75rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'normal' }}>
                    Other Allergies
                  </label>
                  <input
                    type="text"
                    value={formData.allergies.other || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      allergies: { ...formData.allergies, other: e.target.value }
                    })}
                    placeholder="Any other allergies not listed above..."
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Medical Notes</label>
                <textarea
                  value={formData.medical_notes}
                  onChange={(e) => setFormData({ ...formData, medical_notes: e.target.value })}
                  rows="2"
                  placeholder="Medical conditions, medications, etc..."
                />
              </div>

              <div style={{ backgroundColor: '#f8f9fa', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: '600', margin: 0 }}>Emergency Contacts</label>
                    <button
                      type="button"
                      onClick={handleAddFormEmergencyContact}
                      style={{
                        fontSize: '0.75rem',
                        padding: '0.25rem 0.75rem',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      + Add Contact
                    </button>
                  </div>

                  {formEmergencyContacts.length === 0 ? (
                    <div style={{
                      padding: '1rem',
                      backgroundColor: '#fff',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '0.875rem',
                      color: '#999',
                      textAlign: 'center'
                    }}>
                      No emergency contacts added. Click "Add Contact" to add one.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {formEmergencyContacts.map((contact, index) => (
                        <div key={contact.id || index} style={{
                          padding: '0.75rem',
                          backgroundColor: '#fff',
                          border: '1px solid #ddd',
                          borderRadius: '4px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <label style={{
                              fontSize: '0.875rem',
                              color: '#333',
                              margin: 0,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              cursor: 'pointer',
                              fontWeight: contact.is_primary ? '600' : '400'
                            }}>
                              <input
                                type="checkbox"
                                checked={contact.is_primary}
                                onChange={(e) => handleUpdateFormEmergencyContact(index, 'is_primary', e.target.checked)}
                                style={{ cursor: 'pointer' }}
                              />
                              Primary Contact
                            </label>
                            <button
                              type="button"
                              onClick={() => handleDeleteFormEmergencyContact(index)}
                              style={{
                                fontSize: '0.75rem',
                                padding: '0.25rem 0.5rem',
                                backgroundColor: '#dc3545',
                                color: 'white',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: 'pointer'
                              }}
                            >
                              Remove
                            </button>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr', gap: '0.5rem' }}>
                            <input
                              type="text"
                              value={contact.name}
                              onChange={(e) => handleUpdateFormEmergencyContact(index, 'name', e.target.value)}
                              placeholder="Name *"
                              style={{ fontSize: '0.875rem' }}
                            />
                            <input
                              type="tel"
                              value={contact.phone}
                              onChange={(e) => handleUpdateFormEmergencyContact(index, 'phone', e.target.value)}
                              placeholder="Phone"
                              style={{ fontSize: '0.875rem' }}
                            />
                            <input
                              type="text"
                              value={contact.relationship}
                              onChange={(e) => handleUpdateFormEmergencyContact(index, 'relationship', e.target.value)}
                              placeholder="Relationship"
                              style={{ fontSize: '0.875rem' }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Additional Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows="3"
                  placeholder="Any additional information about the family..."
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="submit">Create Family</button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
      </div>
    </div>
  )}

      {/* Delete Family Confirmation Modal */}
      {showDeleteModal && deletingFamily && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '8px',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%'
          }}>
            <h2 style={{ marginTop: 0, marginBottom: '1rem' }}>Delete Family</h2>
            <p style={{ marginBottom: '1.5rem', color: '#666' }}>
              Choose how to delete this family. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <button
                onClick={() => handleDeleteFamily(deletingFamily.family_id, false)}
                className="btn-sm secondary"
                style={{ width: '100%', padding: '0.75rem', textAlign: 'left' }}
              >
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Delete children only</div>
                <div style={{ fontSize: '0.85rem', color: '#666' }}>Keep parent accounts and login access</div>
              </button>
              <button
                onClick={() => handleDeleteFamily(deletingFamily.family_id, true)}
                className="btn-sm danger"
                style={{ width: '100%', padding: '0.75rem', textAlign: 'left' }}
              >
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Delete children and parent accounts</div>
                <div style={{ fontSize: '0.85rem', color: '#fff', opacity: 0.9 }}>Permanently remove all data and login access</div>
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingFamily(null);
                }}
                className="btn-sm secondary"
                style={{ width: '100%', marginTop: '0.5rem' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Family Modal */}
      {showFamilyDetails && selectedFamily && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '8px',
            padding: '2rem',
            maxWidth: '900px',
            width: '95%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>
                Edit {editForm.childLastName ? `${editForm.childLastName} Family` : 'Family'}
              </h2>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => {
                    setDeletingFamily(selectedFamily);
                    setShowDeleteModal(true);
                    setShowFamilyDetails(false);
                  }}
                  className="danger"
                  style={{
                    fontSize: '0.875rem',
                    padding: '0.5rem 0.75rem'
                  }}
                >
                  Delete Family
                </button>
                <button
                  onClick={() => {
                    setShowFamilyDetails(false);
                    setSelectedFamily(null);
                  }}
                  style={{
                    fontSize: '1.5rem',
                    padding: 0,
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    lineHeight: 1
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            <form onSubmit={handleEditSubmit}>
              <h3 style={{
                marginTop: '1rem',
                marginBottom: '1rem',
                borderBottom: '2px solid #333',
                paddingBottom: '0.5rem'
              }}>
                Parent 1
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>First Name *</label>
                  <input
                    type="text"
                    value={editForm.parent1FirstName}
                    onChange={(e) => setEditForm({ ...editForm, parent1FirstName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Last Name *</label>
                  <input
                    type="text"
                    value={editForm.parent1LastName}
                    onChange={(e) => setEditForm({ ...editForm, parent1LastName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email (Login Username) *</label>
                  <input
                    type="email"
                    value={editForm.parent1Email}
                    onChange={(e) => setEditForm({ ...editForm, parent1Email: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={editForm.parent1Phone}
                    onChange={(e) => setEditForm({ ...editForm, parent1Phone: e.target.value })}
                  />
                </div>
              </div>

              <h3 style={{
                marginTop: '1.5rem',
                marginBottom: '1rem',
                borderBottom: '2px solid #333',
                paddingBottom: '0.5rem'
              }}>
                Parent 2 (Optional)
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>First Name</label>
                  <input
                    type="text"
                    value={editForm.parent2FirstName}
                    onChange={(e) => setEditForm({ ...editForm, parent2FirstName: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input
                    type="text"
                    value={editForm.parent2LastName}
                    onChange={(e) => setEditForm({ ...editForm, parent2LastName: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Email (Login Username)</label>
                  <input
                    type="email"
                    value={editForm.parent2Email}
                    onChange={(e) => setEditForm({ ...editForm, parent2Email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={editForm.parent2Phone}
                    onChange={(e) => setEditForm({ ...editForm, parent2Phone: e.target.value })}
                  />
                </div>
              </div>

              <h3 style={{
                marginTop: '1.5rem',
                marginBottom: '1rem',
                borderBottom: '2px solid #333',
                paddingBottom: '0.5rem'
              }}>
                Child Information
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label>First Name *</label>
                  <input
                    type="text"
                    value={editForm.childFirstName}
                    onChange={(e) => setEditForm({ ...editForm, childFirstName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Last Name *</label>
                  <input
                    type="text"
                    value={editForm.childLastName}
                    onChange={(e) => setEditForm({ ...editForm, childLastName: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Date of Birth *</label>
                  <input
                    type="date"
                    value={editForm.childDob}
                    onChange={(e) => setEditForm({ ...editForm, childDob: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Enrollment Status *</label>
                  <select
                    value={editForm.childStatus}
                    onChange={(e) => setEditForm({ ...editForm, childStatus: e.target.value })}
                    required
                    style={{ padding: '0.5rem', fontSize: '1rem' }}
                  >
                    <option value="ACTIVE">Active - Enrolled</option>
                    <option value="ENROLLED">Enrolled</option>
                    <option value="WAITLIST">Waitlist - Pending Enrollment</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Monthly Rate</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={editForm.childMonthlyRate}
                    onChange={(e) => setEditForm({ ...editForm, childMonthlyRate: e.target.value })}
                    onWheel={(e) => e.target.blur()}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Allergies</label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '0.75rem',
                  padding: '1rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: '#f9f9f9'
                }}>
                  {COMMON_ALLERGIES.map(allergy => (
                    <label key={allergy} style={{
                      display: 'flex',
                      alignItems: 'center',
                      cursor: 'pointer',
                      minHeight: '24px'
                    }}>
                      <input
                        type="checkbox"
                        checked={(editForm.allergies.common || []).includes(allergy)}
                        onChange={() => handleEditAllergyToggle(allergy)}
                        style={{
                          marginRight: '0.5rem',
                          flexShrink: 0,
                          width: '16px',
                          height: '16px'
                        }}
                      />
                      <span style={{ fontSize: '0.9rem', lineHeight: '1.2' }}>{allergy}</span>
                    </label>
                  ))}
                </div>
                <div style={{ marginTop: '0.75rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'normal' }}>
                    Other Allergies
                  </label>
                  <input
                    type="text"
                    value={editForm.allergies.other || ''}
                    onChange={(e) => setEditForm({
                      ...editForm,
                      allergies: { ...editForm.allergies, other: e.target.value }
                    })}
                    placeholder="Any other allergies not listed above..."
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Medical Notes</label>
                <textarea
                  value={editForm.medical_notes}
                  onChange={(e) => setEditForm({ ...editForm, medical_notes: e.target.value })}
                  rows="2"
                  placeholder="Medical conditions, medications, etc..."
                />
              </div>

              <div className="form-group">
                <label>Additional Notes</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows="3"
                  placeholder="Any additional information about the family..."
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="submit">Save Changes</button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setShowFamilyDetails(false);
                    setSelectedFamily(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </>
      )}

      {/* CHILDREN TAB */}
      {activeTab === 'children' && (
        <>
  <div className="card">
    <div className="report-card-header">
      <div>
        <h2 className="report-card-title">Child Directory</h2>
        <p className="report-card-subtitle">
          Complete roster with allergies, medical notes, and emergency contacts
          {!childDirectoryLoading && childDirectory.length > 0 && (() => {
            const counts = getChildCounts();
            return (
              <span style={{ color: '#666', fontSize: '0.9rem', marginLeft: '0.5rem' }}>
                — Showing {getFilteredChildren().length} of {counts.total}
              </span>
            );
          })()}
        </p>
      </div>
      {!childDirectoryLoading && childDirectory.length > 0 && (() => {
        const counts = getChildCounts();
        return (
          <div className="report-card-actions">
            <span className="badge badge-approved" style={{ marginRight: '0.5rem' }}>
              Enrolled: {counts.enrolled}
            </span>
            {counts.waitlist > 0 && (
              <span className="badge badge-pending">
                Waitlist: {counts.waitlist}
              </span>
            )}
          </div>
        );
      })()}
    </div>

    {!childDirectoryLoading && childDirectory.length > 0 && (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem',
        padding: '1rem',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #e5e7eb'
      }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Search</label>
          <input
            type="text"
            placeholder="Name, allergies, contact..."
            value={directoryFilters.search}
            onChange={(e) => setDirectoryFilters({ ...directoryFilters, search: e.target.value })}
            style={{ fontSize: '0.9rem' }}
          />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Status</label>
          <select
            value={directoryFilters.status}
            onChange={(e) => setDirectoryFilters({ ...directoryFilters, status: e.target.value })}
            style={{ fontSize: '0.9rem' }}
          >
            <option value="all">All Children</option>
            <option value="enrolled">Enrolled (Active)</option>
            <option value="waitlist">Waitlist</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Allergies</label>
          <select
            value={directoryFilters.hasAllergies}
            onChange={(e) => setDirectoryFilters({ ...directoryFilters, hasAllergies: e.target.value })}
            style={{ fontSize: '0.9rem' }}
          >
            <option value="all">All Children</option>
            <option value="yes">Has Allergies</option>
            <option value="no">No Allergies</option>
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Sort by</label>
          <select
            value={childSort}
            onChange={(e) => setChildSort(e.target.value)}
            style={{ fontSize: '0.9rem' }}
          >
            <option value="alpha">Alphabetical</option>
            <option value="age">Age</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button
            onClick={() => {
              setDirectoryFilters({ status: 'all', hasAllergies: 'all', search: '' });
              setChildSort('alpha');
            }}
            className="secondary"
            style={{ fontSize: '0.875rem', padding: '0.75rem 1rem', width: '100%' }}
          >
            Clear Filters
          </button>
        </div>
      </div>
    )}

    {childDirectoryLoading ? (
      <div style={{ padding: '1.5rem', textAlign: 'center', color: '#666' }}>
        Loading child list...
      </div>
    ) : childDirectoryError ? (
      <div
        className="alert alert-error"
        style={{
          marginBottom: '1rem',
          padding: '1rem',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
        }}
      >
        {childDirectoryError}
      </div>
    ) : childDirectory.length === 0 ? (
      <p style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>
        No children found. Once families are added, their children will appear here.
      </p>
    ) : getFilteredChildren().length === 0 ? (
      <p style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>
        No children match your current filters. Try adjusting the filters above.
      </p>
    ) : (
      <>
        <div className="child-table-wrapper">
          <table>
            <thead>
              <tr>
                <th style={{ minWidth: '180px' }}>Name</th>
                <th style={{ minWidth: '80px' }}>Age</th>
                <th style={{ minWidth: '180px' }}>Allergies</th>
                <th style={{ minWidth: '220px' }}>Emergency Contact</th>
                <th style={{ minWidth: '220px' }}>Authorized Pickup</th>
                <th style={{ minWidth: '120px' }}>Status</th>
                <th style={{ minWidth: '100px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {getFilteredChildren().map((child) => {
                const allergiesText = formatAllergies(child.allergies);
                const hasAllergies =
                  allergiesText && allergiesText.toLowerCase() !== 'none';
                const emergencyContact = formatEmergencyContact(child);
                const authorizedPickup = formatAuthorizedPickup(
                  child.authorizedPickup || child.authorized_pickup
                );
                const statusLabel = formatStatusLabel(child.status);
                const statusClass = getStatusBadgeClass(child.status);
                const isExpanded = expandedChildRows[child.id];
                const hasNotes = child.medical_notes || child.notes;

                return (
                  <React.Fragment key={child.id}>
                    <tr
                      onClick={() => hasNotes && toggleChildRow(child.id)}
                      style={{
                        cursor: hasNotes ? 'pointer' : 'default',
                        backgroundColor: isExpanded ? '#f8f9fa' : 'transparent'
                      }}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {hasNotes && (
                            <span style={{ fontSize: '0.75rem', color: '#666' }}>
                              {isExpanded ? '▼' : '▶'}
                            </span>
                          )}
                          <span>{getChildFullName(child)}</span>
                        </div>
                      </td>
                      <td>{getChildAgeDisplay(child)}</td>
                      <td>
                        <div className="child-allergy-cell">
                          {hasAllergies && (
                            <span
                              className="allergy-indicator"
                              aria-label="Allergies on file"
                            />
                          )}
                          <span>{hasAllergies ? allergiesText : 'None'}</span>
                        </div>
                      </td>
                      <td>{emergencyContact}</td>
                      <td>{authorizedPickup}</td>
                      <td>
                        <span className={`badge ${statusClass}`}>
                          {statusLabel}
                          {child.status === 'WAITLIST' && child.waitlist_priority && (
                            <span style={{ marginLeft: '0.25rem', fontWeight: 'bold' }}>
                              ({formatWaitlistPosition(child.waitlist_priority)})
                            </span>
                          )}
                        </span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="flex" style={{ gap: '0.5rem' }}>
                          <button
                            onClick={() => handleEditChild(child, true)}
                            style={{
                              padding: '0.75rem 1rem',
                              fontSize: '0.875rem'
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleViewFiles(child)}
                            className="secondary"
                            style={{
                              padding: '0.75rem 1rem',
                              fontSize: '0.875rem'
                            }}
                          >
                            Files
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && hasNotes && (
                      <tr style={{ backgroundColor: '#f8f9fa' }}>
                        <td colSpan="7" style={{ padding: '1rem' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            {child.medical_notes && (
                              <div>
                                <div style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', color: '#495057' }}>
                                  Medical Notes
                                </div>
                                <div style={{ fontSize: '0.875rem', color: '#666', backgroundColor: '#fff', padding: '0.75rem', borderRadius: '4px', border: '1px solid #dee2e6' }}>
                                  {child.medical_notes}
                                </div>
                              </div>
                            )}
                            {child.notes && (
                              <div>
                                <div style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', color: '#495057' }}>
                                  Additional Notes
                                </div>
                                <div style={{ fontSize: '0.875rem', color: '#666', backgroundColor: '#fff', padding: '0.75rem', borderRadius: '4px', border: '1px solid #dee2e6' }}>
                                  {child.notes}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="child-card-list">
          {getFilteredChildren().map((child) => {
            const allergiesText = formatAllergies(child.allergies);
            const hasAllergies =
              allergiesText && allergiesText.toLowerCase() !== 'none';
            const emergencyContact = formatEmergencyContact(child);
            const authorizedPickup = formatAuthorizedPickup(
              child.authorizedPickup || child.authorized_pickup
            );
            const statusLabel = formatStatusLabel(child.status);
            const statusClass = getStatusBadgeClass(child.status);
            const isExpanded = expandedChildRows[child.id];
            const hasNotes = child.medical_notes || child.notes;

            return (
              <div className="child-card" key={`${child.id}-card`}>
                <div
                  className="child-card-line child-card-line-top"
                  onClick={() => hasNotes && toggleChildRow(child.id)}
                  style={{ cursor: hasNotes ? 'pointer' : 'default' }}
                >
                  <div>
                    <div className="child-card-name">
                      {hasNotes && (
                        <span style={{ fontSize: '0.75rem', color: '#666', marginRight: '0.5rem' }}>
                          {isExpanded ? '▼' : '▶'}
                        </span>
                      )}
                      {getChildFullName(child)}
                    </div>
                    <div className="child-card-meta">Age {getChildAgeDisplay(child)}</div>
                  </div>
                  <span className={`badge ${statusClass}`}>{statusLabel}</span>
                </div>
                <div className="child-card-line">
                  <span className="child-card-label">Allergies</span>
                  <div className={`child-card-value ${hasAllergies ? 'warning' : ''}`}>
                    {hasAllergies && (
                      <span
                        className="allergy-indicator"
                        aria-label="Allergies on file"
                      />
                    )}
                    {hasAllergies ? allergiesText : 'None'}
                  </div>
                </div>
                <div className="child-card-line">
                  <span className="child-card-label">Emergency Contact</span>
                  <div className="child-card-value">{emergencyContact}</div>
                </div>
                <div className="child-card-line">
                  <span className="child-card-label">Authorized Pickup</span>
                  <div className="child-card-value">{authorizedPickup}</div>
                </div>
                {isExpanded && hasNotes && (
                  <>
                    {child.medical_notes && (
                      <div className="child-card-line" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <span className="child-card-label">Medical Notes</span>
                        <div className="child-card-value" style={{ backgroundColor: '#fff', padding: '0.75rem', borderRadius: '4px', border: '1px solid #dee2e6', width: '100%' }}>
                          {child.medical_notes}
                        </div>
                      </div>
                    )}
                    {child.notes && (
                      <div className="child-card-line" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <span className="child-card-label">Additional Notes</span>
                        <div className="child-card-value" style={{ backgroundColor: '#fff', padding: '0.75rem', borderRadius: '4px', border: '1px solid #dee2e6', width: '100%' }}>
                          {child.notes}
                        </div>
                      </div>
                    )}
                  </>
                )}
                <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleEditChild(child, true)}
                    style={{
                      fontSize: '0.875rem',
                      padding: '0.5rem 0.75rem',
                      backgroundColor: '#007bff',
                      color: 'white',
                      flex: 1,
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleViewFiles(child)}
                    style={{
                      fontSize: '0.875rem',
                      padding: '0.5rem 0.75rem',
                      backgroundColor: '#6c757d',
                      color: 'white',
                      flex: 1,
                    }}
                  >
                    Files
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </>
    )}
  </div>

      {/* File Management Modal */}
      {showFilesModal && selectedChild && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '8px',
            padding: '2rem',
            maxWidth: '800px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>
                Files for {selectedChild.first_name} {selectedChild.last_name}
              </h2>
              <button
                onClick={() => {
                  setShowFilesModal(false);
                  setSelectedChild(null);
                  setShowUploadForm(false);
                  setSelectedFile(null);
                }}
                style={{
                  fontSize: '1.5rem',
                  padding: '0.25rem 0.75rem',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Ã—
              </button>
            </div>

            <button
              onClick={() => setShowUploadForm(!showUploadForm)}
              style={{ marginBottom: '1rem' }}
            >
              {showUploadForm ? 'Cancel Upload' : 'Upload New File'}
            </button>

            {showUploadForm && (
              <form onSubmit={handleFileUpload} style={{
                backgroundColor: '#f8f9fa',
                padding: '1.5rem',
                borderRadius: '4px',
                marginBottom: '1.5rem'
              }}>
                <div className="form-group">
                  <label>File *</label>
                  <input
                    type="file"
                    onChange={(e) => setSelectedFile(e.target.files[0])}
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    required
                  />
                  <small style={{ color: '#666', fontSize: '0.85rem' }}>
                    Max 20MB. Accepted formats: PDF, JPG, PNG, DOCX
                  </small>
                </div>

                <div className="form-group">
                  <label>Category *</label>
                  <select
                    value={uploadForm.category}
                    onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
                    required
                  >
                    <option value="MEDICAL">Medical</option>
                    <option value="ENROLLMENT">Enrollment</option>
                    <option value="EMERGENCY">Emergency</option>
                    <option value="PHOTO_CONSENT">Photo Consent</option>
                    <option value="INSURANCE">Insurance</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                    rows="3"
                    placeholder="Add a description for this file..."
                  />
                </div>

                <div className="form-group">
                  <label>Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={uploadForm.tags}
                    onChange={(e) => setUploadForm({ ...uploadForm, tags: e.target.value })}
                    placeholder="e.g., vaccination, consent, emergency"
                  />
                </div>

                <button type="submit">Upload File</button>
              </form>
            )}

            <div>
              <h3 style={{ marginBottom: '1rem' }}>Uploaded Files ({childDocuments.length})</h3>
              {childDocuments.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>
                  No files uploaded yet
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {childDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      style={{
                        padding: '1rem',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '4px',
                        border: '1px solid #dee2e6'
                      }}
                    >
                      <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                        <div>
                          <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>
                            {doc.file_name}
                          </div>
                          <div style={{ fontSize: '0.875rem', color: '#666' }}>
                            Category: {doc.category}
                            {doc.tags && (
                              <span> â€¢ Tags: {Array.isArray(doc.tags) ? doc.tags.join(', ') : doc.tags}</span>
                            )}
                          </div>
                          {doc.description && (
                            <div style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.25rem' }}>
                              {doc.description}
                            </div>
                          )}
                          <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.25rem' }}>
                            Uploaded: {formatDate(doc.uploaded_at)}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleDownloadFile(doc.id, doc.file_name)}
                            style={{
                              fontSize: '0.875rem',
                              padding: '0.5rem 1rem',
                              backgroundColor: '#28a745',
                              color: 'white'
                            }}
                          >
                            Download
                          </button>
                          <button
                            onClick={() => handleDeleteFile(doc.id)}
                            className="danger"
                            style={{
                              fontSize: '0.875rem',
                              padding: '0.5rem 1rem'
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Child Directory Edit Modal */}
      {showDirectoryEditModal && directoryEditingChild && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '8px',
            padding: '2rem',
            maxWidth: '700px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div className="flex-between" style={{ marginBottom: '1rem' }}>
              <h2 style={{ margin: 0 }}>
                Edit {directoryEditingChild.first_name || directoryEditingChild.firstName} {directoryEditingChild.last_name || directoryEditingChild.lastName}
              </h2>
              <button
                onClick={handleCancelDirectoryEdit}
                style={{
                  fontSize: '1.5rem',
                  padding: '0.25rem 0.75rem',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                ×
              </button>
            </div>

            <h3 style={{
              marginTop: '1rem',
              marginBottom: '1rem',
              borderBottom: '2px solid #333',
              paddingBottom: '0.5rem'
            }}>
              Emergency Contacts
            </h3>

            <div style={{ backgroundColor: '#f8f9fa', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={handleAddEmergencyContact}
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.25rem 0.75rem',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    + Add Contact
                  </button>
                </div>

                {emergencyContacts.length === 0 ? (
                  <div style={{
                    padding: '1rem',
                    backgroundColor: '#fff',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '0.875rem',
                    color: '#999',
                    textAlign: 'center'
                  }}>
                    No emergency contacts added. Click "Add Contact" to add one.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {emergencyContacts.map((contact, index) => (
                      <div key={contact.id || index} style={{
                        padding: '0.75rem',
                        backgroundColor: '#fff',
                        border: '1px solid #ddd',
                        borderRadius: '4px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <label style={{
                            fontSize: '0.875rem',
                            color: '#333',
                            margin: 0,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            cursor: 'pointer',
                            fontWeight: contact.is_primary ? '600' : '400'
                          }}>
                            <input
                              type="checkbox"
                              checked={contact.is_primary}
                              onChange={(e) => handleUpdateEmergencyContact(index, 'is_primary', e.target.checked)}
                              style={{ cursor: 'pointer' }}
                            />
                            Primary Contact
                          </label>
                          <button
                            type="button"
                            onClick={() => handleDeleteEmergencyContact(index)}
                            style={{
                              fontSize: '0.75rem',
                              padding: '0.25rem 0.5rem',
                              backgroundColor: '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '3px',
                              cursor: 'pointer'
                            }}
                          >
                            Remove
                          </button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr', gap: '0.5rem' }}>
                          <input
                            type="text"
                            value={contact.name}
                            onChange={(e) => handleUpdateEmergencyContact(index, 'name', e.target.value)}
                            placeholder="Name *"
                            style={{ fontSize: '0.875rem' }}
                          />
                          <input
                            type="tel"
                            value={contact.phone}
                            onChange={(e) => handleUpdateEmergencyContact(index, 'phone', e.target.value)}
                            placeholder="Phone"
                            style={{ fontSize: '0.875rem' }}
                          />
                          <input
                            type="text"
                            value={contact.relationship}
                            onChange={(e) => handleUpdateEmergencyContact(index, 'relationship', e.target.value)}
                            placeholder="Relationship"
                            style={{ fontSize: '0.875rem' }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <h3 style={{
              marginTop: '1.5rem',
              marginBottom: '1rem',
              borderBottom: '2px solid #333',
              paddingBottom: '0.5rem'
            }}>
              Allergies
            </h3>

            <div style={{ backgroundColor: '#f8f9fa', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowAllergyEdit(!showAllergyEdit)}
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.25rem 0.75rem',
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    {showAllergyEdit ? 'Hide List' : 'Edit Allergies'}
                  </button>
                </div>

                {showAllergyEdit ? (
                  <>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '0.5rem',
                      padding: '0.75rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      backgroundColor: '#fff',
                      marginBottom: '0.5rem'
                    }}>
                      {COMMON_ALLERGIES.map(allergy => (
                        <label key={allergy} style={{
                          display: 'flex',
                          alignItems: 'center',
                          cursor: 'pointer',
                          minHeight: '20px',
                          fontSize: '0.8rem'
                        }}>
                          <input
                            type="checkbox"
                            checked={(childEditForm.allergies?.common || []).includes(allergy)}
                            onChange={() => handleChildAllergyToggle(allergy)}
                            style={{
                              marginRight: '0.4rem',
                              flexShrink: 0,
                              width: '14px',
                              height: '14px'
                            }}
                          />
                          <span>{allergy}</span>
                        </label>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={childEditForm.allergies?.other || ''}
                      onChange={(e) => setChildEditForm({
                        ...childEditForm,
                        allergies: { ...childEditForm.allergies, other: e.target.value }
                      })}
                      placeholder="Other allergies..."
                      style={{ fontSize: '0.875rem' }}
                    />
                  </>
                ) : (
                  <div style={{
                    padding: '0.5rem',
                    backgroundColor: '#fff',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '0.875rem',
                    color: '#666'
                  }}>
                    {formatAllergies(childEditForm.allergies) || 'None'}
                  </div>
                )}
              </div>
            </div>

            <h3 style={{
              marginTop: '1.5rem',
              marginBottom: '1rem',
              borderBottom: '2px solid #333',
              paddingBottom: '0.5rem'
            }}>
              Medical & Additional Notes
            </h3>

            <div style={{ backgroundColor: '#f8f9fa', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
              <div className="form-group">
                <label>Medical Notes</label>
                <textarea
                  value={childEditForm.medical_notes}
                  onChange={(e) => setChildEditForm({ ...childEditForm, medical_notes: e.target.value })}
                  rows="2"
                  placeholder="Medical conditions, medications, etc..."
                />
              </div>
              <div className="form-group">
                <label>Additional Notes</label>
                <textarea
                  value={childEditForm.notes}
                  onChange={(e) => setChildEditForm({ ...childEditForm, notes: e.target.value })}
                  rows="2"
                  placeholder="Any other important information"
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
              <button
                onClick={handleDeleteChildFamily}
                style={{
                  fontSize: '0.875rem',
                  padding: '0.5rem 1rem',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Delete Entire Family
              </button>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  onClick={handleSaveDirectoryChild}
                  style={{
                    fontSize: '0.875rem',
                    padding: '0.5rem 1rem',
                    backgroundColor: '#28a745',
                    color: 'white'
                  }}
                >
                  Save Changes
                </button>
                <button
                  onClick={handleCancelDirectoryEdit}
                  className="secondary"
                  style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {/* PARENTS TAB */}
      {activeTab === 'parents' && (
        <>
          <div className="card">
            <div className="report-card-header">
              <div>
                <h2 className="report-card-title">Parent Directory</h2>
                <p className="report-card-subtitle">
                  Complete contact information for all parents
                  {!parentDirectoryLoading && parentDirectory.length > 0 && (
                    <span style={{ color: '#666', fontSize: '0.9rem', marginLeft: '0.5rem' }}>
                      — Showing {getFilteredParents().length} of {parentDirectory.length}
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Filters */}
            {!parentDirectoryLoading && parentDirectory.length > 0 && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                marginBottom: '1.5rem',
                padding: '1rem',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Search</label>
                  <input
                    type="text"
                    placeholder="Name, email, phone..."
                    value={parentFilters.search}
                    onChange={(e) => setParentFilters({ ...parentFilters, search: e.target.value })}
                    style={{ fontSize: '0.9rem' }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Account Status</label>
                  <select
                    value={parentFilters.status}
                    onChange={(e) => setParentFilters({ ...parentFilters, status: e.target.value })}
                    style={{ fontSize: '0.9rem' }}
                  >
                    <option value="all">All Accounts</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Has Children</label>
                  <select
                    value={parentFilters.hasChildren}
                    onChange={(e) => setParentFilters({ ...parentFilters, hasChildren: e.target.value })}
                    style={{ fontSize: '0.9rem' }}
                  >
                    <option value="all">All Parents</option>
                    <option value="yes">Has Children</option>
                    <option value="no">No Children</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Billing Status</label>
                  <select
                    value={parentFilters.billingStatus}
                    onChange={(e) => setParentFilters({ ...parentFilters, billingStatus: e.target.value })}
                    style={{ fontSize: '0.9rem' }}
                  >
                    <option value="all">All Billing Statuses</option>
                    <option value="current">Current</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button
                    onClick={() => setParentFilters({ status: 'all', hasChildren: 'all', billingStatus: 'all', search: '' })}
                    className="secondary"
                    style={{ fontSize: '0.875rem', padding: '0.75rem 1rem', width: '100%' }}
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            )}

            {/* Loading/Error States */}
            {parentDirectoryLoading ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: '#666' }}>
                Loading parent directory...
              </div>
            ) : parentDirectoryError ? (
              <div className="alert alert-error" style={{
                marginBottom: '1rem',
                padding: '1rem',
                backgroundColor: '#f8d7da',
                color: '#721c24',
                border: '1px solid #f5c6cb',
                borderRadius: '4px',
              }}>
                {parentDirectoryError}
              </div>
            ) : parentDirectory.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>
                No parents found. Once families are added, parents will appear here.
              </p>
            ) : getFilteredParents().length === 0 ? (
              <p style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>
                No parents match your current filters. Try adjusting the filters above.
              </p>
            ) : (
              <>
                {/* Parent Table */}
                <div className="child-table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ minWidth: '180px' }}>Name</th>
                        <th style={{ minWidth: '180px' }}>Email</th>
                        <th style={{ minWidth: '120px' }}>Phone</th>
                        <th style={{ minWidth: '200px' }}>Children</th>
                        <th style={{ minWidth: '120px' }}>Account Status</th>
                        <th style={{ minWidth: '140px' }}>Billing Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getFilteredParents().map((parent) => {
                        const isExpanded = expandedParentRows[parent.id];
                        const hasDetails = parent.address_line1 || parent.notes;
                        const billingBadge = getBillingStatusBadge(parent);
                        const childrenArray = typeof parent.children === 'string' ? JSON.parse(parent.children) : parent.children;

                        return (
                          <React.Fragment key={parent.id}>
                            <tr
                              onClick={() => hasDetails && toggleParentRow(parent.id)}
                              style={{
                                cursor: hasDetails ? 'pointer' : 'default',
                                backgroundColor: isExpanded ? '#f8f9fa' : 'transparent'
                              }}
                            >
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  {hasDetails && (
                                    <span style={{ fontSize: '0.75rem', color: '#666' }}>
                                      {isExpanded ? '▼' : '▶'}
                                    </span>
                                  )}
                                  <span>{getParentFullName(parent)}</span>
                                </div>
                              </td>
                              <td>{parent.email || '—'}</td>
                              <td>{parent.phone || '—'}</td>
                              <td>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                  {getParentChildrenWithStatus(parent).map((child, idx) => (
                                    <span key={idx} className={`badge ${child.status === 'WAITLIST' ? 'badge-pending' : 'badge-approved'}`} style={{
                                      fontSize: '0.95rem',
                                      fontWeight: 'normal',
                                      padding: '0.25rem 0.6rem',
                                      whiteSpace: 'nowrap'
                                    }}>
                                      {child.first_name} {child.last_name}
                                      {child.status === 'WAITLIST' && ' (Waitlist)'}
                                    </span>
                                  ))}
                                  {getParentChildrenWithStatus(parent).length === 0 && <span>—</span>}
                                </div>
                              </td>
                              <td>
                                <span className={`badge ${parent.is_active ? 'badge-approved' : 'badge-draft'}`} style={{
                                  fontSize: '0.95rem',
                                  fontWeight: 'normal',
                                  padding: '0.25rem 0.6rem'
                                }}>
                                  {parent.is_active ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td>
                                <span className={`badge ${billingBadge.class}`} style={{
                                  fontSize: '0.95rem',
                                  fontWeight: 'normal',
                                  padding: '0.25rem 0.6rem'
                                }}>
                                  {billingBadge.label}
                                </span>
                              </td>
                            </tr>
                            {isExpanded && hasDetails && (
                              <tr style={{ backgroundColor: '#f8f9fa' }}>
                                <td colSpan="6" style={{ padding: '1rem' }}>
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                    {parent.address_line1 && (
                                      <div>
                                        <div style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', color: '#495057' }}>
                                          Address
                                        </div>
                                        <div style={{ fontSize: '0.875rem', color: '#666', backgroundColor: '#fff', padding: '0.75rem', borderRadius: '4px', border: '1px solid #dee2e6' }}>
                                          {parent.address_line1}
                                          {parent.address_line2 && <><br />{parent.address_line2}</>}
                                          {(parent.city || parent.province || parent.postal_code) && (
                                            <><br />{[parent.city, parent.province, parent.postal_code].filter(Boolean).join(', ')}</>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                    {parent.notes && (
                                      <div>
                                        <div style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', color: '#495057' }}>
                                          Notes
                                        </div>
                                        <div style={{ fontSize: '0.875rem', color: '#666', backgroundColor: '#fff', padding: '0.75rem', borderRadius: '4px', border: '1px solid #dee2e6' }}>
                                          {parent.notes}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  {childrenArray && childrenArray.length > 0 && (
                                    <div style={{ marginTop: '1rem' }}>
                                      <div style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', color: '#495057' }}>
                                        Children Details
                                      </div>
                                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        {childrenArray.map((child, idx) => (
                                          <span key={idx} style={{
                                            fontSize: '0.85rem',
                                            padding: '0.4rem 0.75rem',
                                            backgroundColor: '#fff',
                                            border: '1px solid #dee2e6',
                                            borderRadius: '4px'
                                          }}>
                                            {child.first_name} {child.last_name}
                                            {child.is_primary_contact && (
                                              <span className="badge badge-approved" style={{ marginLeft: '0.5rem', fontSize: '0.7rem', padding: '0.125rem 0.375rem' }}>Primary</span>
                                            )}
                                            {child.has_billing_responsibility && (
                                              <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#666' }}>(Billing)</span>
                                            )}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default AdminFamilies;







