import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { transitService } from '../../services/transitService';
import { WebLeafletMap } from './WebLeafletMap';
import { useTranslation } from '../../hooks/useTranslation';
import {
  GeoPoint,
  StationLocation,
  ParkingDetail,
  CityLandmarkPoi,
  RouteOptionDto,
} from '../../types/route';

// Conditionally import native MapView only on native platforms to prevent web crashes
let MapView: any = null;
let Marker: any = null;
let Polyline: any = null;

if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default;
    Marker = Maps.Marker;
    Polyline = Maps.Polyline;
  } catch (e) {
    console.warn('react-native-maps could not be loaded, using fallback:', e);
  }
}

export const TIMISOARA_CENTER = {
  latitude: 45.7537,
  longitude: 21.2257,
  latitudeDelta: 0.032,
  longitudeDelta: 0.032,
};

/**
 * Official Google Maps Aubergine Dark Mode JSON style.
 */
const AUBERGINE_MAP_STYLE = [
  {
    elementType: 'geometry',
    stylers: [{ color: colors.mapDarkLand }],
  },
  {
    elementType: 'labels.text.fill',
    stylers: [{ color: colors.mapDarkLabel }],
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: colors.mapDarkCanvas }],
  },
  {
    featureType: 'administrative.country',
    elementType: 'geometry.stroke',
    stylers: [{ color: colors.mapDarkBorder }],
  },
  {
    featureType: 'administrative.province',
    elementType: 'geometry.stroke',
    stylers: [{ color: colors.mapDarkBorder }],
  },
  {
    featureType: 'administrative.land_parcel',
    elementType: 'labels.text.fill',
    stylers: [{ color: colors.mapDarkLabelSecondary }],
  },
  {
    featureType: 'landscape.man_made',
    elementType: 'geometry.stroke',
    stylers: [{ color: colors.mapDarkRoadArterial }],
  },
  {
    featureType: 'landscape.natural',
    elementType: 'geometry',
    stylers: [{ color: colors.mapDarkPark }],
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: colors.mapDarkPoi }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: colors.mapDarkPoiLabel }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.stroke',
    stylers: [{ color: colors.mapDarkRoadStroke }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry.fill',
    stylers: [{ color: colors.mapDarkPark }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: colors.mapDarkParkLabel }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: colors.mapDarkRoad }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: colors.mapDarkRoadLabel }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.stroke',
    stylers: [{ color: colors.mapDarkRoadStroke }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: colors.mapDarkRoadHighway }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: colors.mapDarkRoadHighwayStroke }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: colors.mapDarkRoadHighwayLabel }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.stroke',
    stylers: [{ color: colors.mapDarkRoadHighwayLabelStroke }],
  },
  {
    featureType: 'transit',
    elementType: 'labels.text.fill',
    stylers: [{ color: colors.mapDarkRoadLabel }],
  },
  {
    featureType: 'transit',
    elementType: 'labels.text.stroke',
    stylers: [{ color: colors.mapDarkRoadStroke }],
  },
  {
    featureType: 'transit.line',
    elementType: 'geometry',
    stylers: [{ color: colors.mapDarkTransitLine }],
  },
  {
    featureType: 'transit.station',
    elementType: 'geometry',
    stylers: [{ color: colors.mapDarkPoi }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: colors.mapDarkWater }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: colors.mapDarkWaterLabel }],
  },
];

export type PoiCategoryFilter =
  | 'bus'
  | 'tram'
  | 'trolleybus'
  | 'bike'
  | 'parking'
  | 'landmarks';

type SelectedPoi =
  | { kind: 'station'; data: StationLocation }
  | { kind: 'parking'; data: ParkingDetail }
  | { kind: 'landmark'; data: CityLandmarkPoi };

interface MapContainerProps {
  origin?: GeoPoint | null;
  destination?: GeoPoint | null;
  originName?: string;
  destinationName?: string;
  userLocation?: GeoPoint | null;
  isNavigating?: boolean;
  stations?: StationLocation[];
  parkings?: ParkingDetail[];
  landmarks?: CityLandmarkPoi[];
  selectedOption?: RouteOptionDto | null;
  selectedMode?: string;
  externalTapTarget?: 'origin' | 'destination';
  onTapTargetChange?: (target: 'origin' | 'destination') => void;
  onSelectPoiAsOrigin?: (point: GeoPoint, name: string) => void;
  onSelectPoiAsDestination?: (point: GeoPoint, name: string) => void;
  onUserLocationResolved?: (point: GeoPoint) => void;
}

const ALL_CATEGORIES: PoiCategoryFilter[] = [
  'bus',
  'tram',
  'trolleybus',
  'bike',
  'parking',
  'landmarks',
];

