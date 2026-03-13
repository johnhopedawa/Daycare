import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Settings } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { fonts, getRolePalette } from '../theme/tokens';
import { UserRole } from '../types/domain';

export function LoadingScreen() {
  return (
    <SafeAreaView style={styles.loadingSafeArea}>
      <ActivityIndicator size="large" color="#E07A5F" />
      <Text style={styles.loadingText}>Loading native workspace...</Text>
    </SafeAreaView>
  );
}

export function AppScreen({
  role,
  eyebrow,
  title,
  subtitle,
  children,
  actionLabel,
  action,
}: {
  role: UserRole;
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  actionLabel?: string;
  action?: () => void;
}) {
  const navigation = useNavigation();
  const palette = getRolePalette(role);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[palette.surface, palette.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.heroCard, { borderColor: palette.border }]}
        >
          <View style={styles.heroHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.eyebrow, { color: palette.muted }]}>{eyebrow}</Text>
              <Text style={[styles.heroTitle, { color: palette.text }]}>{title}</Text>
              <Text style={[styles.heroSubtitle, { color: palette.muted }]}>{subtitle}</Text>
            </View>
            <Pressable
              onPress={() => navigation.navigate('Settings' as never)}
              style={[styles.settingsButton, { backgroundColor: palette.surface }]}
            >
              <Settings size={18} color={palette.primaryDark} />
            </Pressable>
          </View>
          {action ? (
            <PrimaryButton label={actionLabel || 'Refresh'} onPress={action} role={role} compact />
          ) : null}
        </LinearGradient>
        <View style={styles.contentStack}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function SurfaceCard({
  role,
  children,
  style,
}: {
  role: UserRole;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const palette = getRolePalette(role);
  return <View style={[styles.surfaceCard, { backgroundColor: palette.surface }, style]}>{children}</View>;
}

export function SectionTitle({
  title,
  caption,
  role,
}: {
  title: string;
  caption: string;
  role: UserRole;
}) {
  const palette = getRolePalette(role);
  return (
    <View style={styles.sectionTitle}>
      <Text style={[styles.sectionCaption, { color: palette.muted }]}>{caption}</Text>
      <Text style={[styles.sectionHeading, { color: palette.text }]}>{title}</Text>
    </View>
  );
}

export function StatCard({
  role,
  label,
  value,
}: {
  role: UserRole;
  label: string;
  value: string | number;
}) {
  const palette = getRolePalette(role);
  return (
    <View style={[styles.statCard, { backgroundColor: palette.surface }]}>
      <Text style={[styles.statLabel, { color: palette.muted }]}>{label}</Text>
      <Text style={[styles.statValue, { color: palette.text }]}>{value}</Text>
    </View>
  );
}

export function Badge({
  label,
  role,
  tone = 'default',
}: {
  label: string;
  role: UserRole;
  tone?: 'default' | 'success' | 'warning' | 'danger';
}) {
  const palette = getRolePalette(role);
  const toneStyles = {
    default: { backgroundColor: palette.accent, color: palette.primaryDark },
    success: { backgroundColor: '#DCFCE7', color: palette.success },
    warning: { backgroundColor: '#FFEDD5', color: palette.warning },
    danger: { backgroundColor: '#FEE2E2', color: palette.danger },
  };

  return (
    <View style={[styles.badge, { backgroundColor: toneStyles[tone].backgroundColor }]}>
      <Text style={[styles.badgeText, { color: toneStyles[tone].color }]}>{label}</Text>
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  role,
  compact,
  disabled,
}: {
  label: string;
  onPress: () => void;
  role: UserRole;
  compact?: boolean;
  disabled?: boolean;
}) {
  const palette = getRolePalette(role);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.primaryButton,
        compact ? styles.primaryButtonCompact : null,
        {
          backgroundColor: disabled ? palette.border : palette.primary,
        },
      ]}
    >
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  onPress,
  role,
}: {
  label: string;
  onPress: () => void;
  role: UserRole;
}) {
  const palette = getRolePalette(role);
  return (
    <Pressable onPress={onPress} style={[styles.secondaryButton, { borderColor: palette.border }]}>
      <Text style={[styles.secondaryButtonText, { color: palette.muted }]}>{label}</Text>
    </Pressable>
  );
}

