import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { getApiUrlPresets } from '../config/apiBaseUrl';
import { fonts, getRolePalette } from '../theme/tokens';
import { UserRole } from '../types/domain';
import { AppTextField, FieldLabel, PrimaryButton, SecondaryButton, SurfaceCard } from './ui';

export function ApiEndpointCard({
  role,
  apiBaseUrl,
  defaultApiBaseUrl,
  onSave,
  onReset,
  onTest,
}: {
  role: UserRole;
  apiBaseUrl: string;
  defaultApiBaseUrl: string;
  onSave: (value: string) => Promise<void>;
  onReset: () => Promise<void>;
  onTest: (value: string) => Promise<'connected' | 'error'>;
}) {
  const palette = getRolePalette(role);
  const [draftValue, setDraftValue] = useState(apiBaseUrl);
  const [status, setStatus] = useState<'idle' | 'connected' | 'error' | 'saving'>('idle');
  const [message, setMessage] = useState('Use EXPO_PUBLIC_API_URL or set a device-specific override here.');
  const presets = useMemo(() => getApiUrlPresets(defaultApiBaseUrl), [defaultApiBaseUrl]);

  async function handleSave() {
    setStatus('saving');
    await onSave(draftValue);
    setStatus('connected');
    setMessage('Saved. New requests will use this API base URL.');
  }

  async function handleReset() {
    await onReset();
    setDraftValue(defaultApiBaseUrl);
    setStatus('idle');
    setMessage('Reverted to EXPO_PUBLIC_API_URL.');
  }

  async function handleTest() {
    const result = await onTest(draftValue);
    setStatus(result);
    setMessage(
      result === 'connected'
        ? 'Backend responded successfully.'
        : 'Connection failed. Use 10.0.2.2 for Android emulator or your computer LAN IP for a physical device.'
    );
  }

  return (
    <SurfaceCard role={role}>
      <View style={{ gap: 12 }}>
        <View style={{ gap: 4 }}>
          <Text style={{ color: palette.muted, fontFamily: fonts.bodyStrong, fontSize: 11, letterSpacing: 1.1, textTransform: 'uppercase' }}>
            Connection
          </Text>
          <Text style={{ color: palette.text, fontFamily: fonts.heading, fontSize: 22 }}>API Endpoint</Text>
          <Text style={{ color: palette.muted, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 }}>
            Emulator: `http://10.0.2.2:5000/api`. Physical device: `http://YOUR-LAN-IP:5000/api`.
          </Text>
        </View>

        <View>
          <FieldLabel label="API Base URL" role={role} />
          <AppTextField
            value={draftValue}
            onChangeText={setDraftValue}
            placeholder="http://10.0.2.2:5000/api"
            role={role}
            autoCapitalize="none"
          />
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {presets.map((preset) => (
            <SecondaryButton key={preset.key} label={preset.label} onPress={() => setDraftValue(preset.value)} role={role} />
          ))}
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <SecondaryButton label="Test URL" onPress={handleTest} role={role} />
          </View>
          <View style={{ flex: 1 }}>
            <PrimaryButton label={status === 'saving' ? 'Saving...' : 'Save URL'} onPress={handleSave} role={role} />
          </View>
        </View>

        <SecondaryButton label="Use Env Default" onPress={handleReset} role={role} />

        <View
          style={{
            backgroundColor:
              status === 'connected'
                ? '#DCFCE7'
                : status === 'error'
                  ? '#FEE2E2'
                  : palette.accent,
            borderRadius: 20,
            paddingHorizontal: 14,
            paddingVertical: 12,
          }}
        >
          <Text
            style={{
              color:
                status === 'connected'
                  ? palette.success
                  : status === 'error'
                    ? palette.danger
                    : palette.primaryDark,
              fontFamily: fonts.bodySemiBold,
              fontSize: 13,
              lineHeight: 18,
            }}
          >
            {message}
          </Text>
        </View>
      </View>
    </SurfaceCard>
  );
}
