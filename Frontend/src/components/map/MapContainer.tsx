import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { LatLng, StationLocation, ParkingDetail } from '../../types/route';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';

interface MapContainerProps {
  origin?: LatLng | null;
  destination?: LatLng | null;
  originName?: string;
  destinationName?: string;
  stations?: StationLocation[];
  parkings?: ParkingDetail[];
  selectedMode?: string;
}

export const MapContainer: React.FC<MapContainerProps> = ({
  origin,
  destination,
  originName = 'Polazište',
  destinationName = 'Odredište',
  stations = [],
  parkings = [],
  selectedMode = 'Bicycle',
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.mapCanvas}>
        {/* Stylized Grid & River Bega indicator */}
        <View style={styles.riverIndicator}>
          <Text style={styles.riverText}>~ Rijeka Bega (Timișoara) ~</Text>
        </View>

        {/* POI Markers: STPT tram/bus stops */}
        {stations.slice(0, 3).map((st) => (
          <View
            key={st.id}
            style={[
              styles.markerStation,
              st.type === 'bike_station' ? styles.markerBike : styles.markerTram,
            ]}
          >
            <Text style={styles.markerMiniIcon}>
              {st.type === 'bike_station' ? '🚲' : '🚊'}
            </Text>
          </View>
        ))}

        {/* Origin Marker */}
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

        {/* Simulated Polyline Route Path */}
        {origin && destination && (
          <View style={styles.simulatedRouteLine}>
            <View
              style={[
                styles.routeGlow,
                selectedMode === 'Bicycle' && { backgroundColor: colors.modes.bicycle },
                selectedMode === 'PublicTransit' && { backgroundColor: colors.modes.publicTransit },
                selectedMode === 'CarWithParking' && { backgroundColor: colors.modes.carWithParking },
              ]}
            />
          </View>
        )}

        {/* Destination Marker */}
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

        {/* Live Map status banner */}
        <View style={styles.cityBadge}>
          <Text style={styles.cityBadgeText}>📍 Timișoara (Centru & UPT)</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8ECF1',
    overflow: 'hidden',
  },
  mapCanvas: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#EDF2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  riverIndicator: {
    position: 'absolute',
    top: '48%',
    left: 0,
    right: 0,
    height: 38,
    backgroundColor: '#BAE6FD',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '-6deg' }],
  },
  riverText: {
    ...typography.caption,
    fontSize: 11,
    color: '#0284C7',
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
  pinCircleGreen: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinCircleRed: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.danger,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  pinLabelBox: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginTop: 4,
  },
  pinLabel: {
    ...typography.caption,
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
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
    backgroundColor: colors.modes.bicycle,
    transform: [{ rotate: '42deg' }],
  },
  markerStation: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  markerTram: {
    top: '42%',
    left: '48%',
    backgroundColor: colors.secondary,
  },
  markerBike: {
    top: '25%',
    left: '60%',
    backgroundColor: colors.modes.scooter,
  },
  markerMiniIcon: {
    fontSize: 11,
  },
  cityBadge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
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
