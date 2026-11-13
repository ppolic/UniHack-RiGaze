import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { AppCard } from '../common/AppCard';
import { Badge } from '../common/Badge';

export const ProfileDetails: React.FC = () => {
  const { user, updatePreferences, hasDisability } = useAuth();

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
          <Badge label={`Dob: ${user.age} god.`} variant="neutral" />
          {hasDisability && (
            <Badge label="Pristupačnost aktivna" variant="info" />
          )}
        </View>
      </AppCard>

      {/* Mobility Preferences & Accessibility Settings */}
      <Text style={styles.sectionTitle}>Pristupačnost i Vlastita Vozila</Text>
      <AppCard style={styles.settingsCard}>
        {/* Disability Toggle */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleLabel}>Osoba s invaliditetom / Kolica</Text>
            <Text style={styles.toggleDesc}>
              Automatski filtrira pristupačan javni prijevoz i rezervirani parking.
            </Text>
          </View>
          <Switch
            value={user.preferences.hasDisability}
            onValueChange={(val) => updatePreferences({ hasDisability: val })}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>

        <View style={styles.divider} />

        {/* Own Bicycle Toggle */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleLabel}>Posjedujem vlastiti bicikl</Text>
            <Text style={styles.toggleDesc}>
              Ne predlaže najam, već direktne biciklističke rute.
            </Text>
          </View>
          <Switch
            value={user.preferences.hasOwnBicycle}
            onValueChange={(val) => updatePreferences({ hasOwnBicycle: val })}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>

        <View style={styles.divider} />

        {/* Own Car Toggle */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleLabel}>Posjedujem automobil</Text>
            <Text style={styles.toggleDesc}>
              Omogućuje opciju vožnje s preporučenim parkingom.
            </Text>
          </View>
          <Switch
            value={user.preferences.hasOwnCar}
            onValueChange={(val) => updatePreferences({ hasOwnCar: val })}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
      </AppCard>
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
});
