import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { motion } from 'framer-motion';
import { User, Lock, Bell, Globe, Percent, Palette } from 'lucide-react';
import api from '../utils/api';
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
  const [taxMessage, setTaxMessage] = useState(null);
  const [taxSaving, setTaxSaving] = useState(false);
  const [themes, setThemes] = useState([]);
  const [activeThemeId, setActiveThemeId] = useState(null);
  const [currentThemeId, setCurrentThemeId] = useState(null);
  const [themeMessage, setThemeMessage] = useState(null);
  const [themeSaving, setThemeSaving] = useState(false);
  const { setTheme, density, setDensity } = useTheme();

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'preferences', label: 'Preferences', icon: Globe },
    { id: 'billing', label: 'Billing', icon: Percent },
    { id: 'themes', label: 'Themes', icon: Palette },
  ];

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await api.get('/settings');
        const rate = parseFloat(response.data.settings?.tax_rate ?? 0.05);
        const enabled = response.data.settings?.tax_enabled ?? true;
        setTaxSettings({
          taxEnabled: enabled,
          taxRatePercent: (rate * 100).toFixed(2),
        });
        const themeList = response.data.themes || [];
        const rawThemeId = response.data.settings?.theme_id ?? themeList[0]?.id ?? null;
        const normalizedThemeId = Number.isFinite(Number(rawThemeId)) ? Number(rawThemeId) : null;
        setThemes(themeList);
        setActiveThemeId(normalizedThemeId);
        setCurrentThemeId(normalizedThemeId);
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

  const handleThemeSave = async () => {
    if (!activeThemeId) {
      setThemeMessage({ type: 'error', text: 'Select a theme to apply.' });
      return;
    }
    const selectedTheme = themes.find((theme) => theme.id === activeThemeId);
    if (!selectedTheme) {
      setThemeMessage({ type: 'error', text: 'Selected theme not found.' });
      return;
    }
    try {
      setThemeSaving(true);
      setThemeMessage(null);
      const response = await api.patch('/settings', { theme_id: activeThemeId });
      const nextTheme = response.data?.active_theme || selectedTheme;
      setTheme(nextTheme);
      setCurrentThemeId(activeThemeId);
      setThemeMessage({ type: 'success', text: 'Theme applied successfully.' });
    } catch (error) {
      setThemeMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to apply theme.',
      });
    } finally {
      setThemeSaving(false);
    }
  };

  return (
    <Layout title="Settings" subtitle="System configuration">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
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
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
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
                  Billing Settings
                </h3>

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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {themes.map((theme) => {
                      let palette = {};
                      if (theme.palette && typeof theme.palette === 'object') {
                        palette = theme.palette;
                      } else if (typeof theme.palette === 'string') {
                        try {
                          palette = JSON.parse(theme.palette);
                        } catch (error) {
                          palette = {};
                        }
                      }
                      let cardColors = Array.isArray(palette.card_colors) ? palette.card_colors : [];
                      if (cardColors.length === 0 && theme.id === 1) {
                        cardColors = defaultCardColors;
                      }
                      const swatches = cardColors.length > 0
                        ? cardColors
                        : [
                            palette.primary,
                            palette.accent,
                            palette.background,
                            palette.surface,
                          ].filter(Boolean);
                      const isSelected = activeThemeId === theme.id;
                      const isCurrent = currentThemeId === theme.id;

                      return (
                        <button
                          key={theme.id}
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
                                      key={`${theme.id}-swatch-${index}`}
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
                )}

                <div className="pt-6">
                  <button
                    type="button"
                    onClick={handleThemeSave}
                    disabled={themeSaving || !activeThemeId || activeThemeId === currentThemeId}
                    className="px-6 py-3 bg-[#FF9B85] text-white font-bold rounded-xl shadow-md hover:bg-[#E07A5F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {themeSaving ? 'Saving...' : 'Apply Theme'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}
