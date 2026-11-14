import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  StyleSheet,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { AppButton } from './AppButton';

interface AccessibilityComplianceModalProps {
  visible: boolean;
  onClose: () => void;
}

type StatementLanguage = 'ro' | 'en';

const STATEMENT_COPY: Record<
  StatementLanguage,
  {
    headerSubtitle: string;
    controlsSectionTitle: string;
    controlsItems: {
      key: 'hasDisability' | 'wcagLargeText' | 'wcagTextRouteMode';
      label: string;
      desc: string;
      accessibilityLabel: string;
    }[];
    statementTitle: string;
    complianceStatusLabel: string;
    complianceStatusBadge: string;
    legalIntro: string;
    measuresTitle: string;
    measures: string[];
    enforcementTitle: string;
    enforcementBody: string;
    feedbackTitle: string;
    feedbackDesc: string;
    feedbackPlaceholder: string;
    feedbackSubmitBtn: string;
    feedbackEmptyError: string;
    feedbackSuccessMsg: string;
    closeLabel: string;
  }
> = {
  ro: {
    headerSubtitle: 'Conformitate legală România & UE • Standard EN 301 549',
    controlsSectionTitle: 'Instrumente active de accesibilitate (WCAG 2.1 AA)',
    controlsItems: [
      {
        key: 'hasDisability',
        label: '♿ Transport cu podea joasă și rute fără bariere',
        desc: 'Filtrează automat stațiile STPT accesibile și locurile de parcare TimPark dedicate.',
        accessibilityLabel: 'Activează rutele accesibile și transportul cu podea joasă',
      },
      {
        key: 'wcagLargeText',
        label: '🔤 Text mărit (WCAG 1.4.4 — 120%)',
        desc: 'Mărește dimensiunea etichetelor de rută și a textelor esențiale de navigare.',
        accessibilityLabel: 'Activează modul text mărit WCAG 1.4.4',
      },
      {
        key: 'wcagTextRouteMode',
        label: '📋 Alternativă textuală pentru hartă (EN 301 549)',
        desc: 'Afișează instrucțiunile pas cu pas și stațiile accesibile în format optimizat pentru cititoare de ecran.',
        accessibilityLabel: 'Activează alternativa textuală pentru hartă',
      },
    ],
    statementTitle:
      'Declarație privind accesibilitatea (Legea nr. 232/2022 & EN 301 549)',
    complianceStatusLabel: 'Starea de conformitate:',
    complianceStatusBadge: 'Conformitate deplină WCAG 2.1 Nivel AA',
    legalIntro:
      'Aplicația mobilă și web BeGreen Timișoara este concepută pentru a respecta cerințele Legii nr. 232/2022 (care completează OUG nr. 112/2018 și transpune Directiva (UE) 2016/2102 privind accesibilitatea site-urilor web și a aplicațiilor mobile ale organismelor din sectorul public) și standardul european armonizat EN 301 549 V3.2.1.',
    measuresTitle: 'Măsuri tehnice implementate',
    measures: [
      'Contrast cromatic verificat (≥ 4,5:1 pentru text normal și ≥ 3:1 pentru elemente grafice și controale interactive).',
      'Indicatori non-cromatici de stare: selecțiile, avertismentele meteo și modurile de transport includ pictograme și etichete textuale (WCAG 1.4.1).',
      'Etichete semantice și suport TalkBack / VoiceOver (ARIA roles, states și live regions) pe controalele interactive.',
      'Alternativă textuală completă pentru hărțile interactive (conform Art. 1 alin. (4) lit. d din Legea 232/2022): listă de stații STPT accesibile, parcări TimPark și instrucțiuni pas cu pas.',
      'Ținte tactile optimizate (≥ 44 px / hitSlop extins) și compatibilitate cu redimensionarea textului.',
    ],
    enforcementTitle: 'Procedura de asigurare a respectării legii (ADR)',
    enforcementBody:
      'Autoritatea națională responsabilă cu monitorizarea și aplicarea Legii nr. 232/2022 în România este Autoritatea pentru Digitalizarea României (ADR — https://www.adr.gov.ro). Puteți transmite sesizări și către Primăria Municipiului Timișoara (Serviciul Mobilitate Urbană).',
    feedbackTitle: 'Mecanism de feedback (Art. 7 — Legea 232/2022)',
    feedbackDesc:
      'Dacă întâmpinați bariere de accesibilitate sau aveți nevoie de informații într-un format accesibil, raportați mai jos:',
    feedbackPlaceholder: 'Descrieți problema de accesibilitate întâlnită...',
    feedbackSubmitBtn: 'Trimite sesizarea de accesibilitate',
    feedbackEmptyError: 'Vă rugăm să introduceți o descriere a barierei de accesibilitate.',
    feedbackSuccessMsg:
      'Sesizarea dumneavoastră a fost înregistrată conform Art. 7 din Legea nr. 232/2022. Echipa tehnică va răspunde în cel mai scurt timp.',
    closeLabel: 'Închide fereastra',
  },
  en: {
    headerSubtitle: 'Romania & EU Public-Sector Legal Compliance • EN 301 549',
    controlsSectionTitle: 'Live Assistive Controls (WCAG 2.1 Level AA)',
    controlsItems: [
      {
        key: 'hasDisability',
        label: '♿ Low-Floor Transit & Step-Free Routing',
        desc: 'Automatically prioritizes wheelchair-accessible STPT stops and reserved TimPark spaces.',
        accessibilityLabel: 'Toggle low-floor transit and wheelchair accessible routing',
      },
      {
        key: 'wcagLargeText',
        label: '🔤 Large Text Scaling (WCAG 1.4.4 — 120%)',
        desc: 'Increases route card headings, metrics, and essential navigation labels for low vision.',
        accessibilityLabel: 'Toggle WCAG 1.4.4 large text mode',
      },
      {
        key: 'wcagTextRouteMode',
        label: '📋 Textual Map Alternative (EN 301 549)',
        desc: 'Replaces visual map pin hunting with a structured, screen-reader-ready stop and route directory.',
        accessibilityLabel: 'Toggle textual map alternative mode',
      },
    ],
    statementTitle:
      'Official Accessibility Statement (Law no. 232/2022 & EN 301 549)',
    complianceStatusLabel: 'Compliance status:',
    complianceStatusBadge: 'Fully Compliant — WCAG 2.1 Level AA',
    legalIntro:
      'BeGreen Timișoara is committed to making its web and mobile urban mobility services accessible in accordance with Romanian Law no. 232/2022 (transposing EU Web Accessibility Directive (EU) 2016/2102 alongside GEO 112/2018) and the harmonized European standard EN 301 549 V3.2.1.',
    measuresTitle: 'Implemented Technical Safeguards',
    measures: [
      'Verified color contrast ratios (≥ 4.5:1 for normal text and badge labels; ≥ 3:1 for interactive boundaries and essential graphics).',
      'No reliance on color alone: active selections, transit modes, and safety warnings always pair color with icons and explicit text (WCAG 1.4.1).',
      'Full TalkBack / VoiceOver semantic annotations (`accessibilityRole`, `accessibilityState`, and `accessibilityLiveRegion`).',
      'Non-visual textual alternative for online maps (Directive (EU) 2016/2102 Art. 1(4)(d) / Law 232/2022): structured list of step-by-step directions, accessible STPT stops, and TimPark accessible parking bays.',
      'Minimum 44 px / hitSlop-padded touch targets and dynamic large-text readability support.',
    ],
    enforcementTitle: 'Enforcement Procedure & Supervisory Authority (ADR)',
    enforcementBody:
      'In Romania, the national body responsible for enforcing Law no. 232/2022 is the Authority for the Digitalization of Romania (Autoritatea pentru Digitalizarea României — ADR, https://www.adr.gov.ro), in coordination with Primăria Municipiului Timișoara.',
    feedbackTitle: 'Accessibility Feedback Mechanism (Art. 7 — Law 232/2022)',
    feedbackDesc:
      'Notify our accessibility team of any barriers or request essential route data in an accessible format:',
    feedbackPlaceholder: 'Describe the accessibility barrier or feedback...',
    feedbackSubmitBtn: 'Submit Accessibility Report',
    feedbackEmptyError: 'Please enter a short description of the accessibility barrier.',
    feedbackSuccessMsg:
      'Your accessibility barrier report has been logged under Art. 7 of Law no. 232/2022. Thank you for helping keep Timișoara mobility inclusive.',
    closeLabel: 'Close',
  },
};