export const MapContainer: React.FC<MapContainerProps> = ({
  origin,
  destination,
  originName,
  destinationName,
  userLocation,
  isNavigating = false,
  stations = [],
  parkings = [],
  landmarks = [],
  selectedOption,
  selectedMode = 'Bike',
  externalTapTarget,
  onTapTargetChange,
  onSelectPoiAsOrigin,
  onSelectPoiAsDestination,
  onUserLocationResolved,
}) => {
  const { t } = useTranslation();
  const resolvedOriginName = originName ?? t.originDefaultName;
  const resolvedDestinationName = destinationName ?? t.destDefaultName;
  const mapRef = useRef<any>(null);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Clean initial state: empty array = show ONLY the active route A -> B without 400+ icons cluttering the map!
  const [activeFilters, setActiveFilters] = useState<PoiCategoryFilter[]>([]);
  const [isDarkMap, setIsDarkMap] = useState(true);
  const [webFocusTarget, setWebFocusTarget] = useState<{
    lat: number;
    lng: number;
    zoom?: number;
    nonce: number;
  } | null>(null);
  const [selectedPoi, setSelectedPoi] = useState<SelectedPoi | null>(null);
  const [loadingTimetable, setLoadingTimetable] = useState(false);
  const [internalTapTarget, setInternalTapTarget] = useState<'origin' | 'destination'>('destination');
  const lastMarkerPressTime = useRef<number>(0);
  const prevNavigatingRef = useRef<boolean>(false);

  const mapTapTarget = externalTapTarget ?? internalTapTarget;
  const setMapTapTarget = (next: 'origin' | 'destination') => {
    setInternalTapTarget(next);
    if (onTapTargetChange) {
      onTapTargetChange(next);
    }
  };

  const toggleCategoryFilter = (cat: PoiCategoryFilter) => {
    setSelectedPoi(null);
    setActiveFilters((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const toggleAllOrCleanFilters = () => {
    setSelectedPoi(null);
    if (activeFilters.length > 0) {
      setActiveFilters([]);
    } else {
      setActiveFilters([...ALL_CATEGORIES]);
    }
  };

  const filteredStations = stations.filter((st) => {
    if (st.type === 'bus') return activeFilters.includes('bus');
    if (st.type === 'tram') return activeFilters.includes('tram');
    if (st.type === 'trolleybus') return activeFilters.includes('trolleybus');
    if (st.type === 'bike_station' || st.type === 'scooter_station') {
      return activeFilters.includes('bike');
    }
    return false;
  });

  const filteredParkings = activeFilters.includes('parking') ? parkings : [];
  const filteredLandmarks = activeFilters.includes('landmarks') ? landmarks : [];

  const getStationEmoji = (type: StationLocation['type']) => {
    switch (type) {
      case 'bike_station':
        return '🚲';
      case 'scooter_station':
        return '🛴';
      case 'tram':
        return '🚊';
      case 'trolleybus':
        return '🚎';
      case 'bus':
      default:
        return '🚌';
    }
  };

  const handleSelectStation = async (st: StationLocation) => {
    lastMarkerPressTime.current = Date.now();
    setSelectedPoi({ kind: 'station', data: st });
    if (!isNavigating && onSelectPoiAsDestination) {
      onSelectPoiAsDestination({ lat: st.lat, lng: st.lng }, st.name);
    }
    if (st.type === 'tram' || st.type === 'bus' || st.type === 'trolleybus') {
      setLoadingTimetable(true);
      try {
        const res = await transitService.getStopTimetable(st.id);
        setSelectedPoi((prev) => {
          if (!prev || prev.kind !== 'station' || prev.data.id !== st.id) {
            return prev;
          }
          return {
            kind: 'station',
            data: {
              ...prev.data,
              nextArrivalMinutes: res.nextArrivalMinutes ?? prev.data.nextArrivalMinutes,
              nextDepartures:
                res.nextDepartures.length > 0
                  ? res.nextDepartures
                  : prev.data.nextDepartures,
            },
          };
        });
      } catch {
        // Ignore timetable error; base station info stays displayed
      } finally {
        setLoadingTimetable(false);
      }
    }
  };

  const handleSelectParking = (prk: ParkingDetail) => {
    lastMarkerPressTime.current = Date.now();
    setSelectedPoi({ kind: 'parking', data: prk });
    if (!isNavigating && onSelectPoiAsDestination) {
      onSelectPoiAsDestination({ lat: prk.lat, lng: prk.lng }, prk.name);
    }
  };

  const handleSelectLandmark = (lm: CityLandmarkPoi) => {
    lastMarkerPressTime.current = Date.now();
    setSelectedPoi({ kind: 'landmark', data: lm });
    if (!isNavigating && onSelectPoiAsDestination) {
      onSelectPoiAsDestination({ lat: lm.lat, lng: lm.lng }, lm.name);
    }
  };

  const handlePointPress = (rawPt: GeoPoint, customName?: string) => {
    if (isNavigating) {
      return;
    }
    if (Date.now() - lastMarkerPressTime.current < 250) {
      return;
    }
    if (selectedPoi) {
      setSelectedPoi(null);
    }
    const pt: GeoPoint = {
      lat: Number(rawPt.lat.toFixed(6)),
      lng: Number(rawPt.lng.toFixed(6)),
    };
    const cleanedName =
      typeof customName === 'string'
        ? customName.replace(/\s+/g, ' ').trim()
        : '';
    const resolvedName = cleanedName || transitService.resolveNearestPointName(pt);
    if (onSelectPoiAsDestination) {
      onSelectPoiAsDestination(pt, resolvedName);
    }
  };

  const handleMapCoordinatePress = (e: any) => {
    const coord = e?.nativeEvent?.coordinate;
    if (!coord || typeof coord.latitude !== 'number' || typeof coord.longitude !== 'number') {
      return;
    }
    handlePointPress({ lat: coord.latitude, lng: coord.longitude });
  };

  const handleGooglePoiClick = (e: any) => {
    const coord = e?.nativeEvent?.coordinate;
    if (!coord || typeof coord.latitude !== 'number' || typeof coord.longitude !== 'number') {
      return;
    }
    handlePointPress(
      { lat: coord.latitude, lng: coord.longitude },
      e?.nativeEvent?.name
    );
  };

  const renderPoiActionButtons = (point: GeoPoint, name: string) => (
    <View style={styles.poiActionsRow}>
      {onSelectPoiAsDestination && (
        <TouchableOpacity
          style={styles.poiRouteBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={t.setAsDestBA11y(name)}
          onPress={() => {
            onSelectPoiAsDestination(point, name);
            setSelectedPoi(null);
          }}
        >
          <Text style={styles.poiRouteBtnText}>{t.setAsDestB}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // Request location permissions on mount
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          setHasLocationPermission(true);
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          const pt = {
            lat: Number(location.coords.latitude.toFixed(6)),
            lng: Number(location.coords.longitude.toFixed(6)),
          };
          if (onUserLocationResolved) {
            onUserLocationResolved(pt);
          }
        }
      } catch (err) {
        console.warn('Location permission or fetch error:', err);
      }
    })();
  }, []);

  // Fit map to coordinates whenever origin, destination or route segments change
  useEffect(() => {
    if (!mapRef.current) return;

    const coordinatesToFit: { latitude: number; longitude: number }[] = [];

    if (origin) {
      coordinatesToFit.push({ latitude: origin.lat, longitude: origin.lng });
    }
    if (destination) {
      coordinatesToFit.push({ latitude: destination.lat, longitude: destination.lng });
    }

    if (selectedOption?.segments) {
      selectedOption.segments.forEach((seg) => {
        if (seg.geometry) {
          seg.geometry.forEach((pt) => {
            coordinatesToFit.push({ latitude: pt.lat, longitude: pt.lng });
          });
        }
      });
    }

    if (coordinatesToFit.length >= 2 && !isNavigating) {
      setTimeout(() => {
        mapRef.current?.fitToCoordinates(coordinatesToFit, {
          edgePadding: { top: 115, right: 50, bottom: 165, left: 50 },
          animated: true,
        });
      }, 300);
    }
  }, [origin, destination, selectedOption, isNavigating]);

  // Follow live GPS position while navigation is active
  useEffect(() => {
    const justStarted = isNavigating && !prevNavigatingRef.current;
    prevNavigatingRef.current = isNavigating;

    if (!isNavigating || !userLocation) return;

    mapRef.current?.animateToRegion(
      {
        latitude: userLocation.lat,
        longitude: userLocation.lng,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      },
      500
    );

    if (justStarted) {
      setWebFocusTarget({
        lat: userLocation.lat,
        lng: userLocation.lng,
        zoom: 16,
        nonce: Date.now(),
      });
    }
  }, [isNavigating, userLocation?.lat, userLocation?.lng]);

  const handleCenterOnUser = async () => {
    setIsLocating(true);
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const pt = {
        lat: Number(location.coords.latitude.toFixed(6)),
        lng: Number(location.coords.longitude.toFixed(6)),
      };
      if (onUserLocationResolved) {
        onUserLocationResolved(pt);
      }
      setWebFocusTarget({ lat: pt.lat, lng: pt.lng, zoom: 16, nonce: Date.now() });
      mapRef.current?.animateToRegion(
        {
          latitude: pt.lat,
          longitude: pt.lng,
          latitudeDelta: 0.018,
          longitudeDelta: 0.018,
        },
        600
      );
    } catch {
      setWebFocusTarget({
        lat: TIMISOARA_CENTER.latitude,
        lng: TIMISOARA_CENTER.longitude,
        zoom: 14,
        nonce: Date.now(),
      });
      mapRef.current?.animateToRegion(TIMISOARA_CENTER, 600);
    } finally {
      setIsLocating(false);
    }
  };

  const handleCenterOnTimisoara = () => {
    setWebFocusTarget({
      lat: TIMISOARA_CENTER.latitude,
      lng: TIMISOARA_CENTER.longitude,
      zoom: 14,
      nonce: Date.now(),
    });
    mapRef.current?.animateToRegion(TIMISOARA_CENTER, 600);
  };

  /**
   * High-contrast vivid colors for each transport mode so the route pops out clearly on the map!
   */
  const getModeStrokeColor = (mode: string) => {
    switch (mode) {
      case 'Walk':
        return colors.mapRouteWalk;
      case 'Bike':
        return colors.mapRouteBike;
      case 'Scooter':
        return colors.mapRouteScooter;
      case 'PublicTransport':
        return colors.mapRouteTransit;
      case 'Car':
      default:
        return colors.mapRouteCar;
    }
  };

  const getModeStrokeWidth = (mode: string) => {
    switch (mode) {
      case 'PublicTransport':
        return 7;
      case 'Bike':
      case 'Scooter':
        return 6;
      case 'Walk':
      case 'Car':
      default:
        return 6;
    }
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'Bike':
        return '🚲';
      case 'Walk':
        return '🚶';
      case 'PublicTransport':
        return '🚊';
      case 'Scooter':
        return '🛴';
      case 'Car':
      default:
        return '🚗';
    }
  };

  const renderSegmentsOverlay = () => {
    const segments = selectedOption?.segments;
    if (!segments || segments.length === 0) {
      return null;
    }

    return (
      <View style={styles.segmentsBanner}>
        {segments.map((seg, idx) => (
          <React.Fragment key={`legend_${idx}`}>
            <View style={styles.segmentPill}>
              <View
                style={[
                  styles.segmentColorDot,
                  { backgroundColor: getModeStrokeColor(seg.mode) },
                ]}
              />
              <Text style={styles.segmentPillText}>
                {getModeIcon(seg.mode)} {seg.durationMinutes} min
              </Text>
            </View>
            {idx < segments.length - 1 && (
              <Text style={styles.segmentArrow}>➔</Text>
            )}
          </React.Fragment>
        ))}
      </View>
    );
  };

  const renderPoiFilterBar = () => {
    const filterItems: { id: PoiCategoryFilter; label: string }[] = [
      { id: 'bus', label: t.filterBus },
      { id: 'tram', label: t.filterTram },
      { id: 'trolleybus', label: t.filterTrolleybus },
      { id: 'bike', label: '🚲 VeloTM' },
      { id: 'parking', label: '🅿️ Parking' },
      { id: 'landmarks', label: t.filterLandmarks },
    ];

    const anyActive = activeFilters.length > 0;

    return (
      <View style={styles.poiFilterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.poiFilterScrollContent}
        >
          {/* Quick Toggle: Clean Map vs Show All */}
          <TouchableOpacity
            onPress={toggleAllOrCleanFilters}
            style={[
              styles.poiFilterChip,
              !anyActive && styles.poiFilterChipCleanActive,
            ]}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityState={{ selected: anyActive }}
            accessibilityLabel={anyActive ? t.hideIconsA11y : t.showAllA11y}
          >
            <Text
              style={[
                styles.poiFilterChipText,
                !anyActive && styles.poiFilterChipTextActive,
              ]}
            >
              {anyActive ? t.hideIcons : t.cleanMapShowAll}
            </Text>
          </TouchableOpacity>

          {filterItems.map((f) => {
            const isActive = activeFilters.includes(f.id);
            return (
              <TouchableOpacity
                key={f.id}
                onPress={() => toggleCategoryFilter(f.id)}
                style={[styles.poiFilterChip, isActive && styles.poiFilterChipActive]}
                activeOpacity={0.8}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={`${t.filterMapPrefix} ${f.label}`}
              >
                <Text
                  style={[
                    styles.poiFilterChipText,
                    isActive && styles.poiFilterChipTextActive,
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderSelectedPoiCard = () => {
    if (!selectedPoi) return null;

    if (selectedPoi.kind === 'station') {
      const st = selectedPoi.data;
      const isBike = st.type === 'bike_station' || st.type === 'scooter_station';
      return (
        <View style={styles.poiPopupCard}>
          <View style={styles.poiPopupHeader}>
            <View style={styles.poiTitleRow}>
              <Text style={styles.poiTypeEmoji}>{getStationEmoji(st.type)}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.poiPopupTitle} numberOfLines={1}>
                  {st.name}
                </Text>
                <Text style={styles.poiPopupSubtitle} numberOfLines={2}>
                  {isBike
                    ? t.bikesFreeLabel(st.availableBikes ?? 0, st.totalDocks ?? 15)
                    : `${t.linesPrefix}: ${st.lines?.join(', ') || '-'}${
                        st.nextArrivalMinutes
                          ? t.arrivesInMin(st.nextArrivalMinutes)
                          : ''
                      }${
                        st.nextDepartures && st.nextDepartures.length > 0
                          ? `\n${t.departuresPrefix} ${st.nextDepartures.slice(0, 3).join(' • ')}`
                          : loadingTimetable
                          ? t.loadingSchedule
                          : ''
                      }`}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setSelectedPoi(null)}
              style={styles.poiCloseBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel={t.closePoiA11y}
            >
              <Text style={styles.poiCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.poiPopupFooter}>
            {isBike ? (
              <View style={styles.poiEcoBadge}>
                <Text style={styles.poiEcoText}>🌱 0g CO₂ VeloTM</Text>
              </View>
            ) : (
              <View style={styles.poiAccessBadge}>
                <Text style={styles.poiAccessText}>
                  {st.dataSource || 'SMTT GTFS Timișoara'}
                </Text>
              </View>
            )}

            {renderPoiActionButtons({ lat: st.lat, lng: st.lng }, st.name)}
          </View>
        </View>
      );
    }

    if (selectedPoi.kind === 'landmark') {
      const lm = selectedPoi.data;
      return (
        <View style={styles.poiPopupCard}>
          <View style={styles.poiPopupHeader}>
            <View style={styles.poiTitleRow}>
              <Text style={styles.poiTypeEmoji}>🏛️</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.poiPopupTitle} numberOfLines={1}>
                  {lm.name}
                </Text>
                <Text style={styles.poiPopupSubtitle} numberOfLines={2}>
                  {lm.address} • {lm.description}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setSelectedPoi(null)}
              style={styles.poiCloseBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel={t.closePoiA11y}
            >
              <Text style={styles.poiCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.poiPopupFooter}>
            <View style={styles.poiAccessBadge}>
              <Text style={styles.poiAccessText}>📍 Primăria Timișoara POI</Text>
            </View>

            {renderPoiActionButtons({ lat: lm.lat, lng: lm.lng }, lm.name)}
          </View>
        </View>
      );
    }

    const prk = selectedPoi.data;
    const availabilityText =
      prk.spotsAvailable != null && prk.totalSpots != null
        ? t.spotsAvailableLabel(prk.spotsAvailable, prk.totalSpots)
        : t.timParkNoSensor;

    return (
      <View style={styles.poiPopupCard}>
        <View style={styles.poiPopupHeader}>
          <View style={styles.poiTitleRow}>
            <Text style={styles.poiTypeEmoji}>🅿️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.poiPopupTitle} numberOfLines={1}>
                {prk.name}
              </Text>
              <Text style={styles.poiPopupSubtitle} numberOfLines={2}>
                {availabilityText} • {prk.hourlyRateRon} RON/h
                {prk.hourlyRateEur ? ` (${prk.hourlyRateEur} €)` : ''}
                {prk.zone ? ` • ${prk.zone}` : ''}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => setSelectedPoi(null)}
            style={styles.poiCloseBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={t.closePoiA11y}
          >
            <Text style={styles.poiCloseText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.poiPopupFooter}>
          <View style={styles.poiAccessBadge}>
            <Text style={styles.poiAccessText}>
              {prk.smsCode && prk.smsNumber
                ? t.smsCodeLabel(prk.smsNumber, prk.smsCode)
                : t.accessibleSpotsLabel(prk.accessibleSpots ?? 2)}
            </Text>
          </View>

          {renderPoiActionButtons({ lat: prk.lat, lng: prk.lng }, prk.name)}
        </View>
      </View>
    );
  };

  // Interactive Leaflet / OpenStreetMap Renderer for Web
  const renderWebMap = () => (
    <WebLeafletMap
      origin={origin}
      destination={destination}
      originName={resolvedOriginName}
      destinationName={resolvedDestinationName}
      userLocation={userLocation}
      isNavigating={isNavigating}
      stations={filteredStations}
      parkings={filteredParkings}
      landmarks={filteredLandmarks}
      selectedOption={selectedOption}
      selectedPoiKey={selectedPoi ? `${selectedPoi.kind}:${selectedPoi.data.id}` : null}
      selectedParkingPolygon={
        selectedPoi?.kind === 'parking' ? selectedPoi.data.polygon : null
      }
      isDarkMap={isDarkMap}
      focusTarget={webFocusTarget}
      getModeStrokeColor={getModeStrokeColor}
      getModeStrokeWidth={getModeStrokeWidth}
      getStationEmoji={getStationEmoji}
      onMapClick={handlePointPress}
      onDragOrigin={(pt) => {
        if (onSelectPoiAsOrigin) {
          onSelectPoiAsOrigin(pt, transitService.resolveNearestPointName(pt));
        }
      }}
      onDragDestination={(pt) => {
        if (onSelectPoiAsDestination) {
          onSelectPoiAsDestination(pt, transitService.resolveNearestPointName(pt));
        }
      }}
      onSelectStation={(st) => handleSelectStation(st)}
      onSelectParking={(prk) => handleSelectParking(prk)}
      onSelectLandmark={(lm) => handleSelectLandmark(lm)}
    />
  );

  return (
    <View style={styles.container}>
      {Platform.OS !== 'web' && MapView ? (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={TIMISOARA_CENTER}
          userInterfaceStyle={isDarkMap ? 'dark' : 'light'}
          customMapStyle={isDarkMap ? AUBERGINE_MAP_STYLE : []}
          showsPointsOfInterest={true}
          showsBuildings={true}
          showsUserLocation={hasLocationPermission}
          showsMyLocationButton={false}
          showsCompass={true}
          onPress={handleMapCoordinatePress}
          onPoiClick={handleGooglePoiClick}
        >
          {/* Origin Marker A (always locked to user's live GPS location) */}
          {origin && (
            <Marker
              coordinate={{ latitude: origin.lat, longitude: origin.lng }}
              title={resolvedOriginName}
              description={t.myGpsOriginMarker}
              draggable={false}
            >
              <View style={styles.markerAnchor}>
                <View style={styles.pinCircleGreen}>
                  <Text style={styles.pinText}>A</Text>
                </View>
                <View style={styles.pinLabelBox}>
                  <Text style={styles.pinLabel}>{resolvedOriginName}</Text>
                </View>
              </View>
            </Marker>
          )}

          {/* Destination Marker B (draggable when not navigating) */}
          {destination && (
            <Marker
              coordinate={{ latitude: destination.lat, longitude: destination.lng }}
              title={resolvedDestinationName}
              description={t.destMarkerDrag}
              draggable={!isNavigating}
              onDragEnd={(e: any) => {
                const c = e?.nativeEvent?.coordinate;
                if (c && onSelectPoiAsDestination) {
                  const pt = {
                    lat: Number(c.latitude.toFixed(6)),
                    lng: Number(c.longitude.toFixed(6)),
                  };
                  onSelectPoiAsDestination(pt, transitService.resolveNearestPointName(pt));
                }
              }}
            >
              <View style={styles.markerAnchor}>
                <View style={styles.pinCircleRed}>
                  <Text style={styles.pinText}>B</Text>
                </View>
                <View style={styles.pinLabelBox}>
                  <Text style={styles.pinLabel}>{destinationName}</Text>
                </View>
              </View>
            </Marker>
          )}

          {/* Filtered SMTT bus/tram/trolleybus stops and VeloTM stations */}
          {filteredStations.map((st) => {
            const isSelected =
              selectedPoi?.kind === 'station' && selectedPoi.data.id === st.id;
            return (
              <Marker
                key={st.id}
                coordinate={{ latitude: st.lat, longitude: st.lng }}
                tracksViewChanges={isSelected}
                onPress={() => handleSelectStation(st)}
              >
                <View
                  style={[
                    styles.markerStation,
                    st.type === 'bike_station' ? styles.markerBike : styles.markerTram,
                    isSelected && styles.markerSelectedHighlight,
                  ]}
                >
                  <Text style={styles.markerMiniIcon}>{getStationEmoji(st.type)}</Text>
                </View>
              </Marker>
            );
          })}

          {/* Filtered TimPark Parkings */}
          {filteredParkings.map((prk) => {
            const isSelected =
              selectedPoi?.kind === 'parking' && selectedPoi.data.id === prk.id;
            return (
              <Marker
                key={prk.id}
                coordinate={{ latitude: prk.lat, longitude: prk.lng }}
                tracksViewChanges={isSelected}
                onPress={() => handleSelectParking(prk)}
              >
                <View
                  style={[
                    styles.markerParking,
                    isSelected && styles.markerSelectedHighlight,
                  ]}
                >
                  <Text style={styles.markerParkingText}>P</Text>
                </View>
              </Marker>
            );
          })}

          {/* Selected TimPark Lot Polygon Outline */}
          {selectedPoi?.kind === 'parking' &&
            selectedPoi.data.polygon &&
            selectedPoi.data.polygon.length >= 3 && (
              <Polyline
                coordinates={selectedPoi.data.polygon.map((pt) => ({
                  latitude: pt.lat,
                  longitude: pt.lng,
                }))}
                strokeColor={colors.accent}
                strokeWidth={4}
              />
            )}

          {/* Filtered City Tourist Landmarks (/api/mobile/pois) */}
          {filteredLandmarks.map((lm) => {
            const isSelected =
              selectedPoi?.kind === 'landmark' && selectedPoi.data.id === lm.id;
            return (
              <Marker
                key={`lm_${lm.id}`}
                coordinate={{ latitude: lm.lat, longitude: lm.lng }}
                tracksViewChanges={isSelected}
                onPress={() => handleSelectLandmark(lm)}
              >
                <View
                  style={[
                    styles.markerStation,
                    styles.markerLandmark,
                    isSelected && styles.markerSelectedHighlight,
                  ]}
                >
                  <Text style={styles.markerMiniIcon}>🏛️</Text>
                </View>
              </Marker>
            );
          })}

          {/* WHITE GLOWING HALO + NEON MODE ROUTE SEGMENTS ON DARK MAP */}
          {selectedOption?.segments &&
            selectedOption.segments.map((seg, idx) => {
              if (!seg.geometry || seg.geometry.length < 2) return null;
              const coords = seg.geometry.map((pt) => ({
                latitude: pt.lat,
                longitude: pt.lng,
              }));
              const isWalk = seg.mode === 'Walk';
              const innerWidth = getModeStrokeWidth(seg.mode);
              return (
                <React.Fragment key={`seg_pair_${selectedOption.id}_${idx}`}>
                  {/* Outer dark depth shadow so the white halo & white walk dashes pop on any street */}
                  <Polyline
                    coordinates={coords}
                    strokeColor={colors.mapRouteDarkHalo}
                    strokeWidth={innerWidth + 7}
                    lineCap="round"
                    lineJoin="round"
                  />
                  {/* Bright White glowing halo for non-walk neon modes */}
                  {!isWalk && (
                    <Polyline
                      coordinates={coords}
                      strokeColor={colors.mapRouteOutline}
                      strokeWidth={innerWidth + 3}
                      lineCap="round"
                      lineJoin="round"
                    />
                  )}
                  {/* Inner vivid neon mode-colored line (or crisp Pure White dashed for Walk) */}
                  <Polyline
                    coordinates={coords}
                    strokeColor={getModeStrokeColor(seg.mode)}
                    strokeWidth={innerWidth}
                    lineDashPattern={isWalk ? [8, 8] : undefined}
                    lineCap="round"
                    lineJoin="round"
                  />
                </React.Fragment>
              );
            })}

          {/* Live User GPS Location Marker */}
          {userLocation && (
            <Marker
              coordinate={{ latitude: userLocation.lat, longitude: userLocation.lng }}
              title={t.myGpsMarkerTitle}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={styles.gpsDotOuter}>
                <View style={styles.gpsDotInner} />
              </View>
            </Marker>
          )}

          {/* Multimodal Transfer Junction Markers */}
          {selectedOption?.segments &&
            selectedOption.segments.slice(0, -1).map((seg, idx) => {
              const allSegments = selectedOption.segments;
              if (!seg.geometry || seg.geometry.length === 0 || !allSegments) return null;
              const junctionPt = seg.geometry[seg.geometry.length - 1];
              const nextSeg = allSegments[idx + 1];
              if (!nextSeg) return null;
              return (
                <Marker
                  key={`junction_${selectedOption.id}_${idx}`}
                  coordinate={{ latitude: junctionPt.lat, longitude: junctionPt.lng }}
                  title={`${t.transferPrefix}: ${getModeIcon(nextSeg.mode)}`}
                  description={nextSeg.description}
                  anchor={{ x: 0.5, y: 0.5 }}
                >
                  <View
                    style={[
                      styles.transferDot,
                      { borderColor: getModeStrokeColor(nextSeg.mode) },
                    ]}
                  />
                </Marker>
              );
            })}
        </MapView>
      ) : (
        renderWebMap()
      )}

      {/* Individual Category Filter Chips below the Top Search Bar */}
      {!isNavigating && renderPoiFilterBar()}

      {/* Selected POI Info Card or Active Route Segments Legend Overlay */}
      {selectedPoi ? renderSelectedPoiCard() : !isNavigating && renderSegmentsOverlay()}

      {/* Floating Map Action Controls */}
      <View style={styles.mapControls}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={handleCenterOnUser}
          activeOpacity={0.8}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          accessibilityRole="button"
          accessibilityLabel={t.centerGpsA11y}
        >
          {isLocating ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={styles.controlIcon}>🎯</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={handleCenterOnTimisoara}
          activeOpacity={0.8}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          accessibilityRole="button"
          accessibilityLabel={t.centerTimisoaraA11y}
        >
          <Text style={styles.controlIcon}>📍</Text>
        </TouchableOpacity>

        {/* Standard Dark / Light Map Mode Toggle */}
        <TouchableOpacity
          style={[
            styles.controlButton,
            isDarkMap && styles.controlBtnHighContrast,
          ]}
          onPress={() => setIsDarkMap((prev) => !prev)}
          activeOpacity={0.8}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          accessibilityRole="button"
          accessibilityState={{ selected: isDarkMap }}
          accessibilityLabel={t.toggleMapThemeA11y}
        >
          <Text
            style={[
              styles.tapTargetText,
              isDarkMap && styles.highContrastActiveText,
            ]}
          >
            {isDarkMap ? '🌙' : '☀️'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.mapDarkLand,
    position: 'relative',
  },
  map: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  poiFilterWrapper: {
    position: 'absolute',
    top: 58,
    left: 0,
    right: 0,
    zIndex: 22,
  },
  poiFilterScrollContent: {
    paddingHorizontal: spacing.md,
    gap: 6,
    alignItems: 'center',
  },
  poiFilterChip: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadows.sm,
  },
  poiFilterChipActive: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  poiFilterChipCleanActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  poiFilterChipText: {
    ...typography.captionMedium,
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  poiFilterChipTextActive: {
    color: colors.textInverse,
    fontWeight: '800',
  },
  poiPopupCard: {
    position: 'absolute',
    bottom: 150,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.sm + 4,
    borderWidth: 1.5,
    borderColor: colors.primary,
    zIndex: 25,
    ...shadows.lg,
  },
  poiPopupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  poiTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    flex: 1,
  },
  poiTypeEmoji: {
    fontSize: 18,
  },
  poiPopupTitle: {
    ...typography.bodyMedium,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  poiPopupSubtitle: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
  },
  poiCloseBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  poiCloseText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  poiPopupFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs + 2,
    gap: spacing.xs,
  },
  poiActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  poiOriginBtn: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  poiOriginBtnText: {
    ...typography.captionMedium,
    fontSize: 10,
    color: colors.primaryDark,
    fontWeight: '700',
  },
  poiAccessBadge: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.xs + 4,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  poiAccessText: {
    ...typography.captionMedium,
    fontSize: 10,
    color: colors.primaryDark,
  },
  poiEcoBadge: {
    backgroundColor: colors.rewardBackground,
    paddingHorizontal: spacing.xs + 4,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  poiEcoText: {
    ...typography.captionMedium,
    fontSize: 10,
    color: colors.rewardText,
    fontWeight: '700',
  },
  poiRouteBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  poiRouteBtnText: {
    ...typography.captionMedium,
    fontSize: 10,
    color: colors.textInverse,
    fontWeight: '700',
  },
  controlBtnOrigin: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  controlBtnDest: {
    borderColor: colors.danger,
    borderWidth: 2,
  },
  controlBtnHighContrast: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.accent,
    borderWidth: 2,
  },
  tapTargetText: {
    ...typography.captionMedium,
    fontSize: 11,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  highContrastActiveText: {
    color: colors.accent,
  },
  markerSelectedHighlight: {
    transform: [{ scale: 1.25 }],
    borderColor: colors.accent,
    borderWidth: 2.5,
  },
  segmentsBanner: {
    position: 'absolute',
    bottom: 150,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.primaryDark,
    gap: 4,
    zIndex: 18,
    ...shadows.md,
  },
  segmentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  segmentColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.mapRouteOutline,
  },
  segmentPillText: {
    ...typography.captionMedium,
    fontSize: 11,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  segmentArrow: {
    fontSize: 10,
    color: colors.textSecondary,
    marginHorizontal: 2,
  },
  transferDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 3.5,
    ...shadows.sm,
  },
  mapControls: {
    position: 'absolute',
    right: spacing.md,
    top: 102,
    gap: spacing.xs + 2,
    zIndex: 20,
  },
  controlButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.controlBorder,
    ...shadows.md,
  },
  controlIcon: {
    fontSize: 18,
  },
  markerAnchor: {
    alignItems: 'center',
  },
  pinCircleGreen: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    borderWidth: 2.5,
    borderColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  pinCircleRed: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.danger,
    borderWidth: 2.5,
    borderColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  pinText: {
    color: colors.textInverse,
    fontWeight: '800',
    fontSize: 14,
  },
  pinLabelBox: {
    backgroundColor: colors.mapLabelBackground,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginTop: 3,
  },
  pinLabel: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textInverse,
    fontWeight: '700',
  },
  markerStation: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.surface,
    ...shadows.sm,
  },
  markerTram: {
    backgroundColor: colors.secondary,
  },
  markerBike: {
    backgroundColor: colors.modes.bicycle,
  },
  markerLandmark: {
    backgroundColor: colors.primary,
  },
  markerMiniIcon: {
    fontSize: 12,
  },
  markerParking: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.modes.carWithParking,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  markerParkingText: {
    color: colors.textInverse,
    fontWeight: '800',
    fontSize: 12,
  },
  gpsDotOuter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
    ...shadows.md,
  },
  gpsDotInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.mapRouteTransit,
    borderWidth: 2.5,
    borderColor: colors.surface,
  },
});
