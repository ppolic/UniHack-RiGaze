import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { RouteOption } from '../../types/route';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Badge } from '../common/Badge';

interface RouteOptionCardProps {
  option: RouteOption;
  isSelected: boolean;
  onSelect: () => void;
}

export const RouteOptionCard: React.FC<RouteOptionCardProps> = ({
  option,
  isSelected,
  onSelect,
}) => {
  const getModeColor = (mode: string) => {
    switch (mode) {
      case 'Bicycle':
        return colors.modes.bicycle;
      case 'PublicTransit':
        return colors.modes.publicTransit;
      case 'Walking':
        return colors.modes.walking;
      case 'CarWithParking':
      default:
        return colors.modes.carWithParking;
    }
  };

  const getModeLabel = (mode: string) => {
    switch (mode) {
      case 'Bicycle':
        return 'Bicikl / Romobil';
      case 'PublicTransit':
        return 'Javni Prijevoz (STPT)';
      case 'Walking':
        return 'Pješke';
      case 'CarWithParking':
        return 'Auto + Parking';
      default:
        return mode;
    }
  };

  const modeColor = getModeColor(option.mode);

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onSelect}
      style={[
        styles.card,
        shadows.sm,
        isSelected && { borderColor: modeColor, borderWidth: 2, backgroundColor: colors.surfaceMuted },
      ]}
    >
      {/* Top Header: Mode, Recommended badge, Eco Points */}
      <View style={styles.headerRow}>
        <View style={styles.modeIndicatorRow}>
          <View style={[styles.modeDot, { backgroundColor: modeColor }]} />
          <Text style={styles.modeTitle}>{getModeLabel(option.mode)}</Text>
        </View>

        <View style={styles.badgesRow}>
          {option.isRecommended && (
            <Badge label="Najzelenije" variant="success" />
          )}
          {option.ecoPoints > 0 ? (
            <Badge label={`+${option.ecoPoints} bodova`} variant="reward" />
          ) : (
            <Badge label="0 bodova" variant="neutral" />
          )}
        </View>
      </View>

      {/* Metric highlights: Time, Distance, CO2, Price */}
      <View style={styles.metricsRow}>
        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>{option.durationMinutes} min</Text>
          <Text style={styles.metricLabel}>Trajanje</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>
            {(option.distanceMeters / 1000).toFixed(1)} km
          </Text>
          <Text style={styles.metricLabel}>Udaljenost</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.metricItem}>
          <Text
            style={[
              styles.metricValue,
              option.co2Grams === 0 ? { color: colors.primary } : { color: colors.textPrimary },
            ]}
          >
            {option.co2Grams}g CO₂
          </Text>
          <Text style={styles.metricLabel}>Emisije</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>
            {option.priceRon === 0 ? 'Besplatno' : `${option.priceRon} RON`}
          </Text>
          <Text style={styles.metricLabel}>Cijena</Text>
        </View>
      </View>

      {/* Steps summary */}
      <Text style={styles.stepsText} numberOfLines={2}>
        {option.stepsSummary}
      </Text>

      {/* Warnings & Accessibility notes */}
      {option.warnings && option.warnings.length > 0 && (
        <View style={styles.warningsList}>
          {option.warnings.map((w, index) => (
            <View
              key={index}
              style={[
                styles.warningBox,
                w.severity === 'alert' && styles.alertBox,
                w.severity === 'warning' && styles.warningAmberBox,
              ]}
            >
              <Text
                style={[
                  styles.warningText,
                  w.severity === 'alert' && { color: colors.danger },
                  w.severity === 'warning' && { color: colors.warning },
                ]}
              >
                {w.message}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Parking details if Car option */}
      {option.parkingDetails && (
        <View style={styles.parkingBox}>
          <Text style={styles.parkingTitle}>
            🅿️ {option.parkingDetails.name}
          </Text>
          <Text style={styles.parkingSubtitle}>
            Slobodno: {option.parkingDetails.spotsAvailable} / {option.parkingDetails.totalSpots} mjesta ({option.parkingDetails.hourlyRateRon} RON/h)
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  modeIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  modeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  modeTitle: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceMuted,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginVertical: spacing.xs + 2,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricValue: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  metricLabel: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: colors.border,
  },
  stepsText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs + 2,
  },
  warningsList: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  warningBox: {
    backgroundColor: colors.infoLight,
    borderRadius: borderRadius.sm,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
  },
  warningAmberBox: {
    backgroundColor: colors.warningLight,
  },
  alertBox: {
    backgroundColor: colors.dangerLight,
  },
  warningText: {
    ...typography.caption,
    color: colors.secondary,
    fontWeight: '500',
  },
  parkingBox: {
    marginTop: spacing.sm,
    padding: spacing.xs + 2,
    backgroundColor: colors.surfaceMuted,
    borderRadius: borderRadius.sm,
  },
  parkingTitle: {
    ...typography.captionMedium,
    color: colors.textPrimary,
  },
  parkingSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
