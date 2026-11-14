import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { AppCard } from '../common/AppCard';
import { AppButton } from '../common/AppButton';
import { Badge } from '../common/Badge';
import { AccessibilityComplianceModal } from '../common/AccessibilityComplianceModal';
import { useTranslation } from '../../hooks/useTranslation';

interface ProfileDetailsProps {
  children?: React.ReactNode;
  verifiedAge?: number | null;
  onSavePreferences?: () => void;
  savingPreferences?: boolean;
  saveConfirmation?: string | null;
}

interface PreferenceRowProps {
  label: string;
  description: string;
  value: boolean;
  onChange: (nextValue: boolean) => void;
}

const PreferenceToggleRow: React.FC<PreferenceRowProps> = ({
  label,
  description,
  value,
  onChange,
}) => (
  <View style={styles.toggleRow}>
    <Pressable
      style={styles.toggleInfo}
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      hitSlop={{ top: 6, bottom: 6, left: 4, right: 8 }}
    >
      <Text style={styles.toggleLabel}>{label}</Text>
      <Text style={styles.toggleDesc}>{description}</Text>
    </Pressable>
    <Switch
      value={value}
      onValueChange={onChange}
      trackColor={{ false: colors.controlBorder, true: colors.primary }}
      thumbColor={colors.surface}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
    />
  </View>
);

