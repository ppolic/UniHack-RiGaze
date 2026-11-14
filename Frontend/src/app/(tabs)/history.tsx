import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { AppCard } from '../../components/common/AppCard';
import { AppButton } from '../../components/common/AppButton';
import { Badge } from '../../components/common/Badge';
import { rewardsService } from '../../services/rewardsService';
import { TripHistoryItem } from '../../types/rewards';
import { useTranslation } from '../../hooks/useTranslation';

type HistoryState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'success'; trips: TripHistoryItem[] };

export default function HistoryScreen() {
  const { language, t } = useTranslation();
  const [state, setState] = useState<HistoryState>({ status: 'loading' });
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    let active = true;

    const loadHistory = async () => {
      try {
        const trips = await rewardsService.getTripHistory();
        if (active) setState({ status: 'success', trips });
      } catch {
        if (active) setState({ status: 'error' });
      }
    };

    void loadHistory();
    return () => {
      // Ignore results after unmount or when a newer request replaces this one.
      active = false;
    };
  }, [requestVersion, language]);

  const handleRetry = () => {
    setState({ status: 'loading' });
    setRequestVersion((version) => version + 1);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{t.historyTitle}</Text>
          <Text style={styles.subtitle}>{t.historySubtitle}</Text>
        </View>

        {state.status === 'loading' && (
          <View
            style={styles.statusCard}
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel={t.historyLoading}
            accessibilityState={{ busy: true }}
          >
            <ActivityIndicator size="large" color={colors.primary} accessible={false} />
            <Text style={styles.statusMessage}>{t.historyLoading}</Text>
          </View>
        )}

        {state.status === 'error' && (
          <AppCard style={styles.statusCard}>
            <Text
              style={styles.errorMessage}
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
            >
              {t.historyError}
            </Text>
            <AppButton title={t.retry} onPress={handleRetry} />
          </AppCard>
        )}

        {state.status === 'success' && state.trips.length === 0 && (
          <AppCard style={styles.statusCard}>
            <Text style={styles.routeText}>{t.historyEmptyTitle}</Text>
            <Text style={styles.statusMessage} accessibilityLiveRegion="polite">
              {t.historyEmptySub}
            </Text>
          </AppCard>
        )}

        {state.status === 'success' && state.trips.map((trip) => (
          <AppCard key={trip.id} style={styles.tripCard}>
            <View style={styles.topRow}>
              <Text style={styles.tripDate}>{trip.date}</Text>
              <Badge
                label={`+${trip.pointsEarned} ${t.points}`}
                variant="reward"
              />
            </View>

            <Text style={styles.routeText}>
              {trip.originName} ➔ {trip.destinationName}
            </Text>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>
                {t.modePrefix}: <Text style={styles.metaVal}>{trip.mode}</Text>
              </Text>
              <Text style={styles.metaLabel}>
                {t.distancePrefix}: <Text style={styles.metaVal}>{trip.distanceKm} km</Text>
              </Text>
              <Text style={styles.metaLabel}>
                CO₂: <Text style={styles.metaVal}>-{trip.co2SavedGrams}g</Text>
              </Text>
            </View>
          </AppCard>
        ))}
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
    padding: spacing.md,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  tripCard: {
    marginBottom: spacing.md,
  },
  statusCard: {
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  statusMessage: {
    ...typography.body,
    color: colors.textSecondary,
  },
  errorMessage: {
    ...typography.body,
    color: colors.danger,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  tripDate: {
    ...typography.captionMedium,
    color: colors.textSecondary,
  },
  routeText: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.textPrimary,
    marginVertical: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceMuted,
  },
  metaLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  metaVal: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
