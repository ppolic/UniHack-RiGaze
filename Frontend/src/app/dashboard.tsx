import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { CityMetrics } from '../components/dashboard/CityMetrics';
import { AppCard } from '../components/common/AppCard';
import { Badge } from '../components/common/Badge';
import { insightsService } from '../services/insightsService';
import { CityInsightsSummary, GapCell } from '../types/insights';

export default function DashboardScreen() {
  const [summary, setSummary] = useState<CityInsightsSummary | null>(null);
  const [gapCells, setGapCells] = useState<GapCell[]>([]);

  useEffect(() => {
    insightsService.getSummary().then(setSummary);
    insightsService.getGapCells().then(setGapCells);
  }, []);

  if (!summary) return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Banner with Simulation notice required by track evaluation */}
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>
            🌱 EcoMutare Green Intelligence (Primăria Timișoara)
          </Text>
          <Text style={styles.bannerSubtitle}>
            Gradski agregirani podaci: identifikacija praznina u biciklističkoj i tranzitnoj infrastrukturi.
          </Text>
          <View style={styles.simulationBadgeRow}>
            <Badge
              label="Simulacija na bazi realnih prometnih koridora Timișoare"
              variant="info"
            />
          </View>
        </View>

        {/* 3 Key Numbers & Top 3 Priority Zones */}
        <CityMetrics summary={summary} />

        {/* Identified Infrastructure Gaps */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>
            Praznine u Mreži (Visok auto-udio & manjak biciklističkih staza)
          </Text>

          {gapCells.map((gap) => (
            <AppCard key={gap.id} style={styles.gapCard}>
              <View style={styles.gapHeader}>
                <Text style={styles.gapZoneName}>{gap.zoneName}</Text>
                <Badge
                  label={`Prioritet: ${gap.priorityScore}/100`}
                  variant="alert"
                />
              </View>

              <View style={styles.gapStatsRow}>
                <Text style={styles.gapStat}>
                  🚗 Udio automobila: <Text style={styles.bold}>{gap.carSharePercentage}%</Text>
                </Text>
                <Text style={styles.gapStat}>
                  🚲 Do bike lanea: <Text style={styles.bold}>{gap.distanceToNearestBikeLaneMeters}m</Text>
                </Text>
              </View>

              <Text style={styles.gapStat}>
                🚏 Do prve stanice JPP-a: <Text style={styles.bold}>{gap.distanceToNearestTransitStopMeters}m</Text>
              </Text>
            </AppCard>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    paddingBottom: spacing['3xl'],
  },
  banner: {
    backgroundColor: colors.surfaceDark,
    padding: spacing.lg,
  },
  bannerTitle: {
    ...typography.h2,
    color: colors.textInverse,
    fontWeight: '800',
  },
  bannerSubtitle: {
    ...typography.caption,
    color: colors.textOnDark,
    marginTop: spacing.xs,
  },
  simulationBadgeRow: {
    marginTop: spacing.md,
  },
  section: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  sectionHeading: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  gapCard: {
    marginBottom: spacing.sm,
  },
  gapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  gapZoneName: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  gapStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: spacing.xs,
  },
  gapStat: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  bold: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
