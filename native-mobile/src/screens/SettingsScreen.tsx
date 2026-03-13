import React, { useEffect, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { useAuth } from '../auth/AuthContext';
import { ApiEndpointCard } from '../components/ApiEndpointCard';
import {
  AppScreen,
  AppTextField,
  ErrorBanner,
  FieldLabel,
  PrimaryButton,
  SecondaryButton,
  SurfaceCard,
} from '../components/ui';
import { readNotificationPreferences, writeNotificationPreferences } from '../storage/preferencesStorage';
import { fonts, getRolePalette } from '../theme/tokens';

export function SettingsScreen() {
  const {
    apiBaseUrl,
    changePasswordForSession,
    defaultApiBaseUrl,
    logout,
    resetApiBaseUrl,
    session,
    testConnection,
    updateApiBaseUrl,
  } = useAuth();
  const role = session?.user.role || 'ADMIN';
  const palette = getRolePalette(role);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState({
    messageAlerts: true,
    billingReminders: true,
    eventReminders: true,
  });

  useEffect(() => {
    async function loadPreferences() {
      const storedPreferences = await readNotificationPreferences();
      setNotificationPrefs(storedPreferences);
    }

    void loadPreferences();
  }, []);

  async function handleChangePassword() {
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    try {
      setSavingPassword(true);
      setPasswordError('');
      setPasswordSuccess('');
      await changePasswordForSession(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSuccess('Password updated successfully.');
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Password update failed.');
    } finally {
      setSavingPassword(false);
    }
  }

  async function updatePreference(key: 'messageAlerts' | 'billingReminders' | 'eventReminders', value: boolean) {
    const nextPreferences = {
      ...notificationPrefs,
      [key]: value,
    };
    setNotificationPrefs(nextPreferences);
    await writeNotificationPreferences(nextPreferences);
  }

  return (
    <AppScreen
      role={role}
      eyebrow="Account Settings"
      title="Settings"
      subtitle="Password changes, local notification preferences, and API configuration."
    >
      <SurfaceCard role={role}>
        <View style={{ gap: 10 }}>
          <Text style={[styles.sectionEyebrow, { color: palette.muted }]}>Signed In</Text>
          <Text style={[styles.accountName, { color: palette.text }]}>
            {session?.user.first_name} {session?.user.last_name}
          </Text>
          <Text style={[styles.accountMeta, { color: palette.muted }]}>
            {session?.user.email} | {session?.user.role}
          </Text>
        </View>
      </SurfaceCard>

      <SurfaceCard role={role}>
        <Text style={[styles.sectionEyebrow, { color: palette.muted }]}>Security</Text>
        <Text style={[styles.sectionHeading, { color: palette.text }]}>Change Password</Text>
        <View style={{ gap: 10, marginTop: 14 }}>
          <AppTextField value={currentPassword} onChangeText={setCurrentPassword} placeholder="Current password" role={role} secureTextEntry />
          <AppTextField value={newPassword} onChangeText={setNewPassword} placeholder="New password" role={role} secureTextEntry />
          <AppTextField value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Confirm new password" role={role} secureTextEntry />
          {passwordError ? <ErrorBanner message={passwordError} /> : null}
          {passwordSuccess ? (
            <View style={styles.successBanner}>
              <Text style={styles.successBannerText}>{passwordSuccess}</Text>
            </View>
          ) : null}
          <PrimaryButton label={savingPassword ? 'Saving...' : 'Update Password'} onPress={handleChangePassword} role={role} disabled={savingPassword} />
          <View style={styles.infoBanner}>
            <Text style={styles.infoBannerText}>
              Two-factor authentication is intentionally not shown here because the backend does not implement it.
            </Text>
          </View>
        </View>
      </SurfaceCard>

      <SurfaceCard role={role}>
        <Text style={[styles.sectionEyebrow, { color: palette.muted }]}>Notification Preferences</Text>
        <Text style={[styles.sectionHeading, { color: palette.text }]}>Local Toggles</Text>
        <View style={{ gap: 12, marginTop: 14 }}>
          {[
            ['messageAlerts', 'Message alerts'],
            ['billingReminders', 'Billing reminders'],
            ['eventReminders', 'Event reminders'],
          ].map(([key, label]) => (
            <View key={key} style={[styles.preferenceRow, { borderColor: palette.border }]}>
              <Text style={[styles.preferenceLabel, { color: palette.text }]}>{label}</Text>
              <Switch
                value={notificationPrefs[key as keyof typeof notificationPrefs]}
                onValueChange={(value) =>
                  void updatePreference(key as 'messageAlerts' | 'billingReminders' | 'eventReminders', value)
                }
                trackColor={{ false: palette.border, true: palette.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          ))}
        </View>
      </SurfaceCard>

      <ApiEndpointCard
        role={role}
        apiBaseUrl={apiBaseUrl}
        defaultApiBaseUrl={defaultApiBaseUrl}
        onSave={async (value) => {
          await updateApiBaseUrl(value);
        }}
        onReset={async () => {
          await resetApiBaseUrl();
        }}
        onTest={testConnection}
      />

      <SecondaryButton label="Sign Out" onPress={() => void logout()} role={role} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  sectionEyebrow: {
    fontFamily: fonts.bodyStrong,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  sectionHeading: {
    fontFamily: fonts.heading,
    fontSize: 22,
    marginTop: 4,
  },
  accountName: {
    fontFamily: fonts.heading,
    fontSize: 26,
  },
  accountMeta: {
    fontFamily: fonts.body,
    fontSize: 14,
  },
  preferenceRow: {
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  preferenceLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
  },
  successBanner: {
    backgroundColor: '#DCFCE7',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  successBannerText: {
    color: '#15803D',
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
  },
  infoBanner: {
    backgroundColor: '#F3F4F6',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  infoBannerText: {
    color: '#57534E',
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
});
