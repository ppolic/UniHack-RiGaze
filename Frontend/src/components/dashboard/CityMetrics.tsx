import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CityInsightsSummary } from '../../types/insights';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { AppCard } from '../common/AppCard';
import { Badge } from '../common/Badge';

interface CityMetricsProps {
  summary: CityInsightsSummary;
}

export const CityMetrics: React.FC<CityMetricsProps> = ({ summary }) => {
  return (
    <View style={styles.container}>
      {/* 3 Key Numbers */}
      <View style={styles.metricsGrid}>
        <AppCard style={styles.metricCard}>
          <Text style={styles.metricNumber}>
            {summary.totalCo2SavedCityKg.toLocaleString()} kg
          </Text>
          <Text style={styles.metricLabel}>Ušteđeni CO₂ u gradu</Text>
        </AppCard>

        <AppCard style={styles.metricCard}>
          <Text style={styles.metricNumber}>
            {summary.totalSimulatedTrips.toLocaleString()}
          </Text>
          <Text style={styles.metricLabel}>Analiziranih putovanja</Text>
        </AppCard>
      </View>

      {/* Top 3 Investment Zones */}
      <Text style={styles.sectionTitle}>Top 3 Prioritetne Zone za Ulaganje</Text>
      <View style={styles.zonesList}>
        {summary.topGapZones.map((zone) => (
          <AppCard key={zone.rank} style={styles.zoneCard}>
            <View style={styles.zoneHeader}>
              <View style={styles.rankBadge}>
                <Text style={styles.rankText}>#{zone.rank}</Text>
              </View>
              <Text style={styles.zoneName}>{zone.zoneName}</Text>
            </View>

            <View style={styles.zoneDetails}>
              <Badge
                label={zone.recommendation}
                variant={zone.recommendation === 'New Bike Corridor' ? 'success' : 'info'}
              />
              <Text style={styles.co2Potential}>
                Potencijal: -{(zone.estimatedCo2ReductionYearKg / 1000).toFixed(1)}t CO₂/god
              </Text>
            </View>
          </AppCard>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  metricCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  metricNumber: {
    ...typography.h2,
    color: colors.primaryDark,
    fontWeight: '800',
  },
  metricLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  zonesList: {
    gap: spacing.sm,
  },
  zoneCard: {
    padding: spacing.md,
  },
  zoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    color: colors.textInverse,
    fontWeight: '700',
    fontSize: 12,
  },
  zoneName: {
    ...typography.bodyMedium,
    fontWeight: '700',
    flex: 1,
    color: colors.textPrimary,
  },
  zoneDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  co2Potential: {
    ...typography.captionMedium,
    color: colors.textSecondary,
  },
});
