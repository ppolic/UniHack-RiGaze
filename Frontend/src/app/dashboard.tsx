import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator } from 'react-native';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { typography } from '../theme/typography';
import { CityMetrics } from '../components/dashboard/CityMetrics';
import { AppCard } from '../components/common/AppCard';
import { AppButton } from '../components/common/AppButton';
import { Badge } from '../components/common/Badge';
import { insightsService } from '../services/insightsService';
import { CityInsightsSummary, GapCell } from '../types/insights';
import { useTranslation } from '../hooks/useTranslation';

type RequestState<T> =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'success'; data: T };

// Each section owns its request lifecycle; retrying one never resets the other.
function useDashboardRequest<T>(load: () => Promise<T>) {
  const [state, setState] = useState<RequestState<T>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const pending = useRef(true);
  const requestId = useRef(0);
  useEffect(() => {
    let active = true;
    const id = ++requestId.current;
    pending.current = true;
    const run = async () => {
      try {
        const data = await load();
        if (data == null) throw new Error('Missing dashboard response');
        if (active && requestId.current === id) setState({ status: 'success', data });
      } catch {
        if (active && requestId.current === id) setState({ status: 'error' });
      } finally {
        if (active && requestId.current === id) pending.current = false;
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [load, attempt]);

  const retry = () => {
    // Acquire synchronously to block repeated taps before the loading render.
    if (pending.current || state.status !== 'error') return;
    pending.current = true;
    setState({ status: 'loading' });
    setAttempt((value) => value + 1);
  };
  return { state, retry };
}

function SectionLoading({ message }: { message: string }) {
  return (
    <View style={styles.feedback} accessible accessibilityRole="progressbar"
      accessibilityLabel={message} accessibilityState={{ busy: true }} accessibilityLiveRegion="polite">
      <ActivityIndicator color={colors.primary} accessible={false} />
      <Text style={styles.feedbackText}>{message}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const { t } = useTranslation();
  const summary = useDashboardRequest<CityInsightsSummary>(insightsService.getSummary);
  const gaps = useDashboardRequest<GapCell[]>(insightsService.getGapCells);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.container}>
          {/* Banner with Simulation notice required by track evaluation */}
          <View style={styles.banner}>
            <Text style={styles.bannerTitle}>
              {t.dashboardBannerTitle}
            </Text>
            <Text style={styles.bannerSubtitle}>
              {t.dashboardBannerSubtitle}
            </Text>
            <View style={styles.simulationBadgeRow}>
              <Badge
                label={t.dashboardSimBadge}
                variant="info"
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionHeading}>{t.dashboardMetricsHeading}</Text>
            {summary.state.status === 'loading' && (
              <SectionLoading message={t.dashboardMetricsLoading} />
            )}
            {summary.state.status === 'error' && (
              <AppCard style={styles.feedback}>
                <Text style={styles.errorText} accessibilityRole="alert" accessibilityLiveRegion="assertive">
                  {t.dashboardMetricsError}
                </Text>
                <AppButton title={t.dashboardMetricsRetry} onPress={summary.retry} />
              </AppCard>
            )}
          </View>
          <CityMetrics
            summary={summary.state.status === 'success' ? summary.state.data : undefined}
            gapCount={gaps.state.status === 'success' ? gaps.state.data.length : undefined}
          />
          {summary.state.status === 'success' && summary.state.data.topGapZones.length === 0 && (
            <View style={styles.section}>
              <AppCard>
                <Text style={styles.feedbackText} accessibilityLiveRegion="polite">
                  {t.dashboardNoZones}
                </Text>
              </AppCard>
            </View>
          )}

          {/* Identified Infrastructure Gaps */}
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>
              {t.dashboardGapsHeading}
            </Text>

            {gaps.state.status === 'loading' && (
              <SectionLoading message={t.dashboardGapsLoading} />
            )}
            {gaps.state.status === 'error' && (
              <AppCard style={styles.feedback}>
                <Text style={styles.errorText} accessibilityRole="alert" accessibilityLiveRegion="assertive">
                  {t.dashboardGapsError}
                </Text>
                <AppButton title={t.dashboardGapsRetry} onPress={gaps.retry} />
              </AppCard>
            )}
            {gaps.state.status === 'success' && gaps.state.data.length === 0 && (
              <AppCard>
                <Text style={styles.feedbackText} accessibilityLiveRegion="polite">
                  {t.dashboardNoGaps}
                </Text>
              </AppCard>
            )}
            <View style={styles.gapGrid}>
              {gaps.state.status === 'success' && gaps.state.data.map((gap) => (
                <AppCard key={gap.id} style={styles.gapCard}>
                  <View style={styles.gapHeader}>
                    <Text style={styles.gapZoneName}>{gap.zoneName}</Text>
                    <Text style={styles.priorityBadge}>{t.demoPriorityLabel} {gap.priorityScore}/100</Text>
                  </View>

                  <View style={styles.gapStatsRow}>
                    <Text style={styles.gapStat}>
                      {t.carShareLabel} <Text style={styles.bold}>{gap.carSharePercentage}%</Text>
                    </Text>
                    <Text style={styles.gapStat}>
                      {t.toBikeLaneLabel} <Text style={styles.bold}>{gap.distanceToNearestBikeLaneMeters}m</Text>
                    </Text>
                  </View>

                  <Text style={styles.gapStat}>
                    {t.toFirstStopLabel} <Text style={styles.bold}>{gap.distanceToNearestTransitStopMeters}m</Text>
                  </Text>
                </AppCard>
              ))}
            </View>
          </View>
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
  scrollContent: {
    paddingBottom: spacing['3xl'],
    alignItems: 'center',
  },
  container: {
    width: '100%',
    maxWidth: 1200,
    minWidth: 0,
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
  feedback: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  feedbackText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  errorText: {
    ...typography.body,
    color: colors.danger,
  },
  gapCard: {
    flexBasis: 360,
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  gapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  gapHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  gapZoneName: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.textPrimary,
    flexBasis: 160,
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  gapStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
    marginVertical: spacing.xs,
  },
  gapStat: {
    ...typography.caption,
    color: colors.textSecondary,
    flexShrink: 1,
    maxWidth: '100%',
  },
  priorityBadge: {
    ...typography.badge,
    color: colors.danger,
    backgroundColor: colors.dangerLight,
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    maxWidth: '100%',
    flexShrink: 1,
  },
  bold: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
