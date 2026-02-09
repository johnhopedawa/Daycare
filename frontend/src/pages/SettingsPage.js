import React, { useEffect, useRef, useState } from 'react';
import { Layout } from '../components/Layout';
import { User, Lock, Bell, Globe, Percent, Palette, Bug, Building2 } from 'lucide-react';
import api from '../utils/api';
import { DEVELOPER_PASSWORD, setDeveloperUnlocked } from '../utils/developerAccess';
import { useTheme } from '../contexts/ThemeContext';

export function SettingsPage() {
  const defaultCardColors = ['#E5D4ED', '#B8E6D5', '#FFF4CC', '#FFDCC8'];
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [taxSettings, setTaxSettings] = useState({
    taxEnabled: true,
    taxRatePercent: '5.00',
  });
  const [daycareSettings, setDaycareSettings] = useState({
    daycareName: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    province: '',
    postalCode: '',
    phone1: '',
    phone2: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    signatureName: '',
    signatureImage: '',
    signatureMode: 'both',
  });
  const [daycareMessage, setDaycareMessage] = useState(null);
  const [daycareSaving, setDaycareSaving] = useState(false);
  const signatureCanvasRef = useRef(null);
  const signatureDrawingRef = useRef(false);
  const [taxMessage, setTaxMessage] = useState(null);
  const [taxSaving, setTaxSaving] = useState(false);
  const [themes, setThemes] = useState([]);
  const [activeThemeId, setActiveThemeId] = useState(null);
  const [currentThemeId, setCurrentThemeId] = useState(null);
  const [activeParentThemeId, setActiveParentThemeId] = useState(null);
  const [currentParentThemeId, setCurrentParentThemeId] = useState(null);
  const [themeMessage, setThemeMessage] = useState(null);
  const [staffThemeSaving, setStaffThemeSaving] = useState(false);
  const [parentThemeSaving, setParentThemeSaving] = useState(false);
  const [debugPassword, setDebugPassword] = useState('');
  const [debugUnlocked, setDebugUnlocked] = useState(false);
  const [debugError, setDebugError] = useState('');
  const [debugLoading, setDebugLoading] = useState(false);
  const [debugConnections, setDebugConnections] = useState([]);
  const [debugSyncLimit, setDebugSyncLimit] = useState(null);
  const [debugStatus, setDebugStatus] = useState(null);
  const [debugSelectedConnectionId, setDebugSelectedConnectionId] = useState('');
  const [debugSyncResult, setDebugSyncResult] = useState(null);
  const [debugSyncingId, setDebugSyncingId] = useState(null);
  const [debugForceSync, setDebugForceSync] = useState(false);
  const [debugResetting, setDebugResetting] = useState(false);
  const { setTheme, density, setDensity } = useTheme();


  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'preferences', label: 'Preferences', icon: Globe },
    { id: 'billing', label: 'Billing', icon: Percent },
    { id: 'themes', label: 'Themes', icon: Palette },
    { id: 'developer', label: 'Developer', icon: Bug },
  ];

  const normalizeThemeId = (value) => (Number.isFinite(Number(value)) ? Number(value) : null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await api.get('/settings');
        const settings = response.data.settings || {};
        const rate = parseFloat(settings.tax_rate ?? 0.05);
        const enabled = settings.tax_enabled ?? true;
        setTaxSettings({
          taxEnabled: enabled,
          taxRatePercent: (rate * 100).toFixed(2),
        });
        setDaycareSettings({
          daycareName: settings.daycare_name || '',
          addressLine1: settings.address_line1 || '',
          addressLine2: settings.address_line2 || '',
          city: settings.city || '',
          province: settings.province || '',
          postalCode: settings.postal_code || '',
          phone1: settings.phone1 || '',
          phone2: settings.phone2 || '',
          contactName: settings.contact_name || '',
          contactPhone: settings.contact_phone || '',
          contactEmail: settings.contact_email || '',
          signatureName: settings.signature_name || '',
          signatureImage: settings.signature_image || '',
          signatureMode: settings.signature_mode || 'both',
        });
        const themeList = response.data.themes || [];
        const normalizedThemeId = normalizeThemeId(settings.theme_id ?? themeList[0]?.id ?? null);
        const normalizedParentThemeId = normalizeThemeId(
          settings.parent_theme_id ?? normalizedThemeId ?? themeList[0]?.id ?? null
        );
        setThemes(themeList);
        setActiveThemeId(normalizedThemeId);
        setCurrentThemeId(normalizedThemeId);
        setActiveParentThemeId(normalizedParentThemeId);
        setCurrentParentThemeId(normalizedParentThemeId);
      } catch (error) {
        setTaxMessage({
          type: 'error',
          text: error.response?.data?.error || 'Failed to load billing settings',
        });
      }
    };

    loadSettings();
  }, []);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const formData = new FormData(e.target);
    const currentPassword = formData.get('currentPassword');
    const newPassword = formData.get('newPassword');
    const confirmPassword = formData.get('confirmPassword');

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      setLoading(false);
      return;
    }

    try {
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      setMessage({ type: 'success', text: 'Password updated successfully' });
      e.target.reset();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to update password',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTaxSave = async (e) => {
    e.preventDefault();
    setTaxMessage(null);

    const parsedRate = parseFloat(taxSettings.taxRatePercent);
    if (!Number.isFinite(parsedRate) || parsedRate < 0 || parsedRate > 100) {
      setTaxMessage({ type: 'error', text: 'Tax rate must be between 0 and 100.' });
      return;
    }

    try {
      setTaxSaving(true);
      await api.patch('/settings', {
        tax_rate: parsedRate / 100,
        tax_enabled: taxSettings.taxEnabled,
      });
      setTaxMessage({ type: 'success', text: 'Billing settings updated.' });
    } catch (error) {
      setTaxMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to update billing settings',
      });
    } finally {
      setTaxSaving(false);
    }
  };

  const getThemePalette = (theme) => {
    if (theme.palette && typeof theme.palette === 'object') {
      return theme.palette;
    }
    if (typeof theme.palette === 'string') {
      try {
        return JSON.parse(theme.palette);
      } catch (error) {
        return {};
      }
    }
    return {};
  };

  const getThemeSwatches = (theme) => {
    const palette = getThemePalette(theme);
    let cardColors = Array.isArray(palette.card_colors) ? palette.card_colors : [];
    if (cardColors.length === 0 && theme.id === 1) {
      cardColors = defaultCardColors;
    }
    return cardColors.length > 0
      ? cardColors
      : [
          palette.primary,
          palette.accent,
          palette.background,
          palette.surface,
        ].filter(Boolean);
  };

  const handleStaffThemeSave = async () => {
    if (!activeThemeId) {
      setThemeMessage({ type: 'error', text: 'Select a staff/admin theme to apply.' });
      return;
    }
    const selectedTheme = themes.find((theme) => theme.id === activeThemeId);
    if (!selectedTheme) {
      setThemeMessage({ type: 'error', text: 'Selected staff/admin theme not found.' });
      return;
    }
    try {
      setStaffThemeSaving(true);
      setThemeMessage(null);
      const response = await api.patch('/settings', { theme_id: activeThemeId });
      const nextTheme = response.data?.active_theme || selectedTheme;
      setTheme(nextTheme);
      const nextThemeId = normalizeThemeId(response.data?.settings?.theme_id ?? activeThemeId);
      setCurrentThemeId(nextThemeId);
      setActiveThemeId(nextThemeId);
      setThemeMessage({ type: 'success', text: 'Staff/Admin portal theme applied.' });
    } catch (error) {
      setThemeMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to apply staff/admin theme.',
      });
    } finally {
      setStaffThemeSaving(false);
    }
  };

  const handleParentThemeSave = async () => {
    if (!activeParentThemeId) {
      setThemeMessage({ type: 'error', text: 'Select a parent portal theme to apply.' });
      return;
    }
    const selectedTheme = themes.find((theme) => theme.id === activeParentThemeId);
    if (!selectedTheme) {
      setThemeMessage({ type: 'error', text: 'Selected parent portal theme not found.' });
      return;
    }
    try {
      setParentThemeSaving(true);
      setThemeMessage(null);
      const response = await api.patch('/settings', { parent_theme_id: activeParentThemeId });
      const nextParentThemeId = normalizeThemeId(
        response.data?.settings?.parent_theme_id ?? activeParentThemeId
      );
      setCurrentParentThemeId(nextParentThemeId);
      setActiveParentThemeId(nextParentThemeId);
      setThemeMessage({ type: 'success', text: 'Parent portal theme applied.' });
    } catch (error) {
      setThemeMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to apply parent portal theme.',
      });
    } finally {
      setParentThemeSaving(false);
    }
  };

  const getCanvasPosition = (event, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startSignature = (event) => {
    if (event.touches) {
      event.preventDefault();
    }
    const canvas = signatureCanvasRef.current;
    if (!canvas) {
      return;
    }
    const context = canvas.getContext('2d');
    signatureDrawingRef.current = true;
    const { x, y } = getCanvasPosition(event, canvas);
    context.strokeStyle = '#3b3b2a';
    context.lineWidth = 2;
    context.lineCap = 'round';
    context.beginPath();
    context.moveTo(x, y);
  };

  const drawSignature = (event) => {
    if (!signatureDrawingRef.current) {
      return;
    }
    if (event.touches) {
      event.preventDefault();
    }
    const canvas = signatureCanvasRef.current;
    if (!canvas) {
      return;
    }
    const context = canvas.getContext('2d');
    const { x, y } = getCanvasPosition(event, canvas);
    context.lineTo(x, y);
    context.stroke();
  };

  const endSignature = () => {
    if (!signatureDrawingRef.current) {
      return;
    }
    signatureDrawingRef.current = false;
    const canvas = signatureCanvasRef.current;
    if (!canvas) {
      return;
    }
    const dataUrl = canvas.toDataURL('image/png');
    setDaycareSettings((prev) => ({ ...prev, signatureImage: dataUrl }));
  };

  const clearSignatureCanvas = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) {
      return;
    }
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
  };

  const clearSignature = () => {
    clearSignatureCanvas();
    setDaycareSettings((prev) => ({ ...prev, signatureImage: '' }));
  };

  const loadSignatureImage = (dataUrl) => {
    const canvas = signatureCanvasRef.current;
    if (!canvas || !dataUrl) {
      return;
    }
    const context = canvas.getContext('2d');
    const image = new Image();
    image.onload = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      const scale = Math.min(canvas.width / image.width, canvas.height / image.height);
      const drawWidth = image.width * scale;
      const drawHeight = image.height * scale;
      const offsetX = (canvas.width - drawWidth) / 2;
      const offsetY = (canvas.height - drawHeight) / 2;
      context.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
    };
    image.src = dataUrl;
  };

  useEffect(() => {
    if (daycareSettings.signatureImage) {
      loadSignatureImage(daycareSettings.signatureImage);
    } else {
      clearSignatureCanvas();
    }
  }, [daycareSettings.signatureImage]);

  useEffect(() => {
    if (activeTab !== 'daycare') {
      return;
    }
    if (daycareSettings.signatureImage) {
      loadSignatureImage(daycareSettings.signatureImage);
    } else {
      clearSignatureCanvas();
    }
  }, [activeTab]);

  const handleDaycareSave = async (e) => {
    e.preventDefault();
    setDaycareMessage(null);
    try {
      setDaycareSaving(true);
      await api.patch('/settings', {
        daycare_name: daycareSettings.daycareName,
        address_line1: daycareSettings.addressLine1,
        address_line2: daycareSettings.addressLine2,
        city: daycareSettings.city,
        province: daycareSettings.province,
        postal_code: daycareSettings.postalCode,
        phone1: daycareSettings.phone1,
        phone2: daycareSettings.phone2,
        contact_name: daycareSettings.contactName,
        contact_phone: daycareSettings.contactPhone,
        contact_email: daycareSettings.contactEmail,
        signature_name: daycareSettings.signatureName,
        signature_image: daycareSettings.signatureImage,
        signature_mode: daycareSettings.signatureMode,
      });
      setDaycareMessage({ type: 'success', text: 'Daycare information updated.' });
    } catch (error) {
      setDaycareMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to update daycare information.',
      });
    } finally {
      setDaycareSaving(false);
    }
  };

  const loadDebugData = async () => {
    setDebugLoading(true);
    setDebugError('');
    try {
      const [connectionsRes, statusRes] = await Promise.allSettled([
        api.get('/business-expenses/connections'),
        api.get('/business-expenses/status'),
      ]);

      if (connectionsRes.status === 'fulfilled') {
        const payload = connectionsRes.value.data || {};
        setDebugConnections(payload.connections || []);
        setDebugSyncLimit(payload.syncLimit || null);
        if (!debugSelectedConnectionId && (payload.connections || []).length > 0) {
          setDebugSelectedConnectionId(String(payload.connections[0].id));
        }
      } else {
        setDebugConnections([]);
        setDebugSyncLimit(null);
        setDebugError('Failed to load SimpleFIN connections.');
      }

      if (statusRes.status === 'fulfilled') {
        setDebugStatus(statusRes.value.data || null);
      } else if (!debugError) {
        setDebugStatus(null);
        setDebugError('Failed to load SimpleFIN status.');
      }
    } catch (error) {
      setDebugError(error.response?.data?.error || 'Failed to load debug data.');
    } finally {
      setDebugLoading(false);
    }
  };

  const handleDebugUnlock = async (e) => {
    e.preventDefault();
    if (debugPassword !== DEVELOPER_PASSWORD) {
      setDebugError('Incorrect developer password.');
      return;
    }

    try {
      await api.post('/developer/unlock', { password: debugPassword });
      setDebugUnlocked(true);
      setDeveloperUnlocked();
      setDebugError('');
      setDebugSyncResult(null);
      loadDebugData();
    } catch (error) {
      setDebugError(error.response?.data?.error || 'Failed to unlock developer access.');
    }
  };

  const handleDebugSync = async () => {
    if (!debugSelectedConnectionId) {
      setDebugError('Select a connection to sync.');
      return;
    }
    setDebugError('');
    setDebugSyncingId(debugSelectedConnectionId);
    try {
      const query = debugForceSync ? '?debug=1&force=1' : '?debug=1';
      const res = await api.post(`/business-expenses/sync/${debugSelectedConnectionId}${query}`);
      setDebugSyncResult(res.data || null);
      if (res.data?.syncLimit) {
        setDebugSyncLimit(res.data.syncLimit);
      }
      await loadDebugData();
    } catch (error) {
      const payload = error.response?.data || null;
      setDebugSyncResult(payload);
      setDebugError(payload?.error || 'Sync failed.');
      if (payload?.syncLimit) {
        setDebugSyncLimit(payload.syncLimit);
      }
    } finally {
      setDebugSyncingId(null);
    }
  };

  const handleResetSyncLimit = async () => {
    setDebugError('');
    setDebugResetting(true);
    try {
      const res = await api.post('/business-expenses/sync-reset');
      if (res.data?.syncLimit) {
        setDebugSyncLimit(res.data.syncLimit);
      }
      setDebugSyncResult(res.data || { message: 'Sync limit reset' });
    } catch (error) {
      const payload = error.response?.data || null;
      setDebugSyncResult(payload);
      setDebugError(payload?.error || 'Failed to reset sync limit.');
    } finally {
      setDebugResetting(false);
    }
  };

  return (
    <Layout title="Settings" subtitle="System configuration">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <div
          className="lg:col-span-1"
        >
          <div className="menu-surface rounded-3xl p-4">
            <nav className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`menu-tab w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                      isActive ? 'menu-tab-active text-white' : ''
                    }`}
                  >
                    <Icon size={18} />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div
          className="lg:col-span-3"
        >
          <div className="bg-white rounded-3xl p-8 shadow-[0_4px_20px_-4px_rgba(255,229,217,0.5)] border border-[#FFE5D9]/30">
            {activeTab === 'profile' && (
              <div>
                <h3 className="font-quicksand font-bold text-2xl text-stone-800 mb-6">
                  Profile Settings
                </h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9B85] focus:border-transparent"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9B85] focus:border-transparent"
                      placeholder="john@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9B85] focus:border-transparent"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div className="pt-4">
                    <button className="px-6 py-3 bg-[#FF9B85] text-white font-bold rounded-xl shadow-md hover:bg-[#E07A5F] transition-colors">
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div>
                <h3 className="font-quicksand font-bold text-2xl text-stone-800 mb-6">
                  Security Settings
                </h3>

                {message && (
                  <div
                    className={`mb-6 p-4 rounded-xl ${
                      message.type === 'success'
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}
                  >
                    {message.text}
                  </div>
                )}

                <form onSubmit={handlePasswordChange} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      Current Password
                    </label>
                    <input
                      type="password"
                      name="currentPassword"
                      required
                      className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9B85] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      New Password
                    </label>
                    <input
                      type="password"
                      name="newPassword"
                      required
                      className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9B85] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      required
                      className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9B85] focus:border-transparent"
                    />
                  </div>
                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-6 py-3 bg-[#FF9B85] text-white font-bold rounded-xl shadow-md hover:bg-[#E07A5F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </form>

                <div className="mt-8 pt-8 border-t border-stone-200">
                  <h4 className="font-quicksand font-bold text-lg text-stone-800 mb-4">
                    Two-Factor Authentication
                  </h4>
                  <p className="text-stone-600 mb-4">
                    Add an extra layer of security to your account
                  </p>
                  <button className="px-4 py-2 border border-[#FFE5D9] text-stone-700 font-medium rounded-xl hover:bg-[#FFF8F3] transition-colors">
                    Enable 2FA
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'billing' && (
              <div>
                <h3 className="font-quicksand font-bold text-2xl text-stone-800 mb-6">
                  Billing
                </h3>

                <div className="mt-10 pt-2">

                  {daycareMessage && (
                    <div
                      className={`mb-6 p-4 rounded-xl ${
                        daycareMessage.type === 'success'
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}
                    >
                      {daycareMessage.text}
                    </div>
                  )}

                  <form onSubmit={handleDaycareSave} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">
                        Daycare Name
                      </label>
                      <input
                        type="text"
                        value={daycareSettings.daycareName}
                        onChange={(e) => setDaycareSettings({ ...daycareSettings, daycareName: e.target.value })}
                        className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9B85] focus:border-transparent"
                        placeholder="Little Sparrows Academy"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-2">
                          Address Line 1
                        </label>
                        <input
                          type="text"
                          value={daycareSettings.addressLine1}
                          onChange={(e) => setDaycareSettings({ ...daycareSettings, addressLine1: e.target.value })}
                          className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9B85] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-2">
                          Address Line 2
                        </label>
                        <input
                          type="text"
                          value={daycareSettings.addressLine2}
                          onChange={(e) => setDaycareSettings({ ...daycareSettings, addressLine2: e.target.value })}
                          className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9B85] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-2">
                          City
                        </label>
                        <input
                          type="text"
                          value={daycareSettings.city}
                          onChange={(e) => setDaycareSettings({ ...daycareSettings, city: e.target.value })}
                          className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9B85] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-2">
                          Province/State
                        </label>
                        <input
                          type="text"
                          value={daycareSettings.province}
                          onChange={(e) => setDaycareSettings({ ...daycareSettings, province: e.target.value })}
                          className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9B85] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-2">
                          Postal Code
                        </label>
                        <input
                          type="text"
                          value={daycareSettings.postalCode}
                          onChange={(e) => setDaycareSettings({ ...daycareSettings, postalCode: e.target.value })}
                          className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9B85] focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-2">
                          Phone 1
                        </label>
                        <input
                          type="text"
                          value={daycareSettings.phone1}
                          onChange={(e) => setDaycareSettings({ ...daycareSettings, phone1: e.target.value })}
                          className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9B85] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-2">
                          Phone 2
                        </label>
                        <input
                          type="text"
                          value={daycareSettings.phone2}
                          onChange={(e) => setDaycareSettings({ ...daycareSettings, phone2: e.target.value })}
                          className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9B85] focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-2">
                          Contact Name
                        </label>
                        <input
                          type="text"
                          value={daycareSettings.contactName}
                          onChange={(e) => setDaycareSettings({ ...daycareSettings, contactName: e.target.value })}
                          className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9B85] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-2">
                          Contact Phone
                        </label>
                        <input
                          type="text"
                          value={daycareSettings.contactPhone}
                          onChange={(e) => setDaycareSettings({ ...daycareSettings, contactPhone: e.target.value })}
                          className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9B85] focus:border-transparent"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-stone-700 mb-2">
                          Contact Email
                        </label>
                        <input
                          type="email"
                          value={daycareSettings.contactEmail}
                          onChange={(e) => setDaycareSettings({ ...daycareSettings, contactEmail: e.target.value })}
                          className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9B85] focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">
                        Signature Name (for receipts)
                      </label>
                      <input
                        type="text"
                        value={daycareSettings.signatureName}
                        onChange={(e) => setDaycareSettings({ ...daycareSettings, signatureName: e.target.value })}
                        className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9B85] focus:border-transparent"
                        placeholder="Faith Dawa"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">
                        Draw Signature (for receipts)
                      </label>
                      <div className="border border-stone-200 rounded-2xl p-4 bg-[#FFF8F3]">
                        <canvas
                          ref={signatureCanvasRef}
                          width={520}
                          height={160}
                          className="w-full h-40 bg-white rounded-xl border border-stone-200 touch-none"
                          onMouseDown={startSignature}
                          onMouseMove={drawSignature}
                          onMouseUp={endSignature}
                          onMouseLeave={endSignature}
                          onTouchStart={startSignature}
                          onTouchMove={drawSignature}
                          onTouchEnd={endSignature}
                        />
                        <div className="mt-3 flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={clearSignature}
                            className="px-4 py-2 border border-stone-200 text-stone-700 font-semibold rounded-xl hover:bg-white transition-colors"
                          >
                            Clear
                          </button>
                          <p className="text-xs text-stone-500">
                            Your drawing is saved with the daycare settings.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">
                        Signature Display
                      </label>
                    <select
                      value={daycareSettings.signatureMode}
                      onChange={(e) => setDaycareSettings({ ...daycareSettings, signatureMode: e.target.value })}
                      className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
                    >
                        <option value="signature">Signature only</option>
                        <option value="name">Signature name only</option>
                        <option value="both">Signature + name</option>
                      </select>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={daycareSaving}
                        className="px-6 py-3 bg-[#FF9B85] text-white font-bold rounded-xl shadow-md hover:bg-[#E07A5F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {daycareSaving ? 'Saving...' : 'Save Daycare Info'}
                      </button>
                    </div>
                  </form>
                </div>

                <div className="mt-10 pt-8 border-t border-stone-200">
                  <h4 className="font-quicksand font-bold text-xl text-stone-800 mb-6">
                    Tax
                  </h4>

                  {taxMessage && (
                    <div
                      className={`mb-6 p-4 rounded-xl ${
                        taxMessage.type === 'success'
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}
                    >
                      {taxMessage.text}
                    </div>
                  )}

                  <form onSubmit={handleTaxSave} className="space-y-6">
                    <div className="flex items-center justify-between p-4 border border-stone-200 rounded-2xl">
                      <div>
                        <p className="font-semibold text-stone-800">Enable Tax</p>
                        <p className="text-sm text-stone-500">Apply daycare tax to invoices</p>
                      </div>
                      <label className="inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={taxSettings.taxEnabled}
                          onChange={(e) => setTaxSettings({ ...taxSettings, taxEnabled: e.target.checked })}
                          className="sr-only"
                        />
                        <span
                          className={`w-12 h-7 flex items-center rounded-full p-1 transition-colors ${
                            taxSettings.taxEnabled ? 'bg-[#FF9B85]' : 'bg-stone-300'
                          }`}
                        >
                          <span
                            className={`bg-white w-5 h-5 rounded-full shadow transform transition-transform ${
                              taxSettings.taxEnabled ? 'translate-x-5' : ''
                            }`}
                          />
                        </span>
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">
                        Tax Rate (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={taxSettings.taxRatePercent}
                        onChange={(e) => setTaxSettings({ ...taxSettings, taxRatePercent: e.target.value })}
                        className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9B85] focus:border-transparent"
                      />
                      <p className="text-xs text-stone-500 mt-2">
                        This rate is applied to all new invoices and billing templates.
                      </p>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={taxSaving}
                        className="px-6 py-3 bg-[#FF9B85] text-white font-bold rounded-xl shadow-md hover:bg-[#E07A5F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {taxSaving ? 'Saving...' : 'Save Billing Settings'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div>
                <h3 className="font-quicksand font-bold text-2xl text-stone-800 mb-6">
                  Notification Preferences
                </h3>
                <div className="space-y-6">
                  {[
                    {
                      title: 'Email Notifications',
                      description: 'Receive updates about attendance and billing',
                    },
                    {
                      title: 'SMS Alerts',
                      description: 'Get text messages for urgent updates',
                    },
                    {
                      title: 'Weekly Reports',
                      description: 'Receive weekly summary reports',
                    },
                    {
                      title: 'Marketing Emails',
                      description: 'Updates about new features and improvements',
                    },
                  ].map((setting, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-4 bg-[#FFF8F3] rounded-xl"
                    >
                      <div>
                        <h4 className="font-medium text-stone-800">
                          {setting.title}
                        </h4>
                        <p className="text-sm text-stone-600">
                          {setting.description}
                        </p>
                      </div>
                      <label className="relative inline-block w-12 h-6">
                        <input type="checkbox" className="sr-only peer" />
                        <div className="w-12 h-6 bg-stone-300 rounded-full peer peer-checked:bg-[#FF9B85] transition-colors cursor-pointer"></div>
                        <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-6"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'preferences' && (
              <div>
                <h3 className="font-quicksand font-bold text-2xl text-stone-800 mb-6">
                  System Preferences
                </h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      Language
                    </label>
                    <select className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9B85] focus:border-transparent">
                      <option>English (US)</option>
                      <option>Spanish</option>
                      <option>French</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      Time Zone
                    </label>
                    <select className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9B85] focus:border-transparent">
                      <option>Eastern Time (ET)</option>
                      <option>Central Time (CT)</option>
                      <option>Mountain Time (MT)</option>
                      <option>Pacific Time (PT)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      Date Format
                    </label>
                    <select className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9B85] focus:border-transparent">
                      <option>MM/DD/YYYY</option>
                      <option>DD/MM/YYYY</option>
                      <option>YYYY-MM-DD</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      Density
                    </label>
                    <div className="inline-flex rounded-xl border border-stone-200 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setDensity('comfortable')}
                        className={`px-4 py-2 text-sm font-semibold transition-colors ${
                          density === 'comfortable'
                            ? 'text-white'
                            : 'text-stone-600 hover:bg-stone-50'
                        }`}
                        style={density === 'comfortable' ? { backgroundColor: 'var(--primary)' } : undefined}
                      >
                        Comfortable
                      </button>
                      <button
                        type="button"
                        onClick={() => setDensity('compact')}
                        className={`px-4 py-2 text-sm font-semibold transition-colors ${
                          density === 'compact'
                            ? 'text-white'
                            : 'text-stone-600 hover:bg-stone-50'
                        }`}
                        style={density === 'compact' ? { backgroundColor: 'var(--primary)' } : undefined}
                      >
                        Compact
                      </button>
                    </div>
                    <p className="text-xs text-stone-500 mt-2">
                      Tighten spacing for large screens.
                    </p>
                  </div>
                  <div className="pt-4">
                    <button className="px-6 py-3 bg-[#FF9B85] text-white font-bold rounded-xl shadow-md hover:bg-[#E07A5F] transition-colors">
                      Save Preferences
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'themes' && (
              <div>
                <h3 className="font-quicksand font-bold text-2xl text-stone-800 mb-6">
                  Theme Settings
                </h3>

                {themeMessage && (
                  <div
                    className={`mb-6 p-4 rounded-xl ${
                      themeMessage.type === 'success'
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}
                  >
                    {themeMessage.text}
                  </div>
                )}

                {themes.length === 0 ? (
                  <p className="text-stone-500">No themes available yet.</p>
                ) : (
                  <div className="space-y-8">
                    <section>
                      <div className="mb-4">
                        <h4 className="font-semibold text-stone-800">Staff and Admin Portal Theme</h4>
                        <p className="text-sm text-stone-500 mt-1">
                          This theme applies to Admin and Educator views.
                        </p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {themes.map((theme) => {
                          const palette = getThemePalette(theme);
                          const swatches = getThemeSwatches(theme);
                          const isSelected = activeThemeId === theme.id;
                          const isCurrent = currentThemeId === theme.id;

                          return (
                            <button
                              key={`staff-theme-${theme.id}`}
                              type="button"
                              onClick={() => setActiveThemeId(theme.id)}
                              className={`text-left border rounded-2xl p-4 transition-all ${
                                isSelected
                                  ? 'border-2 shadow-md'
                                  : 'border-stone-200 hover:shadow-sm'
                              }`}
                              style={{
                                borderColor: isSelected ? palette.primary || 'var(--primary)' : undefined,
                                backgroundColor: isSelected ? `${palette.background || '#FFF8F3'}20` : undefined,
                              }}
                            >
                              <div className="flex items-center justify-between gap-4">
                                <div>
                                  <p className="font-semibold text-stone-800">{theme.name}</p>
                                  {theme.description && (
                                    <p className="text-sm text-stone-500 mt-1">{theme.description}</p>
                                  )}
                                  {swatches.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                      {swatches.map((color, index) => (
                                        <span
                                          key={`staff-${theme.id}-swatch-${index}`}
                                          className="w-6 h-6 rounded-full border border-white shadow-sm"
                                          style={{ backgroundColor: color }}
                                          aria-hidden="true"
                                        />
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  {isCurrent && (
                                    <span
                                      className="text-xs font-semibold px-3 py-1 rounded-full"
                                      style={{
                                        backgroundColor: palette.accent || 'var(--accent)',
                                        color: palette.primary_dark || 'var(--primary-dark)',
                                      }}
                                    >
                                      Active
                                    </span>
                                  )}
                                  {isSelected && !isCurrent && (
                                    <span
                                      className="text-xs font-semibold px-3 py-1 rounded-full"
                                      style={{
                                        backgroundColor: palette.primary || 'var(--primary)',
                                        color: palette.on_primary || '#FFFFFF',
                                      }}
                                    >
                                      Selected
                                    </span>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      <div className="pt-6">
                        <button
                          type="button"
                          onClick={handleStaffThemeSave}
                          disabled={staffThemeSaving || !activeThemeId || activeThemeId === currentThemeId}
                          className="px-6 py-3 bg-[#FF9B85] text-white font-bold rounded-xl shadow-md hover:bg-[#E07A5F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {staffThemeSaving ? 'Saving...' : 'Apply Staff/Admin Theme'}
                        </button>
                      </div>
                    </section>

                    <section>
                      <div className="mb-4">
                        <h4 className="font-semibold text-stone-800">Parent Portal Theme</h4>
                        <p className="text-sm text-stone-500 mt-1">
                          This theme is used only for parent portal pages.
                        </p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {themes.map((theme) => {
                          const palette = getThemePalette(theme);
                          const swatches = getThemeSwatches(theme);
                          const isSelected = activeParentThemeId === theme.id;
                          const isCurrent = currentParentThemeId === theme.id;

                          return (
                            <button
                              key={`parent-theme-${theme.id}`}
                              type="button"
                              onClick={() => setActiveParentThemeId(theme.id)}
                              className={`text-left border rounded-2xl p-4 transition-all ${
                                isSelected
                                  ? 'border-2 shadow-md'
                                  : 'border-stone-200 hover:shadow-sm'
                              }`}
                              style={{
                                borderColor: isSelected ? palette.primary || 'var(--primary)' : undefined,
                                backgroundColor: isSelected ? `${palette.background || '#FFF8F3'}20` : undefined,
                              }}
                            >
                              <div className="flex items-center justify-between gap-4">
                                <div>
                                  <p className="font-semibold text-stone-800">{theme.name}</p>
                                  {theme.description && (
                                    <p className="text-sm text-stone-500 mt-1">{theme.description}</p>
                                  )}
                                  {swatches.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                      {swatches.map((color, index) => (
                                        <span
                                          key={`parent-${theme.id}-swatch-${index}`}
                                          className="w-6 h-6 rounded-full border border-white shadow-sm"
                                          style={{ backgroundColor: color }}
                                          aria-hidden="true"
                                        />
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  {isCurrent && (
                                    <span
                                      className="text-xs font-semibold px-3 py-1 rounded-full"
                                      style={{
                                        backgroundColor: palette.accent || 'var(--accent)',
                                        color: palette.primary_dark || 'var(--primary-dark)',
                                      }}
                                    >
                                      Active
                                    </span>
                                  )}
                                  {isSelected && !isCurrent && (
                                    <span
                                      className="text-xs font-semibold px-3 py-1 rounded-full"
                                      style={{
                                        backgroundColor: palette.primary || 'var(--primary)',
                                        color: palette.on_primary || '#FFFFFF',
                                      }}
                                    >
                                      Selected
                                    </span>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      <div className="pt-6">
                        <button
                          type="button"
                          onClick={handleParentThemeSave}
                          disabled={
                            parentThemeSaving
                            || !activeParentThemeId
                            || activeParentThemeId === currentParentThemeId
                          }
                          className="px-6 py-3 bg-[#FF9B85] text-white font-bold rounded-xl shadow-md hover:bg-[#E07A5F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {parentThemeSaving ? 'Saving...' : 'Apply Parent Theme'}
                        </button>
                      </div>
                    </section>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'developer' && (
              <div>
                <h3 className="font-quicksand font-bold text-2xl text-stone-800 mb-6">
                  Developer Panel
                </h3>

                {!debugUnlocked ? (
                  <form onSubmit={handleDebugUnlock} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">
                        Developer Password
                      </label>
                      <input
                        type="password"
                        value={debugPassword}
                        onChange={(e) => setDebugPassword(e.target.value)}
                        className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9B85] focus:border-transparent"
                        placeholder="Enter developer password"
                      />
                      <p className="text-xs text-stone-500 mt-2">
                        Use the shared developer password to unlock diagnostics.
                      </p>
                    </div>
                    {debugError && (
                      <div className="p-3 rounded-xl bg-red-50 text-red-700 border border-red-200">
                        {debugError}
                      </div>
                    )}
                    <button
                      type="submit"
                      className="px-6 py-3 bg-[#FF9B85] text-white font-bold rounded-xl shadow-md hover:bg-[#E07A5F] transition-colors"
                    >
                      Unlock Developer
                    </button>
                  </form>
                ) : (
                  <div className="space-y-6">
                    <div className="p-4 rounded-2xl border border-[#FFE5D9]/60 bg-[#FFF8F3]">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <h4 className="font-semibold text-stone-800">Firefly III</h4>
                          <p className="text-sm text-stone-600">
                            Open Firefly to manage expense accounts and access tokens.
                          </p>
                        </div>
                        <a
                          href="/firefly-redirect"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 rounded-xl bg-white border themed-border text-sm font-semibold text-stone-700 hover:bg-[#FFE5D9] transition-colors"
                        >
                          Open Firefly
                        </a>
                      </div>
                    </div>
                    {debugError && (
                      <div className="p-3 rounded-xl bg-red-50 text-red-700 border border-red-200">
                        {debugError}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={loadDebugData}
                        disabled={debugLoading}
                        className="px-4 py-2 bg-[#FF9B85] text-white font-semibold rounded-xl shadow-md hover:bg-[#E07A5F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {debugLoading ? 'Refreshing...' : 'Refresh Developer Data'}
                      </button>
                      {debugSyncLimit && (
                        <span className="text-sm text-stone-600">
                          Daily sync remaining: {debugSyncLimit.remaining} of {debugSyncLimit.limit}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={handleResetSyncLimit}
                        disabled={debugResetting}
                        className="px-4 py-2 border border-stone-200 text-stone-700 font-semibold rounded-xl hover:bg-[#FFF8F3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {debugResetting ? 'Resetting...' : 'Reset Sync Limit'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="border border-stone-200 rounded-2xl p-4">
                        <h4 className="font-semibold text-stone-800 mb-3">SimpleFIN Status</h4>
                        <pre className="text-xs text-stone-700 bg-[#FFF8F3] rounded-xl p-3 overflow-auto">
                          {JSON.stringify(debugStatus || { status: 'Not loaded' }, null, 2)}
                        </pre>
                      </div>
                      <div className="border border-stone-200 rounded-2xl p-4">
                        <h4 className="font-semibold text-stone-800 mb-3">Connections</h4>
                        <pre className="text-xs text-stone-700 bg-[#FFF8F3] rounded-xl p-3 overflow-auto">
                          {JSON.stringify(debugConnections || [], null, 2)}
                        </pre>
                      </div>
                    </div>

                    <div className="border border-stone-200 rounded-2xl p-4">
                      <h4 className="font-semibold text-stone-800 mb-3">Run Sync Debug</h4>
                      <div className="flex flex-col md:flex-row gap-3 md:items-center">
                        <select
                          value={debugSelectedConnectionId}
                          onChange={(e) => setDebugSelectedConnectionId(e.target.value)}
                          className="flex-1 px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9B85] focus:border-transparent"
                        >
                          {debugConnections.length === 0 && (
                            <option value="">No connections available</option>
                          )}
                          {debugConnections.map((connection) => (
                            <option key={connection.id} value={String(connection.id)}>
                              {connection.account_name} (ID {connection.id})
                            </option>
                          ))}
                        </select>
                        <label className="inline-flex items-center gap-2 text-sm text-stone-600">
                          <input
                            type="checkbox"
                            checked={debugForceSync}
                            onChange={(e) => setDebugForceSync(e.target.checked)}
                          />
                          Force reimport
                        </label>
                        <button
                          type="button"
                          onClick={handleDebugSync}
                          disabled={!debugSelectedConnectionId || debugSyncingId === debugSelectedConnectionId}
                          className="px-4 py-3 bg-[#FF9B85] text-white font-semibold rounded-xl shadow-md hover:bg-[#E07A5F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {debugSyncingId === debugSelectedConnectionId ? 'Syncing...' : 'Run Debug Sync'}
                        </button>
                      </div>
                      <div className="mt-4">
                        <pre className="text-xs text-stone-700 bg-[#FFF8F3] rounded-xl p-3 overflow-auto">
                          {JSON.stringify(debugSyncResult || { result: 'No debug sync run yet.' }, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

