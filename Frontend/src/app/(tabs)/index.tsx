import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { DemoUserRole } from '../../store/userStore';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { MapContainer } from '../../components/map/MapContainer';
import { RoutePresets, DEMO_PRESETS, RoutePresetItem } from '../../components/map/RoutePresets';
import { RouteOptionCard } from '../../components/map/RouteOptionCard';
import { TravelOptionsPanel } from '../../components/map/TravelOptionsPanel';
import { TripCompletedModal } from '../../components/map/TripCompletedModal';
import { AppButton } from '../../components/common/AppButton';
import { Badge } from '../../components/common/Badge';
import {
  API_CONFIG,
  setUseMockFallback,
  setApiBaseUrl,
  checkBackendHealth,
} from '../../services/api';
import { routeService } from '../../services/routeService';
import { transitService } from '../../services/transitService';
import {
  RouteOptionDto,
  StationLocation,
  ParkingDetail,
  WeatherInfoDto,
  AgeCategory,
} from '../../types/route';

export default function MapScreen() {
  const router = useRouter();
  const { user, addEcoPoints, hasDisability, loginAsDemoUser } = useAuth();

  // Route Planning State
  const [activePreset, setActivePreset] = useState<RoutePresetItem>(DEMO_PRESETS[0]);
  const [options, setOptions] = useState<RouteOptionDto[]>([]);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [weather, setWeather] = useState<WeatherInfoDto | null>(null);
  const [isMock, setIsMock] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [stations, setStations] = useState<StationLocation[]>([]);
  const [parkings, setParkings] = useState<ParkingDetail[]>([]);
  const [tripModalVisible, setTripModalVisible] = useState(false);
  const [lastCo2Saved, setLastCo2Saved] = useState(0);
  const routeRequestId = useRef(0);
  const mounted = useRef(false);
  const planningPending = useRef(false);

  // Offline Demo Safety Switch State (FE-09)
  const [useMockMode, setUseMockMode] = useState(API_CONFIG.USE_MOCK_FALLBACK);
  const [connectionModalVisible, setConnectionModalVisible] = useState(false);
  const [apiUrlInput, setApiUrlInput] = useState(API_CONFIG.BASE_URL);
  const [healthStatus, setHealthStatus] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle');
  const [healthMessage, setHealthMessage] = useState<string | null>(null);

  const loadTransitPois = () => {
    transitService.getNearbyStations(45.7538, 21.2257).then(setStations);
    transitService.getParkings().then(setParkings);
  };

  // Load Transit POIs on mount or when Demo/Live mode changes
  useEffect(() => {
    loadTransitPois();
  }, [useMockMode]);

  // Start planning before interaction with a newly committed preset/profile.
  useLayoutEffect(() => {
    mounted.current = true;
    fetchRoutes(activePreset);
    return () => {
      mounted.current = false;
      routeRequestId.current += 1;
    };
  }, [activePreset, hasDisability, user?.age, user?.id,
    user?.preferences?.hasOwnBicycle, user?.preferences?.hasOwnScooter,
    user?.preferences?.hasOwnCar, useMockMode]);

  const handleToggleMockMode = () => {
    const nextMock = !useMockMode;
    setUseMockFallback(nextMock);
    setUseMockMode(nextMock);
    setHealthStatus('idle');
    setHealthMessage(null);
  };

  const handleTestConnection = async () => {
    setApiBaseUrl(apiUrlInput);
    setHealthStatus('checking');
    setHealthMessage('Provjera veze s backendom...');
    const res = await checkBackendHealth();
    setHealthStatus(res.ok ? 'ok' : 'error');
    setHealthMessage(res.message);
  };

  const handleApplyConnectionSettings = (enableLive: boolean) => {
    setApiBaseUrl(apiUrlInput);
    setUseMockFallback(!enableLive);
    setUseMockMode(!enableLive);
    setConnectionModalVisible(false);
    fetchRoutes(activePreset);
    loadTransitPois();
  };

  const fetchRoutes = async (preset: RoutePresetItem) => {
    const requestId = ++routeRequestId.current;
    const isCurrentRequest = () => mounted.current && requestId === routeRequestId.current;
    planningPending.current = true;
    setIsLoading(true);
    try {
      const userAge = user?.age ?? 22;
      const ageCategory: AgeCategory =
        userAge < 14 ? 'Under14' : userAge < 16 ? 'From14To15' : 'Adult';

      const response = await routeService.planRoute({
        origin: preset.origin,
        destination: preset.destination,
        profile: {
          ageCategory,
          hasDisability: !!user?.preferences?.hasDisability,
          ownsBike: !!user?.preferences?.hasOwnBicycle,
          ownsScooter: !!user?.preferences?.hasOwnScooter,
          ownsCar: !!user?.preferences?.hasOwnCar,
        },
      });

      if (!isCurrentRequest()) return;

      setOptions(response.options);
      setWeather(response.weather);
      setIsMock(response.isMock);

      // Default to recommended option
      const recommended =
        response.options.find((o) => o.isRecommended) || response.options[0];
      setSelectedOptionId(recommended?.id ?? null);
    } catch (err) {
      if (!isCurrentRequest()) return;
      console.error('Greška pri planiranju rute:', err);
      // Previous routes no longer belong to the requested preset/profile.
      setOptions([]);
      setSelectedOptionId(null);
    } finally {
      if (isCurrentRequest()) {
        planningPending.current = false;
        setIsLoading(false);
      }
    }
  };

  const handleSelectPreset = (preset: RoutePresetItem) => {
    setActivePreset(preset);
  };

  const handleSelectPoiAsDestination = (point: { lat: number; lng: number }, name: string) => {
    setActivePreset((prev) => ({
      ...prev,
      id: 'custom_poi',
      label: `${prev.originName} ➔ ${name}`,
      destinationName: name,
      destination: point,
    }));
  };

  const selectedOption = options.find((o) => o.id === selectedOptionId);

  const handleCompleteTrip = async () => {
    if (!mounted.current || planningPending.current || isLoading || !selectedOption) return;

    // Calculate CO2 savings vs 390g car baseline
    const co2Saved = Math.max(0, 390 - selectedOption.co2Grams);
    setLastCo2Saved(co2Saved);

    try {
      await routeService.recordTrip({
        mode: selectedOption.mode,
        distanceMeters: Math.round(selectedOption.distanceKm * 1000),
        co2SavedGrams: co2Saved,
        ecoPoints: selectedOption.ecoPoints,
      });
    } catch (err) {
      console.warn('Greška pri spremanju vožnje, nastavljamo lokalno:', err);
    }

    addEcoPoints(selectedOption.ecoPoints, co2Saved);
    setTripModalVisible(true);
  };

  const getWeatherConditionIcon = (condition?: string) => {
    switch (condition) {
      case 'Rain':
        return '🌧️ Kiša';
      case 'Snow':
        return '❄️ Snijeg';
      case 'Cold':
        return '🥶 Hladno';
      case 'Windy':
        return '💨 Vjetrovito';
      case 'Clear':
      default:
        return '☀️ Vedro';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
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

      {/* Quick Demo Profile Switcher (FE-08) */}
      <View style={styles.profileSwitcherRow}>
        <Text style={styles.profileSwitcherLabel}>Profil:</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.profileChipsScroll}
        >
          {(
            [
              { role: 'student', label: '🎓 Student (18+)' },
              { role: 'accessibility', label: '♿ Kolica' },
              { role: 'teen_15', label: '🪖 Mlađi (14–15g)' },
              { role: 'child_12', label: '🧒 Dijete (<14g)' },
            ] as { role: DemoUserRole; label: string }[]
          ).map((item) => {
            const isActive =
              (item.role === 'accessibility' && hasDisability) ||
              (item.role === 'teen_15' && !hasDisability && user?.age === 15) ||
              (item.role === 'child_12' && !hasDisability && (user?.age ?? 22) < 14) ||
              (item.role === 'student' && !hasDisability && (user?.age ?? 22) >= 16);

            return (
              <TouchableOpacity
                key={item.role}
                onPress={() => loginAsDemoUser(item.role)}
                style={[
                  styles.profileChip,
                  isActive && styles.profileChipActive,
                ]}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.profileChipText,
                    isActive && styles.profileChipTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Weather & Offline Safety Status Bar */}
      <View style={styles.statusBarRow}>
        {weather && (
          <View style={styles.weatherPill}>
            <Text style={styles.weatherText}>
              {getWeatherConditionIcon(weather.condition)} • {weather.temperatureC}°C • {weather.precipitationMm} mm
            </Text>
          </View>
        )}

        <View style={styles.connectionControlsRow}>
          <TouchableOpacity
            onPress={handleToggleMockMode}
            activeOpacity={0.8}
            accessibilityLabel="Prebaci između Offline Demo i Live API načina"
          >
            <Badge
              label={
                useMockMode
                  ? '🛡️ DEMO (Offline)'
                  : isMock
                  ? '⚠️ LIVE ➔ Fallback'
                  : '🌐 LIVE API'
              }
              variant={
                useMockMode ? 'neutral' : isMock ? 'warning' : 'success'
              }
              style={styles.demoBadge}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingsIconBtn}
            onPress={() => {
              setApiUrlInput(API_CONFIG.BASE_URL);
              setConnectionModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.settingsIconText}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Map View */}
      <View style={styles.mapWrapper}>
        <MapContainer
          origin={activePreset.origin}
          destination={activePreset.destination}
          originName={activePreset.originName}
          destinationName={activePreset.destinationName}
          stations={stations}
          parkings={parkings}
          selectedOption={selectedOption}
          selectedMode={selectedOption?.mode || 'Bike'}
          onSelectPoiAsDestination={handleSelectPoiAsDestination}
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
              loading={isLoading}
              disabled={isLoading}
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

      {/* EcoMutare Trip Completed Modal */}
      <TripCompletedModal
        visible={tripModalVisible}
        option={selectedOption}
        co2SavedGrams={lastCo2Saved}
        totalPoints={user?.totalEcoPoints ?? 0}
        originName={activePreset.originName}
        destinationName={activePreset.destinationName}
        onClose={() => setTripModalVisible(false)}
        onViewRewards={() => {
          setTripModalVisible(false);
          router.push('/(tabs)/rewards');
        }}
      />

      {/* Offline Demo Safety & API Configuration Modal (FE-09) */}
      <Modal
        visible={connectionModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConnectionModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.connectionModalCard}>
            <View style={styles.connectionModalHeader}>
              <Text style={styles.connectionModalTitle}>
                🛡️ Demo & API Način rada
              </Text>
              <TouchableOpacity
                onPress={() => setConnectionModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.connectionModalDesc}>
              Za sigurnu prezentaciju koristite Offline Demo. Ako imate pokrenut
              backend na lokalnoj mreži, unesite IP adresu i prebacite na Live API
              (automatski fallback ostaje aktivan u slučaju pada mreže).
            </Text>

            <Text style={styles.inputLabel}>Backend Base URL</Text>
            <TextInput
              style={styles.urlInput}
              value={apiUrlInput}
              onChangeText={setApiUrlInput}
              placeholder="http://192.168.1.15:5279"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity
              style={styles.testConnBtn}
              onPress={handleTestConnection}
              disabled={healthStatus === 'checking'}
              activeOpacity={0.8}
            >
              <Text style={styles.testConnBtnText}>
                {healthStatus === 'checking'
                  ? 'Provjeravam vezu...'
                  : '🔌 Testiraj vezu s backendom'}
              </Text>
            </TouchableOpacity>

            {healthMessage && (
              <View
                style={[
                  styles.healthResultBox,
                  healthStatus === 'ok'
                    ? styles.healthResultOk
                    : styles.healthResultWarn,
                ]}
              >
                <Text
                  style={[
                    styles.healthResultText,
                    healthStatus === 'ok'
                      ? styles.healthTextOk
                      : styles.healthTextWarn,
                  ]}
                >
                  {healthStatus === 'ok' ? '✅ ' : '⚠️ '}
                  {healthMessage}
                </Text>
              </View>
            )}

            <View style={styles.modalModeButtonsRow}>
              <AppButton
                title="🛡️ Offline Demo"
                variant={useMockMode ? 'primary' : 'outline'}
                size="sm"
                onPress={() => handleApplyConnectionSettings(false)}
                style={{ flex: 1 }}
              />
              <AppButton
                title="🌐 Live API"
                variant={!useMockMode ? 'secondary' : 'outline'}
                size="sm"
                onPress={() => handleApplyConnectionSettings(true)}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
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
  profileSwitcherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.md,
    paddingVertical: 3,
    backgroundColor: colors.background,
  },
  profileSwitcherLabel: {
    ...typography.captionMedium,
    fontSize: 11,
    color: colors.textSecondary,
    marginRight: spacing.xs,
  },
  profileChipsScroll: {
    paddingRight: spacing.md,
    gap: 6,
  },
  profileChip: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  profileChipActive: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  profileChipText: {
    ...typography.captionMedium,
    fontSize: 11,
    color: colors.textPrimary,
  },
  profileChipTextActive: {
    color: colors.textInverse,
    fontWeight: '700',
  },
  statusBarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    backgroundColor: colors.background,
  },
  weatherPill: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  weatherText: {
    ...typography.captionMedium,
    fontSize: 11,
    color: colors.textPrimary,
  },
  demoBadge: {
    alignSelf: 'center',
  },
  connectionControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  settingsIconBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  settingsIconText: {
    fontSize: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  connectionModalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.lg,
  },
  connectionModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  connectionModalTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalCloseText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  connectionModalDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  inputLabel: {
    ...typography.captionMedium,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  urlInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.controlBorder,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 4,
    color: colors.textPrimary,
    ...typography.body,
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  testConnBtn: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.xs + 4,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  testConnBtnText: {
    ...typography.captionMedium,
    color: colors.primaryDark,
    fontWeight: '700',
  },
  healthResultBox: {
    borderRadius: borderRadius.md,
    padding: spacing.xs + 4,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  healthResultOk: {
    backgroundColor: colors.successLight,
    borderColor: colors.success,
  },
  healthResultWarn: {
    backgroundColor: colors.warningLight,
    borderColor: colors.warning,
  },
  healthResultText: {
    ...typography.captionMedium,
    fontSize: 11,
  },
  healthTextOk: {
    color: colors.primaryDark,
  },
  healthTextWarn: {
    color: colors.warning,
  },
  modalModeButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  mapWrapper: {
    height: 230,
    position: 'relative',
  },
  accessibilityFloatPill: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.surfaceDark,
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
