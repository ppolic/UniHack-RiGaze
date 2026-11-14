import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { colors } from '../../theme/colors';
import { borderRadius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { AppCard } from '../../components/common/AppCard';
import { AppButton } from '../../components/common/AppButton';
import { Badge } from '../../components/common/Badge';
import { useAuth } from '../../hooks/useAuth';
import { FavoritesList } from '../../components/favorites/FavoritesList';
import { fe2ErrorMessage } from '../../services/fe2Session';
import { rewardsService } from '../../services/rewardsService';
import { TripHistoryItem } from '../../types/rewards';

type HistoryState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; trips: TripHistoryItem[] };

const modeLabels: Record<string, string> = {
  Walk: 'Pe jos', Walking: 'Pe jos', Bicycle: 'Bicicletă', Bike: 'Bicicletă', Scooter: 'Trotinetă',
  Bus: 'Autobuz', Tram: 'Tramvai', Trolleybus: 'Troleibuz', Car: 'Mașină', PublicTransport: 'Transport public', PublicTransit: 'Transport public', Carpooling: 'Mașină partajată', CarWithParking: 'Mașină și parcare',
};

export default function HistoryScreen() {
  const router = useRouter();
  const { user, token } = useAuth();
  const loading = useRef(false);
  const { section } = useLocalSearchParams<{ section?: string }>();
  const showingFavorites = section === 'favorites';
  const [state, setState] = useState<HistoryState>({ status: 'loading' });
  const [requestVersion, setRequestVersion] = useState(0);

  useFocusEffect(useCallback(() => {
    let active = true;
    loading.current = true;
    setState({ status: 'loading' });

    const loadHistory = async () => {
      try {
        const trips = await rewardsService.getTripHistory();
        if (active) setState({ status: 'success', trips });
      } catch (error) {
        if (active) setState({ status: 'error', message: fe2ErrorMessage(error, 'Nu am putut încărca istoricul. Verifică conexiunea și încearcă din nou.') });
      } finally {
        if (active) loading.current = false;
      }
    };

    void loadHistory();
    return () => { active = false; };
  }, [requestVersion, user?.id, token]));

  const handleRetry = () => {
    if (loading.current) return;
    loading.current = true;
    setState({ status: 'loading' });
    setRequestVersion((version) => version + 1);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.content}>
          <View style={styles.heading}>
            <Text style={styles.eyebrow}>DRUMURILE TALE</Text>
            <Text style={styles.title} accessibilityRole="header">Favorite și istoric</Text>
            <Text style={styles.description}>Alegerile de azi, într-un oraș mai verde mâine.</Text>
          </View>

          <View style={styles.sections} accessibilityRole="tablist">
            {(['favorites', 'history'] as const).map((value) => {
              const selected = showingFavorites === (value === 'favorites');
              return (
                <Pressable
                  key={value}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  onPress={() => router.setParams({ section: value })}
                  style={({ pressed }) => [styles.sectionButton, selected && styles.activeSection, pressed && styles.pressedSection]}
                >
                  <Text style={[styles.sectionLabel, selected && styles.activeLabel]}>
                    {value === 'favorites' ? '♡  Favorite' : '↺  Istoric'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {showingFavorites ? (
            <FavoritesList />
          ) : (
            <View style={styles.list}>
              <View style={styles.listHeading}>
                <Text style={styles.sectionTitle} accessibilityRole="header">Călătorii returnate de server</Text>
                {state.status === 'success' && <Badge label={state.trips.length + ' în listă'} />}
              </View>
              <Text style={styles.description}>Serviciul poate returna date inițializate și nu confirmă păstrarea lor după repornirea serverului.</Text>
              {state.status === 'loading' && (
                <View style={styles.statusCard} accessible accessibilityRole="progressbar"
                  accessibilityLabel="Se încarcă istoricul călătoriilor" accessibilityState={{ busy: true }}>
                  <ActivityIndicator size="large" color={colors.primary} accessible={false} />
                  <Text style={styles.description}>Se încarcă istoricul călătoriilor…</Text>
                </View>
              )}
              {state.status === 'error' && (
                <AppCard style={styles.statusCard}>
                  <Text style={styles.sectionTitle}>Istoricul nu este disponibil</Text>
                  <Text style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="assertive">
                    {state.message}
                  </Text>
                  <AppButton title="Încearcă din nou" onPress={handleRetry} />
                </AppCard>
              )}
              {state.status === 'success' && state.trips.length === 0 && (
                <AppCard style={styles.statusCard}>
                  <Text style={styles.emptyIcon} accessible={false}>↺</Text>
                  <Text style={styles.sectionTitle}>Fiecare drum are un început</Text>
                  <Text style={styles.description} accessibilityLiveRegion="polite">
                    Nu există încă nicio călătorie înregistrată. După finalizarea unei călătorii, aici vei putea vedea traseul și punctele obținute.
                  </Text>
                </AppCard>
              )}
              {state.status === 'success' && state.trips.map((trip) => (
                <AppCard key={trip.id} style={styles.tripCard}>
                  <View style={styles.listHeading}>
                    <Text style={styles.date}>{trip.date}</Text>
                    <Badge label={(trip.pointsEarned > 0 ? '+' : '') + trip.pointsEarned + ' puncte'} variant="reward" />
                  </View>
                  <Text style={styles.route}>{trip.originName} → {trip.destinationName}</Text>
                  <Text style={styles.mode}>{modeLabels[trip.mode] ?? trip.mode}</Text>
                  <View style={styles.metrics}>
                    {[
                      { label: 'Distanță', value: trip.distanceKm + ' km' },
                      { label: 'Durată', value: trip.durationMinutes + ' min' },
                      { label: 'CO₂ economisit', value: trip.co2SavedGrams + ' g' },
                    ].map((metric) => (
                      <View key={metric.label} style={styles.metric}>
                        <Text style={styles.metricValue}>{metric.value}</Text>
                        <Text style={styles.metricLabel}>{metric.label}</Text>
                      </View>
                    ))}
                  </View>
                </AppCard>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.xl, paddingBottom: spacing['3xl'], alignItems: 'center' },
  content: { width: '100%', maxWidth: 960, gap: spacing['2xl'] },
  heading: { gap: spacing.sm },
  eyebrow: { ...typography.captionMedium, color: colors.primary, letterSpacing: 1 },
  title: { ...typography.h1, color: colors.textPrimary },
  description: { ...typography.body, color: colors.textSecondary },
  sections: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  sectionButton: { flexGrow: 1, flexBasis: '40%', minHeight: 48, justifyContent: 'center', alignItems: 'center', padding: spacing.md, borderRadius: borderRadius.md, borderWidth: 2, borderColor: colors.controlBorder, backgroundColor: colors.surface },
  activeSection: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
  pressedSection: { borderColor: colors.primary },
  sectionLabel: { ...typography.bodyMedium, color: colors.textPrimary, textAlign: 'center' },
  activeLabel: { color: colors.textInverse },
  list: { gap: spacing.lg },
  listHeading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  sectionTitle: { ...typography.h3, color: colors.textPrimary, flexShrink: 1 },
  statusCard: { padding: spacing.xl, gap: spacing.lg },
  emptyIcon: { fontSize: 32, color: colors.primary },
  error: { ...typography.body, color: colors.danger },
  tripCard: { gap: spacing.md },
  date: { ...typography.captionMedium, color: colors.textSecondary, flexShrink: 1 },
  route: { ...typography.h3, color: colors.textPrimary },
  mode: { ...typography.bodyMedium, color: colors.textSecondary },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.lg },
  metric: { flexGrow: 1, flexBasis: 120, gap: spacing.xs },
  metricValue: { ...typography.bodyMedium, color: colors.textPrimary },
  metricLabel: { ...typography.caption, color: colors.textSecondary },
});
