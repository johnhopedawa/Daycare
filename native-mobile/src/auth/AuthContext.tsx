import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { getEnvApiBaseUrl, normalizeApiBaseUrl } from '../config/apiBaseUrl';
import { changePassword, fetchCurrentUser, fetchHealth, forceResetPassword, loginWithPassword } from '../services/auth';
import { clearSession, readSession, saveSession } from '../storage/sessionStorage';
import { readApiUrlOverride, writeApiUrlOverride } from '../storage/preferencesStorage';
import { AuthSession, AuthUser } from '../types/domain';

interface AuthContextValue {
  apiBaseUrl: string;
  defaultApiBaseUrl: string;
  session: AuthSession | null;
  user: AuthUser | null;
  isBootstrapping: boolean;
  login: (email: string, password: string) => Promise<AuthSession>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<AuthUser | null>;
  updateApiBaseUrl: (value: string) => Promise<string>;
  resetApiBaseUrl: () => Promise<string>;
  testConnection: (value?: string) => Promise<'connected' | 'error'>;
  changePasswordForSession: (currentPassword: string, newPassword: string) => Promise<void>;
  forceResetPasswordForSession: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const defaultApiBaseUrl = getEnvApiBaseUrl();

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        const [apiOverride, storedSession] = await Promise.all([readApiUrlOverride(), readSession()]);
        const resolvedApiBaseUrl = normalizeApiBaseUrl(apiOverride) || defaultApiBaseUrl;

        if (!mounted) {
          return;
        }

        setApiBaseUrl(resolvedApiBaseUrl);

        if (!storedSession) {
          return;
        }

        if (!resolvedApiBaseUrl) {
          setSession(storedSession);
          return;
        }

        try {
          const user = await fetchCurrentUser(resolvedApiBaseUrl, storedSession.token);
          const refreshedSession = {
            ...storedSession,
            user,
          };
          setSession(refreshedSession);
          await saveSession(refreshedSession);
        } catch (error) {
          await clearSession();
          setSession(null);
        }
      } finally {
        if (mounted) {
          setIsBootstrapping(false);
        }
      }
    }

    void bootstrap();

    return () => {
      mounted = false;
    };
  }, [defaultApiBaseUrl]);

  async function refreshUser() {
    if (!session || !apiBaseUrl) {
      return null;
    }

    const user = await fetchCurrentUser(apiBaseUrl, session.token);
    const nextSession = {
      ...session,
      user,
    };
    setSession(nextSession);
    await saveSession(nextSession);
    return user;
  }

  async function login(email: string, password: string) {
    if (!apiBaseUrl) {
      throw new Error('Set an API URL before signing in.');
    }

    const nextSession = await loginWithPassword(apiBaseUrl, email.trim(), password);
    setSession(nextSession);
    await saveSession(nextSession);
    return nextSession;
  }

  async function logout() {
    setSession(null);
    await clearSession();
  }

  async function updateApiBaseUrl(value: string) {
    const normalized = normalizeApiBaseUrl(value);
    setApiBaseUrl(normalized);
    await writeApiUrlOverride(normalized);
    return normalized;
  }

  async function resetApiBaseUrl() {
    const normalized = defaultApiBaseUrl;
    setApiBaseUrl(normalized);
    await writeApiUrlOverride('');
    return normalized;
  }

  async function testConnection(value?: string) {
    const target = normalizeApiBaseUrl(value) || apiBaseUrl;
    if (!target) {
      throw new Error('Set an API URL before testing the connection.');
    }

    try {
      await fetchHealth(target);
      return 'connected';
    } catch (error) {
      return 'error';
    }
  }

  async function changePasswordForSession(currentPassword: string, newPassword: string) {
    if (!session || !apiBaseUrl) {
      throw new Error('You must be signed in to change your password.');
    }

    await changePassword(apiBaseUrl, session.token, currentPassword, newPassword);
  }

  async function forceResetPasswordForSession(newPassword: string) {
    if (!session || !apiBaseUrl) {
      throw new Error('You must be signed in to reset your password.');
    }

    await forceResetPassword(apiBaseUrl, session.token, newPassword);
    await refreshUser();
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      apiBaseUrl,
      defaultApiBaseUrl,
      session,
      user: session?.user || null,
      isBootstrapping,
      login,
      logout,
      refreshUser,
      updateApiBaseUrl,
      resetApiBaseUrl,
      testConnection,
      changePasswordForSession,
      forceResetPasswordForSession,
    }),
    [apiBaseUrl, defaultApiBaseUrl, isBootstrapping, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
