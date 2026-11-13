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
import { GeoPoint, StationLocation, ParkingDetail, RouteOptionDto } from '../../types/route';

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

type PoiFilterType = 'all' | 'transit' | 'bike' | 'parking';

type SelectedPoi =
  | { kind: 'station'; data: StationLocation }
  | { kind: 'parking'; data: ParkingDetail };

interface MapContainerProps {
  origin?: GeoPoint | null;
  destination?: GeoPoint | null;
  originName?: string;
  destinationName?: string;
  stations?: StationLocation[];
  parkings?: ParkingDetail[];
  selectedOption?: RouteOptionDto | null;
  selectedMode?: string;
  onSelectPoiAsDestination?: (point: GeoPoint, name: string) => void;
}

export const MapContainer: React.FC<MapContainerProps> = ({
  origin,
  destination,
  originName = 'Polazište',
  destinationName = 'Odredište',
  stations = [],
  parkings = [],
  selectedOption,
  selectedMode = 'Bike',
  onSelectPoiAsDestination,
}) => {
  const mapRef = useRef<any>(null);
  const [userLocation, setUserLocation] = useState<GeoPoint | null>(null);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [poiFilter, setPoiFilter] = useState<PoiFilterType>('all');
  const [selectedPoi, setSelectedPoi] = useState<SelectedPoi | null>(null);

  const filteredStations = stations.filter((st) => {
    if (poiFilter === 'all') return true;
    if (poiFilter === 'transit') return st.type === 'tram' || st.type === 'bus';
    if (poiFilter === 'bike') return st.type === 'bike_station';
    return false;
  });

  const filteredParkings = poiFilter === 'all' || poiFilter === 'parking' ? parkings : [];

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
          edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
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
      { id: 'transit', label: '🚊 STPT' },
      { id: 'bike', label: '🚲 VeloTM' },
      { id: 'parking', label: '🅿️ Parking' },
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
      const isBike = st.type === 'bike_station';
      return (
        <View style={styles.poiPopupCard}>
          <View style={styles.poiPopupHeader}>
            <View style={styles.poiTitleRow}>
              <Text style={styles.poiTypeEmoji}>
                {isBike ? '🚲' : st.type === 'tram' ? '🚊' : '🚌'}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.poiPopupTitle} numberOfLines={1}>
                  {st.name}
                </Text>
                <Text style={styles.poiPopupSubtitle}>
                  {isBike
                    ? `Slobodno bicikala: ${st.availableBikes ?? 0} / ${st.totalDocks ?? 15} mjesta`
                    : `Linije: ${st.lines?.join(', ') || '-'}${
                        st.nextArrivalMinutes ? ` • Dolazak za ${st.nextArrivalMinutes} min` : ''
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
            {st.isWheelchairAccessible ? (
              <View style={styles.poiAccessBadge}>
                <Text style={styles.poiAccessText}>♿ Niskopodni pristup</Text>
              </View>
            ) : (
              <View style={styles.poiEcoBadge}>
                <Text style={styles.poiEcoText}>🌱 0g CO₂ VeloTM</Text>
              </View>
            )}

            {onSelectPoiAsDestination && (
              <TouchableOpacity
                style={styles.poiRouteBtn}
                onPress={() => {
                  onSelectPoiAsDestination({ lat: st.lat, lng: st.lng }, st.name);
                  setSelectedPoi(null);
                }}
              >
                <Text style={styles.poiRouteBtnText}>Odredište (B) ➔</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    }

    const prk = selectedPoi.data;
    return (
      <View style={styles.poiPopupCard}>
        <View style={styles.poiPopupHeader}>
          <View style={styles.poiTitleRow}>
            <Text style={styles.poiTypeEmoji}>🅿️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.poiPopupTitle} numberOfLines={1}>
                {prk.name}
              </Text>
              <Text style={styles.poiPopupSubtitle}>
                Slobodno: {prk.spotsAvailable}/{prk.totalSpots} mjesta • {prk.hourlyRateRon} RON/h
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
          {prk.isAccessible && (
            <View style={styles.poiAccessBadge}>
              <Text style={styles.poiAccessText}>
                ♿ {prk.accessibleSpots ?? 2} invalidska mjesta (Besplatno)
              </Text>
            </View>
          )}

          {onSelectPoiAsDestination && (
            <TouchableOpacity
              style={styles.poiRouteBtn}
              onPress={() => {
                onSelectPoiAsDestination({ lat: prk.lat, lng: prk.lng }, prk.name);
                setSelectedPoi(null);
              }}
            >
              <Text style={styles.poiRouteBtnText}>Odredište (B) ➔</Text>
            </TouchableOpacity>
          )}
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
            onPress={() => setSelectedPoi({ kind: 'station', data: st })}
            style={[
              styles.webPoiFloating,
              webStationPositions[idx % webStationPositions.length] as any,
              styles.markerStation,
              st.type === 'bike_station' ? styles.markerBike : styles.markerTram,
            ]}
          >
            <Text style={styles.markerMiniIcon}>
              {st.type === 'bike_station' ? '🚲' : st.type === 'tram' ? '🚊' : '🚌'}
            </Text>
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
        >
          {/* Origin Marker A */}
          {origin && (
            <Marker
              coordinate={{ latitude: origin.lat, longitude: origin.lng }}
              title={originName}
              description="Polazište putovanja"
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

          {/* Destination Marker B */}
          {destination && (
            <Marker
              coordinate={{ latitude: destination.lat, longitude: destination.lng }}
              title={destinationName}
              description="Odredište"
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

          {/* Infrastructure POI Markers: STPT tram/bus and VeloTM */}
          {filteredStations.map((st) => (
            <Marker
              key={st.id}
              coordinate={{ latitude: st.lat, longitude: st.lng }}
              onPress={() => setSelectedPoi({ kind: 'station', data: st })}
            >
              <View
                style={[
                  styles.markerStation,
                  st.type === 'bike_station' ? styles.markerBike : styles.markerTram,
                  selectedPoi?.kind === 'station' &&
                    selectedPoi.data.id === st.id &&
                    styles.markerSelectedHighlight,
                ]}
              >
                <Text style={styles.markerMiniIcon}>
                  {st.type === 'bike_station' ? '🚲' : st.type === 'tram' ? '🚊' : '🚌'}
                </Text>
              </View>
            </Marker>
          ))}

          {/* Infrastructure POI Markers: Parkings */}
          {filteredParkings.map((prk) => (
            <Marker
              key={prk.id}
              coordinate={{ latitude: prk.lat, longitude: prk.lng }}
              onPress={() => setSelectedPoi({ kind: 'parking', data: prk })}
            >
              <View
                style={[
                  styles.markerParking,
                  selectedPoi?.kind === 'parking' &&
                    selectedPoi.data.id === prk.id &&
                    styles.markerSelectedHighlight,
                ]}
              >
                <Text style={styles.markerParkingText}>P</Text>
              </View>
            </Marker>
          ))}

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
    top: spacing.sm,
    left: spacing.md,
    right: 68,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    zIndex: 22,
  },
  poiFilterChip: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
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
    fontSize: 11,
    color: colors.textPrimary,
  },
  poiFilterChipTextActive: {
    color: colors.textInverse,
    fontWeight: '700',
  },
  poiPopupCard: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.md,
    right: 68,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.primary,
    zIndex: 25,
    ...shadows.md,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs + 2,
    gap: spacing.xs,
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
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  poiRouteBtnText: {
    ...typography.captionMedium,
    fontSize: 11,
    color: colors.textInverse,
    fontWeight: '700',
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
    bottom: spacing.sm,
    left: spacing.md,
    right: 68,
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
    top: spacing.md,
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
