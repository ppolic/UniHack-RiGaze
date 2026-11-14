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
import { AccessibilityComplianceModal } from '../../components/common/AccessibilityComplianceModal';
import {
  API_CONFIG,
  setUseMockFallback,
  setApiBaseUrl,
  checkBackendHealth,
} from '../../services/api';
import { routeService } from '../../services/routeService';
import {
  transitService,
  haversineDistanceMeters,
} from '../../services/transitService';
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
  destination: GeoPoint | null;
  destinationName: string;
}

const INITIAL_ENDPOINTS: ActiveRouteEndpoints = {
  origin: { lat: TIMISOARA_CENTER.latitude, lng: TIMISOARA_CENTER.longitude },
  originName: '🎯 Moja lokacija',
  destination: null,
  destinationName: '',
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
  const {
    user,
    addEcoPoints,
    hasDisability,
    wcagLargeText,
    wcagTextRouteMode,
    updatePreferences,
    loginAsDemoUser,
  } = useAuth();

  const fs = (base: number) => (wcagLargeText ? Math.round(base * 1.2) : base);

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

  // Active GPS Navigation & Anti-Cheat State
  const ARRIVAL_RADIUS_METERS = 60;
  const MIN_TRIP_DISTANCE_METERS = 100;
  const [isNavigating, setIsNavigating] = useState(false);
  const [distanceToDestMeters, setDistanceToDestMeters] = useState<number | null>(null);
  const [gpsErrorMsg, setGpsErrorMsg] = useState<string | null>(null);
  const locationWatcherRef = useRef<Location.LocationSubscription | null>(null);
  const tripCompletingRef = useRef(false);
  const isNavigatingRef = useRef(false);
  const destinationRef = useRef<GeoPoint | null>(INITIAL_ENDPOINTS.destination);

  // UI, Search Bar & Bottom Sheet State
  const [panelOpen, setPanelOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [externalResults, setExternalResults] = useState<SearchSuggestionItem[]>([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const searchInputRef = useRef<any>(null);

  // Modals
  const [tripModalVisible, setTripModalVisible] = useState(false);
  const [lastCo2Saved, setLastCo2Saved] = useState(0);
  const [lastTripEarlyFinish, setLastTripEarlyFinish] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [wcagModalVisible, setWcagModalVisible] = useState(false);
  const [textAltFilter, setTextAltFilter] = useState<
    'all' | 'stations' | 'parking' | 'landmarks'
  >('all');

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

  // Re-plan route whenever Point A, Point B, or User Profile changes (paused while navigating)
  useLayoutEffect(() => {
    mounted.current = true;
    if (!isNavigatingRef.current) {
      fetchRoutes(endpoints);
    }
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
    if (!currentEndpoints.destination) {
      routeRequestId.current += 1;
      planningPending.current = false;
      setOptions([]);
      setSelectedOptionId(null);
      setIsLoading(false);
      return;
    }

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

  const handleUserLocationResolved = (pt: GeoPoint) => {
    setUserGpsLocation(pt);
    if (!isNavigatingRef.current) {
      setEndpoints((prev) => ({
        ...prev,
        origin: pt,
        originName: '🎯 Moja lokacija',
      }));
    }
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

  const handleResetLocations = () => {
    isNavigatingRef.current = false;
    stopGpsWatcher();
    setIsNavigating(false);
    setDistanceToDestMeters(null);
    setGpsErrorMsg(null);
    setPanelOpen(false);
    setSearchFocused(false);
    setSearchQuery('');
    Keyboard.dismiss();
    setEndpoints((prev) => ({
      origin: userGpsLocation || prev.origin,
      originName: '🎯 Moja lokacija',
      destination: null,
      destinationName: '',
    }));
    setOptions([]);
    setSelectedOptionId(null);
  };

  /**
   * Refreshes Point A (Polazište) from the user's current GPS coordinates.
   */
  const handleRefreshMyLocation = async () => {
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
        handleUserLocationResolved(pt);
        return;
      }
    } catch {
      // Fallback below if GPS is unavailable on emulator/device
    } finally {
      setIsLocatingOrigin(false);
    }

    const fallbackPt: GeoPoint = userGpsLocation || {
      lat: TIMISOARA_CENTER.latitude,
      lng: TIMISOARA_CENTER.longitude,
    };
    handleUserLocationResolved(fallbackPt);
  };

  const selectedOption = options.find((o) => o.id === selectedOptionId);
  const directDistanceMeters = endpoints.destination
    ? Math.round(haversineDistanceMeters(endpoints.origin, endpoints.destination))
    : null;
  const isDestinationTooClose =
    directDistanceMeters !== null && directDistanceMeters < MIN_TRIP_DISTANCE_METERS;

  destinationRef.current = endpoints.destination;

  const stopGpsWatcher = () => {
    if (locationWatcherRef.current) {
      locationWatcherRef.current.remove();
      locationWatcherRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      isNavigatingRef.current = false;
      stopGpsWatcher();
    };
  }, []);

  const handleCompleteTrip = async (reachedDestination: boolean = true) => {
    if (!mounted.current || planningPending.current || isLoading || !selectedOption) return;

    if (!reachedDestination) {
      setLastCo2Saved(0);
      setLastTripEarlyFinish(true);
      setTripModalVisible(true);
      return;
    }

    setLastTripEarlyFinish(false);
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

  const completeTripRef = useRef(handleCompleteTrip);
  completeTripRef.current = handleCompleteTrip;

  const handlePositionUpdate = (pt: GeoPoint) => {
    setUserGpsLocation(pt);
    if (!isNavigatingRef.current || !destinationRef.current) return;

    const distMeters = Math.round(
      haversineDistanceMeters(pt, destinationRef.current)
    );
    setDistanceToDestMeters(distMeters);

    if (distMeters <= ARRIVAL_RADIUS_METERS && !tripCompletingRef.current) {
      tripCompletingRef.current = true;
      isNavigatingRef.current = false;
      stopGpsWatcher();
      setIsNavigating(false);
      completeTripRef.current(true);
    }
  };

  const handleStartNavigation = async () => {
    if (
      !selectedOption ||
      isLoading ||
      !endpoints.destination ||
      isDestinationTooClose
    ) {
      return;
    }

    tripCompletingRef.current = false;
    isNavigatingRef.current = true;
    setGpsErrorMsg(null);
    setPanelOpen(false);
    setSearchFocused(false);
    Keyboard.dismiss();
    setIsNavigating(true);

    const referencePoint = userGpsLocation || endpoints.origin;
    setDistanceToDestMeters(
      Math.round(haversineDistanceMeters(referencePoint, endpoints.destination))
    );

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (!isNavigatingRef.current) return;

      if (status !== 'granted') {
        setGpsErrorMsg(
          'GPS dozvola je odbijena — bodovi se dodjeljuju tek unutar 60 m od točke B.'
        );
        return;
      }

      try {
        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        if (!isNavigatingRef.current) return;
        handlePositionUpdate({
          lat: Number(current.coords.latitude.toFixed(6)),
          lng: Number(current.coords.longitude.toFixed(6)),
        });
      } catch {
        // Watch subscription below continues attempting live GPS fixes
      }

      if (!isNavigatingRef.current) return;
      stopGpsWatcher();
      locationWatcherRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 2000,
          distanceInterval: 4,
        },
        (loc) => {
          handlePositionUpdate({
            lat: Number(loc.coords.latitude.toFixed(6)),
            lng: Number(loc.coords.longitude.toFixed(6)),
          });
        }
      );
    } catch {
      if (isNavigatingRef.current) {
        setGpsErrorMsg(
          'GPS signal trenutno nije dostupan — bodovi se dodjeljuju tek unutar 60 m od cilja.'
        );
      }
    }
  };

  const handleCancelNavigation = () => {
    isNavigatingRef.current = false;
    stopGpsWatcher();
    setIsNavigating(false);
    setDistanceToDestMeters(null);
    setGpsErrorMsg(null);
  };

  const handleManualFinishNavigation = () => {
    if (tripCompletingRef.current) return;
    tripCompletingRef.current = true;
    isNavigatingRef.current = false;
    stopGpsWatcher();
    setIsNavigating(false);
    const reached =
      distanceToDestMeters !== null &&
      distanceToDestMeters <= ARRIVAL_RADIUS_METERS;
    completeTripRef.current(reached);
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

  const panelSummaryText = !endpoints.destination
    ? 'Klikni na kartu ili upiši odredište za izračun eco-rute'
    : isDestinationTooClose
    ? `⚠️ Odredište preblizu (${directDistanceMeters} m < ${MIN_TRIP_DISTANCE_METERS} m)`
    : selectedOption
    ? `Preporučeno: ${selectedOption.title} (${selectedOption.durationMinutes} min • ${selectedOption.distanceKm} km • +${selectedOption.ecoPoints} bodova)`
    : 'Računam najoptimalnije eco-opcije...';

  const showAutocomplete =
    searchFocused || searchQuery.trim().length > 0;

  // Polazište A ("Moja lokacija") & Odredište B + Reset rendered at the top of TravelOptionsPanel
  const renderBottomSheetAbSlot = () => {
    const abHitSlop = { top: 6, bottom: 6, left: 4, right: 4 };

    if (!endpoints.destination) {
      return (
        <TouchableOpacity
          style={styles.selectDestinationPromptBtn}
          onPress={() => {
            setSearchFocused(true);
            searchInputRef.current?.focus();
          }}
          activeOpacity={0.85}
          hitSlop={abHitSlop}
          accessibilityRole="button"
          accessibilityLabel="Odaberi svoje odredište. Polazište A je uvijek tvoja GPS lokacija."
        >
          <Text style={styles.selectDestPromptIcon}>🏁</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.selectDestPromptTitle, { fontSize: fs(14) }]}>
              Odaberi svoje odredište
            </Text>
            <Text
              style={[styles.selectDestPromptSub, { fontSize: fs(10) }]}
              numberOfLines={1}
            >
              Klikni na kartu ili pretraži adresu (A je uvijek tvoja lokacija)
            </Text>
          </View>
          <Text style={styles.selectDestPromptArrow}>🔍</Text>
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.bottomAbContainer}>
        {/* Fixed Origin A = Moja lokacija */}
        <TouchableOpacity
          style={[styles.abBox, styles.abBoxActiveOrigin, { flex: 0.95 }]}
          onPress={handleRefreshMyLocation}
          activeOpacity={0.85}
          hitSlop={abHitSlop}
          accessibilityRole="button"
          accessibilityLabel={`Osvježi moju trenutnu GPS lokaciju (Polazište A): ${
            isLocatingOrigin ? 'Tražim GPS' : endpoints.originName
          }`}
        >
          <View style={styles.abDotOrigin} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.abLabel, { fontSize: fs(10) }]}>
              Polazište (A)
            </Text>
            <Text
              style={[styles.abValue, { fontSize: fs(12) }]}
              numberOfLines={1}
            >
              {isLocatingOrigin ? 'Tražim GPS...' : endpoints.originName}
            </Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.abArrowText}>➔</Text>

        {/* Destination B */}
        <TouchableOpacity
          style={[styles.abBox, styles.abBoxActiveDest, { flex: 1.15 }]}
          onPress={() => {
            setSearchFocused(true);
            searchInputRef.current?.focus();
          }}
          activeOpacity={0.85}
          hitSlop={abHitSlop}
          accessibilityRole="button"
          accessibilityLabel={`Promijeni Odredište (B): ${endpoints.destinationName}`}
        >
          <View style={styles.abDotDest} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.abLabel, { fontSize: fs(10) }]}>
              Odredište (B)
            </Text>
            <Text
              style={[styles.abValue, { fontSize: fs(12) }]}
              numberOfLines={1}
            >
              {endpoints.destinationName}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Reset Locations Button */}
        <TouchableOpacity
          style={styles.abResetBtn}
          onPress={handleResetLocations}
          activeOpacity={0.8}
          hitSlop={abHitSlop}
          accessibilityRole="button"
          accessibilityLabel="Resetiraj odredište i lokacije"
        >
          <Text style={styles.abResetIcon}>🔄</Text>
          <Text style={[styles.abResetText, { fontSize: fs(10) }]}>Reset</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const formatRemainingDistance = (meters: number | null, fallbackKm: number) => {
    if (meters == null) {
      return `${fallbackKm.toFixed(2)} km`;
    }
    return meters >= 1000 ? `${(meters / 1000).toFixed(2)} km` : `${meters} m`;
  };

  const renderActiveNavigationTopBanner = () => {
    if (!isNavigating || !selectedOption) return null;
    const primaryStep =
      selectedOption.segments?.[0]?.description ||
      `Prati označenu rutu prema: ${endpoints.destinationName}`;

    return (
      <View
        style={styles.navigationTopBanner}
        accessibilityLiveRegion="polite"
      >
        <View style={styles.navTopTitleRow}>
          <Text
            style={[styles.navTopModeTitle, { fontSize: fs(14) }]}
            numberOfLines={1}
          >
            🛰️ {selectedOption.title || selectedOption.mode}
          </Text>
          <View style={styles.navLivePill}>
            <Text style={styles.navLivePillText}>GPS UŽIVO</Text>
          </View>
        </View>
        <Text
          style={[styles.navTopStepText, { fontSize: fs(12) }]}
          numberOfLines={2}
        >
          🏁 Cilj: {endpoints.destinationName} • {primaryStep}
        </Text>
        {gpsErrorMsg && (
          <View style={styles.navWarningBox} accessibilityLiveRegion="polite">
            <Text style={styles.navWarningText}>⚠️ {gpsErrorMsg}</Text>
          </View>
        )}
      </View>
    );
  };

  const renderActiveNavigationHud = () => {
    if (!isNavigating || !selectedOption) return null;

    const totalMeters = Math.max(100, Math.round(selectedOption.distanceKm * 1000));
    const currentDist = distanceToDestMeters ?? totalMeters;
    const progressRatio = Math.max(0, Math.min(1, 1 - currentDist / totalMeters));
    const progressPct = Math.round(progressRatio * 100);
    const estMinutesLeft = Math.max(
      1,
      Math.ceil((currentDist / totalMeters) * selectedOption.durationMinutes)
    );

    return (
      <View style={styles.navHudCard}>
        <View style={styles.navHudHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.navHudStatusLabel, { fontSize: fs(10) }]}>
              AUTOMATSKI ZAVRŠETAK UNUTAR {ARRIVAL_RADIUS_METERS} m OD CILJA
            </Text>
            <Text
              style={[styles.navHudRouteTitle, { fontSize: fs(14) }]}
              numberOfLines={1}
            >
              {endpoints.originName} ➔ {endpoints.destinationName}
            </Text>
          </View>
          <View style={styles.navHudPointsBadge}>
            <Text style={styles.navHudPointsText}>
              +{selectedOption.ecoPoints} bod.
            </Text>
          </View>
        </View>

        <View style={styles.navHudMetricsRow} accessibilityLiveRegion="polite">
          <View style={styles.navHudMetric}>
            <Text style={[styles.navHudMetricVal, { fontSize: fs(16) }]}>
              {formatRemainingDistance(distanceToDestMeters, selectedOption.distanceKm)}
            </Text>
            <Text style={[styles.navHudMetricLbl, { fontSize: fs(10) }]}>
              Preostalo do B
            </Text>
          </View>

          <View style={styles.navHudMetricDivider} />

          <View style={styles.navHudMetric}>
            <Text style={[styles.navHudMetricVal, { fontSize: fs(16) }]}>
              ~{estMinutesLeft} min
            </Text>
            <Text style={[styles.navHudMetricLbl, { fontSize: fs(10) }]}>
              Procjena
            </Text>
          </View>

          <View style={styles.navHudMetricDivider} />

          <View style={styles.navHudMetric}>
            <Text style={[styles.navHudMetricVal, { fontSize: fs(16) }]}>
              {progressPct}%
            </Text>
            <Text style={[styles.navHudMetricLbl, { fontSize: fs(10) }]}>
              Napredak
            </Text>
          </View>
        </View>

        <View style={styles.navProgressTrack}>
          <View style={[styles.navProgressFill, { width: `${progressPct}%` }]} />
        </View>

        <View style={styles.navHudActionsRow}>
          <TouchableOpacity
            style={styles.navCancelBtn}
            onPress={handleCancelNavigation}
            activeOpacity={0.8}
            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            accessibilityRole="button"
            accessibilityLabel="Prekini aktivnu navigaciju bez bodova"
          >
            <Text style={[styles.navCancelBtnText, { fontSize: fs(13) }]}>
              ✕ Prekini
            </Text>
          </TouchableOpacity>

          <AppButton
            title={`🏁 Završi vožnju (+${selectedOption.ecoPoints})`}
            onPress={handleManualFinishNavigation}
            size="md"
            style={{ flex: 1 }}
          />
        </View>
      </View>
    );
  };

  // EN 301 549 / Law 232/2022 Art. 1(4)(d): Non-visual Textual Alternative to Interactive Map
  const renderTextualMapAlternative = () => {
    const stationItems = [...stations]
      .sort((a, b) =>
        hasDisability
          ? Number(Boolean(b.isWheelchairAccessible)) -
            Number(Boolean(a.isWheelchairAccessible))
          : 0
      )
      .map((s) => ({
        id: `st_${s.id}`,
        category: 'stations' as const,
        title: `🚋 ${s.name}`,
        subtitle: `Linije: ${s.lines?.join(', ') || 'STPT javni prijevoz'}${
          s.isWheelchairAccessible ? ' • ♿ Niskopodni pristup' : ''
        }`,
        isAccessibleHighlight: Boolean(s.isWheelchairAccessible),
        accessibleTag: s.isWheelchairAccessible ? '♿ Pristupačno' : null,
        lat: s.lat,
        lng: s.lng,
        selectName: s.name,
      }));

    const parkingItems = [...parkings]
      .sort((a, b) =>
        hasDisability ? Number(b.isAccessible) - Number(a.isAccessible) : 0
      )
      .map((p) => ({
        id: `pk_${p.id}`,
        category: 'parking' as const,
        title: `🅿️ ${p.name}`,
        subtitle: `${p.zone ? `Zona ${p.zone} • ` : ''}${p.hourlyRateRon} RON/h${
          p.isAccessible
            ? ` • ♿ Mjesta za invalide${
                p.accessibleSpots != null ? `: ${p.accessibleSpots}` : ''
              }`
            : ''
        }`,
        isAccessibleHighlight: p.isAccessible,
        accessibleTag: p.isAccessible ? '♿ PMR parking' : null,
        lat: p.lat,
        lng: p.lng,
        selectName: p.name,
      }));

    const landmarkItems = landmarks.map((l) => ({
      id: `lm_${l.id}`,
      category: 'landmarks' as const,
      title: `📍 ${l.name}`,
      subtitle:
        l.address || l.description || `${l.lat.toFixed(4)}, ${l.lng.toFixed(4)}`,
      isAccessibleHighlight: false,
      accessibleTag: null as string | null,
      lat: l.lat,
      lng: l.lng,
      selectName: l.name,
    }));

    const allTextPois = [...stationItems, ...parkingItems, ...landmarkItems];
    const filteredTextPois =
      textAltFilter === 'all'
        ? allTextPois
        : allTextPois.filter((item) => item.category === textAltFilter);

    const filterOptions: Array<{
      key: 'all' | 'stations' | 'parking' | 'landmarks';
      label: string;
    }> = [
      { key: 'all', label: `Sve (${allTextPois.length})` },
      { key: 'stations', label: `🚋 STPT (${stationItems.length})` },
      { key: 'parking', label: `🅿️ Parking (${parkingItems.length})` },
      { key: 'landmarks', label: `📍 Lokacije (${landmarkItems.length})` },
    ];

    return (
      <View
        style={styles.textAltOverlay}
        accessibilityLabel="Tekstualna alternativa karte prema zakonu 232/2022 i normi EN 301 549"
      >
        <ScrollView
          contentContainerStyle={styles.textAltScrollContent}
          showsVerticalScrollIndicator
          keyboardShouldPersistTaps="handled"
        >
          {/* EN 301 549 Legal Banner & Switch back to Map */}
          <View style={styles.textAltBanner}>
            <View style={styles.textAltBannerTextCol}>
              <Text
                style={[styles.textAltBannerTitle, { fontSize: fs(13) }]}
                accessibilityRole="header"
              >
                📜 Tekstualna alternativa karte (EN 301 549)
              </Text>
              <Text style={[styles.textAltBannerSub, { fontSize: fs(11) }]}>
                Pristupačna navigacija bez vizualne karte (Law 232/2022 Art.
                1(4)(d)). Pretraži gore ili odaberi točku B ispod.
              </Text>
            </View>
            <View style={styles.textAltBannerActions}>
              <TouchableOpacity
                style={styles.textAltMapBtn}
                onPress={() => updatePreferences({ wcagTextRouteMode: false })}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Vrati vizualni prikaz karte"
              >
                <Text style={[styles.textAltMapBtnText, { fontSize: fs(12) }]}>
                  🗺️ Prikaz karte
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.textAltStatementBtn}
                onPress={() => setWcagModalVisible(true)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Otvori izjavu pristupačnosti WCAG 2.1 AA"
              >
                <Text
                  style={[styles.textAltStatementBtnText, { fontSize: fs(11) }]}
                >
                  ♿ Izjava / Postavke
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Step-by-Step Textual Route Section */}
          <View style={styles.textAltSectionCard} accessibilityLiveRegion="polite">
            <Text
              style={[styles.textAltSectionTitle, { fontSize: fs(14) }]}
              accessibilityRole="header"
            >
              🧭 Koraci trenutne rute
            </Text>
            <Text style={[styles.textAltRouteEndpoints, { fontSize: fs(12) }]}>
              Polazište (A): {endpoints.originName}
              {'\n'}
              Odredište (B):{' '}
              {endpoints.destination
                ? endpoints.destinationName
                : 'Nije odabrano — odaberi lokaciju ispod ili u tražilici'}
            </Text>

            {endpoints.destination && selectedOption ? (
              <View style={styles.textAltStepsList}>
                <Text style={[styles.textAltRouteSummary, { fontSize: fs(12) }]}>
                  ✓ Odabrano: {selectedOption.title || selectedOption.mode} •{' '}
                  {selectedOption.durationMinutes} min •{' '}
                  {selectedOption.distanceKm.toFixed(2)} km • +
                  {selectedOption.ecoPoints} bodova
                </Text>
                {(selectedOption.segments && selectedOption.segments.length > 0
                  ? selectedOption.segments
                  : [
                      {
                        mode: selectedOption.mode,
                        description: `Nastavi rutom prema ${endpoints.destinationName}`,
                        durationMinutes: selectedOption.durationMinutes,
                        distanceKm: selectedOption.distanceKm,
                      },
                    ]
                ).map((seg, idx) => (
                  <View key={`seg_${idx}`} style={styles.textAltStepRow}>
                    <Text style={[styles.textAltStepNum, { fontSize: fs(11) }]}>
                      {idx + 1}.
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.textAltStepDesc, { fontSize: fs(12) }]}
                      >
                        {seg.description ||
                          `${seg.mode} (${seg.durationMinutes} min)`}
                      </Text>
                      <Text
                        style={[styles.textAltStepMeta, { fontSize: fs(10) }]}
                      >
                        {seg.mode} • {seg.durationMinutes} min •{' '}
                        {seg.distanceKm.toFixed(2)} km
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          {/* Accessible STPT Stations, TimPark & City POIs Directory */}
          <Text
            style={[styles.textAltSectionTitle, { fontSize: fs(14) }]}
            accessibilityRole="header"
          >
            📍 Stanice, PMR parking i odredišta u Timișoari
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.textAltFilterRow}
          >
            {filterOptions.map((opt) => {
              const active = textAltFilter === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.textAltFilterChip,
                    active && styles.textAltFilterChipActive,
                  ]}
                  onPress={() => setTextAltFilter(opt.key)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`Filtriraj popis: ${opt.label}`}
                >
                  <Text
                    style={[
                      styles.textAltFilterText,
                      active && styles.textAltFilterTextActive,
                      { fontSize: fs(11) },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text
            style={[styles.textAltCountLabel, { fontSize: fs(11) }]}
            accessibilityLiveRegion="polite"
          >
            Prikazano {filteredTextPois.length} lokacija
            {hasDisability ? ' (pristupačne lokacije su na vrhu)' : ''}
          </Text>

          {filteredTextPois.slice(0, 45).map((item) => (
            <View
              key={item.id}
              style={[
                styles.textAltPoiCard,
                item.isAccessibleHighlight && styles.textAltPoiCardAccessible,
              ]}
            >
              <View style={styles.textAltPoiTopRow}>
                <Text
                  style={[styles.textAltPoiTitle, { fontSize: fs(13) }]}
                  numberOfLines={2}
                >
                  {item.title}
                </Text>
                {item.accessibleTag && (
                  <View style={styles.textAltAccessiblePill}>
                    <Text
                      style={[
                        styles.textAltAccessiblePillText,
                        { fontSize: fs(10) },
                      ]}
                    >
                      {item.accessibleTag}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.textAltPoiSub, { fontSize: fs(11) }]}>
                {item.subtitle}
              </Text>
              <TouchableOpacity
                style={styles.textAltSelectBtn}
                onPress={() =>
                  handleSelectPoiAsDestination(
                    { lat: item.lat, lng: item.lng },
                    item.selectName
                  )
                }
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={`Odaberi ${item.selectName} kao cilj B`}
              >
                <Text
                  style={[styles.textAltSelectBtnText, { fontSize: fs(12) }]}
                >
                  🏁 Odaberi kao cilj (B)
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Compact Top Header */}
      <View style={styles.topHeader}>
        <View style={styles.brandRow}>
          <Text style={styles.brandTitle} numberOfLines={1}>
            BeGreen
          </Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.profileSettingsBtn}
            onPress={() => {
              setApiUrlInput(API_CONFIG.BASE_URL);
              setSettingsModalVisible(true);
            }}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 2, right: 2 }}
            accessibilityRole="button"
            accessibilityLabel="Otvori postavke profila i API načina rada"
          >
            <Text style={styles.profileSettingsText} numberOfLines={1}>
              {getActiveProfileBadge()} •{' '}
              {getWeatherShortLabel(weather?.condition, weather?.temperatureC)}{' '}
              ⚙️
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.pointsBadgeBtn}
            onPress={() => router.push('/(tabs)/rewards')}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 2, right: 2 }}
            accessibilityRole="button"
            accessibilityLabel={`Otvori eco nagrade, trenutno ${
              user?.totalEcoPoints ?? 0
            } bodova`}
          >
            <Text style={styles.pointsBadgeText}>
              ⭐ {user?.totalEcoPoints ?? 0}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dashboardLinkBtn}
            onPress={() => router.push('/dashboard')}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            accessibilityRole="button"
            accessibilityLabel="Otvori gradski eko dashboard"
          >
            <Text style={styles.dashboardLinkText}>🏛️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* FULL-SCREEN MAP WORKSPACE */}
      <View style={styles.fullMapContainer}>
        <View
          style={{ flex: 1 }}
          importantForAccessibility={
            wcagTextRouteMode && !isNavigating ? 'no-hide-descendants' : 'auto'
          }
        >
          <MapContainer
            origin={endpoints.origin}
            destination={endpoints.destination}
            originName={endpoints.originName}
            destinationName={endpoints.destinationName || 'Odredište'}
            userLocation={userGpsLocation}
            isNavigating={isNavigating}
            stations={stations}
            parkings={parkings}
            landmarks={landmarks}
            selectedOption={selectedOption}
            selectedMode={selectedOption?.mode || 'Bike'}
            onSelectPoiAsDestination={handleSelectPoiAsDestination}
            onUserLocationResolved={handleUserLocationResolved}
          />
        </View>

        {wcagTextRouteMode && !isNavigating && renderTextualMapAlternative()}

        {isNavigating && renderActiveNavigationTopBanner()}

        {/* Floating Address & Place Search Bar at the Top of the Map (Filters sit directly below it in MapContainer) */}
        {!isNavigating && (
        <View style={styles.floatingSearchBarContainer}>
          <View style={styles.searchBarInputRow}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              ref={searchInputRef}
              style={[styles.searchBarInput, { fontSize: fs(13) }]}
              value={searchQuery}
              onFocus={() => setSearchFocused(true)}
              onChangeText={(text) => {
                setSearchQuery(text);
                if (!searchFocused) setSearchFocused(true);
              }}
              placeholder="Upiši adresu, ulicu ili stanicu za Odredište (B)..."
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              accessibilityLabel="Pretraži adresu, ulicu ili stanicu za odredište B"
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
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Očisti i zatvori pretragu adrese"
              >
                <Text style={styles.clearSearchText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Autocomplete Dropdown List when typing or focused (sets Destination B) */}
          {showAutocomplete && (
            <View style={styles.autocompleteDropdown}>
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
                        onPress={() => handleSelectPoiAsDestination(pt, item.name)}
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

                      <TouchableOpacity
                        style={styles.setBBadge}
                        onPress={() =>
                          handleSelectPoiAsDestination(pt, item.name)
                        }
                      >
                        <Text style={styles.setBBadgeText}>🏁 Cilj B</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>
        )}
      </View>

      {/* Collapsible Route Options Panel with "Odaberi svoje odredište" / A➔B + Reset */}
      {!isNavigating && (
      <TravelOptionsPanel
        topSlot={renderBottomSheetAbSlot()}
        isOpen={panelOpen}
        onToggleOpen={setPanelOpen}
        summaryText={panelSummaryText}
        footer={
          endpoints.destination &&
          selectedOption && (
            <View style={styles.actionBottomBar}>
              {isDestinationTooClose && (
                <View
                  style={styles.antiCheatWarningBox}
                  accessibilityLiveRegion="polite"
                >
                  <Text
                    style={[styles.antiCheatWarningText, { fontSize: fs(11) }]}
                  >
                    ⚠️ Odredište je preblizu tvojoj lokaciji ({directDistanceMeters} m). Odaberi točku B udaljenu barem {MIN_TRIP_DISTANCE_METERS} m za pokretanje vožnje.
                  </Text>
                </View>
              )}
              <AppButton
                title={`🚀 Kreni (${selectedOption.durationMinutes} min • +${selectedOption.ecoPoints} bodova)`}
                onPress={handleStartNavigation}
                loading={isLoading}
                disabled={isLoading || isDestinationTooClose}
                size="lg"
              />
            </View>
          )
        }
      >
        {!endpoints.destination ? (
          <View style={styles.emptyRoutePromptBox}>
            <Text
              style={[styles.emptyRoutePromptText, { fontSize: fs(13) }]}
            >
              Odaberi odredište (točku B) klikom na kartu ili putem tražilice gore kako bismo prikazali najbolje eco-opcije iz tvoje trenutne lokacije.
            </Text>
          </View>
        ) : (
          options.map((option) => (
            <RouteOptionCard
              key={option.id}
              option={option}
              isSelected={selectedOptionId === option.id}
              onSelect={() => {
                setSelectedOptionId(option.id);
              }}
            />
          ))
        )}
      </TravelOptionsPanel>
      )}

      {renderActiveNavigationHud()}

      {/* BeGreen Trip Completed Modal */}
      <TripCompletedModal
        visible={tripModalVisible}
        option={selectedOption}
        co2SavedGrams={lastCo2Saved}
        totalPoints={user?.totalEcoPoints ?? 0}
        originName={endpoints.originName}
        destinationName={endpoints.destinationName || 'Odredište'}
        earlyFinish={lastTripEarlyFinish}
        onClose={() => setTripModalVisible(false)}
        onViewRewards={() => {
          setTripModalVisible(false);
          router.push('/(tabs)/rewards');
        }}
      />

      {/* Romanian Law 232/2022, EN 301 549 & WCAG 2.1 AA Compliance Modal */}
      <AccessibilityComplianceModal
        visible={wcagModalVisible}
        onClose={() => setWcagModalVisible(false)}
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
            <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.connectionModalHeader}>
              <Text style={styles.connectionModalTitle}>
                👤 Profil putnika & API postavke
              </Text>
              <TouchableOpacity
                onPress={() => setSettingsModalVisible(false)}
                style={styles.modalCloseBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Zatvori postavke"
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
              ♿ Pristupačnost (WCAG 2.1 AA • Law 232/2022)
            </Text>
            <View style={styles.profileGrid}>
              <TouchableOpacity
                onPress={() =>
                  updatePreferences({ wcagLargeText: !wcagLargeText })
                }
                style={[
                  styles.profileChip,
                  wcagLargeText && styles.profileChipActive,
                ]}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityState={{ selected: wcagLargeText }}
                accessibilityLabel="Uključi ili isključi veliki tekst 120 posto"
              >
                <Text
                  style={[
                    styles.profileChipText,
                    wcagLargeText && styles.profileChipTextActive,
                  ]}
                >
                  {wcagLargeText ? '✓ ' : ''}🔤 Veliki tekst (120%)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() =>
                  updatePreferences({ wcagTextRouteMode: !wcagTextRouteMode })
                }
                style={[
                  styles.profileChip,
                  wcagTextRouteMode && styles.profileChipActive,
                ]}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityState={{ selected: wcagTextRouteMode }}
                accessibilityLabel="Uključi ili isključi tekstualnu alternativu karte"
              >
                <Text
                  style={[
                    styles.profileChipText,
                    wcagTextRouteMode && styles.profileChipTextActive,
                  ]}
                >
                  {wcagTextRouteMode ? '✓ ' : ''}📜 Tekstualna karta
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.wcagModalOpenBtn}
              onPress={() => {
                setSettingsModalVisible(false);
                setWcagModalVisible(true);
              }}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Otvori izjavu o pristupačnosti Law 232/2022 i sve WCAG opcije"
            >
              <Text style={styles.wcagModalOpenBtnText}>
                ♿ WCAG 2.1 AA postavke & Izjava (RO / EN)
              </Text>
            </TouchableOpacity>

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
            </ScrollView>
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
    flexShrink: 1,
  },
  brandTitle: {
    ...typography.h3,
    fontSize: 18,
    color: colors.primaryDark,
    fontWeight: '800',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  profileSettingsBtn: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: 120,
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
    maxHeight: '88%',
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
  wcagModalOpenBtn: {
    minHeight: 44,
    backgroundColor: colors.primaryDark,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wcagModalOpenBtnText: {
    ...typography.captionMedium,
    fontSize: 12,
    fontWeight: '800',
    color: colors.textInverse,
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
  navigationTopBanner: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.primary,
    zIndex: 28,
    ...shadows.lg,
  },
  navTopTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 2,
  },
  navTopModeTitle: {
    ...typography.bodyMedium,
    fontSize: 13,
    fontWeight: '800',
    color: colors.textInverse,
    flex: 1,
  },
  navLivePill: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  navLivePillText: {
    ...typography.captionMedium,
    fontSize: 10,
    fontWeight: '800',
    color: colors.textInverse,
  },
  navTopStepText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textOnDark,
  },
  navWarningBox: {
    marginTop: 6,
    backgroundColor: colors.warningLight,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  navWarningText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.warning,
    fontWeight: '700',
  },
  navHudCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 2,
    borderColor: colors.primary,
    zIndex: 32,
    ...shadows.lg,
  },
  navHudHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  navHudStatusLabel: {
    ...typography.captionMedium,
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.3,
  },
  navHudRouteTitle: {
    ...typography.bodyMedium,
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 1,
  },
  navHudPointsBadge: {
    backgroundColor: colors.rewardBackground,
    borderWidth: 1,
    borderColor: colors.rewardBorder,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  navHudPointsText: {
    ...typography.captionMedium,
    fontSize: 12,
    fontWeight: '800',
    color: colors.rewardText,
  },
  navHudMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceMuted,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  navHudMetric: {
    flex: 1,
    alignItems: 'center',
  },
  navHudMetricVal: {
    ...typography.bodyMedium,
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  navHudMetricLbl: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
  },
  navHudMetricDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },
  navProgressTrack: {
    height: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
    marginBottom: spacing.sm + 2,
  },
  navProgressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  navHudActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  navCancelBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 2,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.danger,
    backgroundColor: colors.dangerLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navCancelBtnText: {
    ...typography.bodyMedium,
    fontSize: 13,
    fontWeight: '800',
    color: colors.danger,
  },
  selectDestinationPromptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderWidth: 1.5,
    borderColor: colors.primary,
    gap: 10,
  },
  selectDestPromptIcon: {
    fontSize: 18,
  },
  selectDestPromptTitle: {
    ...typography.bodyMedium,
    fontSize: 14,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  selectDestPromptSub: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textSecondary,
  },
  selectDestPromptArrow: {
    fontSize: 15,
  },
  abArrowText: {
    alignSelf: 'center',
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  abResetBtn: {
    alignSelf: 'stretch',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.dangerLight,
    borderWidth: 1.5,
    borderColor: colors.danger,
    borderRadius: borderRadius.md,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  abResetIcon: {
    fontSize: 12,
  },
  abResetText: {
    ...typography.captionMedium,
    fontSize: 10,
    fontWeight: '800',
    color: colors.danger,
  },
  antiCheatWarningBox: {
    backgroundColor: colors.warningLight,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.warning,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    marginBottom: spacing.xs + 2,
  },
  antiCheatWarningText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.warning,
    fontWeight: '700',
  },
  emptyRoutePromptBox: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceMuted,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyRoutePromptText: {
    ...typography.body,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  textAltOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 25,
    backgroundColor: colors.background,
    paddingTop: 62,
  },
  textAltScrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: 150,
    gap: spacing.sm,
  },
  textAltBanner: {
    backgroundColor: colors.primaryDark,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.sm,
  },
  textAltBannerTextCol: {
    gap: 3,
  },
  textAltBannerTitle: {
    ...typography.h3,
    fontSize: 13,
    fontWeight: '800',
    color: colors.textInverse,
  },
  textAltBannerSub: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textOnDark,
    lineHeight: 16,
  },
  textAltBannerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  textAltMapBtn: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textAltMapBtnText: {
    ...typography.captionMedium,
    fontSize: 12,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  textAltStatementBtn: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.textOnDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textAltStatementBtnText: {
    ...typography.captionMedium,
    fontSize: 11,
    fontWeight: '700',
    color: colors.textInverse,
  },
  textAltSectionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
    ...shadows.sm,
  },
  textAltSectionTitle: {
    ...typography.bodyMedium,
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  textAltRouteEndpoints: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  textAltStepsList: {
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  textAltRouteSummary: {
    ...typography.captionMedium,
    fontSize: 12,
    fontWeight: '800',
    color: colors.primaryDark,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  textAltStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  textAltStepNum: {
    ...typography.captionMedium,
    fontSize: 11,
    fontWeight: '800',
    color: colors.primaryDark,
    minWidth: 20,
  },
  textAltStepDesc: {
    ...typography.body,
    fontSize: 12,
    color: colors.textPrimary,
  },
  textAltStepMeta: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  textAltFilterRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  textAltFilterChip: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.controlBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textAltFilterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  textAltFilterText: {
    ...typography.captionMedium,
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  textAltFilterTextActive: {
    color: colors.textInverse,
  },
  textAltCountLabel: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
  },
  textAltPoiCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
    ...shadows.sm,
  },
  textAltPoiCardAccessible: {
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  textAltPoiTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  textAltPoiTitle: {
    ...typography.bodyMedium,
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
    flex: 1,
  },
  textAltAccessiblePill: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  textAltAccessiblePillText: {
    ...typography.captionMedium,
    fontSize: 10,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  textAltPoiSub: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  textAltSelectBtn: {
    minHeight: 44,
    marginTop: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  textAltSelectBtnText: {
    ...typography.captionMedium,
    fontSize: 12,
    fontWeight: '800',
    color: colors.textInverse,
  },
});
