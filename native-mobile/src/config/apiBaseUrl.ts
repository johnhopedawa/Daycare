const ANDROID_EMULATOR_API_URL = 'http://10.0.2.2:5000/api';

export function normalizeApiBaseUrl(value?: string | null): string {
  const trimmed = String(value || '').trim();
  if (!trimmed) {
    return '';
  }

  return trimmed.replace(/\/+$/, '');
}

export function getEnvApiBaseUrl(): string {
  return normalizeApiBaseUrl(process.env.EXPO_PUBLIC_API_URL);
}

export function buildHealthUrl(baseUrl: string): string {
  const normalized = normalizeApiBaseUrl(baseUrl);
  if (!normalized) {
    return '';
  }

  if (normalized.endsWith('/api')) {
    return `${normalized.slice(0, -4)}/health`;
  }

  return `${normalized}/health`;
}

export function getApiUrlPresets(defaultUrl: string) {
  return [
    {
      key: 'default',
      label: 'Use Env',
      value: defaultUrl,
      helper: 'Use EXPO_PUBLIC_API_URL',
    },
    {
      key: 'android-emulator',
      label: 'Android Emulator',
      value: ANDROID_EMULATOR_API_URL,
      helper: 'Maps to local Docker backend on Android emulator',
    },
  ];
}
