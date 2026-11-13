import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { AppCard } from '../../components/common/AppCard';
import { Badge } from '../../components/common/Badge';
import { rewardsService } from '../../services/rewardsService';
import { TripHistoryItem } from '../../types/rewards';

export default function HistoryScreen() {
  const [history, setHistory] = useState<TripHistoryItem[]>([]);

  useEffect(() => {
    rewardsService.getTripHistory().then(setHistory);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Povijest Putovanja</Text>
          <Text style={styles.subtitle}>
            Zabilježena putovanja i doprinos smanjenju emisija u Timișoari.
          </Text>
        </View>

        {history.map((trip) => (
          <AppCard key={trip.id} style={styles.tripCard}>
            <View style={styles.topRow}>
              <Text style={styles.tripDate}>{trip.date}</Text>
              <Badge
                label={`+${trip.pointsEarned} bodova`}
                variant="reward"
              />
            </View>

            <Text style={styles.routeText}>
              {trip.originName} ➔ {trip.destinationName}
            </Text>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>
                Način: <Text style={styles.metaVal}>{trip.mode}</Text>
              </Text>
              <Text style={styles.metaLabel}>
                Udaljenost: <Text style={styles.metaVal}>{trip.distanceKm} km</Text>
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
