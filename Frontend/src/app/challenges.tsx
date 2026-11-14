import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AppButton } from '../components/common/AppButton';
import { AppCard } from '../components/common/AppCard';
import { Badge } from '../components/common/Badge';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from '../hooks/useTranslation';
import { communityErrorMessage, communityService } from '../services/communityService';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { ChallengeDefinition } from '../types/community';

type ChallengesState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; challenges: ChallengeDefinition[] };

export default function ChallengesScreen() {
  const router = useRouter();
  const { user, token } = useAuth();
  const { t } = useTranslation();
  const { width, fontScale } = useWindowDimensions();
  const [state, setState] = useState<ChallengesState>({ status: 'loading' });
  const [requestVersion, setRequestVersion] = useState(0);
  const loading = useRef(false);

  const categories: Record<string, string> = {
    Bike: t.challengeCatBike,
    Walk: t.challengeCatWalk,
    Transit: t.challengeCatTransit,
    Carbon: t.challengeCatCarbon,
    CarFree: t.challengeCatCarFree,
    Community: t.challengeCatCommunity,
    Accessibility: t.challengeCatAccessibility,
  };
  const units: Record<string, string> = {
    vožnje: t.challengeUnitTrips,
    vožnja: t.challengeUnitTrip,
    dan: t.challengeUnitDay,
    dana: t.challengeUnitDays,
    prijava: t.challengeUnitReport,
    trips: t.challengeUnitTrips,
    trip: t.challengeUnitTrip,
    day: t.challengeUnitDay,
    days: t.challengeUnitDays,
    report: t.challengeUnitReport,
  };

  useEffect(() => {
    let active = true;
    loading.current = true;
    setState({ status: 'loading' });
    const load = async () => {
      try {
        const challenges = await communityService.getChallenges();
        if (active) setState({ status: 'success', challenges });
      } catch (error) {
        if (active) setState({ status: 'error', message: communityErrorMessage(error, 'load') });
      } finally {
        if (active) loading.current = false;
      }
    };
    void load();
    return () => { active = false; };
  }, [requestVersion, user?.id, token, user?.preferences.hasDisability]);

  const reload = () => {
    if (loading.current) return;
    loading.current = true;
    setState({ status: 'loading' });
    setRequestVersion((version) => version + 1);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.content}>
          <View style={styles.heading}>
            <Text style={styles.eyebrow}>{t.challengesEyebrow}</Text>
            <Text style={styles.title} accessibilityRole="header">{t.challengesTitle}</Text>
            <Text style={styles.description}>{t.challengesSubtitle}</Text>
          </View>

          {user?.organizationBadge && (
            <View style={{ backgroundColor: colors.surfaceMuted, padding: spacing.md, borderRadius: 12, borderWidth: 1, borderColor: colors.primary, gap: 4 }}>
              <Text style={{ ...typography.captionMedium, color: colors.primaryDark, fontWeight: '700' }}>
                🎓 Green Campus Challenge: {user.organizationBadge}
              </Text>
              <Text style={{ ...typography.caption, color: colors.textSecondary }}>
                Vaši zeleni kilometri automatski se pribrajaju na rang listu za {user.verifiedOrganization ?? 'vašu organizaciju'}!
              </Text>
            </View>
          )}

          <AppCard style={styles.notice}>
            <Text style={styles.sectionTitle} accessibilityRole="header">{t.challengesNoticeTitle}</Text>
            <Text style={styles.description}>
              {t.challengesNoticeBody1}
            </Text>
            <Text style={styles.description}>
              {t.challengesNoticeBody2}
            </Text>
            <AppButton title={t.challengesJoinDisabledBtn} disabled onPress={() => {}} textStyle={styles.buttonText} />
          </AppCard>

          <View style={styles.listHeading}>
            <Text style={styles.sectionTitle} accessibilityRole="header">{t.challengesCatalogTitle}</Text>
            <AppButton title={t.reloadBtn} variant="outline" onPress={reload} disabled={state.status === 'loading'} textStyle={styles.buttonText} />
          </View>

          {state.status === 'loading' && (
            <View style={styles.statusCard} accessible accessibilityRole="progressbar"
              accessibilityLabel={t.challengesLoadingA11y} accessibilityState={{ busy: true }}>
              <ActivityIndicator size="large" color={colors.primary} accessible={false} />
              <Text style={styles.description}>{t.challengesLoading}</Text>
            </View>
          )}
          {state.status === 'error' && (
            <AppCard style={styles.statusCard}>
              <Text style={styles.sectionTitle}>{t.challengesUnavailableTitle}</Text>
              <Text style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="assertive">{state.message}</Text>
              <AppButton title={t.retry} onPress={reload} />
            </AppCard>
          )}
          {state.status === 'success' && state.challenges.length === 0 && (
            <AppCard style={styles.statusCard}>
              <Text style={styles.sectionTitle}>{t.challengesEmptyTitle}</Text>
              <Text style={styles.description}>{t.challengesEmptyDesc}</Text>
            </AppCard>
          )}
          {state.status === 'success' && (
            <View style={styles.grid}>
              {state.challenges.map((challenge) => (
                <View key={challenge.id} style={[styles.column, width >= 900 && fontScale <= 1.3 && styles.desktopColumn]}>
                  <AppCard style={styles.challengeCard}>
                    <View style={styles.badges}>
                      <Badge label={categories[challenge.category] ?? t.challengesDefaultCategory} />
                      <Badge label={challenge.rewardPoints + t.challengesBonusPointsSuffix} variant="reward" style={styles.badge} />
                    </View>
                    <Text style={styles.sectionTitle} accessibilityRole="header">{t.challengesCopy[challenge.id]?.title ?? challenge.title}</Text>
                    <Text style={styles.description}>{t.challengesCopy[challenge.id]?.description ?? challenge.description}</Text>
                    <Text style={styles.target}>{t.challengesGoalPrefix} {challenge.targetValue} {units[challenge.unit] ?? challenge.unit}</Text>
                    {challenge.adaptedForAccessibility && <Text style={styles.caption}>{t.challengesAccessibleLabel}</Text>}
                    <Text style={styles.caption}>{t.challengesProgressUnavailable}</Text>
                    <View style={styles.collect}>
                      <AppButton title={t.challengesCollectDisabledBtn} disabled onPress={() => {}} textStyle={styles.buttonText} />
                    </View>
                  </AppCard>
                </View>
              ))}
            </View>
          )}
          <AppButton title={t.backHomeBtn} variant="outline" onPress={() => router.navigate('/(tabs)/home')} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.xl, alignItems: 'center' },
  content: { width: '100%', maxWidth: 960, gap: spacing['2xl'] },
  heading: { gap: spacing.sm },
  eyebrow: { ...typography.captionMedium, color: colors.primary, letterSpacing: 1 },
  title: { ...typography.h1, color: colors.textPrimary },
  description: { ...typography.body, color: colors.textSecondary },
  sectionTitle: { ...typography.h3, color: colors.textPrimary, flexShrink: 1 },
  caption: { ...typography.caption, color: colors.textSecondary },
  notice: { gap: spacing.md, backgroundColor: colors.surfaceMuted },
  listHeading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  statusCard: { gap: spacing.lg, padding: spacing.xl },
  error: { ...typography.body, color: colors.danger },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  column: { flexBasis: '100%', flexGrow: 1, minWidth: 0 },
  desktopColumn: { flexBasis: '45%' },
  challengeCard: { flex: 1, gap: spacing.lg },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  badge: { maxWidth: '100%', flexShrink: 1 },
  target: { ...typography.bodyMedium, color: colors.textPrimary },
  collect: { marginTop: 'auto' },
  buttonText: { flexShrink: 1, textAlign: 'center' },
});
