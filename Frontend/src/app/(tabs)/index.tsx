import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { DemoUserRole } from '../../store/userStore';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { MapContainer, TIMISOARA_CENTER } from '../../components/map/MapContainer';
import { RouteOptionCard } from '../../components/map/RouteOptionCard';
import { TravelOptionsPanel } from '../../components/map/TravelOptionsPanel';
import { TripCompletedModal } from '../../components/map/TripCompletedModal';
import { AppButton } from '../../components/common/AppButton';
import {
  API_CONFIG,
  setUseMockFallback,
  setApiBaseUrl,
  checkBackendHealth,
} from '../../services/api';
import { routeService } from '../../services/routeService';
import { transitService } from '../../services/transitService';
import {
  GeoPoint,
  RouteOptionDto,
  StationLocation,
  ParkingDetail,
  CityLandmarkPoi,
  WeatherInfoDto,
  AgeCategory,
} from '../../types/route';

interface ActiveRouteEndpoints {
  origin: GeoPoint;
  originName: string;
  destination: GeoPoint;
  destinationName: string;
}

const INITIAL_ENDPOINTS: ActiveRouteEndpoints = {
  origin: { lat: 45.7537, lng: 21.2257 },
  originName: 'Piața Victoriei',
  destination: { lat: 45.7475, lng: 21.2262 },
  destinationName: 'UPT Politehnica',
};

interface SearchSuggestionItem {
  id: string;
  name: string;
  subtitle: string;
  icon: string;
  lat: number;
  lng: number;
}

