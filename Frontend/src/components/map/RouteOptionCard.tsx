import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { RouteOptionDto } from '../../types/route';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Badge } from '../common/Badge';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../hooks/useTranslation';

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
  const { t, translateMessage } = useTranslation();

  // Social companion & pooling interactive state
  const isWalkLike = option.mode === 'Walk' || option.mode === 'WalkBuddy';
  const isBikeLike = option.mode === 'Bike' || option.mode === 'BikePool';
  const isCarLike = option.mode === 'Car' || option.mode === 'Carpool';

  const [walkChoice, setWalkChoice] = useState<'alone' | 'buddy'>(
    option.mode === 'WalkBuddy' ? 'buddy' : 'alone'
  );
  const [isEnrolledAsBuddy, setIsEnrolledAsBuddy] = useState(option.mode === 'WalkBuddy');
  const [joinedBuddy, setJoinedBuddy] = useState<string | null>(null);

  const [bikeChoice, setBikeChoice] = useState<'alone' | 'pool'>(
    option.mode === 'BikePool' ? 'pool' : 'alone'
  );
  const [isEnrolledInBikePool, setIsEnrolledInBikePool] = useState(option.mode === 'BikePool');
  const [joinedBikeGroup, setJoinedBikeGroup] = useState<string | null>(null);

  const [carChoice, setCarChoice] = useState<'alone' | 'carpool'>(
    option.mode === 'Carpool' ? 'carpool' : 'alone'
  );
  const [acceptedPassenger, setAcceptedPassenger] = useState<string | null>(null);
  const [carpoolSeats, setCarpoolSeats] = useState(3);

  const getModeColor = (mode: string) => {
    switch (mode) {
      case 'Bike':
      case 'BikePool':
        return colors.modes.bicycle;
      case 'PublicTransport':
        return colors.modes.publicTransit;
      case 'Walk':
      case 'WalkBuddy':
        return colors.modes.walking;
      case 'Scooter':
        return colors.modes.scooter;
      case 'Carpool':
        return colors.modes.carpooling;
      case 'Car':
      default:
        return colors.modes.carWithParking;
    }
  };

  const getModeLabel = (mode: string) => {
    switch (mode) {
      case 'Bike':
        return t.modeBikeLabel;
      case 'BikePool':
        return t.modeBikePoolLabel;
      case 'PublicTransport':
        return t.modeTransitLabel;
      case 'Walk':
        return t.modeWalkLabel;
      case 'WalkBuddy':
        return t.modeWalkBuddyLabel;
      case 'Scooter':
        return t.modeScooterLabel;
      case 'Carpool':
        return t.modeCarpoolLabel;
      case 'Car':
        return t.modeCarLabel;
      default:
        return mode;
    }
  };

  const modeColor = getModeColor(option.mode);
  const cardTitle = translateMessage(option.title) || getModeLabel(option.mode);
  const priceLabel = option.costRon === 0 ? t.free : `${option.costRon} RON`;
  const a11ySummary = `${cardTitle}${isSelected ? t.selectedComma : ''}${
    option.isRecommended ? t.recommendedComma : ''
  }. ${t.durationShort} ${option.durationMinutes} min, ${t.distanceShort} ${option.distanceKm.toFixed(
    1
  )} km, ${option.co2Grams}g CO2, ${t.priceShort} ${priceLabel}, +${
    option.ecoPoints
  } ${t.points}.`;

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
          {isSelected && <Badge label={t.selected} variant="success" />}
          {option.isRecommended && (
            <Badge label={t.recommended} variant="success" />
          )}
          {option.ecoPoints > 0 ? (
            <Badge label={`+${option.ecoPoints} ${t.points}`} variant="reward" />
          ) : (
            <Badge label={t.zeroPointsBadge} variant="neutral" />
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
            {t.durationShort}
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
            {t.distanceShort}
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
            {t.emissionsShort}
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
            {t.priceShort}
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
          {option.segments.map((s) => translateMessage(s.description)).filter(Boolean).join(' ➔ ')}
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
                ⚠️ {translateMessage(w.message)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* 1. WALK BUDDY INTERACTIVE COMPANION SELECTION */}
      {isSelected && isWalkLike && (
        <View style={styles.socialBox}>
          <Text style={styles.socialQuestionTitle}>
            {t.walkBuddyQuestion}
          </Text>
          <View style={styles.socialChoiceRow}>
            <TouchableOpacity
              onPress={() => setWalkChoice('alone')}
              style={[styles.socialChoiceBtn, walkChoice === 'alone' && styles.socialChoiceBtnActive]}
            >
              <Text style={[styles.socialChoiceText, walkChoice === 'alone' && styles.socialChoiceTextActive]}>
                {t.walkAloneBtn}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setWalkChoice('buddy')}
              style={[styles.socialChoiceBtn, walkChoice === 'buddy' && styles.socialChoiceBtnActive]}
            >
              <Text style={[styles.socialChoiceText, walkChoice === 'buddy' && styles.socialChoiceTextActive]}>
                {t.walkBuddyBtn}
              </Text>
            </TouchableOpacity>
          </View>

          {walkChoice === 'buddy' && (
            <View style={styles.buddySubSection}>
              <Text style={styles.buddySubTitle}>{t.nearbyWalkBuddiesTitle}</Text>
              <View style={styles.buddyItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.buddyName}>{t.walkBuddy1Name}</Text>
                  <Text style={styles.buddyMeta}>{t.walkBuddy1Meta}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setJoinedBuddy('Elena V.')}
                  style={[styles.buddyJoinBtn, joinedBuddy === 'Elena V.' && styles.buddyJoinBtnActive]}
                >
                  <Text style={styles.buddyJoinBtnText}>
                    {joinedBuddy === 'Elena V.' ? t.walkBuddyJoinedBtn : t.walkBuddyJoinBtn}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.buddyItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.buddyName}>{t.walkBuddy2Name}</Text>
                  <Text style={styles.buddyMeta}>{t.walkBuddy2Meta}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setJoinedBuddy('Radu P.')}
                  style={[styles.buddyJoinBtn, joinedBuddy === 'Radu P.' && styles.buddyJoinBtnActive]}
                >
                  <Text style={styles.buddyJoinBtnText}>
                    {joinedBuddy === 'Radu P.' ? t.walkBuddyJoinedBtn : t.walkBuddyJoinBtn}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={() => setIsEnrolledAsBuddy(!isEnrolledAsBuddy)}
                style={styles.enrollToggleRow}
              >
                <View style={[styles.checkbox, isEnrolledAsBuddy && styles.checkboxActive]}>
                  {isEnrolledAsBuddy && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.enrollText}>
                  {t.walkBuddyEnrollLabel}
                </Text>
              </TouchableOpacity>
              {isEnrolledAsBuddy && (
                <Text style={styles.enrolledSuccess}>
                  {t.walkBuddyEnrolledMsg}
                </Text>
              )}
            </View>
          )}
        </View>
      )}

      {/* 2. BIKE POOL INTERACTIVE GROUP CYCLING */}
      {isSelected && isBikeLike && (
        <View style={styles.socialBox}>
          <Text style={styles.socialQuestionTitle}>
            {t.bikePoolQuestion}
          </Text>
          <View style={styles.socialChoiceRow}>
            <TouchableOpacity
              onPress={() => setBikeChoice('alone')}
              style={[styles.socialChoiceBtn, bikeChoice === 'alone' && styles.socialChoiceBtnActive]}
            >
              <Text style={[styles.socialChoiceText, bikeChoice === 'alone' && styles.socialChoiceTextActive]}>
                {t.bikeAloneBtn}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setBikeChoice('pool')}
              style={[styles.socialChoiceBtn, bikeChoice === 'pool' && styles.socialChoiceBtnActive]}
            >
              <Text style={[styles.socialChoiceText, bikeChoice === 'pool' && styles.socialChoiceTextActive]}>
                {t.bikePoolBtn}
              </Text>
            </TouchableOpacity>
          </View>

          {bikeChoice === 'pool' && (
            <View style={styles.buddySubSection}>
              <Text style={styles.buddySubTitle}>{t.nearbyBikePoolsTitle}</Text>
              <View style={styles.buddyItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.buddyName}>{t.bikePool1Name}</Text>
                  <Text style={styles.buddyMeta}>{t.bikePool1Meta}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setJoinedBikeGroup('VeloTM Convoy')}
                  style={[styles.buddyJoinBtn, joinedBikeGroup === 'VeloTM Convoy' && styles.buddyJoinBtnActive]}
                >
                  <Text style={styles.buddyJoinBtnText}>
                    {joinedBikeGroup === 'VeloTM Convoy' ? t.bikePoolJoinedBtn : t.bikePoolJoinBtn}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={() => setIsEnrolledInBikePool(!isEnrolledInBikePool)}
                style={styles.enrollToggleRow}
              >
                <View style={[styles.checkbox, isEnrolledInBikePool && styles.checkboxActive]}>
                  {isEnrolledInBikePool && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.enrollText}>
                  {t.bikePoolEnrollLabel}
                </Text>
              </TouchableOpacity>
              {isEnrolledInBikePool && (
                <Text style={styles.enrolledSuccess}>
                  {t.bikePoolEnrolledMsg}
                </Text>
              )}
            </View>
          )}
        </View>
      )}

      {/* 3. CARPOOL / SHARED DRIVING */}
      {isSelected && isCarLike && (
        <View style={styles.socialBox}>
          <Text style={styles.socialQuestionTitle}>
            {t.carpoolQuestion}
          </Text>
          <View style={styles.socialChoiceRow}>
            <TouchableOpacity
              onPress={() => setCarChoice('alone')}
              style={[styles.socialChoiceBtn, carChoice === 'alone' && styles.socialChoiceBtnActive]}
            >
              <Text style={[styles.socialChoiceText, carChoice === 'alone' && styles.socialChoiceTextActive]}>
                {t.carAloneBtn}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setCarChoice('carpool')}
              style={[styles.socialChoiceBtn, carChoice === 'carpool' && styles.socialChoiceBtnActive]}
            >
              <Text style={[styles.socialChoiceText, carChoice === 'carpool' && styles.socialChoiceTextActive]}>
                {t.carpoolOfferBtn}
              </Text>
            </TouchableOpacity>
          </View>

          {carChoice === 'carpool' && (
            <View style={styles.buddySubSection}>
              <Text style={styles.buddySubTitle}>{t.nearbyCarpoolPassengersTitle}</Text>
              <View style={styles.buddyItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.buddyName}>{t.carpoolPassenger1Name}</Text>
                  <Text style={styles.buddyMeta}>{t.carpoolPassenger1Meta}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setAcceptedPassenger('Mihai S.')}
                  style={[styles.buddyJoinBtn, acceptedPassenger === 'Mihai S.' && styles.buddyJoinBtnActive]}
                >
                  <Text style={styles.buddyJoinBtnText}>
                    {acceptedPassenger === 'Mihai S.' ? t.carpoolAcceptedBtn : t.carpoolPickUpBtn}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.buddyItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.buddyName}>{t.carpoolPassenger2Name}</Text>
                  <Text style={styles.buddyMeta}>{t.carpoolPassenger2Meta}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setAcceptedPassenger('Andreea D.')}
                  style={[styles.buddyJoinBtn, acceptedPassenger === 'Andreea D.' && styles.buddyJoinBtnActive]}
                >
                  <Text style={styles.buddyJoinBtnText}>
                    {acceptedPassenger === 'Andreea D.' ? t.carpoolAcceptedBtn : t.carpoolPickUpBtn}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={{ marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Text style={{ ...typography.caption, color: colors.textSecondary, fontWeight: '700' }}>
                  {t.carpoolAvailableSeatsLabel}
                </Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {[1, 2, 3, 4].map((num) => (
                    <TouchableOpacity
                      key={num}
                      onPress={() => setCarpoolSeats(num)}
                      style={[styles.seatBtn, carpoolSeats === num && styles.seatBtnActive]}
                    >
                      <Text style={[styles.seatBtnText, carpoolSeats === num && styles.seatBtnTextActive]}>
                        {num}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  desktopCard: { width: '100%', maxWidth: 960, alignSelf: 'center', padding: spacing.lg },
  desktopHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: spacing.md },
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
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  modeIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    flexShrink: 1,
    minWidth: 0,
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
    flexShrink: 1,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  socialBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceMuted,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    gap: spacing.sm,
  },
  socialQuestionTitle: {
    ...typography.bodyMedium,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  socialChoiceRow: {
    flexDirection: 'row',
    gap: spacing.xs + 2,
    marginTop: 4,
  },
  socialChoiceBtn: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.controlBorder,
    backgroundColor: colors.surface,
  },
  socialChoiceBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  socialChoiceText: {
    ...typography.captionMedium,
    color: colors.textPrimary,
    fontWeight: '700',
    textAlign: 'center',
  },
  socialChoiceTextActive: {
    color: colors.textInverse,
    fontWeight: '800',
  },
  buddySubSection: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.xs + 2,
  },
  buddySubTitle: {
    ...typography.captionMedium,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  buddyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  buddyName: {
    ...typography.captionMedium,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  buddyMeta: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  buddyJoinBtn: {
    minHeight: 32,
    paddingHorizontal: spacing.sm + 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  buddyJoinBtnActive: {
    backgroundColor: colors.primary,
  },
  buddyJoinBtnText: {
    ...typography.captionMedium,
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  enrollToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    marginTop: spacing.xs + 2,
    paddingVertical: 2,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  checkboxActive: {
    backgroundColor: colors.primary,
  },
  checkmark: {
    color: colors.textInverse,
    fontSize: 12,
    fontWeight: '800',
  },
  enrollText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  enrolledSuccess: {
    ...typography.caption,
    fontSize: 11,
    color: colors.primary,
    fontWeight: '700',
    marginTop: 2,
  },
  seatBtn: {
    minWidth: 32,
    height: 32,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.controlBorder,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seatBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  seatBtnText: {
    ...typography.captionMedium,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  seatBtnTextActive: {
    color: colors.textInverse,
    fontWeight: '800',
  },
});
