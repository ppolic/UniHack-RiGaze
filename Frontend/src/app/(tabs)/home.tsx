import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, type Href } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../hooks/useTranslation';
import { colors } from '../../theme/colors';
import { borderRadius, shadows, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { width, fontScale } = useWindowDimensions();
  const firstName = user?.fullName.trim().split(/\s+/)[0];

  const shortcuts: { title: string; description: string; icon: string; href: Href; upcoming?: boolean }[] = [
    { title: t.historyScreenTitle, description: `${t.homeShortcutFavoritesDesc} ${t.homeShortcutHistoryDesc}`, icon: '♡', href: '/(tabs)/history' },
    { title: t.homeShortcutChallengesTitle, description: t.homeShortcutChallengesDesc, icon: '⚑', href: '/challenges' },
    { title: t.homeShortcutReportTitle, description: t.homeShortcutReportDesc, icon: '⚐', href: '/report-issue' },
    { title: t.homeShortcutPointsTitle, description: t.homeShortcutPointsDesc, icon: '✧', href: '/(tabs)/rewards' },
    { title: t.homeShortcutCouponsTitle, description: t.homeShortcutCouponsDesc, icon: '🎟', href: '/(tabs)/rewards' },
  ];

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.content}>
          <View style={styles.welcome}>
            <Text style={styles.brand}>{t.homeBrand}</Text>
            <Text style={styles.heading} accessibilityRole="header">
              {firstName ? t.homeGreetingNamed(firstName) : t.homeGreetingDefault}
            </Text>
            <Text style={styles.intro}>{t.homeIntro}</Text>
            {user?.organizationBadge && (
              <View style={{ flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap', marginTop: 6 }}>
                <View style={{ backgroundColor: colors.surfaceMuted, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.primary }}>
                  <Text style={{ ...typography.captionMedium, color: colors.primaryDark, fontWeight: '700' }}>
                    {user.organizationBadge}
                  </Text>
                </View>
                {user.trustBadge && (
                  <View style={{ backgroundColor: colors.surfaceMuted, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: borderRadius.full }}>
                    <Text style={{ ...typography.captionMedium, color: colors.textSecondary }}>
                      {user.trustBadge}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          <View style={styles.hero}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>{t.homeHeroBadge}</Text>
            </View>
            <Text style={styles.heroTitle} accessibilityRole="header">{t.homeHeroTitle}</Text>
            <Text style={styles.heroDescription}>
              {t.homeHeroDescription}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.homeOpenMapA11y}
              onPress={() => router.navigate('/(tabs)')}
              style={({ pressed }) => [styles.mapButton, pressed && styles.mapButtonPressed]}
            >
              <Text style={styles.mapButtonText}>{t.homeOpenMapBtn}</Text>
              <Text style={styles.mapButtonText} accessible={false}>↗</Text>
            </Pressable>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle} accessibilityRole="header">{t.homeSectionTitle}</Text>
            <Text style={styles.intro}>{t.homeSectionSubtitle}</Text>
          </View>
          <View style={styles.grid}>
            {shortcuts.map((shortcut) => (
              <Pressable
                key={shortcut.title}
                accessibilityRole="button"
                accessibilityLabel={`${shortcut.title}${shortcut.upcoming ? `, ${t.comingSoonLabel}` : ''}`}
                accessibilityHint={shortcut.description}
                onPress={() => router.navigate(shortcut.href)}
                style={({ pressed }) => [
                  styles.shortcut,
                  width >= 900 && styles.wideShortcut,
                  (width < 360 || fontScale > 1.3) && styles.singleShortcut,
                  pressed && styles.shortcutPressed,
                ]}
              >
                <View style={styles.shortcutTop}>
                  <View style={styles.shortcutIconWrap}>
                    <Text style={styles.shortcutIcon} accessible={false}>{shortcut.icon}</Text>
                  </View>
                  {shortcut.upcoming && <Text style={styles.upcoming}>{t.comingSoonLabel}</Text>}
                </View>
                <Text style={styles.shortcutTitle}>{shortcut.title}</Text>
                <Text style={styles.shortcutDescription}>{shortcut.description}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.xl, paddingBottom: spacing['3xl'], alignItems: 'center' },
  content: { width: '100%', maxWidth: 960, gap: spacing['2xl'] },
  welcome: { gap: spacing.sm },
  brand: { ...typography.captionMedium, color: colors.primary, letterSpacing: 1 },
  heading: { ...typography.h1, color: colors.textPrimary },
  intro: { ...typography.body, color: colors.textSecondary },
  hero: { backgroundColor: colors.primary, borderRadius: borderRadius.xl, padding: spacing['2xl'], gap: spacing.lg, ...shadows.sm },
  heroBadge: { alignSelf: 'flex-start', backgroundColor: colors.accent, borderRadius: borderRadius.full, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  heroBadgeText: { ...typography.captionMedium, color: colors.rewardText },
  heroTitle: { ...typography.h1, color: colors.textInverse },
  heroDescription: { ...typography.body, color: colors.textOnDark, maxWidth: 580 },
  mapButton: { minHeight: 48, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md, backgroundColor: colors.accent, padding: spacing.md, borderRadius: borderRadius.md },
  mapButtonPressed: { backgroundColor: colors.surface },
  mapButtonText: { ...typography.bodyMedium, color: colors.rewardText },
  sectionHeader: { gap: spacing.xs },
  sectionTitle: { ...typography.h3, color: colors.textPrimary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  shortcut: {
    flexBasis: '45%',
    flexGrow: 1,
    minWidth: 0,
    minHeight: 160,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadows.sm,
  },
  shortcutPressed: { backgroundColor: colors.surfaceMuted, borderColor: colors.primary },
  wideShortcut: { flexBasis: '30%' },
  singleShortcut: { flexBasis: '100%' },
  shortcutTop: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs, marginBottom: 2 },
  shortcutIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.controlBorder,
  },
  shortcutIcon: { fontSize: 22, color: colors.primaryDark },
  upcoming: { ...typography.caption, color: colors.textSecondary },
  shortcutTitle: { ...typography.bodyMedium, fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  shortcutDescription: { ...typography.caption, color: colors.textSecondary, lineHeight: 18 },
});
