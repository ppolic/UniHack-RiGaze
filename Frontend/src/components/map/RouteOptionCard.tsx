import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { RouteOptionDto } from '../../types/route';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Badge } from '../common/Badge';
import { useAuth } from '../../hooks/useAuth';

interface RouteOptionCardProps {
  option: RouteOptionDto;
  isSelected: boolean;
  onSelect: () => void;
}

export const RouteOptionCard: React.FC<RouteOptionCardProps> = ({
  option,
  isSelected,
  onSelect,
}) => {
  const desktop = useWindowDimensions().width >= 768;
  const { wcagLargeText } = useAuth();
  const getModeColor = (mode: string) => {
    switch (mode) {
      case 'Bike':
        return colors.modes.bicycle;
      case 'PublicTransport':
        return colors.modes.publicTransit;
      case 'Walk':
        return colors.modes.walking;
      case 'Scooter':
        return colors.modes.scooter;
      case 'Car':
      default:
        return colors.modes.carWithParking;
    }
  };

  const getModeLabel = (mode: string) => {
    switch (mode) {
      case 'Bike':
        return 'Bicikl';
      case 'PublicTransport':
        return 'Javni Prijevoz (STPT)';
      case 'Walk':
        return 'Pješke';
      case 'Scooter':
        return 'Romobil';
      case 'Car':
        return 'Automobil';
      default:
        return mode;
    }
  };

  const modeColor = getModeColor(option.mode);
  const cardTitle = option.title || getModeLabel(option.mode);
  const priceLabel = option.costRon === 0 ? 'Besplatno' : `${option.costRon} RON`;
  const a11ySummary = `${cardTitle}${isSelected ? ', odabrano' : ''}${
    option.isRecommended ? ', najzelenije' : ''
  }. Trajanje ${option.durationMinutes} min, udaljenost ${option.distanceKm.toFixed(
    1
  )} km, emisije ${option.co2Grams} grama CO2, cijena ${priceLabel}, nagrada ${
    option.ecoPoints
  } eko bodova.`;

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onSelect}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={a11ySummary}
      style={[
        styles.card,
        desktop && styles.desktopCard,
        shadows.sm,
        isSelected && {
          borderColor: modeColor,
          borderWidth: 2,
          backgroundColor: colors.surfaceMuted,
        },
      ]}
    >
      {/* Top Header: Mode indicator & Non-color Badges (WCAG 1.4.1) */}
      <View style={[styles.headerRow, desktop && styles.desktopHeader]}>
        <View style={[styles.modeIndicatorRow, desktop && styles.desktopMode]}>
          <View style={[styles.modeDot, { backgroundColor: modeColor }]} />
          <Text
            style={[
              styles.modeTitle,
              desktop && styles.desktopHeading,
              wcagLargeText && styles.largeTitle,
            ]}
          >
            {cardTitle}
          </Text>
        </View>

        <View style={[styles.badgesRow, desktop && styles.desktopBadges]}>
          {isSelected && <Badge label="✓ Odabrano" variant="success" />}
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

      {/* Metrics Row: Duration, Distance, CO2, Price */}
      <View style={[styles.metricsRow, desktop && styles.desktopMetrics]}>
        <View style={[styles.metricItem, desktop && styles.desktopMetric]}>
          <Text
            style={[
              styles.metricValue,
              desktop && styles.desktopHeading,
              wcagLargeText && styles.largeMetricVal,
            ]}
          >
            {option.durationMinutes} min
          </Text>
          <Text
            style={[
              styles.metricLabel,
              desktop && styles.desktopBody,
              wcagLargeText && styles.largeCaption,
            ]}
          >
            Trajanje
          </Text>
        </View>

        <View style={[styles.divider, desktop && styles.hidden]} />

        <View style={[styles.metricItem, desktop && styles.desktopMetric]}>
          <Text
            style={[
              styles.metricValue,
              desktop && styles.desktopHeading,
              wcagLargeText && styles.largeMetricVal,
            ]}
          >
            {option.distanceKm.toFixed(1)} km
          </Text>
          <Text
            style={[
              styles.metricLabel,
              desktop && styles.desktopBody,
              wcagLargeText && styles.largeCaption,
            ]}
          >
            Udaljenost
          </Text>
        </View>

        <View style={[styles.divider, desktop && styles.hidden]} />

        <View style={[styles.metricItem, desktop && styles.desktopMetric]}>
          <Text
            style={[
              styles.metricValue,
              desktop && styles.desktopHeading,
              wcagLargeText && styles.largeMetricVal,
              option.co2Grams === 0
                ? { color: colors.primary }
                : { color: colors.textPrimary },
            ]}
          >
            {option.co2Grams}g CO₂
          </Text>
          <Text
            style={[
              styles.metricLabel,
              desktop && styles.desktopBody,
              wcagLargeText && styles.largeCaption,
            ]}
          >
            Emisije
          </Text>
        </View>

        <View style={[styles.divider, desktop && styles.hidden]} />

        <View style={[styles.metricItem, desktop && styles.desktopMetric]}>
          <Text
            style={[
              styles.metricValue,
              desktop && styles.desktopHeading,
              wcagLargeText && styles.largeMetricVal,
            ]}
          >
            {priceLabel}
          </Text>
          <Text
            style={[
              styles.metricLabel,
              desktop && styles.desktopBody,
              wcagLargeText && styles.largeCaption,
            ]}
          >
            Cijena
          </Text>
        </View>
      </View>

      {/* Segments summary */}
      {option.segments && option.segments.length > 0 && (
        <Text
          style={[
            styles.stepsText,
            desktop && styles.desktopBody,
            wcagLargeText && styles.largeBody,
          ]}
          numberOfLines={desktop || wcagLargeText ? undefined : 2}
        >
          {option.segments.map((s) => s.description).filter(Boolean).join(' ➔ ')}
        </Text>
      )}

      {/* Warnings list */}
      {option.warnings && option.warnings.length > 0 && (
        <View style={styles.warningsList}>
          {option.warnings.map((w, index) => (
            <View key={index} style={[styles.warningBox, desktop && styles.desktopWarning]}>
              <Text
                style={[
                  styles.warningText,
                  desktop && styles.desktopBody,
                  wcagLargeText && styles.largeCaption,
                ]}
              >
                ⚠️ {w.message}
              </Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  desktopCard: { width: '100%', maxWidth: 960, alignSelf: 'center', padding: spacing.lg },
  desktopHeader: { flexWrap: 'wrap', gap: spacing.md },
  desktopMode: { flexBasis: 200, flexGrow: 1, flexShrink: 1, minWidth: 0 },
  desktopBadges: { flexWrap: 'wrap', flexShrink: 1, maxWidth: '100%' },
  desktopMetrics: { flexWrap: 'wrap', gap: spacing.md },
  desktopMetric: { flexBasis: 160, flexGrow: 1, flexShrink: 1, minWidth: 0 },
  desktopHeading: { ...typography.h3, flexShrink: 1, maxWidth: '100%' },
  desktopBody: { ...typography.body, flexShrink: 1, maxWidth: '100%' },
  desktopWarning: { padding: spacing.md },
  hidden: { display: 'none' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.controlBorder,
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
    flex: 1,
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
    backgroundColor: colors.warningLight,
    borderRadius: borderRadius.sm,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
  },
  warningText: {
    ...typography.caption,
    color: colors.warning,
    fontWeight: '600',
  },
  largeTitle: {
    fontSize: 18,
    lineHeight: 24,
  },
  largeMetricVal: {
    fontSize: 18,
    lineHeight: 24,
  },
  largeBody: {
    fontSize: 15,
    lineHeight: 21,
  },
  largeCaption: {
    fontSize: 14,
    lineHeight: 19,
  },
});
