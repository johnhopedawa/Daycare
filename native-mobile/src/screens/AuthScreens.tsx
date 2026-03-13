import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuth } from '../auth/AuthContext';
import { ApiEndpointCard } from '../components/ApiEndpointCard';
import { AppTextField, ErrorBanner, PrimaryButton, SecondaryButton } from '../components/ui';
import { fonts, getRolePalette } from '../theme/tokens';

export function LoginScreen() {
  const palette = getRolePalette('ADMIN');
  const { apiBaseUrl, defaultApiBaseUrl, login, updateApiBaseUrl, resetApiBaseUrl, testConnection } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    try {
      setLoading(true);
      setError('');
      await login(email, password);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Login failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      style={{ flex: 1 }}
    >
      <LinearGradient
        colors={[palette.background, palette.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.loginContainer}
      >
        <View style={styles.loginHeader}>
          <Text style={[styles.loginEyebrow, { color: palette.primaryDark }]}>Real Native Mobile App</Text>
          <Text style={[styles.loginTitle, { color: palette.text }]}>Little Sparrows Academy</Text>
          <Text style={[styles.loginSubtitle, { color: palette.muted }]}>
            One login surface. Admin, Educator, and Parent accounts route to role-specific native tabs after authentication.
          </Text>
        </View>

        <View style={[styles.loginCard, { backgroundColor: palette.surface }]}>
          <View style={{ gap: 10 }}>
            <Text style={[styles.formEyebrow, { color: palette.muted }]}>Sign In</Text>
            <AppTextField
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              role="ADMIN"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <AppTextField
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              role="ADMIN"
              secureTextEntry
            />
            {error ? <ErrorBanner message={error} /> : null}
            <PrimaryButton label={loading ? 'Signing In...' : 'Continue'} onPress={handleLogin} role="ADMIN" disabled={loading} />
          </View>
        </View>

        <ApiEndpointCard
          role="ADMIN"
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
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

export function ForceResetPasswordScreen() {
  const palette = getRolePalette('ADMIN');
  const { forceResetPasswordForSession, logout } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleReset() {
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      await forceResetPasswordForSession(newPassword);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Password reset failed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <LinearGradient
      colors={[palette.background, palette.accent]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.resetContainer}
    >
      <View style={[styles.loginCard, { backgroundColor: palette.surface }]}>
        <Text style={[styles.loginEyebrow, { color: palette.primaryDark }]}>Action Required</Text>
        <Text style={[styles.loginTitle, { color: palette.text, fontSize: 30 }]}>Reset Your Password</Text>
        <Text style={[styles.loginSubtitle, { color: palette.muted }]}>
          This account is marked for password reset before the mobile workspace can open.
        </Text>

        <View style={{ gap: 10, marginTop: 16 }}>
          <AppTextField
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="New password"
            role="ADMIN"
            secureTextEntry
          />
          <AppTextField
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm new password"
            role="ADMIN"
            secureTextEntry
          />
          {error ? <ErrorBanner message={error} /> : null}
          <PrimaryButton label={saving ? 'Saving...' : 'Reset Password'} onPress={handleReset} role="ADMIN" disabled={saving} />
          <SecondaryButton label="Sign Out" onPress={() => void logout()} role="ADMIN" />
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  loginContainer: {
    flex: 1,
    gap: 16,
    paddingHorizontal: 16,
    paddingTop: 72,
    paddingBottom: 28,
  },
  loginHeader: {
    gap: 10,
  },
  loginEyebrow: {
    fontFamily: fonts.bodyStrong,
    fontSize: 12,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  loginTitle: {
    fontFamily: fonts.heading,
    fontSize: 38,
  },
  loginSubtitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
  },
  loginCard: {
    borderRadius: 30,
    padding: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  formEyebrow: {
    fontFamily: fonts.bodyStrong,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  resetContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
});
