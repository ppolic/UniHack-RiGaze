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

export const ProfileDetails: React.FC<{ children?: React.ReactNode; verifiedAge?: number | null }> = ({ children, verifiedAge }) => {
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
          <Badge label={verifiedAge === undefined || verifiedAge === null ? 'Vârstă neconfirmată' : verifiedAge + ' ani'} variant="neutral" />
          {hasDisability && <Badge label="Rute accesibile" variant="info" />}
          {(wcagLargeText || wcagTextRouteMode) && <Badge label="Opțiuni vizuale active" variant="success" />}
        </View>
        {children && <View style={styles.editor}>{children}</View>}
      </AppCard>

      {/* Mobility Preferences & Accessibility Settings */}
      <Text style={styles.sectionTitle} accessibilityRole="header">
        Preferințe de mobilitate
      </Text>
      <AppCard style={styles.settingsCard}>
        {/* Disability Toggle */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleLabel}>Am nevoie de rute accesibile</Text>
            <Text style={styles.toggleDesc}>
              Ține cont de accesibilitate când sunt propuse opțiunile de transport.
            </Text>
          </View>
          <Switch
            value={user.preferences.hasDisability}
            onValueChange={(val) => updatePreferences({ hasDisability: val })}
            trackColor={{ false: colors.controlBorder, true: colors.primary }}
            thumbColor={colors.surface}
            accessibilityRole="switch"
            accessibilityLabel="Am nevoie de rute accesibile"
            accessibilityState={{ checked: user.preferences.hasDisability }}
          />
        </View>

        <View style={styles.divider} />

        {/* Own Bicycle Toggle */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleLabel}>Am bicicletă proprie</Text>
            <Text style={styles.toggleDesc}>
              Folosește bicicleta proprie la planificarea călătoriilor.
            </Text>
          </View>
          <Switch
            value={user.preferences.hasOwnBicycle}
            onValueChange={(val) => updatePreferences({ hasOwnBicycle: val })}
            trackColor={{ false: colors.controlBorder, true: colors.primary }}
            thumbColor={colors.surface}
            accessibilityRole="switch"
            accessibilityLabel="Am bicicletă proprie"
            accessibilityState={{ checked: user.preferences.hasOwnBicycle }}
          />
        </View>

        <View style={styles.divider} />

        {/* Own Car Toggle */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleLabel}>Am mașină proprie</Text>
            <Text style={styles.toggleDesc}>
              Include opțiunile de călătorie cu mașina proprie.
            </Text>
          </View>
          <Switch
            value={user.preferences.hasOwnCar}
            onValueChange={(val) => updatePreferences({ hasOwnCar: val })}
            trackColor={{ false: colors.controlBorder, true: colors.primary }}
            thumbColor={colors.surface}
            accessibilityRole="switch"
            accessibilityLabel="Am mașină proprie"
            accessibilityState={{ checked: user.preferences.hasOwnCar }}
          />
        </View>
      </AppCard>

      {/* WCAG 2.1 Level AA / Romanian Law 232/2022 / EN 301 549 Section */}
      <Text style={styles.wcagSectionTitle} accessibilityRole="header">
        Accesibilitate vizuală
      </Text>
      <AppCard style={styles.settingsCard}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleLabel}>Text mărit</Text>
            <Text style={styles.toggleDesc}>
              Mărește textele importante din opțiunile și instrucțiunile de traseu.
            </Text>
          </View>
          <Switch
            value={wcagLargeText}
            onValueChange={(val) => updatePreferences({ wcagLargeText: val })}
            trackColor={{ false: colors.controlBorder, true: colors.primary }}
            thumbColor={colors.surface}
            accessibilityRole="switch"
            accessibilityLabel="Activează textul mărit pentru trasee"
            accessibilityState={{ checked: wcagLargeText }}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleLabel}>Alternativă textuală pentru hartă</Text>
            <Text style={styles.toggleDesc}>
              Afișează stațiile și pașii călătoriei într-un format textual.
            </Text>
          </View>
          <Switch
            value={wcagTextRouteMode}
            onValueChange={(val) => updatePreferences({ wcagTextRouteMode: val })}
            trackColor={{ false: colors.controlBorder, true: colors.primary }}
            thumbColor={colors.surface}
            accessibilityRole="switch"
            accessibilityLabel="Activează alternativa textuală pentru hartă"
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
          accessibilityLabel="Deschide declarația de accesibilitate în română și engleză"
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.statementBtnTitle}>
              Declarație de accesibilitate
            </Text>
            <Text style={styles.statementBtnSub}>
              Informații despre accesibilitate și feedback
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
