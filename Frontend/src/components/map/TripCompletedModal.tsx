import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { AppButton } from '../common/AppButton';
import { RouteOptionDto } from '../../types/route';
import { useTranslation } from '../../hooks/useTranslation';

interface TripCompletedModalProps {
  visible: boolean;
  option?: RouteOptionDto | null;
  co2SavedGrams: number;
  totalPoints: number;
  originName: string;
  destinationName: string;
  earlyFinish?: boolean;
  onClose: () => void;
  onViewRewards: () => void;
}

const NEXT_REWARD_TARGET = 500;

export const TripCompletedModal: React.FC<TripCompletedModalProps> = ({
  visible,
  option,
  co2SavedGrams,
  totalPoints,
  originName,
  destinationName,
  earlyFinish = false,
  onClose,
  onViewRewards,
}) => {
  const { t } = useTranslation();
  if (!option) return null;

  const effectivePoints = earlyFinish ? 0 : option.ecoPoints;
  const isZeroPoints = effectivePoints === 0;
  const progressPercent = Math.min(100, Math.round((totalPoints / NEXT_REWARD_TARGET) * 100));
  const pointsRemaining = Math.max(0, NEXT_REWARD_TARGET - totalPoints);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Top Icon & Header */}
          <View style={styles.headerBadgeCircle}>
            <Text style={styles.headerEmoji}>
              {earlyFinish ? '⚠️' : isZeroPoints ? '🚗' : '🌱'}
            </Text>
          </View>

          <Text style={styles.title}>
            {earlyFinish
              ? t.tripEarlyTitle
              : isZeroPoints
              ? t.tripFinishedNeutralTitle
              : t.tripCompletedTitle}
          </Text>

          <Text style={styles.routeSummaryText}>
            {originName} ➔ {destinationName} ({option.title || option.mode})
          </Text>

          {/* Points Reward Highlight Box */}
          <View
            style={[
              styles.rewardHighlightBox,
              isZeroPoints && styles.rewardHighlightBoxNeutral,
            ]}
          >
            <Text
              style={[
                styles.rewardPointsValue,
                isZeroPoints && styles.rewardPointsValueNeutral,
              ]}
            >
              +{effectivePoints} {t.ecoPointsUnit}
            </Text>
            <Text style={styles.rewardSubtext}>
              {earlyFinish
                ? t.tripEarlySub
                : isZeroPoints
                ? t.tripNeutralSub
                : t.tripCompletedSub}
            </Text>
          </View>

          {/* 3 Impact Metrics Row */}
          <View style={styles.metricsRow}>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>{t.co2Saved}</Text>
              <Text style={styles.metricValue}>
                {co2SavedGrams > 0 ? `-${co2SavedGrams}g` : '0g'}
              </Text>
            </View>

            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>{t.distanceShort}</Text>
              <Text style={styles.metricValue}>{option.distanceKm} km</Text>
            </View>

            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>{t.durationLabel}</Text>
              <Text style={styles.metricValue}>{option.durationMinutes} min</Text>
            </View>
          </View>

          {/* Progress toward next Timișoara reward */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>
                {t.totalPointsHeader(totalPoints)}
              </Text>
              <Text style={styles.progressTargetText}>
                {pointsRemaining > 0
                  ? t.pointsToStpt(pointsRemaining)
                  : t.rewardUnlocked}
              </Text>
            </View>
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${progressPercent}%` },
                ]}
              />
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsColumn}>
            <AppButton
              title={t.viewRewards}
              onPress={onViewRewards}
              variant="primary"
              size="md"
              style={styles.fullWidthBtn}
            />

            <TouchableOpacity
              style={styles.secondaryCloseBtn}
              onPress={onClose}
              activeOpacity={0.75}
            >
              <Text style={styles.secondaryCloseText}>{t.backToMap}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.lg,
  },
  headerBadgeCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  headerEmoji: {
    fontSize: 28,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  routeSummaryText: {
    ...typography.captionMedium,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  rewardHighlightBox: {
    width: '100%',
    backgroundColor: colors.rewardBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.rewardBorder,
    marginBottom: spacing.md,
  },
  rewardHighlightBoxNeutral: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
  },
  rewardPointsValue: {
    ...typography.h1,
    fontSize: 26,
    color: colors.rewardText,
    fontWeight: '800',
  },
  rewardPointsValueNeutral: {
    color: colors.textSecondary,
  },
  rewardSubtext: {
    ...typography.caption,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: 4,
  },
  metricsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  metricBox: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricLabel: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
  },
  metricValue: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
  },
  progressSection: {
    width: '100%',
    backgroundColor: colors.surfaceMuted,
    borderRadius: borderRadius.md,
    padding: spacing.sm + 2,
    marginBottom: spacing.lg,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressTitle: {
    ...typography.captionMedium,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  progressTargetText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
  },
  progressBarTrack: {
    width: '100%',
    height: 8,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  actionsColumn: {
    width: '100%',
    gap: spacing.xs,
  },
  fullWidthBtn: {
    width: '100%',
  },
  secondaryCloseBtn: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  secondaryCloseText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
