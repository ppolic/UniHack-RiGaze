import React, { useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AppButton } from '../components/common/AppButton';
import { AppCard } from '../components/common/AppCard';
import { AppInput } from '../components/common/AppInput';
import { Badge } from '../components/common/Badge';
import { useAuth } from '../hooks/useAuth';
import { communityErrorMessage, communityService } from '../services/communityService';
import { useUserStore } from '../store/userStore';
import { colors } from '../theme/colors';
import { borderRadius, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { IssueCategory, IssueReportReceipt } from '../types/community';

const categories: { value: IssueCategory; label: string; description: string }[] = [
  { value: 'RoadBlockade', label: 'Drum blocat', description: 'Lucrări sau obstacole pe carosabil.' },
  { value: 'BlockedBikeLane', label: 'Pistă de biciclete blocată', description: 'Acces împiedicat pe o pistă existentă.' },
  { value: 'InaccessibleArea', label: 'Zonă inaccesibilă', description: 'Bariere pentru deplasarea în siguranță.' },
  { value: 'MissingBikeLane', label: 'Lipsă pistă de biciclete', description: 'Un loc unde este necesară o pistă.' },
  { value: 'TransitDisruption', label: 'Transport public perturbat', description: 'O problemă care afectează transportul public.' },
];

interface ReportForm {
  category: IssueCategory | '';
  description: string;
  streetOrZone: string;
  latitude: string;
  longitude: string;
}
type FieldErrors = Partial<Record<keyof ReportForm, string>>;
const emptyForm: ReportForm = { category: '', description: '', streetOrZone: '', latitude: '', longitude: '' };

function coordinate(input: string): number {
  const normalized = input.trim().replace(',', '.');
  return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized) ? Number(normalized) : NaN;
}

