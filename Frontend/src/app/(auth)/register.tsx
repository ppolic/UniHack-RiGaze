import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/authService';
import { ApiHttpError } from '../../services/api';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { AppInput } from '../../components/common/AppInput';
import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { getTranslations, useTranslation } from '../../hooks/useTranslation';

type FormErrors = { fullName?: string; email?: string; password?: string; birthDate?: string; server?: string };

function getBirthDateError(value: string, now = new Date()): string | undefined {
  const tr = getTranslations();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return tr.regDateFormatError;
  const [year, month, day] = value.split('-').map(Number);
  // Round-trip the calendar fields to reject normalization such as February 30.
  // setFullYear also avoids the Date constructor's special handling of years 0–99.
  const date = new Date(0);
  date.setHours(0, 0, 0, 0);
  date.setFullYear(year, month - 1, day);
  if (year < 1 || date.getFullYear() !== year || date.getMonth() + 1 !== month || date.getDate() !== day) {
    return tr.regDateInvalidError;
  }
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (date > today) return tr.regDateFutureError;
  return undefined;
}

export default function RegisterScreen() {
  const router = useRouter();
  const { language, t } = useTranslation();
  const localize = (ro: string, en: string) => language === 'en' ? en : ro;
  const { setUser, setToken } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [birthDate, setBirthDate] = useState('2004-06-15');
  const [hasDisability, setHasDisability] = useState(false);
  const [hasOwnBicycle, setHasOwnBicycle] = useState(true);
  const [hasOwnCar, setHasOwnCar] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (loading) return;
    const today = new Date();
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const trimmedBirthDate = birthDate.trim();
    const nextErrors: FormErrors = {
      fullName: trimmedName ? undefined : t.regNameError,
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)
        ? undefined : t.regEmailError,
      password: trimmedPassword.length >= 8
        ? undefined : localize('Parola trebuie să aibă cel puțin 8 caractere.', 'Password must contain at least 8 characters.'),
      birthDate: getBirthDateError(trimmedBirthDate, today),
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    Keyboard.dismiss();
    setLoading(true);
    try {
      const res = await authService.register({
        email: trimmedEmail,
        password: trimmedPassword,
        fullName: trimmedName,
        birthDate: trimmedBirthDate,
        hasDisability,
        hasOwnBicycle,
        hasOwnScooter: false,
        hasOwnCar,
      });
      setToken(res.token);
      setUser(res.user);
      router.replace('/(tabs)/home');
    } catch (err: any) {
      if (err instanceof ApiHttpError) {
        setErrors({ server: err.message || localize('Înregistrarea a eșuat.', 'Registration failed.') });
      } else {
        setErrors({ server: localize('Nu am putut contacta serverul sau confirma înregistrarea. Verifică conexiunea și încearcă din nou.', 'Could not connect to the server or confirm registration. Check your connection and try again.') });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <View style={styles.header}>
        <Text style={styles.title}>{localize('Creează un cont', 'Create an account')}</Text>
        <Text style={styles.subtitle}>
          {localize('Creează un cont BeGreen pentru călătorii, economii de CO₂ și eco-puncte. Înregistrarea este confirmată de server.', 'Create a BeGreen account for trips, CO₂ savings and eco-points. Registration is confirmed by the server.')}
        </Text>
      </View>

      <AppCard style={styles.formCard}>
        {Object.values(errors).some(Boolean) && (
          <Text style={styles.errorSummary} accessibilityRole="alert" accessibilityLiveRegion="assertive">
            {Object.values(errors).filter(Boolean).join(' ')}
          </Text>
        )}
        <AppInput
          label={t.regFullNameLabel}
          accessibilityLabel={t.regFullNameLabel}
          accessibilityHint={errors.fullName}
          error={errors.fullName}
          value={fullName}
          onChangeText={(value) => {
            setFullName(value);
            setErrors((previous) => ({ ...previous, fullName: undefined, server: undefined }));
          }}
          placeholder={t.regFullNamePlaceholder}
          autoCapitalize="words"
          autoComplete="name"
          returnKeyType="next"
        />
        <AppInput
          label={t.regEmailLabel}
          accessibilityLabel={t.regEmailLabel}
          accessibilityHint={errors.email}
          error={errors.email}
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            setErrors((previous) => ({ ...previous, email: undefined, server: undefined }));
          }}
          placeholder={t.emailPlaceholder}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          returnKeyType="next"
        />
        <AppInput
          label={localize('Parolă (minim 8 caractere)', 'Password (at least 8 characters)')}
          accessibilityLabel={t.passwordLabel}
          accessibilityHint={errors.password}
          error={errors.password}
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            setErrors((previous) => ({ ...previous, password: undefined, server: undefined }));
          }}
          placeholder={localize('Cel puțin 8 caractere', 'At least 8 characters')}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
        />
        <AppInput
          label={t.regBirthDateLabel}
          accessibilityLabel={t.regBirthDateLabel}
          accessibilityHint={errors.birthDate}
          error={errors.birthDate}
          value={birthDate}
          onChangeText={(value) => {
            setBirthDate(value);
            setErrors((previous) => ({ ...previous, birthDate: undefined, server: undefined }));
          }}
          placeholder="2004-06-15"
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="done"
          onSubmitEditing={handleRegister}
        />

        <Text style={styles.sectionHeader}>{t.regSectionAccessibility}</Text>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleText}>{t.disabilityLabel}</Text>
          <Switch
            accessibilityLabel={t.disabilityLabel}
            value={hasDisability}
            onValueChange={setHasDisability}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleText}>{t.ownBikeLabel}</Text>
          <Switch
            accessibilityLabel={t.ownBikeLabel}
            value={hasOwnBicycle}
            onValueChange={setHasOwnBicycle}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleText}>{t.ownCarLabel}</Text>
          <Switch
            accessibilityLabel={t.ownCarLabel}
            value={hasOwnCar}
            onValueChange={setHasOwnCar}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>

        <AppButton
          title={localize('Creează cont', 'Create account')}
          loading={loading}
          onPress={handleRegister}
          style={styles.submitBtn}
        />

        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.switchAuth}
        >
          <Text style={styles.switchAuthText}>
            <Text style={styles.linkText}>{localize('Înapoi la autentificare', 'Back to sign in')}</Text>
          </Text>
        </TouchableOpacity>
      </AppCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  header: {
    marginVertical: spacing.xl,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },
  formCard: {
    padding: spacing.xl,
  },
  errorSummary: {
    ...typography.body,
    color: colors.danger,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceMuted,
  },
  toggleText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  submitBtn: {
    marginTop: spacing.xl,
  },
  switchAuth: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  switchAuthText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  linkText: {
    color: colors.primary,
    fontWeight: '700',
  },
});
