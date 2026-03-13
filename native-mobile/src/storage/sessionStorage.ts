import * as SecureStore from 'expo-secure-store';

import { AuthSession } from '../types/domain';

const SESSION_KEY = 'daycare.native.session';

export async function saveSession(session: AuthSession) {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
}

export async function readSession(): Promise<AuthSession | null> {
  const rawValue = await SecureStore.getItemAsync(SESSION_KEY);
  if (!rawValue) {
    return null;
  }

  return JSON.parse(rawValue) as AuthSession;
}

export async function clearSession() {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}
