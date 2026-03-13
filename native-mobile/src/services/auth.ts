import { buildHealthUrl } from '../config/apiBaseUrl';
import { AuthSession, AuthUser, HealthResponse } from '../types/domain';
import { requestJson } from './http';

export async function loginWithPassword(baseUrl: string, email: string, password: string): Promise<AuthSession> {
  return requestJson<AuthSession>({
    baseUrl,
    path: '/auth/login',
    method: 'POST',
    body: {
      email,
      password,
    },
  });
}

export async function fetchCurrentUser(baseUrl: string, token: string): Promise<AuthUser> {
  const response = await requestJson<{ user: AuthUser }>({
    baseUrl,
    path: '/auth/me',
    token,
  });
  return response.user;
}

export async function changePassword(
  baseUrl: string,
  token: string,
  currentPassword: string,
  newPassword: string
) {
  return requestJson<{ message: string }>({
    baseUrl,
    path: '/auth/change-password',
    method: 'POST',
    token,
    body: {
      currentPassword,
      newPassword,
    },
  });
}

export async function forceResetPassword(baseUrl: string, token: string, newPassword: string) {
  return requestJson<{ message: string }>({
    baseUrl,
    path: '/auth/force-reset-password',
    method: 'POST',
    token,
    body: {
      newPassword,
    },
  });
}

export async function fetchHealth(baseUrl: string): Promise<HealthResponse> {
  const healthUrl = buildHealthUrl(baseUrl);
  const response = await fetch(healthUrl, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`);
  }

  return response.json() as Promise<HealthResponse>;
}
