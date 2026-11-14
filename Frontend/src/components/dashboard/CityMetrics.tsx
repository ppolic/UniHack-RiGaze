import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CityInsightsSummary } from '../../types/insights';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { AppCard } from '../common/AppCard';
import { useTranslation } from '../../hooks/useTranslation';

interface CityMetricsProps {
  summary?: CityInsightsSummary;
  gapCount?: number;
}

export const CityMetrics: React.FC<CityMetricsProps> = ({ summary, gapCount }) => {
  const { language, t } = useTranslation();
  if (!summary && gapCount === undefined) return null;

  return (
    <View style={styles.container}>
      {/* Independent sources: never convert unavailable gap data into zero. */}
      <View style={styles.metricsGrid}>
        {summary && (
          <>
            <AppCard style={styles.metricCard}>
              <Text style={styles.metricNumber}>
                {summary.totalCo2SavedCityKg.toLocaleString(language === 'en' ? 'en-GB' : 'ro-RO')} kg
              </Text>
              <Text style={styles.metricLabel}>{t.simCo2Saved}</Text>
            </AppCard>

            <AppCard style={styles.metricCard}>
              <Text style={styles.metricNumber}>
                {summary.totalSimulatedTrips.toLocaleString(language === 'en' ? 'en-GB' : 'ro-RO')}
              </Text>
              <Text style={styles.metricLabel}>{t.simTrips}</Text>
            </AppCard>
          </>
        )}
        {gapCount !== undefined && (
          <AppCard style={styles.metricCard}>
            <Text style={styles.metricNumber}>{gapCount.toLocaleString(language === 'en' ? 'en-GB' : 'ro-RO')}</Text>
            <Text style={styles.metricLabel}>{t.identifiedCells}</Text>
          </AppCard>
        )}
      </View>

      {/* Top 3 Investment Zones */}
      {summary && (
        <>
          <Text style={styles.sectionTitle}>{t.topGapZonesHeading}</Text>
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
                  <Text style={[
                    styles.recommendation,
                    zone.recommendation === 'New Bike Corridor' && styles.bikeRecommendation,
                  ]}>{zone.recommendation === 'New Bike Corridor' ? t.recommendBike : zone.recommendation === 'Extend Tram Line' ? t.recommendTransit : t.recommendHub}</Text>
                  <Text style={styles.co2Potential}>
                    {t.simPotentialPrefix} -{(zone.estimatedCo2ReductionYearKg / 1000).toFixed(1)}t {t.perYearSuffix}
                  </Text>
                </View>
              </AppCard>
            ))}
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    minWidth: 0,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  metricCard: {
    flexBasis: 240,
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  metricNumber: {
    ...typography.h2,
    color: colors.primaryDark,
    fontWeight: '800',
    textAlign: 'center',
    maxWidth: '100%',
  },
  metricLabel: {
    maxWidth: '100%',
    flexShrink: 1,
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  zoneCard: {
    padding: spacing.md,
    flexBasis: 300,
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  zoneHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  rankBadge: {
    width: 28,
    height: 28,
    flexShrink: 0,
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
    flexBasis: 160,
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    color: colors.textPrimary,
  },
  zoneDetails: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  co2Potential: {
    ...typography.captionMedium,
    color: colors.textSecondary,
  },
  recommendation: {
    ...typography.badge,
    color: colors.info,
    backgroundColor: colors.infoLight,
    borderColor: colors.info,
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    alignSelf: 'flex-start',
    maxWidth: '100%',
    flexShrink: 1,
  },
  bikeRecommendation: {
    color: colors.primaryDark,
    backgroundColor: colors.successLight,
    borderColor: colors.success,
  },
});
