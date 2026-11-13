import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { MapContainer } from '../../components/map/MapContainer';
import { RoutePresets, DEMO_PRESETS, RoutePresetItem } from '../../components/map/RoutePresets';
import { RouteOptionCard } from '../../components/map/RouteOptionCard';
import { TravelOptionsPanel } from '../../components/map/TravelOptionsPanel';
import { AppButton } from '../../components/common/AppButton';
import { routeService } from '../../services/routeService';
import { transitService } from '../../services/transitService';
import { RouteOption, StationLocation, ParkingDetail } from '../../types/route';

export default function MapScreen() {
  const router = useRouter();
  const { user, addEcoPoints, hasDisability } = useAuth();

  // Route Planning State
  const [activePreset, setActivePreset] = useState<RoutePresetItem>(DEMO_PRESETS[0]);
  const [options, setOptions] = useState<RouteOption[]>([]);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [stations, setStations] = useState<StationLocation[]>([]);
  const [parkings, setParkings] = useState<ParkingDetail[]>([]);

  // Load Transit POIs on mount
  useEffect(() => {
    transitService.getNearbyStations(45.7538, 21.2257).then(setStations);
    transitService.getParkings().then(setParkings);
  }, []);

  // Fetch routes when preset or disability status changes
  useEffect(() => {
    fetchRoutes(activePreset);
  }, [activePreset, hasDisability]);

  const fetchRoutes = async (preset: RoutePresetItem) => {
    setIsLoading(true);
    try {
      const response = await routeService.planRoute({
        origin: preset.origin,
        destination: preset.destination,
        hasDisability: user?.preferences?.hasDisability,
        age: user?.age,
        hasOwnBicycle: user?.preferences?.hasOwnBicycle,
        hasOwnCar: user?.preferences?.hasOwnCar,
      });

      setOptions(response.options);
      // Default to recommended option
      const recommended = response.options.find((o) => o.isRecommended) || response.options[0];
      if (recommended) {
        setSelectedOptionId(recommended.id);
      }
    } catch (err) {
      console.error('Greška pri planiranju rute:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPreset = (preset: RoutePresetItem) => {
    setActivePreset(preset);
  };

  const selectedOption = options.find((o) => o.id === selectedOptionId);

  const handleCompleteTrip = async () => {
    if (!selectedOption) return;

    // Award Eco-Points & save to store
    addEcoPoints(selectedOption.ecoPoints, selectedOption.co2Grams === 0 ? 390 : 355);

    Alert.alert(
      'Zeleno putovanje završeno! 🌱',
      `Osvojili ste +${selectedOption.ecoPoints} eko-bodova!\nVaš doprinos smanjenju CO₂ je zabilježen u gradskoj bazi.`,
      [
        { text: 'Pregledaj nagrade', onPress: () => router.push('/(tabs)/rewards') },
        { text: 'U redu', style: 'cancel' },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.brandTitle}>EcoMutare</Text>
          <Text style={styles.brandSubtitle}>Timișoara Green Mobility</Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.pointsBadgeBtn}
            onPress={() => router.push('/(tabs)/rewards')}
          >
            <Text style={styles.pointsBadgeText}>
              ⭐ {user?.totalEcoPoints ?? 0} bodova
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dashboardLinkBtn}
            onPress={() => router.push('/dashboard')}
          >
            <Text style={styles.dashboardLinkText}>🏛️ Grad</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Preset Chips Bar */}
      <RoutePresets
        activePresetId={activePreset.id}
        onSelectPreset={handleSelectPreset}
      />

      {/* Map View */}
      <View style={styles.mapWrapper}>
        <MapContainer
          origin={activePreset.origin}
          destination={activePreset.destination}
          originName={activePreset.originName}
          destinationName={activePreset.destinationName}
          stations={stations}
          parkings={parkings}
          selectedMode={selectedOption?.mode || 'Bicycle'}
        />

        {/* Accessibility Status Pill if active */}
        {hasDisability && (
          <View style={styles.accessibilityFloatPill}>
            <Text style={styles.accessibilityFloatText}>
              ♿ Profil prilagođen kolicima: filtrirani tramvaji s niskim podom
            </Text>
          </View>
        )}
      </View>

      {/* Route Options Comparison Sheet */}
      <TravelOptionsPanel
        footer={selectedOption && (
          <View style={styles.actionBottomBar}>
            <AppButton
              title={`Odaberi i završi (${selectedOption.durationMinutes} min • +${selectedOption.ecoPoints} bodova)`}
              onPress={handleCompleteTrip}
              size="lg"
            />
          </View>
        )}
      >
          {options.map((option) => (
            <RouteOptionCard
              key={option.id}
              option={option}
              isSelected={selectedOptionId === option.id}
              onSelect={() => setSelectedOptionId(option.id)}
            />
          ))}
      </TravelOptionsPanel>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  brandTitle: {
    ...typography.h3,
    color: colors.primaryDark,
    fontWeight: '800',
  },
  brandSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  pointsBadgeBtn: {
    backgroundColor: colors.rewardBackground,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.rewardBorder,
  },
  pointsBadgeText: {
    ...typography.captionMedium,
    color: colors.rewardText,
    fontWeight: '700',
  },
  dashboardLinkBtn: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dashboardLinkText: {
    ...typography.captionMedium,
    color: colors.textPrimary,
  },
  mapWrapper: {
    height: 240,
    position: 'relative',
  },
  accessibilityFloatPill: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.secondary,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  accessibilityFloatText: {
    ...typography.captionMedium,
    color: colors.textInverse,
    fontSize: 12,
  },
  sheetContainer: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    marginTop: -spacing.md,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
    ...shadows.lg,
  },
  sheetHeader: {
    marginBottom: spacing.sm,
  },
  sheetTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  sheetSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  optionsList: {
    flex: 1,
  },
  actionBottomBar: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
