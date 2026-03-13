import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL_OVERRIDE_KEY = 'daycare.native.api-url';
const NOTIFICATION_PREFS_KEY = 'daycare.native.notification-prefs';

export interface NotificationPreferences {
  messageAlerts: boolean;
  billingReminders: boolean;
  eventReminders: boolean;
}

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  messageAlerts: true,
  billingReminders: true,
  eventReminders: true,
};

export async function readApiUrlOverride() {
  return AsyncStorage.getItem(API_URL_OVERRIDE_KEY);
}

export async function writeApiUrlOverride(value: string) {
  if (!value) {
    await AsyncStorage.removeItem(API_URL_OVERRIDE_KEY);
    return;
  }

  await AsyncStorage.setItem(API_URL_OVERRIDE_KEY, value);
}

export async function readNotificationPreferences(): Promise<NotificationPreferences> {
  const rawValue = await AsyncStorage.getItem(NOTIFICATION_PREFS_KEY);
  if (!rawValue) {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }

  return {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...(JSON.parse(rawValue) as Partial<NotificationPreferences>),
  };
}

export async function writeNotificationPreferences(value: NotificationPreferences) {
  await AsyncStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(value));
}
