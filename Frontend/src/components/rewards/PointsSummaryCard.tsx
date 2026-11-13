import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { AppCard } from '../common/AppCard';

export const PointsSummaryCard: React.FC = () => {
  const { user } = useAuth();

  const points = user?.totalEcoPoints ?? 0;
  const co2Saved = user?.totalCo2SavedKg ?? 0;
  const tripsCount = user?.completedTripsCount ?? 0;

  return (
    <AppCard style={styles.card}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.titleLabel}>Moji Eko-Bodovi</Text>
          <Text style={styles.pointsNumber}>{points}</Text>
        </View>
        <View style={styles.leafIconBadge}>
          <Text style={styles.leafEmoji}>🌱</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statVal}>{co2Saved} kg</Text>
          <Text style={styles.statLbl}>Ušteđeno CO₂</Text>
        </View>
        <View style={styles.verticalDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statVal}>{tripsCount}</Text>
          <Text style={styles.statLbl}>Zelenih ruta</Text>
        </View>
        <View style={styles.verticalDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statVal}>{(co2Saved * 0.05).toFixed(1)} 🌳</Text>
          <Text style={styles.statLbl}>Ekiv. stabala</Text>
        </View>
      </View>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#064E3B', // Deep forest emerald
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleLabel: {
    ...typography.captionMedium,
    color: '#A7F3D0',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  pointsNumber: {
    ...typography.h1,
    fontSize: 36,
    color: '#FFFFFF',
    fontWeight: '800',
    marginTop: 2,
  },
  leafIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  leafEmoji: {
    fontSize: 24,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginVertical: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statBox: {
    alignItems: 'center',
  },
  statVal: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statLbl: {
    ...typography.caption,
    fontSize: 11,
    color: '#A7F3D0',
    marginTop: 2,
  },
  verticalDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
});