export default function ReportIssueScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [form, setForm] = useState<ReportForm>(emptyForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<IssueReportReceipt | null>(null);
  const mounted = useRef(false);
  const locked = useRef(false);
  const confirmed = useRef<IssueReportReceipt | null>(null);
  const sessionVersion = useRef(0);

  useEffect(() => {
    mounted.current = true;
    const unsubscribe = useUserStore.subscribe((next, previous) => {
      if (next.user?.id !== previous.user?.id || next.token !== previous.token || next.isAuthenticated !== previous.isAuthenticated) {
        sessionVersion.current += 1;
        confirmed.current = null;
        setReceipt(null);
        setSubmissionError('Sesiunea s-a schimbat. Verifică autentificarea înainte de a continua.');
      }
    });
    return () => {
      mounted.current = false;
      sessionVersion.current += 1;
      unsubscribe();
    };
  }, []);

  const updateField = <K extends keyof ReportForm>(field: K, value: ReportForm[K]) => {
    if (locked.current) return;
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async () => {
    if (!mounted.current || locked.current || confirmed.current) return;
    const nextErrors: FieldErrors = {};
    const latitude = coordinate(form.latitude);
    const longitude = coordinate(form.longitude);
    if (!form.category) nextErrors.category = 'Alege o categorie.';
    if (!form.description.trim()) nextErrors.description = 'Descrie problema observată.';
    else if (form.description.trim().length > 600) nextErrors.description = 'Descrierea poate avea cel mult 600 de caractere.';
    if (form.streetOrZone.trim().length > 150) nextErrors.streetOrZone = 'Folosește cel mult 150 de caractere.';
    if (!Number.isFinite(latitude) || Math.abs(latitude) > 90) nextErrors.latitude = 'Introdu o latitudine între -90 și 90.';
    if (!Number.isFinite(longitude) || Math.abs(longitude) > 180) nextErrors.longitude = 'Introdu o longitudine între -180 și 180.';
    setErrors(nextErrors);
    setSubmissionError(null);
    if (Object.keys(nextErrors).length > 0 || !form.category) return;

    // Acquire before the first await: rapid taps cannot send overlapping requests.
    locked.current = true;
    const version = sessionVersion.current;
    setSubmitting(true);
    Keyboard.dismiss();
    try {
      const result = await communityService.createReport({
        category: form.category,
        description: form.description.trim(),
        streetOrZone: form.streetOrZone.trim() || undefined,
        latitude,
        longitude,
      });
      if (!mounted.current || sessionVersion.current !== version) return;
      confirmed.current = result;
      setReceipt(result);
    } catch (error) {
      if (mounted.current && sessionVersion.current === version) {
        setSubmissionError(communityErrorMessage(error, 'submit'));
      }
    } finally {
      locked.current = false;
      if (mounted.current) setSubmitting(false);
    }
  };

  const reset = () => {
    if (locked.current) return;
    confirmed.current = null;
    setReceipt(null);
    setForm(emptyForm);
    setErrors({});
    setSubmissionError(null);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <View style={styles.content}>
          <View style={styles.heading}>
            <Text style={styles.eyebrow}>UN ORAȘ MAI UȘOR DE PARCURS</Text>
            <Text style={styles.title} accessibilityRole="header">Raportează o problemă</Text>
            <Text style={styles.description}>Spune-ne ce îngreunează deplasarea. Introdu locul și detaliile observate.</Text>
          </View>

          {receipt ? (
            <AppCard style={styles.card}>
              <View style={styles.receiptHeading} accessibilityLiveRegion="polite">
                <Badge label="Primită de server" variant="success" />
                <Text style={styles.sectionTitle} accessibilityRole="header">Raportarea #{receipt.id} a fost primită</Text>
              </View>
              <Text style={styles.target}>{categories.find((category) => category.value === receipt.category)?.label}</Text>
              <Text style={styles.description}>{receipt.description}</Text>
              {receipt.streetOrZone !== '' && <Text style={styles.description}>{receipt.streetOrZone}</Text>}
              <Text selectable style={styles.caption}>Latitudine: {receipt.latitude} · Longitudine: {receipt.longitude}</Text>
              <Text style={styles.description}>
                Confirmarea atestă primirea de către serverul EcoMutare. Păstrarea după repornirea serverului și acordarea punctelor nu sunt garantate de serviciul actual. Raportarea nu este transmisă automat către primărie.
              </Text>
              <AppButton title="Raportează altă problemă" onPress={reset} textStyle={styles.buttonText} />
            </AppCard>
          ) : (
            <View style={styles.form}>
              <AppCard style={styles.card}>
                <Text style={styles.sectionTitle} accessibilityRole="header">1. Ce ai observat?</Text>
                <Text style={styles.caption}>Categoria și descrierea sunt obligatorii.</Text>
                <View style={styles.categories} accessibilityRole="radiogroup" accessibilityLabel="Categoria problemei">
                  {categories.map((category) => (
                    <Pressable
                      key={category.value}
                      accessibilityRole="radio"
                      accessibilityLabel={category.label}
                      accessibilityHint={category.description}
                      accessibilityState={{ checked: form.category === category.value, disabled: submitting }}
                      disabled={submitting}
                      onPress={() => updateField('category', category.value)}
                      style={({ pressed }) => [styles.category, form.category === category.value && styles.selectedCategory, pressed && styles.pressedCategory]}
                    >
                      <Text style={styles.categoryTitle}>{form.category === category.value ? '✓ ' : ''}{category.label}</Text>
                      <Text style={styles.caption}>{category.description}</Text>
                    </Pressable>
                  ))}
                </View>
                {errors.category && <Text style={styles.error} accessibilityRole="alert">{errors.category}</Text>}
                <View accessibilityLiveRegion="polite">
                  <AppInput label="Descriere *" accessibilityLabel="Descrierea problemei, obligatorie"
                    value={form.description} onChangeText={(value) => updateField('description', value)}
                    error={errors.description} accessibilityHint={errors.description}
                    multiline maxLength={600} style={styles.descriptionInput} editable={!submitting} />
                  <Text style={styles.caption}>{form.description.length}/600 caractere</Text>
                </View>
              </AppCard>

              <AppCard style={styles.card}>
                <Text style={styles.sectionTitle} accessibilityRole="header">2. Unde se află problema?</Text>
                <Text style={styles.description}>Introdu coordonate WGS84 în grade zecimale. Poți folosi punct sau virgulă. Nu este necesar accesul la GPS.</Text>
                <View accessibilityLiveRegion="polite">
                  <AppInput label="Stradă sau zonă (opțional)" accessibilityLabel="Stradă sau zonă, opțional"
                    value={form.streetOrZone} onChangeText={(value) => updateField('streetOrZone', value)}
                    error={errors.streetOrZone} maxLength={150} autoCapitalize="words" editable={!submitting} />
                  <View style={styles.coordinates}>
                    <View style={styles.coordinate}>
                      <AppInput label="Latitudine *" accessibilityLabel="Latitudine, obligatorie, între -90 și 90"
                        value={form.latitude} onChangeText={(value) => updateField('latitude', value)}
                        error={errors.latitude} accessibilityHint={errors.latitude} inputMode="decimal" autoCorrect={false}
                        maxLength={24} editable={!submitting} returnKeyType="next" />
                    </View>
                    <View style={styles.coordinate}>
                      <AppInput label="Longitudine *" accessibilityLabel="Longitudine, obligatorie, între -180 și 180"
                        value={form.longitude} onChangeText={(value) => updateField('longitude', value)}
                        error={errors.longitude} accessibilityHint={errors.longitude} inputMode="decimal" autoCorrect={false}
                        maxLength={24} editable={!submitting} returnKeyType="send" submitBehavior="submit" onSubmitEditing={handleSubmit} />
                    </View>
                  </View>
                </View>
              </AppCard>

              {Object.values(errors).some(Boolean) && (
                <Text style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="assertive">Verifică câmpurile marcate înainte de trimitere.</Text>
              )}
              {submissionError && (
                <Text style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="assertive">{submissionError}</Text>
              )}
              <View style={styles.actions}>
                <Text style={styles.caption}>Raportarea ajunge la EcoMutare și nu înlocuiește o sesizare oficială către primărie.</Text>
                <AppButton title={submissionError ? 'Reîncearcă trimiterea' : 'Trimite raportarea'} onPress={handleSubmit}
                  loading={submitting} disabled={submitting || !isAuthenticated || !user} style={styles.submit} textStyle={styles.buttonText} />
                {submitting && (
                  <Text style={styles.caption} accessibilityLiveRegion="polite" accessibilityState={{ busy: true }}>Se verifică sesiunea și se trimite raportarea…</Text>
                )}
              </View>
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
  content: { width: '100%', maxWidth: 760, gap: spacing['2xl'] },
  heading: { gap: spacing.sm },
  eyebrow: { ...typography.captionMedium, color: colors.primary, letterSpacing: 1 },
  title: { ...typography.h1, color: colors.textPrimary },
  sectionTitle: { ...typography.h3, color: colors.textPrimary },
  description: { ...typography.body, color: colors.textSecondary },
  caption: { ...typography.caption, color: colors.textSecondary },
  target: { ...typography.bodyMedium, color: colors.textPrimary },
  error: { ...typography.body, color: colors.danger },
  form: { gap: spacing.lg },
  card: { gap: spacing.lg },
  categories: { gap: spacing.sm },
  category: { minHeight: 48, borderWidth: 2, borderColor: colors.controlBorder, borderRadius: borderRadius.md, padding: spacing.md, gap: spacing.xs },
  selectedCategory: { backgroundColor: colors.surfaceMuted, borderColor: colors.primary },
  pressedCategory: { backgroundColor: colors.surfaceMuted },
  categoryTitle: { ...typography.bodyMedium, color: colors.textPrimary },
  descriptionInput: { minHeight: 120, textAlignVertical: 'top' },
  coordinates: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  coordinate: { flexBasis: 220, flexGrow: 1, minWidth: 0 },
  actions: { gap: spacing.md },
  submit: { minHeight: 48 },
  buttonText: { flexShrink: 1, textAlign: 'center' },
  receiptHeading: { gap: spacing.md },
});
