import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from '../../hooks/useTranslation';
import { colors } from '../../theme/colors';
import { borderRadius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export function AuthenticatedHeader({ onBack }: { onBack?: () => void }) {
  const { language, toggleLanguage, t } = useTranslation();

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.row}>
        {onBack && (
          <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel={t.backLabel} style={styles.backButton}>
            <Text style={styles.brand} accessible={false}>‹</Text>
          </Pressable>
        )}
        <Text style={styles.brand} numberOfLines={1}>BeGreen</Text>
        <Pressable
          onPress={toggleLanguage}
          accessibilityRole="button"
          accessibilityLabel={language === 'ro' ? t.switchToEnA11y : t.switchToRoA11y}
          style={({ pressed }) => [styles.languageButton, pressed && styles.pressed]}
        >
          <Text style={styles.languageText}>
            {language === 'ro' ? '🇷🇴 RO' : '🇬🇧 EN'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  brand: { ...typography.h3, color: colors.primaryDark, fontWeight: '800', flexShrink: 1 },
  backButton: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  languageButton: {
    minWidth: 64,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surfaceMuted,
  },
  languageText: { ...typography.captionMedium, color: colors.primaryDark, fontWeight: '800' },
  pressed: { backgroundColor: colors.primaryLight },
});
