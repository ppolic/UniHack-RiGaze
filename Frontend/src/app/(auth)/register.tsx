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

type FormErrors = { fullName?: string; email?: string; password?: string; birthDate?: string; server?: string };

function calculateAge(birthDate: string, today: Date): number {
  const [year, month, day] = birthDate.split('-').map(Number);
  const birthdayPending = today.getMonth() + 1 < month ||
    (today.getMonth() + 1 === month && today.getDate() < day);
  // A February 29 birthday advances on March 1 in non-leap years.
  return today.getFullYear() - year - (birthdayPending ? 1 : 0);
}

function getBirthDateError(value: string, now = new Date()): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Unesite datum u obliku YYYY-MM-DD.';
  const [year, month, day] = value.split('-').map(Number);
  // Round-trip the calendar fields to reject normalization such as February 30.
  // setFullYear also avoids the Date constructor's special handling of years 0–99.
  const date = new Date(0);
  date.setHours(0, 0, 0, 0);
  date.setFullYear(year, month - 1, day);
  if (year < 1 || date.getFullYear() !== year || date.getMonth() + 1 !== month || date.getDate() !== day) {
    return 'Unesite stvarni kalendarski datum.';
  }
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (date > today) return 'Datum rođenja ne može biti u budućnosti.';
  return undefined;
}

export default function RegisterScreen() {
  const router = useRouter();
  const { setUser, setToken } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Demo123!');
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
      fullName: trimmedName ? undefined : 'Unesite ime i prezime.',
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)
        ? undefined : 'Unesite valjanu email adresu.',
      password: trimmedPassword.length >= 8
        ? undefined : 'Lozinka mora imati najmanje 8 znakova.',
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
      router.replace('/(tabs)');
    } catch (err: any) {
      if (err instanceof ApiHttpError) {
        setErrors({ server: err.message || 'Registracija nije uspjela.' });
      } else {
        setUser({
          id: `usr_${Date.now()}`,
          email: trimmedEmail,
          fullName: trimmedName,
          birthDate: trimmedBirthDate,
          age: calculateAge(trimmedBirthDate, today),
          preferences: {
            hasDisability,
            hasOwnBicycle,
            hasOwnScooter: false,
            hasOwnCar,
            preferredModes: hasDisability ? ['PublicTransit'] : ['Bicycle', 'PublicTransit'],
          },
          totalEcoPoints: 50,
          totalCo2SavedKg: 0,
          completedTripsCount: 0,
        });
        setToken('token-registered');
        router.replace('/(tabs)');
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
        <Text style={styles.title}>Registracija korisnika</Text>
        <Text style={styles.subtitle}>
          Izradite BeGreen račun na backendu za praćenje vožnji, CO₂ uštede i eko-bodova (+50 bodova dobrodošlice).
        </Text>
      </View>

      <AppCard style={styles.formCard}>
        {Object.values(errors).some(Boolean) && (
          <Text style={styles.errorSummary} accessibilityRole="alert" accessibilityLiveRegion="assertive">
            {Object.values(errors).filter(Boolean).join(' ')}
          </Text>
        )}
        <AppInput
          label="Ime i prezime"
          accessibilityLabel="Ime i prezime"
          accessibilityHint={errors.fullName}
          error={errors.fullName}
          value={fullName}
          onChangeText={(value) => {
            setFullName(value);
            setErrors((previous) => ({ ...previous, fullName: undefined, server: undefined }));
          }}
          placeholder="npr. Ana Horvat"
          autoCapitalize="words"
          autoComplete="name"
          returnKeyType="next"
        />
        <AppInput
          label="Email"
          accessibilityLabel="Email"
          accessibilityHint={errors.email}
          error={errors.email}
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            setErrors((previous) => ({ ...previous, email: undefined, server: undefined }));
          }}
          placeholder="korisnik@upt.ro"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          returnKeyType="next"
        />
        <AppInput
          label="Lozinka (min. 8 znakova)"
          accessibilityLabel="Lozinka"
          accessibilityHint={errors.password}
          error={errors.password}
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            setErrors((previous) => ({ ...previous, password: undefined, server: undefined }));
          }}
          placeholder="Minimalno 8 znakova"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
        />
        <AppInput
          label="Datum rođenja (YYYY-MM-DD)"
          accessibilityLabel="Datum rođenja, u obliku godina-mjesec-dan"
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

        <Text style={styles.sectionHeader}>Pristupačnost i Vlastita Vozila</Text>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleText}>Osoba s invaliditetom (kolica)</Text>
          <Switch
            accessibilityLabel="Osoba s invaliditetom, kolica"
            value={hasDisability}
            onValueChange={setHasDisability}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleText}>Posjedujem vlastiti bicikl</Text>
          <Switch
            accessibilityLabel="Posjedujem vlastiti bicikl"
            value={hasOwnBicycle}
            onValueChange={setHasOwnBicycle}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleText}>Posjedujem automobil</Text>
          <Switch
            accessibilityLabel="Posjedujem automobil"
            value={hasOwnCar}
            onValueChange={setHasOwnCar}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>

        <AppButton
          title="Registriraj se (+50 eko-bodova)"
          loading={loading}
          onPress={handleRegister}
          style={styles.submitBtn}
        />

        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.switchAuth}
        >
          <Text style={styles.switchAuthText}>
            <Text style={styles.linkText}>Natrag na prijavu</Text>
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
