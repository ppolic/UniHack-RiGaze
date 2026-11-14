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

export const ProfileDetails: React.FC<{ children?: React.ReactNode; verifiedAge?: number | null }> = ({ children, verifiedAge }) => {
  const { language, t } = useTranslation();
  const localize = (ro: string, en: string) => language === 'en' ? en : ro;
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
            <Badge label="Auth0 Passkey Biometrie ⚡" variant="info" />
          )}
          <Badge
            label={
              user.zeroKnowledgeAgeVerified
                ? `GDPR Zero-Knowledge: ${user.ageCategory ?? 'Adult'} 🛡️`
                : (verifiedAge === undefined || verifiedAge === null
                ? localize('Vârstă neconfirmată', 'Age unconfirmed')
                : t.ageBadge(verifiedAge))
            }
            variant="neutral"
          />
          {user.trustBadge && (
            <Badge label={user.trustBadge} variant="warning" />
          )}
          {hasDisability && <Badge label={t.accessibilityActiveBadge} variant="info" />}
          {(wcagLargeText || wcagTextRouteMode) && (
            <Badge label={localize('Opțiuni vizuale active', 'Visual options enabled')} variant="success" />
          )}
        </View>
        {children && <View style={styles.editor}>{children}</View>}
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
            <Text style={styles.toggleDesc}>
              {localize('Ține cont de accesibilitate când sunt propuse opțiunile de transport.', 'Consider accessibility when suggesting transport options.')}
            </Text>
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
            <Text style={styles.toggleDesc}>
              {localize('Folosește bicicleta proprie la planificarea călătoriilor.', 'Use your own bicycle when planning journeys.')}
            </Text>
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
            <Text style={styles.toggleDesc}>
              {localize('Include opțiunile de călătorie cu mașina proprie.', 'Include travel options using your own car.')}
            </Text>
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
            <Text style={styles.toggleDesc}>
              {t.wcagLargeTextDesc}
            </Text>
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
            <Text style={styles.toggleDesc}>
              {t.wcagTextMapDesc}
            </Text>
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
});
