import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { AppCard } from '../common/AppCard';
import { useTranslation } from '../../hooks/useTranslation';

export const PointsSummaryCard: React.FC<{ balance: number }> = ({ balance }) => {
  const { user } = useAuth();
  const { language, t } = useTranslation();
  if (!user) return null;

  return (
    <AppCard style={styles.card}>
      <Text style={styles.label}>{t.myEcoPoints}</Text>
      <View style={styles.balanceRow}>
        <Text style={styles.points}>{balance}</Text>
        <Text style={styles.unit}>{t.availablePoints}</Text>
      </View>
      <Text style={styles.description}>{t.nextRewardDescription}</Text>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surfaceDark, borderColor: colors.surfaceDark, borderRadius: borderRadius.xl, padding: spacing['2xl'], gap: spacing.sm },
  label: { ...typography.captionMedium, color: colors.textOnDark, letterSpacing: 1 },
  balanceRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: spacing.sm },
  points: { ...typography.h1, fontSize: 40, lineHeight: 48, color: colors.accent, maxWidth: '100%', flexShrink: 1 },
  unit: { ...typography.bodyMedium, color: colors.textInverse },
  description: { ...typography.caption, color: colors.textOnDark },
});
