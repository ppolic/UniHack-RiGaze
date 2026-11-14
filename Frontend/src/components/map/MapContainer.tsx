import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { transitService } from '../../services/transitService';
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
  latitudeDelta: 0.035,
  longitudeDelta: 0.035,
};

type PoiFilterType = 'all' | 'transit' | 'bike' | 'parking' | 'landmarks';

type SelectedPoi =
  | { kind: 'station'; data: StationLocation }
  | { kind: 'parking'; data: ParkingDetail }
  | { kind: 'landmark'; data: CityLandmarkPoi };

interface MapContainerProps {
  origin?: GeoPoint | null;
  destination?: GeoPoint | null;
  originName?: string;
  destinationName?: string;
  stations?: StationLocation[];
  parkings?: ParkingDetail[];
  landmarks?: CityLandmarkPoi[];
  selectedOption?: RouteOptionDto | null;
  selectedMode?: string;
  externalTapTarget?: 'origin' | 'destination';
  onTapTargetChange?: (target: 'origin' | 'destination') => void;
  onSelectPoiAsOrigin?: (point: GeoPoint, name: string) => void;
  onSelectPoiAsDestination?: (point: GeoPoint, name: string) => void;
}

export const MapContainer: React.FC<MapContainerProps> = ({
  origin,
  destination,
  originName = 'Polazište',
  destinationName = 'Odredište',
  stations = [],
  parkings = [],
  landmarks = [],
  selectedOption,
  selectedMode = 'Bike',
  externalTapTarget,
  onTapTargetChange,
  onSelectPoiAsOrigin,
  onSelectPoiAsDestination,
}) => {
  const mapRef = useRef<any>(null);
  const [userLocation, setUserLocation] = useState<GeoPoint | null>(null);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [poiFilter, setPoiFilter] = useState<PoiFilterType>('all');
  const [selectedPoi, setSelectedPoi] = useState<SelectedPoi | null>(null);
  const [loadingTimetable, setLoadingTimetable] = useState(false);
  const [internalTapTarget, setInternalTapTarget] = useState<'origin' | 'destination'>('destination');
  const lastMarkerPressTime = useRef<number>(0);

  const mapTapTarget = externalTapTarget ?? internalTapTarget;
  const setMapTapTarget = (next: 'origin' | 'destination') => {
    setInternalTapTarget(next);
    if (onTapTargetChange) {
      onTapTargetChange(next);
    }
  };

  const filteredStations = stations.filter((st) => {
    if (poiFilter === 'all') return true;
    if (poiFilter === 'transit') {
      return st.type === 'tram' || st.type === 'bus' || st.type === 'trolleybus';
    }
    if (poiFilter === 'bike') {
      return st.type === 'bike_station' || st.type === 'scooter_station';
    }
    return false;
  });

  const filteredParkings =
    poiFilter === 'all' || poiFilter === 'parking' ? parkings : [];

  const filteredLandmarks =
    poiFilter === 'all' || poiFilter === 'landmarks' ? landmarks : [];

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

  const handleMapCoordinatePress = (e: any) => {
    // Ignore map tap if a POI marker was just pressed within 250ms
    if (Date.now() - lastMarkerPressTime.current < 250) {
      return;
    }
    if (selectedPoi) {
      setSelectedPoi(null);
      return;
    }
    const coord = e?.nativeEvent?.coordinate;
    if (!coord || typeof coord.latitude !== 'number' || typeof coord.longitude !== 'number') {
      return;
    }
    const pt: GeoPoint = {
      lat: Number(coord.latitude.toFixed(6)),
      lng: Number(coord.longitude.toFixed(6)),
    };
    const resolvedName = transitService.resolveNearestPointName(pt);
    if (mapTapTarget === 'origin' && onSelectPoiAsOrigin) {
      onSelectPoiAsOrigin(pt, resolvedName);
      setMapTapTarget('destination');
    } else if (onSelectPoiAsDestination) {
      onSelectPoiAsDestination(pt, resolvedName);
    }
  };

  const renderPoiActionButtons = (point: GeoPoint, name: string) => (
    <View style={styles.poiActionsRow}>
      {onSelectPoiAsOrigin && (
        <TouchableOpacity
          style={styles.poiOriginBtn}
          onPress={() => {
            onSelectPoiAsOrigin(point, name);
            setSelectedPoi(null);
          }}
        >
          <Text style={styles.poiOriginBtnText}>📍 Polazište (A)</Text>
        </TouchableOpacity>
      )}
      {onSelectPoiAsDestination && (
        <TouchableOpacity
          style={styles.poiRouteBtn}
          onPress={() => {
            onSelectPoiAsDestination(point, name);
            setSelectedPoi(null);
          }}
        >
          <Text style={styles.poiRouteBtnText}>🏁 Odredište (B)</Text>
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
          setUserLocation({
            lat: location.coords.latitude,
            lng: location.coords.longitude,
          });
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

    if (coordinatesToFit.length >= 2) {
      setTimeout(() => {
        mapRef.current?.fitToCoordinates(coordinatesToFit, {
          edgePadding: { top: 125, right: 50, bottom: 135, left: 50 },
          animated: true,
        });
      }, 300);
    }
  }, [origin, destination, selectedOption]);

  const handleCenterOnUser = async () => {
    setIsLocating(true);
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };
      setUserLocation({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });
      mapRef.current?.animateToRegion(coords, 600);
    } catch (e) {
      // Fallback to Timișoara center if user GPS is off/unavailable
      mapRef.current?.animateToRegion(TIMISOARA_CENTER, 600);
    } finally {
      setIsLocating(false);
    }
  };

  const handleCenterOnTimisoara = () => {
    mapRef.current?.animateToRegion(TIMISOARA_CENTER, 600);
  };

  const getModeStrokeColor = (mode: string) => {
    switch (mode) {
      case 'Bike':
        return colors.modes.bicycle;
      case 'Walk':
        return colors.modes.walking;
      case 'PublicTransport':
        return colors.modes.publicTransit;
      case 'Scooter':
        return colors.modes.scooter;
      case 'Car':
      default:
        return colors.modes.carWithParking;
    }
  };

  const getModeStrokeWidth = (mode: string) => {
    switch (mode) {
      case 'PublicTransport':
        return 6;
      case 'Bike':
      case 'Scooter':
        return 5;
      case 'Walk':
      case 'Car':
      default:
        return 4;
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
                  seg.mode === 'Walk' && styles.segmentDotDashed,
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
    const filters: { id: PoiFilterType; label: string }[] = [
      { id: 'all', label: 'Sve' },
      { id: 'transit', label: '🚊 SMTT' },
      { id: 'bike', label: '🚲 VeloTM' },
      { id: 'parking', label: '🅿️ TimPark' },
      { id: 'landmarks', label: '🏛️ Grad' },
    ];

    return (
      <View style={styles.poiFilterRow}>
        {filters.map((f) => {
          const isActive = poiFilter === f.id;
          return (
            <TouchableOpacity
              key={f.id}
              onPress={() => {
                setPoiFilter(f.id);
                setSelectedPoi(null);
              }}
              style={[styles.poiFilterChip, isActive && styles.poiFilterChipActive]}
              activeOpacity={0.8}
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
                    ? `Slobodno bicikala: ${st.availableBikes ?? 0} / ${st.totalDocks ?? 15} mjesta`
                    : `Linije: ${st.lines?.join(', ') || '-'}${
                        st.nextArrivalMinutes
                          ? ` • Dolazak za ${st.nextArrivalMinutes} min`
                          : ''
                      }${
                        st.nextDepartures && st.nextDepartures.length > 0
                          ? `\nPolasci: ${st.nextDepartures.slice(0, 3).join(' • ')}`
                          : loadingTimetable
                          ? ' • Učitavam vozni red...'
                          : ''
                      }`}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setSelectedPoi(null)}
              style={styles.poiCloseBtn}
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
        ? `Slobodno: ${prk.spotsAvailable}/${prk.totalSpots} mjesta`
        : 'TimPark zona (status uživo: bez senzora)';

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
          >
            <Text style={styles.poiCloseText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.poiPopupFooter}>
          <View style={styles.poiAccessBadge}>
            <Text style={styles.poiAccessText}>
              {prk.smsCode && prk.smsNumber
                ? `📱 SMS ${prk.smsNumber} (kod ${prk.smsCode})`
                : `♿ ${prk.accessibleSpots ?? 2} invalidska mjesta`}
            </Text>
          </View>

          {renderPoiActionButtons({ lat: prk.lat, lng: prk.lng }, prk.name)}
        </View>
      </View>
    );
  };

  // Web Fallback Renderer
  const renderWebFallback = () => {
    const webStationPositions = [
      { top: '26%', left: '16%' },
      { top: '62%', left: '20%' },
      { top: '28%', right: '22%' },
      { top: '68%', right: '16%' },
    ];
    const webParkingPositions = [
      { top: '44%', left: '14%' },
      { top: '42%', right: '18%' },
    ];
    const webLandmarkPositions = [
      { top: '34%', left: '46%' },
      { top: '56%', left: '54%' },
      { top: '24%', left: '62%' },
    ];

    return (
      <View style={styles.webFallbackContainer}>
        {/* River Bega indicator */}
        <View style={styles.riverIndicator}>
          <Text style={styles.riverText}>~ Rijeka Bega (Timișoara) ~</Text>
        </View>

        {/* Interactive POI Stations on Web */}
        {filteredStations.slice(0, 4).map((st, idx) => (
          <TouchableOpacity
            key={st.id}
            onPress={() => handleSelectStation(st)}
            style={[
              styles.webPoiFloating,
              webStationPositions[idx % webStationPositions.length] as any,
              styles.markerStation,
              st.type === 'bike_station' ? styles.markerBike : styles.markerTram,
            ]}
          >
            <Text style={styles.markerMiniIcon}>{getStationEmoji(st.type)}</Text>
          </TouchableOpacity>
        ))}

        {/* Interactive POI Parkings on Web */}
        {filteredParkings.slice(0, 2).map((prk, idx) => (
          <TouchableOpacity
            key={prk.id}
            onPress={() => setSelectedPoi({ kind: 'parking', data: prk })}
            style={[
              styles.webPoiFloating,
              webParkingPositions[idx % webParkingPositions.length] as any,
              styles.markerParking,
            ]}
          >
            <Text style={styles.markerParkingText}>P</Text>
          </TouchableOpacity>
        ))}

        {/* Interactive Landmarks on Web */}
        {filteredLandmarks.slice(0, 3).map((lm, idx) => (
          <TouchableOpacity
            key={`web_lm_${lm.id}`}
            onPress={() => setSelectedPoi({ kind: 'landmark', data: lm })}
            style={[
              styles.webPoiFloating,
              webLandmarkPositions[idx % webLandmarkPositions.length] as any,
              styles.markerStation,
              styles.markerLandmark,
            ]}
          >
            <Text style={styles.markerMiniIcon}>🏛️</Text>
          </TouchableOpacity>
        ))}

        {/* Origin Pin */}
        {origin && (
          <View style={[styles.pinContainer, styles.originPin]}>
            <View style={styles.pinCircleGreen}>
              <Text style={styles.pinText}>A</Text>
            </View>
            <View style={styles.pinLabelBox}>
              <Text style={styles.pinLabel}>{originName}</Text>
            </View>
          </View>
        )}

        {/* Route Line Simulation */}
        {origin && destination && (
          <View style={styles.simulatedRouteLine}>
            <View
              style={[
                styles.routeGlow,
                { backgroundColor: getModeStrokeColor(selectedOption?.mode || selectedMode) },
              ]}
            />
          </View>
        )}

        {/* Destination Pin */}
        {destination && (
          <View style={[styles.pinContainer, styles.destinationPin]}>
            <View style={styles.pinCircleRed}>
              <Text style={styles.pinText}>B</Text>
            </View>
            <View style={styles.pinLabelBox}>
              <Text style={styles.pinLabel}>{destinationName}</Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {Platform.OS !== 'web' && MapView ? (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={TIMISOARA_CENTER}
          showsUserLocation={hasLocationPermission}
          showsMyLocationButton={false}
          showsCompass={true}
          onPress={handleMapCoordinatePress}
        >
          {/* Origin Marker A (draggable) */}
          {origin && (
            <Marker
              coordinate={{ latitude: origin.lat, longitude: origin.lng }}
              title={originName}
              description="Polazište putovanja (povuci za promjenu)"
              draggable
              onDragEnd={(e: any) => {
                const c = e?.nativeEvent?.coordinate;
                if (c && onSelectPoiAsOrigin) {
                  const pt = {
                    lat: Number(c.latitude.toFixed(6)),
                    lng: Number(c.longitude.toFixed(6)),
                  };
                  onSelectPoiAsOrigin(pt, transitService.resolveNearestPointName(pt));
                }
              }}
            >
              <View style={styles.markerAnchor}>
                <View style={styles.pinCircleGreen}>
                  <Text style={styles.pinText}>A</Text>
                </View>
                <View style={styles.pinLabelBox}>
                  <Text style={styles.pinLabel}>{originName}</Text>
                </View>
              </View>
            </Marker>
          )}

          {/* Destination Marker B (draggable) */}
          {destination && (
            <Marker
              coordinate={{ latitude: destination.lat, longitude: destination.lng }}
              title={destinationName}
              description="Odredište (povuci za promjenu)"
              draggable
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

          {/* Infrastructure POI Markers: ALL SMTT tram/trolleybus/bus stops and VeloTM */}
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

          {/* Infrastructure POI Markers: TimPark Parkings */}
          {filteredParkings.map((prk) => {
            const isSelected =
              selectedPoi?.kind === 'parking' && selectedPoi.data.id === prk.id;
            return (
              <Marker
                key={prk.id}
                coordinate={{ latitude: prk.lat, longitude: prk.lng }}
                tracksViewChanges={isSelected}
                onPress={() => {
                  lastMarkerPressTime.current = Date.now();
                  setSelectedPoi({ kind: 'parking', data: prk });
                }}
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
                strokeColor={colors.primaryDark}
                strokeWidth={3}
              />
            )}

          {/* City Tourist Landmarks (/api/mobile/pois) — all selectable as A or B */}
          {filteredLandmarks.map((lm) => {
            const isSelected =
              selectedPoi?.kind === 'landmark' && selectedPoi.data.id === lm.id;
            return (
              <Marker
                key={`lm_${lm.id}`}
                coordinate={{ latitude: lm.lat, longitude: lm.lng }}
                tracksViewChanges={isSelected}
                onPress={() => {
                  lastMarkerPressTime.current = Date.now();
                  setSelectedPoi({ kind: 'landmark', data: lm });
                }}
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

          {/* Active Route Segments Geometry */}
          {selectedOption?.segments &&
            selectedOption.segments.map((seg, idx) => {
              if (!seg.geometry || seg.geometry.length < 2) return null;
              const coords = seg.geometry.map((pt) => ({
                latitude: pt.lat,
                longitude: pt.lng,
              }));
              const isWalk = seg.mode === 'Walk';
              return (
                <Polyline
                  key={`seg_${selectedOption.id}_${idx}`}
                  coordinates={coords}
                  strokeColor={getModeStrokeColor(seg.mode)}
                  strokeWidth={getModeStrokeWidth(seg.mode)}
                  lineDashPattern={isWalk ? [6, 8] : undefined}
                  lineCap="round"
                  lineJoin="round"
                />
              );
            })}

          {/* Multimodal Transfer Junction Markers (where one segment ends and the next begins) */}
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
                  title={`Presjedanje: ${getModeIcon(nextSeg.mode)}`}
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
        renderWebFallback()
      )}

      {/* Top POI Filter Chips */}
      {renderPoiFilterBar()}

      {/* Selected POI Info Card or Active Route Segments Legend Overlay */}
      {selectedPoi ? renderSelectedPoiCard() : renderSegmentsOverlay()}

      {/* Floating Map Action Controls */}
      <View style={styles.mapControls}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={handleCenterOnUser}
          activeOpacity={0.8}
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
        >
          <Text style={styles.controlIcon}>📍</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.controlButton,
            mapTapTarget === 'origin' ? styles.controlBtnOrigin : styles.controlBtnDest,
          ]}
          onPress={() =>
            setMapTapTarget(mapTapTarget === 'origin' ? 'destination' : 'origin')
          }
          activeOpacity={0.8}
          accessibilityLabel="Odaberi postavlja li klik na kartu Polazište (A) ili Odredište (B)"
        >
          <Text style={styles.tapTargetText}>
            {mapTapTarget === 'origin' ? '👆A' : '👆B'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  webFallbackContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  poiFilterRow: {
    position: 'absolute',
    top: 64,
    left: spacing.md,
    right: 68,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    zIndex: 22,
  },
  poiFilterChip: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  poiFilterChipActive: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  poiFilterChipText: {
    ...typography.captionMedium,
    fontSize: 12,
    color: colors.textPrimary,
  },
  poiFilterChipTextActive: {
    color: colors.textInverse,
    fontWeight: '700',
  },
  poiPopupCard: {
    position: 'absolute',
    bottom: 88,
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
  tapTargetText: {
    ...typography.captionMedium,
    fontSize: 11,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  webPoiFloating: {
    position: 'absolute',
    zIndex: 14,
  },
  markerSelectedHighlight: {
    transform: [{ scale: 1.25 }],
    borderColor: colors.accent,
    borderWidth: 2.5,
  },
  segmentsBanner: {
    position: 'absolute',
    bottom: 88,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
    zIndex: 18,
    ...shadows.sm,
  },
  segmentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  segmentColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  segmentDotDashed: {
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  segmentPillText: {
    ...typography.captionMedium,
    fontSize: 11,
    color: colors.textPrimary,
  },
  segmentArrow: {
    fontSize: 10,
    color: colors.textSecondary,
    marginHorizontal: 2,
  },
  transferDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.surface,
    borderWidth: 3,
    ...shadows.sm,
  },
  mapControls: {
    position: 'absolute',
    right: spacing.md,
    top: 64,
    gap: spacing.sm,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  pinCircleRed: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.danger,
    borderWidth: 2,
    borderColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
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
    fontWeight: '600',
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
  riverIndicator: {
    position: 'absolute',
    top: '48%',
    left: 0,
    right: 0,
    height: 38,
    backgroundColor: colors.mapWater,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '-6deg' }],
  },
  riverText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.secondary,
    fontWeight: '600',
  },
  pinContainer: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 10,
  },
  originPin: {
    top: '32%',
    left: '26%',
  },
  destinationPin: {
    top: '64%',
    right: '28%',
  },
  simulatedRouteLine: {
    position: 'absolute',
    top: '40%',
    left: '32%',
    width: '45%',
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeGlow: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    transform: [{ rotate: '42deg' }],
  },
  cityBadge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    backgroundColor: colors.mapBadgeBackground,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cityBadgeText: {
    ...typography.captionMedium,
    color: colors.textPrimary,
  },
});
