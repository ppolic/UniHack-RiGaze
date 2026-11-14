import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/authService';
import { ApiHttpError } from '../../services/api';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { AppInput } from '../../components/common/AppInput';
import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { useTranslation } from '../../hooks/useTranslation';

export default function LoginScreen() {
  const router = useRouter();
  const { language, toggleLanguage, t } = useTranslation();
  const { setUser, setToken } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (loading) return;
    setErrorMsg(null);
    setLoading(true);
    try {
      const res = await authService.login({ email, password });
      setToken(res.token);
      setUser(res.user);
      router.replace('/(tabs)/home');
    } catch (err: any) {
      if (err instanceof ApiHttpError) {
        setErrorMsg(err.message || t.loginFailed);
      } else {
        setErrorMsg(t.loginServerError);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoBypass = () => {
    setToken('demo-bypass-token');
    setUser({
      id: 'demo-user-1',
      email: 'demo@begreen.tm',
      fullName: 'Demo User',
      birthDate: '2000-01-01',
      age: 26,
      preferences: {
        hasDisability: false,
        hasOwnBicycle: true,
        hasOwnScooter: false,
        hasOwnCar: false,
        preferredModes: ['Walk', 'Bike', 'Bus', 'Tram'],
      },
      totalEcoPoints: 340,
      totalCo2SavedKg: 18.4,
      completedTripsCount: 12,
    });
    router.replace('/(tabs)/home');
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <View style={styles.langRow}>
        <TouchableOpacity
          style={styles.langToggleBtn}
          onPress={toggleLanguage}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={
            language === 'ro'
              ? t.switchToEnA11y
              : t.switchToRoA11y
          }
        >
          <Text style={styles.langToggleText}>
            {language === 'ro' ? '🇷🇴 Română (Schimbă în EN)' : '🇬🇧 English (Switch to RO)'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.header}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoText}>🌱</Text>
        </View>
        <Text style={styles.appTitle}>BeGreen</Text>
        <Text style={styles.tagline}>
          {t.loginTagline}
        </Text>
      </View>

      <AppCard style={styles.formCard}>
        <Text style={styles.formTitle}>{t.loginTitle}</Text>
        <Text style={styles.demoNotice}>
          {t.loginSubtitle}
        </Text>
        {errorMsg && (
          <Text style={styles.errorText} accessibilityRole="alert" accessibilityLiveRegion="assertive">
            {errorMsg}
          </Text>
        )}
        <AppInput
          label={t.emailAddressLabel}
          accessibilityLabel={t.emailAddressLabel}
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            setErrorMsg(null);
          }}
          placeholder={t.emailPlaceholder}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          returnKeyType="next"
        />
        <AppInput
          label={t.passwordLabel}
          accessibilityLabel={t.passwordLabel}
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            setErrorMsg(null);
          }}
          placeholder="••••••••"
          secureTextEntry
          autoComplete="password"
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="done"
          onSubmitEditing={handleLogin}
        />

        <AppButton
          title={t.loginButton}
          loading={loading}
          onPress={handleLogin}
          style={styles.submitBtn}
        />

        <AppButton
          title={t.demoBypassButton}
          onPress={handleDemoBypass}
          variant="outline"
          style={{ marginTop: spacing.sm }}
        />

        <TouchableOpacity
          onPress={() => router.push('/(auth)/register')}
          style={styles.switchAuth}
        >
          <Text style={styles.switchAuthText}>
            {t.noAccountPrompt}<Text style={styles.linkText}>{t.createAccountLink}</Text>
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
    justifyContent: 'center',
  },
  langRow: {
    alignItems: 'flex-end',
    marginBottom: spacing.sm,
  },
  langToggleBtn: {
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  langToggleText: {
    ...typography.captionMedium,
    color: colors.primaryDark,
    fontWeight: '700',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  logoText: {
    fontSize: 32,
  },
  appTitle: {
    ...typography.h1,
    color: colors.primaryDark,
  },
  tagline: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  formCard: {
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  formTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  submitBtn: {
    marginTop: spacing.sm,
  },
  demoNotice: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
    fontWeight: '600',
    marginBottom: spacing.md,
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