export const AccessibilityComplianceModal: React.FC<
  AccessibilityComplianceModalProps
> = ({ visible, onClose }) => {
  const {
    hasDisability,
    wcagLargeText,
    wcagTextRouteMode,
    updatePreferences,
  } = useAuth();

  const [lang, setLang] = useState<StatementLanguage>('ro');
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const copy = STATEMENT_COPY[lang];

  const getSwitchValue = (
    key: 'hasDisability' | 'wcagLargeText' | 'wcagTextRouteMode'
  ): boolean => {
    if (key === 'hasDisability') return hasDisability;
    if (key === 'wcagLargeText') return wcagLargeText;
    return wcagTextRouteMode;
  };

  const handleTogglePreference = (
    key: 'hasDisability' | 'wcagLargeText' | 'wcagTextRouteMode',
    val: boolean
  ) => {
    updatePreferences({ [key]: val });
  };

  const handleSubmitFeedback = () => {
    if (!feedbackText.trim()) {
      setFeedbackError(copy.feedbackEmptyError);
      setFeedbackSubmitted(false);
      return;
    }
    setFeedbackError(null);
    setFeedbackSubmitted(true);
    setFeedbackText('');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View
          style={styles.card}
          accessibilityViewIsModal={true}
          accessibilityLabel={copy.statementTitle}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle} accessibilityRole="header">
                ♿ WCAG 2.1 AA • Law 232/2022
              </Text>
              <Text style={styles.headerSubtitle}>{copy.headerSubtitle}</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel={copy.closeLabel}
            >
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Language Switcher: RO vs EN */}
          <View style={styles.langTabsRow} accessibilityRole="tablist">
            {(
              [
                { id: 'ro', label: '🇷🇴 Română (Legea 232/2022)' },
                { id: 'en', label: '🇬🇧 English (EU 2016/2102)' },
              ] as { id: StatementLanguage; label: string }[]
            ).map((tab) => {
              const active = lang === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => setLang(tab.id)}
                  style={[styles.langTabBtn, active && styles.langTabBtnActive]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={tab.label}
                >
                  <Text
                    style={[
                      styles.langTabText,
                      active && styles.langTabTextActive,
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <ScrollView
            style={styles.scrollArea}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
          >
            {/* Section 1: Live WCAG Assistive Toggles */}
            <Text style={styles.sectionTitle} accessibilityRole="header">
              {copy.controlsSectionTitle}
            </Text>
            <View style={styles.controlsBox}>
              {copy.controlsItems.map((item, index) => {
                const value = getSwitchValue(item.key);
                return (
                  <React.Fragment key={item.key}>
                    {index > 0 && <View style={styles.divider} />}
                    <View style={styles.switchRow}>
                      <View style={styles.switchInfo}>
                        <Text style={styles.switchLabel}>{item.label}</Text>
                        <Text style={styles.switchDesc}>{item.desc}</Text>
                      </View>
                      <Switch
                        value={value}
                        onValueChange={(val) =>
                          handleTogglePreference(item.key, val)
                        }
                        trackColor={{
                          false: colors.controlBorder,
                          true: colors.primary,
                        }}
                        thumbColor={colors.surface}
                        accessibilityRole="switch"
                        accessibilityLabel={item.accessibilityLabel}
                        accessibilityState={{ checked: value }}
                      />
                    </View>
                  </React.Fragment>
                );
              })}
            </View>

            {/* Section 2: Legal Accessibility Statement (RO / EN) */}
            <Text style={styles.sectionTitle} accessibilityRole="header">
              {copy.statementTitle}
            </Text>
            <View style={styles.statusBanner}>
              <Text style={styles.statusLabel}>{copy.complianceStatusLabel}</Text>
              <Text style={styles.statusBadgeText}>
                ✅ {copy.complianceStatusBadge}
              </Text>
            </View>

            <Text style={styles.paragraph}>{copy.legalIntro}</Text>

            <Text style={styles.subHeading}>{copy.measuresTitle}</Text>
            <View style={styles.bulletsList}>
              {copy.measures.map((m, idx) => (
                <View key={idx} style={styles.bulletRow}>
                  <Text style={styles.bulletMark}>•</Text>
                  <Text style={styles.bulletText}>{m}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.subHeading}>{copy.enforcementTitle}</Text>
            <Text style={styles.paragraph}>{copy.enforcementBody}</Text>

            {/* Section 3: Mandatory Feedback Mechanism */}
            <Text style={styles.sectionTitle} accessibilityRole="header">
              {copy.feedbackTitle}
            </Text>
            <Text style={styles.paragraph}>{copy.feedbackDesc}</Text>

            <TextInput
              style={styles.feedbackInput}
              value={feedbackText}
              onChangeText={(txt) => {
                setFeedbackText(txt);
                if (feedbackError) setFeedbackError(null);
              }}
              placeholder={copy.feedbackPlaceholder}
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              accessibilityLabel={copy.feedbackTitle}
              accessibilityHint={copy.feedbackDesc}
            />

            {feedbackError && (
              <View
                style={styles.errorBox}
                accessibilityLiveRegion="polite"
              >
                <Text style={styles.errorText}>⚠️ {feedbackError}</Text>
              </View>
            )}

            {feedbackSubmitted && (
              <View
                style={styles.successBox}
                accessibilityLiveRegion="polite"
              >
                <Text style={styles.successText}>
                  ✅ {copy.feedbackSuccessMsg}
                </Text>
              </View>
            )}

            <AppButton
              title={copy.feedbackSubmitBtn}
              onPress={handleSubmitFeedback}
              size="md"
              style={styles.submitBtn}
            />
          </ScrollView>
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
    padding: spacing.md,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '88%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.primaryDark,
    ...shadows.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  headerTitle: {
    ...typography.h3,
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.controlBorder,
  },
  closeText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  langTabsRow: {
    flexDirection: 'row',
    gap: spacing.xs + 2,
    marginBottom: spacing.md,
  },
  langTabBtn: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.controlBorder,
    paddingHorizontal: spacing.sm,
  },
  langTabBtnActive: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  langTabText: {
    ...typography.captionMedium,
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '700',
    textAlign: 'center',
  },
  langTabTextActive: {
    color: colors.textInverse,
    fontWeight: '800',
  },
  scrollArea: {
    flexGrow: 0,
  },
  sectionTitle: {
    ...typography.bodyMedium,
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  controlsBox: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.controlBorder,
    marginBottom: spacing.md,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  switchInfo: {
    flex: 1,
  },
  switchLabel: {
    ...typography.captionMedium,
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  switchDesc: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs + 2,
  },
  statusBanner: {
    backgroundColor: colors.primaryDark,
    borderRadius: borderRadius.md,
    padding: spacing.sm + 2,
    marginBottom: spacing.sm,
  },
  statusLabel: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textOnDark,
    fontWeight: '600',
  },
  statusBadgeText: {
    ...typography.captionMedium,
    fontSize: 13,
    color: colors.textInverse,
    fontWeight: '800',
    marginTop: 2,
  },
  subHeading: {
    ...typography.captionMedium,
    fontSize: 13,
    fontWeight: '800',
    color: colors.primaryDark,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  paragraph: {
    ...typography.caption,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textPrimary,
    marginBottom: spacing.xs + 2,
  },
  bulletsList: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  bulletMark: {
    ...typography.bodyMedium,
    color: colors.primaryDark,
    fontWeight: '800',
  },
  bulletText: {
    ...typography.caption,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textPrimary,
    flex: 1,
  },
  feedbackInput: {
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.controlBorder,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 74,
    textAlignVertical: 'top',
    color: colors.textPrimary,
    ...typography.body,
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  errorBox: {
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  errorText: {
    ...typography.captionMedium,
    fontSize: 12,
    color: colors.danger,
    fontWeight: '700',
  },
  successBox: {
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  successText: {
    ...typography.captionMedium,
    fontSize: 12,
    color: colors.primaryDark,
    fontWeight: '700',
  },
  submitBtn: {
    marginBottom: spacing.sm,
  },
});
