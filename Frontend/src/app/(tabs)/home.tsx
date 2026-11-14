import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, type Href } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { colors } from '../../theme/colors';
import { borderRadius, shadows, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

const shortcuts: { title: string; description: string; icon: string; href: Href; upcoming?: boolean }[] = [
  { title: 'Favorite', description: 'Un loc pentru drumurile preferate.', icon: '♡', href: { pathname: '/(tabs)/history', params: { section: 'favorites' } } },
  { title: 'Istoric', description: 'Revino la călătoriile tale.', icon: '↺', href: { pathname: '/(tabs)/history', params: { section: 'history' } } },
  { title: 'Provocări', description: 'Pași mici pentru un oraș mai verde.', icon: '⚑', href: '/challenges' },
  { title: 'Raportează o problemă', description: 'Ajută la îmbunătățirea traseelor.', icon: '⚐', href: '/report-issue' },
  { title: 'Puncte', description: 'Vezi punctele și recompensele tale.', icon: '✧', href: '/(tabs)/rewards' },
  { title: 'Cupoane', description: 'Explorează catalogul de recompense.', icon: '🎟', href: '/(tabs)/rewards' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { width, fontScale } = useWindowDimensions();
  const firstName = user?.fullName.trim().split(/\s+/)[0];

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.content}>
          <View style={styles.welcome}>
            <Text style={styles.brand}>BEGREEN · TIMIȘOARA</Text>
            <Text style={styles.heading} accessibilityRole="header">
              {firstName ? `Bună, ${firstName}!` : 'Bine ai venit!'}
            </Text>
            <Text style={styles.intro}>Un drum mai bun începe cu o alegere verde.</Text>
          </View>

          <View style={styles.hero}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>MAI BINE PENTRU ORAȘ</Text>
            </View>
            <Text style={styles.heroTitle} accessibilityRole="header">Unde mergem?</Text>
            <Text style={styles.heroDescription}>
              Pe jos, cu bicicleta sau cu transportul public: găsește o variantă mai sustenabilă pentru următoarea călătorie.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Deschide harta și planifică o călătorie"
              onPress={() => router.navigate('/(tabs)')}
              style={({ pressed }) => [styles.mapButton, pressed && styles.mapButtonPressed]}
            >
              <Text style={styles.mapButtonText}>Deschide harta</Text>
              <Text style={styles.mapButtonText} accessible={false}>↗</Text>
            </Pressable>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle} accessibilityRole="header">La un pas distanță</Text>
            <Text style={styles.intro}>Tot ce ai nevoie pentru a merge mai departe.</Text>
          </View>
          <View style={styles.grid}>
            {shortcuts.map((shortcut) => (
              <Pressable
                key={shortcut.title}
                accessibilityRole="button"
                accessibilityLabel={`${shortcut.title}${shortcut.upcoming ? ', în curând' : ''}`}
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
                  <Text style={styles.shortcutIcon} accessible={false}>{shortcut.icon}</Text>
                  {shortcut.upcoming && <Text style={styles.upcoming}>În curând</Text>}
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
  shortcut: { flexBasis: '45%', flexGrow: 1, minWidth: 0, minHeight: 150, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.controlBorder, borderRadius: borderRadius.lg, padding: spacing.lg, gap: spacing.sm },
  shortcutPressed: { backgroundColor: colors.surfaceMuted },
  wideShortcut: { flexBasis: '30%' },
  singleShortcut: { flexBasis: '100%' },
  shortcutTop: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs },
  shortcutIcon: { fontSize: 26, color: colors.primaryDark },
  upcoming: { ...typography.caption, color: colors.textSecondary },
  shortcutTitle: { ...typography.bodyMedium, color: colors.textPrimary },
  shortcutDescription: { ...typography.caption, color: colors.textSecondary },
});
