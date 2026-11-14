import React, { useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AppButton } from '../components/common/AppButton';
import { AppCard } from '../components/common/AppCard';
import { AppInput } from '../components/common/AppInput';
import { Badge } from '../components/common/Badge';
import { ReportLocationPicker } from '../components/reports/ReportLocationPicker';
import { useAuth } from '../hooks/useAuth';
import { getTranslations, useTranslation } from '../hooks/useTranslation';
import { communityErrorMessage, communityService } from '../services/communityService';
import { useUserStore } from '../store/userStore';
import { colors } from '../theme/colors';
import { borderRadius, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { isReportLocation, IssueCategory, IssueReportReceipt, ReportLocation, ReportTransportMode, reportTransportModes } from '../types/community';

interface ReportForm {
  category: IssueCategory | '';
  title: string;
  description: string;
  streetOrZone: string;
  affectedModes: ReportTransportMode[];
  affectsWheelchair: boolean;
  location: ReportLocation | null;
}
type FieldErrors = Partial<Record<keyof ReportForm, string>>;
const emptyForm: ReportForm = { category: '', title: '', description: '', streetOrZone: '', affectedModes: [], affectsWheelchair: false, location: null };
type LocationErrorKey = 'reportLocationDenied' | 'reportLocationServicesOff' | 'reportLocationTimeout' | 'reportLocationFailed';
class LocationRequestError extends Error {
  constructor(readonly translationKey: LocationErrorKey) { super(translationKey); }
}

export default function ReportIssueScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { t, translateMessage } = useTranslation();
  const modeLabels: Record<ReportTransportMode, string> = {
    Walk: t.modeWalk, Bike: t.modeBike, Scooter: t.modeScooter, PublicTransport: t.modePublicTransport,
    Car: t.modeCar, Carpool: t.modeCarpool, Combined: t.modeCombined,
  };

  const categories: { value: IssueCategory; label: string; description: string }[] = [
    { value: 'RoadBlockade', label: t.reportCatRoadBlockade, description: t.reportCatRoadBlockadeDesc },
    { value: 'BlockedBikeLane', label: t.reportCatBlockedBike, description: t.reportCatBlockedBikeDesc },
    { value: 'InaccessibleArea', label: t.reportCatInaccessible, description: t.reportCatInaccessibleDesc },
    { value: 'MissingBikeLane', label: t.reportCatMissingBike, description: t.reportCatMissingBikeDesc },
    { value: 'TransitDisruption', label: t.reportCatTransitDisruption, description: t.reportCatTransitDisruptionDesc },
  ];

  const [form, setForm] = useState<ReportForm>(emptyForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<IssueReportReceipt | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<LocationErrorKey | null>(null);
  const locationPending = useRef(false);
  const locationVersion = useRef(0);
  const mounted = useRef(false);
  const locked = useRef(false);
  const confirmed = useRef<IssueReportReceipt | null>(null);
  const sessionVersion = useRef(0);

  useEffect(() => {
    mounted.current = true;
    const unsubscribe = useUserStore.subscribe((next, previous) => {
      if (next.user?.id !== previous.user?.id || next.token !== previous.token || next.isAuthenticated !== previous.isAuthenticated) {
        sessionVersion.current += 1;
        locationVersion.current += 1;
        confirmed.current = null;
        setReceipt(null);
        setSubmissionError(getTranslations().reportSessionChanged);
      }
    });
    return () => {
      mounted.current = false;
      sessionVersion.current += 1;
      locationVersion.current += 1;
      unsubscribe();
    };
  }, []);

  const updateField = <K extends keyof ReportForm>(field: K, value: ReportForm[K]) => {
    if (locked.current) return;
    setForm((current) => ({ ...current, [field]: value,
      ...(field === 'category' && value === 'InaccessibleArea' ? { affectsWheelchair: true } : {}),
    }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const useCurrentLocation = async () => {
    if (!mounted.current || locked.current || locationPending.current) return;
    locationPending.current = true;
    const version = ++locationVersion.current;
    const active = () => mounted.current && locationVersion.current === version;
    setLocating(true);
    setLocationError(null);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const acquire = async (): Promise<ReportLocation> => {
        if (Platform.OS === 'web') {
          if (typeof navigator === 'undefined' || !navigator.geolocation || !window.isSecureContext) {
            throw new LocationRequestError('reportLocationFailed');
          }
          // Browser API explicitly disables cached fixes (Expo's web default permits caching).
          return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(
            ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
            (error) => reject(new LocationRequestError(error.code === 1 ? 'reportLocationDenied' : error.code === 3 ? 'reportLocationTimeout' : 'reportLocationFailed')),
            { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
          ));
        }
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!active()) throw new LocationRequestError('reportLocationFailed');
        if (permission.status !== 'granted') throw new LocationRequestError('reportLocationDenied');
        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!active()) throw new LocationRequestError('reportLocationFailed');
        if (!servicesEnabled) throw new LocationRequestError('reportLocationServicesOff');
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        return { latitude: position.coords.latitude, longitude: position.coords.longitude };
      };
      const point = await Promise.race([
        acquire(),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new LocationRequestError('reportLocationTimeout')), 20000); }),
      ]);
      if (!active()) return;
      if (!isReportLocation(point)) throw new LocationRequestError('reportLocationFailed');
      updateField('location', point);
    } catch (error) {
      if (active()) setLocationError(error instanceof LocationRequestError ? error.translationKey : 'reportLocationFailed');
    } finally {
      if (timer) clearTimeout(timer);
      // One-shot location APIs cannot always be cancelled; invalidate late results.
      if (locationVersion.current === version) locationVersion.current += 1;
      locationPending.current = false;
      if (mounted.current) setLocating(false);
    }
  };

  const handleSubmit = async () => {
    if (!mounted.current || locked.current || confirmed.current || locationPending.current || pickerVisible) return;
    const nextErrors: FieldErrors = {};
    if (!form.category) nextErrors.category = t.reportErrCategory;
    if (!form.title.trim() || form.title.trim().length > 160) nextErrors.title = t.reportErrTitle;
    if (!form.description.trim()) nextErrors.description = t.reportErrDescriptionRequired;
    else if (form.description.trim().length > 600) nextErrors.description = t.reportErrDescriptionMax;
    if (form.streetOrZone.trim().length > 150) nextErrors.streetOrZone = t.reportErrStreetMax;
    if (!form.affectedModes.length) nextErrors.affectedModes = t.reportModesHint;
    if (!isReportLocation(form.location)) nextErrors.location = t.reportLocationRequired;
    setErrors(nextErrors);
    setSubmissionError(null);
    if (Object.keys(nextErrors).length > 0 || !form.category || !isReportLocation(form.location)) return;

    // Acquire before the first await: rapid taps cannot send overlapping requests.
    locked.current = true;
    const version = sessionVersion.current;
    setSubmitting(true);
    Keyboard.dismiss();
    try {
      const result = await communityService.createReport({
        category: form.category,
        title: form.title.trim(),
        description: form.description.trim(),
        affectedModes: [...form.affectedModes],
        affectsWheelchair: form.affectsWheelchair,
        streetOrZone: form.streetOrZone.trim() || undefined,
        latitude: form.location.latitude,
        longitude: form.location.longitude,
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
    if (locked.current || locationPending.current) return;
    confirmed.current = null;
    setReceipt(null);
    setForm(emptyForm);
    setErrors({});
    setSubmissionError(null);
    setLocationError(null);
    setPickerVisible(false);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <View style={styles.content}>
          <View style={styles.heading}>
            <Text style={styles.eyebrow}>{t.reportEyebrow}</Text>
            <Text style={styles.title} accessibilityRole="header">{t.reportTitle}</Text>
            <Text style={styles.description}>{t.reportSubtitle}</Text>
          </View>

          {receipt ? (
            <AppCard style={styles.card}>
              <View style={styles.receiptHeading} accessibilityLiveRegion="polite">
                <Badge label={t.reportReceiptBadge} variant="success" />
                <Text style={styles.sectionTitle} accessibilityRole="header">{t.reportReceiptTitle(receipt.id)}</Text>
              </View>
              <Text style={styles.sectionTitle}>{receipt.title}</Text>
              <Text style={styles.target}>{categories.find((category) => category.value === receipt.category)?.label}</Text>
              <Text style={styles.description}>{receipt.description}</Text>
              {receipt.streetOrZone !== '' && <Text style={styles.description}>{receipt.streetOrZone}</Text>}
              <Text selectable style={styles.caption}>{t.reportCoordsLabel(receipt.latitude, receipt.longitude)}</Text>
              <Text style={styles.description}>{t.reportModesTitle}: {receipt.affectedModes.map((mode) => modeLabels[mode]).join(', ')}</Text>
              {receipt.affectsWheelchair && <Text style={styles.description}>{t.reportWheelchair}</Text>}
              <Text style={styles.description}>
                {t.reportReceiptDisclaimer}
              </Text>
              <AppButton title={t.reportAnotherBtn} onPress={reset} textStyle={styles.buttonText} />
            </AppCard>
          ) : (
            <View style={styles.form}>
              <AppCard style={styles.card}>
                <Text style={styles.sectionTitle} accessibilityRole="header">{t.reportStep1Title}</Text>
                <Text style={styles.caption}>{t.reportStep1Hint}</Text>
                <View style={styles.categories} accessibilityRole="radiogroup" accessibilityLabel={t.reportCategoryGroupA11y}>
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
                {errors.category && <Text style={styles.error} accessibilityRole="alert">{translateMessage(errors.category)}</Text>}
                <View accessibilityLiveRegion="polite">
                  <AppInput label={t.reportTitleLabel} accessibilityLabel={t.reportTitleLabel}
                    value={form.title} onChangeText={(value) => updateField('title', value)}
                    error={translateMessage(errors.title)} accessibilityHint={translateMessage(errors.title)} maxLength={160} editable={!submitting} returnKeyType="next" />
                  <AppInput label={t.reportDescLabel} accessibilityLabel={t.reportDescA11y}
                    value={form.description} onChangeText={(value) => updateField('description', value)}
                    error={translateMessage(errors.description)} accessibilityHint={translateMessage(errors.description)}
                    multiline maxLength={600} style={styles.descriptionInput} editable={!submitting} />
                  <Text style={styles.caption}>{t.reportCharsCount(form.description.length)}</Text>
                </View>
              </AppCard>

              <AppCard style={styles.card}>
                <Text style={styles.sectionTitle} accessibilityRole="header">{t.reportModesTitle}</Text>
                <Text style={styles.caption}>{t.reportModesHint}</Text>
                <View style={styles.modes} accessibilityLabel={t.reportModesTitle}>
                  {reportTransportModes.map((mode) => {
                    const selected = form.affectedModes.includes(mode);
                    return (
                      <Pressable key={mode} accessibilityRole="checkbox" accessibilityLabel={modeLabels[mode]}
                        accessibilityState={{ checked: selected, disabled: submitting }} disabled={submitting}
                        onPress={() => updateField('affectedModes', selected ? form.affectedModes.filter((value) => value !== mode) : [...form.affectedModes, mode])}
                        style={({ pressed }) => [styles.category, styles.mode, selected && styles.selectedCategory, pressed && styles.pressedCategory]}>
                        <Text style={styles.categoryTitle}>{selected ? '✓ ' : ''}{modeLabels[mode]}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                {errors.affectedModes && <Text style={styles.error} accessibilityRole="alert">{translateMessage(errors.affectedModes)}</Text>}
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>{t.reportWheelchair}</Text>
                  <Switch value={form.affectsWheelchair} onValueChange={(value) => updateField('affectsWheelchair', value)}
                    disabled={submitting || form.category === 'InaccessibleArea'} accessibilityLabel={t.reportWheelchair}
                    accessibilityHint={form.category === 'InaccessibleArea' ? t.reportWheelchairRequired : undefined}
                    trackColor={{ false: colors.controlBorder, true: colors.primary }} thumbColor={colors.surface} />
                </View>
                {form.category === 'InaccessibleArea' && <Text style={styles.caption}>{t.reportWheelchairRequired}</Text>}
              </AppCard>

              <AppCard style={styles.card}>
                <Text style={styles.sectionTitle} accessibilityRole="header">{t.reportStep2Title}</Text>
                <Text style={styles.description}>{t.reportStep2Desc}</Text>
                <View accessibilityLiveRegion="polite">
                  <AppInput label={t.reportStreetLabel} accessibilityLabel={t.reportStreetA11y}
                    value={form.streetOrZone} onChangeText={(value) => updateField('streetOrZone', value)}
                    error={translateMessage(errors.streetOrZone)} maxLength={150} autoCapitalize="words" editable={!submitting} />
                  <View style={styles.locationActions}>
                    <View style={styles.locationAction}>
                      <AppButton title={t.reportUseLocation} onPress={useCurrentLocation} loading={locating}
                        disabled={submitting || locating} style={styles.submit} textStyle={styles.buttonText} />
                    </View>
                    <View style={styles.locationAction}>
                      <AppButton title={t.reportChooseMap} variant="outline" disabled={submitting || locating}
                        onPress={() => { if (!locked.current && !locationPending.current) { Keyboard.dismiss(); setPickerVisible(true); } }}
                        style={styles.submit} textStyle={styles.buttonText} />
                    </View>
                  </View>
                  {locating && <Text style={styles.caption} accessibilityState={{ busy: true }} accessibilityLiveRegion="polite">{t.reportLocating}</Text>}
                  <View style={styles.locationSummary} accessibilityLiveRegion="polite">
                    <Text style={styles.categoryTitle}>{t.reportLocationSelected}</Text>
                    <Text style={styles.description} selectable>
                      {form.location ? t.reportCoordsLabel(Number(form.location.latitude.toFixed(6)), Number(form.location.longitude.toFixed(6))) : t.reportLocationEmpty}
                    </Text>
                  </View>
                  {locationError && <Text style={styles.error} accessibilityRole="alert">{t[locationError]}</Text>}
                  {errors.location && <Text style={styles.error} accessibilityRole="alert">{translateMessage(errors.location)}</Text>}
                </View>
              </AppCard>

              {Object.values(errors).some(Boolean) && (
                <Text style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="assertive">{t.reportFormCheckError}</Text>
              )}
              {submissionError && (
                <Text style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="assertive">{translateMessage(submissionError)}</Text>
              )}
              <View style={styles.actions}>
                <Text style={styles.caption}>{t.reportSubmitDisclaimer}</Text>
                <AppButton title={submissionError ? t.reportRetryBtn : t.reportSubmitBtn} onPress={handleSubmit}
                  loading={submitting} disabled={submitting || locating || !isAuthenticated || !user} style={styles.submit} textStyle={styles.buttonText} />
                {submitting && (
                  <Text style={styles.caption} accessibilityLiveRegion="polite" accessibilityState={{ busy: true }}>{t.reportSubmitting}</Text>
                )}
              </View>
            </View>
          )}
          <AppButton title={t.backHomeBtn} variant="outline" onPress={() => router.navigate('/(tabs)/home')} />
        </View>
      </ScrollView>
      {pickerVisible && (
        <ReportLocationPicker value={form.location} onCancel={() => setPickerVisible(false)}
          onConfirm={(point) => {
            if (!locked.current && isReportLocation(point)) {
              updateField('location', point);
              setLocationError(null);
              setPickerVisible(false);
            }
          }} />
      )}
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
  modes: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  mode: { flexBasis: 180, flexGrow: 1, justifyContent: 'center' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' },
  switchLabel: { ...typography.body, color: colors.textPrimary, flexGrow: 1, flexBasis: 180 },
  locationActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.md },
  locationAction: { flexBasis: 220, flexGrow: 1, minWidth: 0 },
  locationSummary: { padding: spacing.md, marginTop: spacing.sm, gap: spacing.xs, borderRadius: borderRadius.md, backgroundColor: colors.surfaceMuted },
  actions: { gap: spacing.md },
  submit: { minHeight: 48 },
  buttonText: { flexShrink: 1, textAlign: 'center' },
  receiptHeading: { gap: spacing.md },
});