export const ProfileDetails: React.FC<ProfileDetailsProps> = ({
  children,
  verifiedAge,
  onSavePreferences,
  savingPreferences = false,
  saveConfirmation,
}) => {
  const { t } = useTranslation();
  const {
    user,
    updatePreferences,
    hasDisability,
    wcagLargeText,
    wcagTextRouteMode,
  } = useAuth();
  const [wcagModalVisible, setWcagModalVisible] = useState(false);

  if (!user) return null;

  const mobilityToggles = [
    {
      key: 'hasDisability' as const,
      label: t.disabilityLabel,
      description: t.profileAccessibilityHint,
      value: !!user.preferences.hasDisability,
    },
    {
      key: 'hasOwnBicycle' as const,
      label: t.ownBikeLabel,
      description: t.profileOwnBikeHint,
      value: !!user.preferences.hasOwnBicycle,
    },
    {
      key: 'hasOwnScooter' as const,
      label: t.ownScooterLabel,
      description: t.ownScooterDesc,
      value: !!user.preferences.hasOwnScooter,
    },
    {
      key: 'hasOwnCar' as const,
      label: t.ownCarLabel,
      description: t.profileOwnCarHint,
      value: !!user.preferences.hasOwnCar,
    },
  ];

  const law232Toggles = [
    {
      key: 'wcagLargeText' as const,
      label: t.wcagLargeTextLabel,
      description: t.wcagLargeTextDesc,
      value: wcagLargeText,
    },
    {
      key: 'wcagTextRouteMode' as const,
      label: t.wcagTextMapLabel,
      description: t.wcagTextMapDesc,
      value: wcagTextRouteMode,
    },
  ];

  return (
    <View style={styles.container}>
      <AppCard style={styles.headerCard}>
        <View style={styles.identityRow}>
          <View style={styles.avatarCircle} accessible={false}>
            <Text style={styles.avatarText}>
              {user.fullName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}
            </Text>
          </View>
          <View style={styles.identity}>
            <Text style={styles.userName}>{user.fullName}</Text>
            <Text selectable style={styles.userEmail}>{user.email}</Text>
          </View>
        </View>
        <View style={styles.badgesRow}>
          {user.organizationBadge && (
            <Badge label={user.organizationBadge} variant="success" />
          )}
          {user.passkeyEnabled && (
            <Badge label={t.profilePasskeyBadge} variant="info" />
          )}
          <Badge
            label={
              user.zeroKnowledgeAgeVerified
                ? `GDPR Zero-Knowledge: ${user.ageCategory ?? 'Adult'} 🛡️`
                : (verifiedAge === undefined || verifiedAge === null
                ? t.profileAgeUnconfirmed
                : t.ageBadge(verifiedAge))
            }
            variant="neutral"
          />
          {user.trustBadge && (
            <Badge label={user.trustBadge} variant="warning" />
          )}
          {hasDisability && <Badge label={t.accessibilityActiveBadge} variant="info" />}
          {(wcagLargeText || wcagTextRouteMode) && (
            <Badge label={t.profileVisualOptionsActive} variant="success" />
          )}
        </View>
        {children && <View style={styles.editor}>{children}</View>}
      </AppCard>

      {/* Mobility Preferences & Accessibility Settings */}
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {t.accessibilityAndVehicles}
      </Text>
      <AppCard style={styles.settingsCard}>
        {mobilityToggles.map((item, idx) => (
          <React.Fragment key={item.key}>
            {idx > 0 && <View style={styles.divider} />}
            <PreferenceToggleRow
              label={item.label}
              description={item.description}
              value={item.value}
              onChange={(val) => updatePreferences({ [item.key]: val })}
            />
          </React.Fragment>
        ))}
      </AppCard>

      {/* WCAG 2.1 Level AA / Romanian Law 232/2022 / EN 301 549 Section */}
      <Text style={styles.wcagSectionTitle} accessibilityRole="header">
        {t.wcagSectionHeader}
      </Text>
      <AppCard style={styles.settingsCard}>
        {law232Toggles.map((item, idx) => (
          <React.Fragment key={item.key}>
            {idx > 0 && <View style={styles.divider} />}
            <PreferenceToggleRow
              label={item.label}
              description={item.description}
              value={item.value}
              onChange={(val) => updatePreferences({ [item.key]: val })}
            />
          </React.Fragment>
        ))}

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.statementOpenBtn}
          onPress={() => setWcagModalVisible(true)}
          activeOpacity={0.85}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          accessibilityRole="button"
          accessibilityLabel={t.statementModalA11y}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.statementBtnTitle}>
              {t.statementModalTitleBtn}
            </Text>
            <Text style={styles.statementBtnSub}>
              {t.statementModalSubBtn}
            </Text>
          </View>
          <Text style={styles.statementBtnArrow}>➔</Text>
        </TouchableOpacity>
      </AppCard>

      {onSavePreferences && (
        <AppButton
          title={savingPreferences ? t.savingChangesBtn : t.savePreferencesBtn}
          onPress={onSavePreferences}
          disabled={savingPreferences}
          style={styles.savePrefsBtn}
        />
      )}

      {saveConfirmation && (
        <View style={styles.confirmationBanner} accessibilityLiveRegion="polite">
          <Text style={styles.confirmationText}>✅ {saveConfirmation}</Text>
        </View>
      )}

      <AccessibilityComplianceModal
        visible={wcagModalVisible}
        onClose={() => setWcagModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: spacing.lg },
  headerCard: { gap: spacing.lg, padding: spacing.xl },
  identityRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.lg },
  identity: { flexGrow: 1, flexBasis: 180, minWidth: 0, gap: spacing.xs },
  avatarCircle: { width: 64, height: 64, borderRadius: borderRadius.full, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  avatarText: { ...typography.h2, color: colors.primaryDark },
  userName: { ...typography.h2, color: colors.textPrimary },
  userEmail: { ...typography.body, color: colors.textSecondary, flexShrink: 1 },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  editor: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.lg },
  sectionTitle: { ...typography.h3, color: colors.textPrimary, marginTop: spacing.sm },
  settingsCard: { paddingVertical: spacing.sm },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 64, paddingVertical: spacing.md },
  toggleInfo: { flex: 1, minWidth: 0, paddingRight: spacing.md },
  toggleLabel: { ...typography.bodyMedium, color: colors.textPrimary },
  toggleDesc: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  wcagSectionTitle: { ...typography.h3, color: colors.textPrimary, marginTop: spacing.sm },
  statementOpenBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, backgroundColor: colors.primaryDark, borderRadius: borderRadius.md, padding: spacing.md, marginVertical: spacing.sm, gap: spacing.sm },
  statementBtnTitle: { ...typography.bodyMedium, color: colors.textInverse },
  statementBtnSub: { ...typography.caption, color: colors.textOnDark, marginTop: spacing.xs },
  statementBtnArrow: { ...typography.h3, color: colors.textInverse },
  savePrefsBtn: { minHeight: 48 },
  confirmationBanner: {
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  confirmationText: {
    ...typography.captionMedium,
    color: colors.primaryDark,
    fontWeight: '700',
  },
});
