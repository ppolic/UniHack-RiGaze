import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AppButton } from '../components/common/AppButton';
import { AppCard } from '../components/common/AppCard';
import { Badge } from '../components/common/Badge';
import { useAuth } from '../hooks/useAuth';
import { communityErrorMessage, communityService } from '../services/communityService';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { ChallengeDefinition } from '../types/community';

type ChallengesState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; challenges: ChallengeDefinition[] };

const categories: Record<string, string> = {
  Bike: 'Bicicletă', Walk: 'Pe jos', Transit: 'Transport public', Carbon: 'Impact climatic',
  CarFree: 'Fără mașină', Community: 'Comunitate', Accessibility: 'Accesibilitate',
};
const units: Record<string, string> = {
  vožnje: 'călătorii', vožnja: 'călătorie', dan: 'zi', dana: 'zile', prijava: 'raportare',
};

// Romanian presentation copy for definitions actually returned by the API.
// This never creates challenges or replaces their targets, points or progress.
const challengeCopy: Record<string, { title: string; description: string }> = {
  'bike-3x': {
    title: 'Săptămâna pe bicicletă',
    description: 'Alege bicicleta proprie sau una închiriată pentru drumurile către facultate sau serviciu.',
  },
  'accessible-transit-3x': {
    title: 'Transport public accesibil',
    description: 'Călătorește fără bariere, cu tramvaie și autobuze cu podea joasă.',
  },
  'car-free-day': {
    title: 'O alegere fără mașina proprie',
    description: 'Alege mersul pe jos, bicicleta, transportul public sau o călătorie partajată pentru deplasările zilnice.',
  },
  'walk-10km': {
    title: 'Mai mult mers pe jos',
    description: 'Adună kilometri pe jos, prin coridoarele verzi de pe Bega și zonele pietonale ale orașului.',
  },
  'accessible-10km': {
    title: 'Mobilitate fără bariere',
    description: 'Alege trasee fără trepte, transport public cu podea joasă sau călătorii partajate accesibile.',
  },
  'try-transit': {
    title: 'Descoperă transportul public',
    description: 'Folosește transportul public STPT sau împarte o călătorie cu alți pasageri.',
  },
  'save-5kg-co2': {
    title: 'Mai puține emisii CO₂',
    description: 'Înlocuiește drumurile cu mașina cu opțiuni sustenabile și economisește emisii de CO₂.',
  },
  'waze-guardian': {
    title: 'Ajută comunitatea în mișcare',
    description: 'Raportează sau confirmă obstacole, lucrări și căi de acces blocate pentru persoanele cu mobilitate redusă.',
  },
};

export default function ChallengesScreen() {
  const router = useRouter();
  const { user, token } = useAuth();
  const { width, fontScale } = useWindowDimensions();
  const [state, setState] = useState<ChallengesState>({ status: 'loading' });
  const [requestVersion, setRequestVersion] = useState(0);
  const loading = useRef(false);

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
            <Text style={styles.eyebrow}>PAȘI MICI, SCHIMBĂRI MARI</Text>
            <Text style={styles.title} accessibilityRole="header">Provocări</Text>
            <Text style={styles.description}>Descoperă obiectivele de mobilitate sustenabilă din catalog.</Text>
          </View>

          <AppCard style={styles.notice}>
            <Text style={styles.sectionTitle} accessibilityRole="header">Ce este disponibil acum</Text>
            <Text style={styles.description}>
              Poți consulta și reîncărca provocările. Înscrierea separată nu este disponibilă. Progresul, finalizarea și colectarea bonusurilor nu pot fi confirmate în siguranță de serviciul actual.
            </Text>
            <Text style={styles.description}>
              De aceea nu afișăm un progres presupus și nu acordăm puncte din acest ecran.
            </Text>
            <AppButton title="Înscriere separată indisponibilă" disabled onPress={() => {}} textStyle={styles.buttonText} />
          </AppCard>

          <View style={styles.listHeading}>
            <Text style={styles.sectionTitle} accessibilityRole="header">Catalog de provocări</Text>
            <AppButton title="Reîncarcă" variant="outline" onPress={reload} disabled={state.status === 'loading'} textStyle={styles.buttonText} />
          </View>

          {state.status === 'loading' && (
            <View style={styles.statusCard} accessible accessibilityRole="progressbar"
              accessibilityLabel="Se încarcă provocările" accessibilityState={{ busy: true }}>
              <ActivityIndicator size="large" color={colors.primary} accessible={false} />
              <Text style={styles.description}>Se încarcă provocările…</Text>
            </View>
          )}
          {state.status === 'error' && (
            <AppCard style={styles.statusCard}>
              <Text style={styles.sectionTitle}>Provocările nu sunt disponibile</Text>
              <Text style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="assertive">{state.message}</Text>
              <AppButton title="Încearcă din nou" onPress={reload} />
            </AppCard>
          )}
          {state.status === 'success' && state.challenges.length === 0 && (
            <AppCard style={styles.statusCard}>
              <Text style={styles.sectionTitle}>Nicio provocare disponibilă acum</Text>
              <Text style={styles.description}>Catalogul returnat de server este gol. Poți reveni mai târziu sau reîncărca lista.</Text>
            </AppCard>
          )}
          {state.status === 'success' && (
            <View style={styles.grid}>
              {state.challenges.map((challenge) => (
                <View key={challenge.id} style={[styles.column, width >= 900 && fontScale <= 1.3 && styles.desktopColumn]}>
                  <AppCard style={styles.challengeCard}>
                    <View style={styles.badges}>
                      <Badge label={categories[challenge.category] ?? 'Provocare'} />
                      <Badge label={challenge.rewardPoints + ' puncte bonus posibile'} variant="reward" style={styles.badge} />
                    </View>
                    <Text style={styles.sectionTitle} accessibilityRole="header">{challengeCopy[challenge.id]?.title ?? challenge.title}</Text>
                    <Text style={styles.description}>{challengeCopy[challenge.id]?.description ?? challenge.description}</Text>
                    <Text style={styles.target}>Obiectiv: {challenge.targetValue} {units[challenge.unit] ?? challenge.unit}</Text>
                    {challenge.adaptedForAccessibility && <Text style={styles.caption}>Adaptată pentru accesibilitate</Text>}
                    <Text style={styles.caption}>Progres și status de finalizare: indisponibile pentru verificare.</Text>
                    <View style={styles.collect}>
                      <AppButton title="Colectare puncte indisponibilă" disabled onPress={() => {}} textStyle={styles.buttonText} />
                    </View>
                  </AppCard>
                </View>
              ))}
            </View>
          )}
          <AppButton title="Înapoi acasă" variant="outline" onPress={() => router.navigate('/(tabs)/home')} />
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
