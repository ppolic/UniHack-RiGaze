import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { AppCard } from '../common/AppCard';
import { Badge } from '../common/Badge';
import { AccessibilityComplianceModal } from '../common/AccessibilityComplianceModal';
import { useTranslation } from '../../hooks/useTranslation';

export const ProfileDetails: React.FC = () => {
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

  return (
    <View style={styles.container}>
      {/* User Header */}
      <AppCard style={styles.headerCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {user.fullName.slice(0, 2).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.userName}>{user.fullName}</Text>
        <Text style={styles.userEmail}>{user.email}</Text>
        <View style={styles.badgesRow}>
          <Badge label={t.ageBadge(user.age)} variant="neutral" />
          {hasDisability && (
            <Badge label={t.accessibilityActiveBadge} variant="info" />
          )}
          {(wcagLargeText || wcagTextRouteMode) && (
            <Badge label="WCAG 2.1 AA" variant="success" />
          )}
        </View>
      </AppCard>

      {/* Mobility Preferences & Accessibility Settings */}
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {t.accessibilityAndVehicles}
      </Text>
      <AppCard style={styles.settingsCard}>
        {/* Disability Toggle */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleLabel}>{t.disabilityLabel}</Text>
            <Text style={styles.toggleDesc}>{t.disabilityDesc}</Text>
          </View>
          <Switch
            value={user.preferences.hasDisability}
            onValueChange={(val) => updatePreferences({ hasDisability: val })}
            trackColor={{ false: colors.controlBorder, true: colors.primary }}
            thumbColor={colors.surface}
            accessibilityRole="switch"
            accessibilityLabel={t.disabilityLabel}
            accessibilityState={{ checked: user.preferences.hasDisability }}
          />
        </View>

        <View style={styles.divider} />

        {/* Own Bicycle Toggle */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleLabel}>{t.ownBikeLabel}</Text>
            <Text style={styles.toggleDesc}>{t.ownBikeDesc}</Text>
          </View>
          <Switch
            value={user.preferences.hasOwnBicycle}
            onValueChange={(val) => updatePreferences({ hasOwnBicycle: val })}
            trackColor={{ false: colors.controlBorder, true: colors.primary }}
            thumbColor={colors.surface}
            accessibilityRole="switch"
            accessibilityLabel={t.ownBikeLabel}
            accessibilityState={{ checked: user.preferences.hasOwnBicycle }}
          />
        </View>

        <View style={styles.divider} />

        {/* Own Car Toggle */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleLabel}>{t.ownCarLabel}</Text>
            <Text style={styles.toggleDesc}>{t.ownCarDesc}</Text>
          </View>
          <Switch
            value={user.preferences.hasOwnCar}
            onValueChange={(val) => updatePreferences({ hasOwnCar: val })}
            trackColor={{ false: colors.controlBorder, true: colors.primary }}
            thumbColor={colors.surface}
            accessibilityRole="switch"
            accessibilityLabel={t.ownCarLabel}
            accessibilityState={{ checked: user.preferences.hasOwnCar }}
          />
        </View>
      </AppCard>

      {/* WCAG 2.1 Level AA / Romanian Law 232/2022 / EN 301 549 Section */}
      <Text style={styles.wcagSectionTitle} accessibilityRole="header">
        {t.wcagSectionHeader}
      </Text>
      <AppCard style={styles.settingsCard}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleLabel}>{t.wcagLargeTextLabel}</Text>
            <Text style={styles.toggleDesc}>{t.wcagLargeTextDesc}</Text>
          </View>
          <Switch
            value={wcagLargeText}
            onValueChange={(val) => updatePreferences({ wcagLargeText: val })}
            trackColor={{ false: colors.controlBorder, true: colors.primary }}
            thumbColor={colors.surface}
            accessibilityRole="switch"
            accessibilityLabel={t.wcagLargeTextLabel}
            accessibilityState={{ checked: wcagLargeText }}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleLabel}>{t.wcagTextMapLabel}</Text>
            <Text style={styles.toggleDesc}>{t.wcagTextMapDesc}</Text>
          </View>
          <Switch
            value={wcagTextRouteMode}
            onValueChange={(val) => updatePreferences({ wcagTextRouteMode: val })}
            trackColor={{ false: colors.controlBorder, true: colors.primary }}
            thumbColor={colors.surface}
            accessibilityRole="switch"
            accessibilityLabel={t.wcagTextMapLabel}
            accessibilityState={{ checked: wcagTextRouteMode }}
          />
        </View>

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

      <AccessibilityComplianceModal
        visible={wcagModalVisible}
        onClose={() => setWcagModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
  },
  headerCard: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  avatarText: {
    ...typography.h2,
    color: colors.primaryDark,
  },
  userName: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  userEmail: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  settingsCard: {
    paddingVertical: spacing.sm,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  toggleInfo: {
    flex: 1,
    paddingRight: spacing.md,
  },
  toggleLabel: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  toggleDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  wcagSectionTitle: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  statementOpenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    backgroundColor: colors.primaryDark,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  statementBtnTitle: {
    ...typography.captionMedium,
    fontSize: 13,
    fontWeight: '800',
    color: colors.textInverse,
  },
  statementBtnSub: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textOnDark,
    marginTop: 2,
  },
  statementBtnArrow: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textInverse,
  },
});