export function FieldLabel({ label, role }: { label: string; role: UserRole }) {
  const palette = getRolePalette(role);
  return <Text style={[styles.fieldLabel, { color: palette.muted }]}>{label}</Text>;
}

export function AppTextField({
  value,
  onChangeText,
  placeholder,
  role,
  secureTextEntry,
  multiline,
  keyboardType,
  autoCapitalize,
  style,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  role: UserRole;
  secureTextEntry?: boolean;
  multiline?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  style?: StyleProp<TextStyle>;
}) {
  const palette = getRolePalette(role);
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={palette.muted}
      secureTextEntry={secureTextEntry}
      multiline={multiline}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      style={[
        styles.textField,
        {
          color: palette.text,
          borderColor: palette.border,
          backgroundColor: palette.surface,
        },
        multiline ? styles.multilineField : null,
        style,
      ]}
    />
  );
}

export function EmptyState({
  role,
  message,
}: {
  role: UserRole;
  message: string;
}) {
  const palette = getRolePalette(role);
  return (
    <View style={[styles.emptyState, { backgroundColor: palette.surface }]}>
      <Text style={[styles.emptyStateText, { color: palette.muted }]}>{message}</Text>
    </View>
  );
}

export function ErrorBanner({
  message,
}: {
  message: string;
}) {
  return (
    <View style={styles.errorBanner}>
      <Text style={styles.errorBannerText}>{message}</Text>
    </View>
  );
}

export function SheetModal({
  visible,
  children,
  onClose,
}: {
  visible: boolean;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <Pressable style={styles.modalDismiss} onPress={onClose} />
        <View style={styles.modalSheet}>{children}</View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
    paddingTop: 8,
  },
  contentStack: {
    gap: 14,
  },
  heroCard: {
    borderRadius: 28,
    borderWidth: 1,
    marginBottom: 14,
    padding: 18,
    gap: 16,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  settingsButton: {
    alignItems: 'center',
    borderRadius: 20,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  eyebrow: {
    fontFamily: fonts.bodyStrong,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontFamily: fonts.heading,
    fontSize: 30,
    marginTop: 8,
  },
  heroSubtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  surfaceCard: {
    borderRadius: 26,
    padding: 18,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  sectionTitle: {
    gap: 4,
    marginBottom: 12,
  },
  sectionCaption: {
    fontFamily: fonts.bodyStrong,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  sectionHeading: {
    fontFamily: fonts.heading,
    fontSize: 22,
  },
  statCard: {
    borderRadius: 24,
    gap: 8,
    minHeight: 110,
    padding: 18,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 2,
  },
  statLabel: {
    fontFamily: fonts.bodyStrong,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  statValue: {
    fontFamily: fonts.heading,
    fontSize: 28,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: {
    fontFamily: fonts.bodyStrong,
    fontSize: 11,
  },
  primaryButton: {
    alignItems: 'center',
    borderRadius: 999,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 18,
  },
  primaryButtonCompact: {
    minHeight: 42,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontFamily: fonts.bodyStrong,
    fontSize: 15,
  },
  secondaryButton: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 18,
  },
  secondaryButtonText: {
    fontFamily: fonts.bodyStrong,
    fontSize: 15,
  },
  fieldLabel: {
    fontFamily: fonts.bodyStrong,
    fontSize: 11,
    letterSpacing: 1.1,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  textField: {
    borderRadius: 22,
    borderWidth: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  multilineField: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  emptyState: {
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 22,
  },
  emptyStateText: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  errorBannerText: {
    color: '#B91C1C',
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
  },
  modalBackdrop: {
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalDismiss: {
    flex: 1,
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 20,
    paddingBottom: 32,
  },
  loadingSafeArea: {
    alignItems: 'center',
    backgroundColor: '#FFF8F3',
    flex: 1,
    gap: 12,
    justifyContent: 'center',
  },
  loadingText: {
    color: '#78716C',
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
  },
});