export default function MapScreen() {
  const router = useRouter();
  const { user, addEcoPoints, hasDisability, loginAsDemoUser } = useAuth();

  // Route Endpoints State (Point A & Point B)
  const [endpoints, setEndpoints] = useState<ActiveRouteEndpoints>(INITIAL_ENDPOINTS);
  const [options, setOptions] = useState<RouteOptionDto[]>([]);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [weather, setWeather] = useState<WeatherInfoDto | null>(null);
  const [isMock, setIsMock] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Full City Map POIs
  const [stations, setStations] = useState<StationLocation[]>([]);
  const [parkings, setParkings] = useState<ParkingDetail[]>([]);
  const [landmarks, setLandmarks] = useState<CityLandmarkPoi[]>([]);

  // User GPS Location State
  const [userGpsLocation, setUserGpsLocation] = useState<GeoPoint | null>(null);
  const [isLocatingOrigin, setIsLocatingOrigin] = useState(false);

  // UI, Search Bar & Bottom Sheet State
  const [panelOpen, setPanelOpen] = useState(false);
  const [mapTapTarget, setMapTapTarget] = useState<'origin' | 'destination'>('destination');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [externalResults, setExternalResults] = useState<SearchSuggestionItem[]>([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const searchInputRef = useRef<any>(null);

  // Modals
  const [tripModalVisible, setTripModalVisible] = useState(false);
  const [lastCo2Saved, setLastCo2Saved] = useState(0);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);

  // Race-condition & lifecycle refs
  const routeRequestId = useRef(0);
  const mounted = useRef(false);
  const planningPending = useRef(false);

  // Offline Demo Safety Switch State (FE-09)
  const [useMockMode, setUseMockMode] = useState(API_CONFIG.USE_MOCK_FALLBACK);
  const [apiUrlInput, setApiUrlInput] = useState(API_CONFIG.BASE_URL);
  const [healthStatus, setHealthStatus] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle');
  const [healthMessage, setHealthMessage] = useState<string | null>(null);

  const loadTransitPois = () => {
    transitService.getNearbyStations().then(setStations);
    transitService.getParkings().then(setParkings);
    transitService.getCityLandmarks().then(setLandmarks);
  };

  useEffect(() => {
    loadTransitPois();
  }, [useMockMode]);

  // Debounced live OpenStreetMap address search for Timișoara when user types in Search Bar
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setExternalResults([]);
      setIsSearchingAddress(false);
      return;
    }

    let cancelled = false;
    setIsSearchingAddress(true);
    const timer = setTimeout(async () => {
      const results = await transitService.searchExternalAddresses(q);
      if (!cancelled) {
        setExternalResults(results);
        setIsSearchingAddress(false);
      }
    }, 280);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  // Re-plan route whenever Point A, Point B, or User Profile changes
  useLayoutEffect(() => {
    mounted.current = true;
    fetchRoutes(endpoints);
    return () => {
      mounted.current = false;
      routeRequestId.current += 1;
    };
  }, [
    endpoints,
    hasDisability,
    user?.age,
    user?.id,
    user?.preferences?.hasOwnBicycle,
    user?.preferences?.hasOwnScooter,
    user?.preferences?.hasOwnCar,
    useMockMode,
  ]);

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
    setSettingsModalVisible(false);
    fetchRoutes(endpoints);
    loadTransitPois();
  };

  const fetchRoutes = async (currentEndpoints: ActiveRouteEndpoints) => {
    const requestId = ++routeRequestId.current;
    const isCurrentRequest = () => mounted.current && requestId === routeRequestId.current;
    planningPending.current = true;
    setIsLoading(true);
    try {
      const userAge = user?.age ?? 22;
      const ageCategory: AgeCategory =
        userAge < 14 ? 'Under14' : userAge < 16 ? 'From14To15' : 'Adult';

      const response = await routeService.planRoute({
        origin: currentEndpoints.origin,
        destination: currentEndpoints.destination,
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

      const recommended =
        response.options.find((o) => o.isRecommended) || response.options[0];
      setSelectedOptionId(recommended?.id ?? null);
    } catch (err) {
      if (!isCurrentRequest()) return;
      console.error('Greška pri planiranju rute:', err);
      setOptions([]);
      setSelectedOptionId(null);
    } finally {
      if (isCurrentRequest()) {
        planningPending.current = false;
        setIsLoading(false);
      }
    }
  };

  const handleSelectPoiAsOrigin = (point: GeoPoint, name: string) => {
    setEndpoints((prev) => ({
      ...prev,
      origin: point,
      originName: name,
    }));
    setSearchFocused(false);
    setSearchQuery('');
    Keyboard.dismiss();
  };

  const handleSelectPoiAsDestination = (point: GeoPoint, name: string) => {
    setEndpoints((prev) => ({
      ...prev,
      destination: point,
      destinationName: name,
    }));
    setSearchFocused(false);
    setSearchQuery('');
    Keyboard.dismiss();
    setPanelOpen(true);
  };

  const handleSwapOriginDestination = () => {
    setEndpoints((prev) => ({
      origin: prev.destination,
      originName: prev.destinationName,
      destination: prev.origin,
      destinationName: prev.originName,
    }));
    setPanelOpen(true);
  };

  /**
   * One-tap "🎯 Moja lokacija" button: sets Point A (Polazište) to the user's current GPS coordinates.
   */
  const handleUseMyLocationAsOrigin = async () => {
    if (userGpsLocation) {
      handleSelectPoiAsOrigin(userGpsLocation, '🎯 Moja lokacija');
      return;
    }

    setIsLocatingOrigin(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const pt: GeoPoint = {
          lat: Number(loc.coords.latitude.toFixed(6)),
          lng: Number(loc.coords.longitude.toFixed(6)),
        };
        setUserGpsLocation(pt);
        handleSelectPoiAsOrigin(pt, '🎯 Moja lokacija');
        return;
      }
    } catch {
      // Fallback below if GPS is turned off on emulator/device
    } finally {
      setIsLocatingOrigin(false);
    }

    const fallbackPt: GeoPoint = {
      lat: TIMISOARA_CENTER.latitude,
      lng: TIMISOARA_CENTER.longitude,
    };
    handleSelectPoiAsOrigin(fallbackPt, '🎯 Moja lokacija (Centar TM)');
  };

  const selectedOption = options.find((o) => o.id === selectedOptionId);

  const handleCompleteTrip = async () => {
    if (!mounted.current || planningPending.current || isLoading || !selectedOption) return;

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

  const getWeatherShortLabel = (condition?: string, tempC?: number) => {
    const t = tempC ?? 16;
    switch (condition) {
      case 'Rain':
        return `🌧️ ${t}°C`;
      case 'Snow':
        return `❄️ ${t}°C`;
      case 'Cold':
        return `🥶 ${t}°C`;
      case 'Windy':
        return `💨 ${t}°C`;
      case 'Clear':
      default:
        return `☀️ ${t}°C`;
    }
  };

  const getActiveProfileBadge = () => {
    if (hasDisability) return '♿ Kolica';
    const age = user?.age ?? 22;
    if (age < 14) return '🧒 <14g';
    if (age < 16) return '🪖 14–15g';
    return '🎓 Student';
  };

  // Combined local + live OpenStreetMap address autocomplete suggestions
  const autocompleteSuggestions = useMemo(() => {
    const localItems: SearchSuggestionItem[] = [];

    for (const lm of landmarks) {
      localItems.push({
        id: `lm_${lm.id}`,
        name: lm.name,
        subtitle: lm.address || 'Znamenitost • Temišvar',
        icon: '🏛️',
        lat: lm.lat,
        lng: lm.lng,
      });
    }

    for (const st of stations) {
      localItems.push({
        id: `st_${st.id}`,
        name: st.name,
        subtitle:
          st.type === 'bike_station'
            ? `VeloTM stanica (${st.availableBikes ?? 6} bicikala)`
            : `Stanica (${st.type === 'tram' ? 'Tramvaj' : st.type === 'trolleybus' ? 'Trolejbus' : 'Autobus'}) • Linije: ${st.lines?.slice(0, 5).join(', ') || '-'}`,
        icon:
          st.type === 'bike_station'
            ? '🚲'
            : st.type === 'tram'
            ? '🚊'
            : st.type === 'trolleybus'
            ? '🚎'
            : '🚌',
        lat: st.lat,
        lng: st.lng,
      });
    }

    for (const prk of parkings) {
      localItems.push({
        id: `prk_${prk.id}`,
        name: prk.name,
        subtitle: `${prk.zone || 'TimPark'} • ${prk.hourlyRateRon} RON/h`,
        icon: '🅿️',
        lat: prk.lat,
        lng: prk.lng,
      });
    }

    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return localItems.slice(0, 12);
    }

    const matchedLocal = localItems
      .filter(
        (it) =>
          it.name.toLowerCase().includes(q) ||
          it.subtitle.toLowerCase().includes(q)
      )
      .slice(0, 10);

    // Combine live OSM street addresses + matched local stations/POIs
    const combined: SearchSuggestionItem[] = [...externalResults];
    for (const loc of matchedLocal) {
      if (
        !combined.some(
          (c) => c.name.toLowerCase() === loc.name.toLowerCase()
        )
      ) {
        combined.push(loc);
      }
    }
    return combined.slice(0, 15);
  }, [landmarks, stations, parkings, searchQuery, externalResults]);

  const panelSummaryText = selectedOption
    ? `Preporučeno: ${selectedOption.title} (${selectedOption.durationMinutes} min • ${selectedOption.distanceKm} km • +${selectedOption.ecoPoints} bodova)`
    : 'Odaberi točku A i B za izračun najoptimalnije rute';

  const showAutocomplete =
    searchFocused || searchQuery.trim().length > 0;

  // Polazište (A) & Odredište (B) rendered at the very top of TravelOptionsPanel (bottom sheet)
  const renderBottomSheetAbSlot = () => (
    <View style={styles.bottomAbContainer}>
      {/* Polazište (A) + One-Tap "Moja lokacija" Button */}
      <View style={styles.abFieldWrapper}>
        <TouchableOpacity
          style={[
            styles.abBox,
            mapTapTarget === 'origin' && styles.abBoxActiveOrigin,
          ]}
          onPress={() => {
            setMapTapTarget('origin');
            setSearchFocused(true);
            searchInputRef.current?.focus();
          }}
          activeOpacity={0.85}
        >
          <View style={styles.abDotOrigin} />
          <View style={{ flex: 1 }}>
            <Text style={styles.abLabel}>Polazište (A)</Text>
            <Text style={styles.abValue} numberOfLines={1}>
              {endpoints.originName}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Direct 1-click "Moja lokacija" GPS button */}
        <TouchableOpacity
          style={styles.myLocationQuickBtn}
          onPress={handleUseMyLocationAsOrigin}
          activeOpacity={0.8}
          accessibilityLabel="Postavi moju trenutnu lokaciju kao Polazište (A)"
        >
          {isLocatingOrigin ? (
            <ActivityIndicator size="small" color={colors.primaryDark} />
          ) : (
            <Text style={styles.myLocationQuickText}>🎯 Moja lokacija</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Swap A <-> B Button */}
      <TouchableOpacity
        style={styles.abSwapButton}
        onPress={handleSwapOriginDestination}
        activeOpacity={0.8}
        accessibilityLabel="Zamijeni polazište i odredište"
      >
        <Text style={styles.abSwapIcon}>⇄</Text>
      </TouchableOpacity>

      {/* Odredište (B) */}
      <View style={styles.abFieldWrapper}>
        <TouchableOpacity
          style={[
            styles.abBox,
            mapTapTarget === 'destination' && styles.abBoxActiveDest,
          ]}
          onPress={() => {
            setMapTapTarget('destination');
            setSearchFocused(true);
            searchInputRef.current?.focus();
          }}
          activeOpacity={0.85}
        >
          <View style={styles.abDotDest} />
          <View style={{ flex: 1 }}>
            <Text style={styles.abLabel}>Odredište (B)</Text>
            <Text style={styles.abValue} numberOfLines={1}>
              {endpoints.destinationName}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.pickOnMapMiniBtn}
          onPress={() => {
            setMapTapTarget('destination');
            setPanelOpen(false);
            setSearchFocused(false);
            Keyboard.dismiss();
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.pickOnMapMiniText}>👆 Klikni na karti</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Compact Top Header */}
      <View style={styles.topHeader}>
        <View style={styles.brandRow}>
          <Text style={styles.brandTitle}>EcoMutare</Text>
          {hasDisability && (
            <View style={styles.accessMiniBadge}>
              <Text style={styles.accessMiniText}>♿ Niski pod</Text>
            </View>
          )}
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.profileSettingsBtn}
            onPress={() => {
              setApiUrlInput(API_CONFIG.BASE_URL);
              setSettingsModalVisible(true);
            }}
            activeOpacity={0.8}
            accessibilityLabel="Otvori postavke profila i API načina rada"
          >
            <Text style={styles.profileSettingsText}>
              {getActiveProfileBadge()} • {getWeatherShortLabel(weather?.condition, weather?.temperatureC)} ⚙️
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.pointsBadgeBtn}
            onPress={() => router.push('/(tabs)/rewards')}
            activeOpacity={0.8}
          >
            <Text style={styles.pointsBadgeText}>
              ⭐ {user?.totalEcoPoints ?? 0}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dashboardLinkBtn}
            onPress={() => router.push('/dashboard')}
            activeOpacity={0.8}
          >
            <Text style={styles.dashboardLinkText}>🏛️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* FULL-SCREEN MAP WORKSPACE */}
      <View style={styles.fullMapContainer}>
        <MapContainer
          origin={endpoints.origin}
          destination={endpoints.destination}
          originName={endpoints.originName}
          destinationName={endpoints.destinationName}
          stations={stations}
          parkings={parkings}
          landmarks={landmarks}
          selectedOption={selectedOption}
          selectedMode={selectedOption?.mode || 'Bike'}
          externalTapTarget={mapTapTarget}
          onTapTargetChange={setMapTapTarget}
          onSelectPoiAsOrigin={handleSelectPoiAsOrigin}
          onSelectPoiAsDestination={handleSelectPoiAsDestination}
          onUserLocationResolved={setUserGpsLocation}
        />

        {/* Floating Address & Place Search Bar at the Top of the Map (Filters sit directly below it in MapContainer) */}
        <View style={styles.floatingSearchBarContainer}>
          <View style={styles.searchBarInputRow}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              ref={searchInputRef}
              style={styles.searchBarInput}
              value={searchQuery}
              onFocus={() => setSearchFocused(true)}
              onChangeText={(text) => {
                setSearchQuery(text);
                if (!searchFocused) setSearchFocused(true);
              }}
              placeholder={
                mapTapTarget === 'origin'
                  ? 'Upiši adresu ili stanicu za Polazište (A)...'
                  : 'Upiši adresu, ulicu ili stanicu u Temišvaru...'
              }
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {isSearchingAddress && (
              <ActivityIndicator
                size="small"
                color={colors.primary}
                style={{ marginRight: 6 }}
              />
            )}
            {(searchQuery.length > 0 || searchFocused) && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  setSearchFocused(false);
                  Keyboard.dismiss();
                }}
                style={styles.clearSearchBtn}
              >
                <Text style={styles.clearSearchText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Autocomplete Dropdown List when typing or focused */}
          {showAutocomplete && (
            <View style={styles.autocompleteDropdown}>
              {/* Top quick row: Use My Current GPS Location as Origin (A) */}
              <TouchableOpacity
                style={styles.autocompleteGpsRow}
                onPress={handleUseMyLocationAsOrigin}
                activeOpacity={0.8}
              >
                <Text style={styles.autocompleteEmoji}>🎯</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.autocompleteGpsTitle}>
                    Moja trenutna lokacija (GPS)
                  </Text>
                  <Text style={styles.autocompleteSub}>
                    Postavi kao Polazište (Točka A)
                  </Text>
                </View>
                <View style={styles.setABadge}>
                  <Text style={styles.setABadgeText}>Polazište A</Text>
                </View>
              </TouchableOpacity>

              <ScrollView
                style={styles.autocompleteScroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {autocompleteSuggestions.map((item) => {
                  const pt = { lat: item.lat, lng: item.lng };
                  return (
                    <View key={item.id} style={styles.autocompleteItemRow}>
                      <TouchableOpacity
                        style={styles.autocompleteMainClick}
                        onPress={() => {
                          if (mapTapTarget === 'origin') {
                            handleSelectPoiAsOrigin(pt, item.name);
                          } else {
                            handleSelectPoiAsDestination(pt, item.name);
                          }
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.autocompleteEmoji}>{item.icon}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.autocompleteTitle} numberOfLines={1}>
                            {item.name}
                          </Text>
                          <Text style={styles.autocompleteSub} numberOfLines={1}>
                            {item.subtitle}
                          </Text>
                        </View>
                      </TouchableOpacity>

                      <View style={styles.autocompleteActionBtns}>
                        <TouchableOpacity
                          style={styles.setABadge}
                          onPress={() => handleSelectPoiAsOrigin(pt, item.name)}
                        >
                          <Text style={styles.setABadgeText}>A</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.setBBadge}
                          onPress={() =>
                            handleSelectPoiAsDestination(pt, item.name)
                          }
                        >
                          <Text style={styles.setBBadgeText}>B</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>
      </View>

      {/* Collapsible Route Options Panel with Polazište (A) & Odredište (B) on top */}
      <TravelOptionsPanel
        topSlot={renderBottomSheetAbSlot()}
        isOpen={panelOpen}
        onToggleOpen={setPanelOpen}
        summaryText={panelSummaryText}
        footer={
          selectedOption && (
            <View style={styles.actionBottomBar}>
              <AppButton
                title={`Odaberi i završi (${selectedOption.durationMinutes} min • +${selectedOption.ecoPoints} bodova)`}
                onPress={handleCompleteTrip}
                loading={isLoading}
                disabled={isLoading}
                size="lg"
              />
            </View>
          )
        }
      >
        {options.map((option) => (
          <RouteOptionCard
            key={option.id}
            option={option}
            isSelected={selectedOptionId === option.id}
            onSelect={() => {
              setSelectedOptionId(option.id);
            }}
          />
        ))}
      </TravelOptionsPanel>

      {/* EcoMutare Trip Completed Modal */}
      <TripCompletedModal
        visible={tripModalVisible}
        option={selectedOption}
        co2SavedGrams={lastCo2Saved}
        totalPoints={user?.totalEcoPoints ?? 0}
        originName={endpoints.originName}
        destinationName={endpoints.destinationName}
        onClose={() => setTripModalVisible(false)}
        onViewRewards={() => {
          setTripModalVisible(false);
          router.push('/(tabs)/rewards');
        }}
      />

      {/* Unified Demo Profile & API Settings Modal */}
      <Modal
        visible={settingsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSettingsModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.connectionModalCard}>
            <View style={styles.connectionModalHeader}>
              <Text style={styles.connectionModalTitle}>
                👤 Profil putnika & API postavke
              </Text>
              <TouchableOpacity
                onPress={() => setSettingsModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Brzi odabir demo profila (FE-08)</Text>
            <View style={styles.profileGrid}>
              {(
                [
                  { role: 'student', label: '🎓 Student (18+)' },
                  { role: 'accessibility', label: '♿ Kolica (Niski pod)' },
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
                    onPress={() => {
                      loginAsDemoUser(item.role);
                    }}
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
            </View>

            <View style={styles.modalDivider} />

            <Text style={styles.inputLabel}>
              Način rada: {useMockMode ? '🛡️ Samostalni cestovni ruter' : isMock ? '⚠️ Live Fallback' : '🌐 Live Backend API'}
            </Text>
            <Text style={styles.connectionModalDesc}>
              Podaci o stanicama, parkinzima i znamenitostima vuku se izravno s
              otvorenih API-ja Grada Temišvara (cont.primariatm.ro).
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
                title="🛡️ Samostalni ruter"
                variant={useMockMode ? 'primary' : 'outline'}
                size="sm"
                onPress={() => handleApplyConnectionSettings(false)}
                style={{ flex: 1 }}
              />
              <AppButton
                title="🌐 Live Backend"
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
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    zIndex: 25,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandTitle: {
    ...typography.h3,
    fontSize: 18,
    color: colors.primaryDark,
    fontWeight: '800',
  },
  accessMiniBadge: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  accessMiniText: {
    ...typography.captionMedium,
    fontSize: 10,
    color: colors.primaryDark,
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  profileSettingsBtn: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  profileSettingsText: {
    ...typography.captionMedium,
    fontSize: 11,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  pointsBadgeBtn: {
    backgroundColor: colors.rewardBackground,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.rewardBorder,
  },
  pointsBadgeText: {
    ...typography.captionMedium,
    fontSize: 11,
    color: colors.rewardText,
    fontWeight: '800',
  },
  dashboardLinkBtn: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dashboardLinkText: {
    fontSize: 13,
  },
  fullMapContainer: {
    flex: 1,
    position: 'relative',
  },
  floatingSearchBarContainer: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.md,
    right: spacing.md,
    zIndex: 28,
  },
  searchBarInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    height: 44,
    borderWidth: 1.5,
    borderColor: colors.primaryDark,
    ...shadows.md,
  },
  searchIcon: {
    fontSize: 15,
    marginRight: 8,
  },
  searchBarInput: {
    flex: 1,
    color: colors.textPrimary,
    ...typography.bodyMedium,
    fontSize: 13,
    paddingVertical: 0,
  },
  clearSearchBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  clearSearchText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  autocompleteDropdown: {
    marginTop: 6,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.primary,
    maxHeight: 290,
    overflow: 'hidden',
    ...shadows.lg,
  },
  autocompleteGpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.surfaceMuted,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 10,
  },
  autocompleteGpsTitle: {
    ...typography.bodyMedium,
    fontSize: 13,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  autocompleteScroll: {
    maxHeight: 235,
  },
  autocompleteItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  autocompleteMainClick: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  autocompleteEmoji: {
    fontSize: 17,
  },
  autocompleteTitle: {
    ...typography.bodyMedium,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  autocompleteSub: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
  },
  autocompleteActionBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  setABadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  setABadgeText: {
    ...typography.captionMedium,
    fontSize: 11,
    fontWeight: '800',
    color: colors.textInverse,
  },
  setBBadge: {
    backgroundColor: colors.danger,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  setBBadgeText: {
    ...typography.captionMedium,
    fontSize: 11,
    fontWeight: '800',
    color: colors.textInverse,
  },
  bottomAbContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  abFieldWrapper: {
    flex: 1,
    gap: 4,
  },
  abBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: 6,
  },
  abBoxActiveOrigin: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceMuted,
  },
  abBoxActiveDest: {
    borderColor: colors.danger,
  },
  abDotOrigin: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  abDotDest: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.danger,
  },
  abLabel: {
    ...typography.caption,
    fontSize: 9,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  abValue: {
    ...typography.captionMedium,
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '800',
  },
  myLocationQuickBtn: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: borderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.primary,
    alignSelf: 'flex-start',
  },
  myLocationQuickText: {
    ...typography.captionMedium,
    fontSize: 10,
    color: colors.primaryDark,
    fontWeight: '800',
  },
  pickOnMapMiniBtn: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.controlBorder,
    alignSelf: 'flex-start',
  },
  pickOnMapMiniText: {
    ...typography.captionMedium,
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  abSwapButton: {
    width: 32,
    height: 32,
    marginTop: 4,
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1.5,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  abSwapIcon: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  connectionModalCard: {
    width: '100%',
    maxWidth: 420,
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
    marginBottom: spacing.sm,
  },
  connectionModalTitle: {
    ...typography.h3,
    fontSize: 16,
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
  profileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.sm,
  },
  profileChip: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
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
    fontSize: 12,
    color: colors.textPrimary,
  },
  profileChipTextActive: {
    color: colors.textInverse,
    fontWeight: '700',
  },
  modalDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  connectionModalDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  inputLabel: {
    ...typography.captionMedium,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: 6,
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
  actionBottomBar: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
