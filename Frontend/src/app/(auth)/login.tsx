import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth0 } from '@auth0/auth0-react';
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
  const localize = (ro: string, en: string) => (language === 'en' ? en : ro);
  const { setUser, setToken } = useAuth();

  const {
    isLoading,
    isAuthenticated,
    error,
    loginWithRedirect: login,
    logout: auth0Logout,
    user,
  } = useAuth0();

  const signup = () =>
    login({ authorizationParams: { screen_hint: 'signup' } });

  const logout = () =>
    auth0Logout({
      logoutParams: {
        returnTo: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5279',
      },
    });

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
        setErrorMsg(
          err.message || localize('Email sau parolă incorectă.', 'Incorrect email or password.')
        );
      } else {
        setErrorMsg(
          localize(
            'Nu am putut contacta serverul sau confirma autentificarea. Verifică conexiunea și încearcă din nou.',
            'Could not connect to the server or confirm sign-in. Check your connection and try again.'
          )
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoBypass = () => {
    setUser({
      id: 'demo-upt-student',
      email: 'student@student.upt.ro',
      fullName: 'Alex Popescu (UPT Student)',
      birthDate: '2003-05-14',
      age: 21,
      preferences: {
        hasDisability: false,
        hasOwnBicycle: true,
        hasOwnScooter: false,
        hasOwnCar: false,
        preferredModes: ['Bicycle', 'PublicTransit'],
        wcagLargeText: false,
        wcagTextRouteMode: false,
      },
      totalEcoPoints: 240,
      totalCo2SavedKg: 12.5,
      completedTripsCount: 18,
    });
    setToken('demo-jwt-token');
    router.replace('/(tabs)/home');
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (isAuthenticated && user) {
    return (
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>🌱</Text>
          </View>
          <Text style={styles.appTitle}>BeGreen</Text>
        </View>

        <AppCard style={styles.formCard}>
          <Text style={styles.demoNotice}>Logged in as {user.email}</Text>
          <Text style={styles.formTitle}>User Profile</Text>
          <Text style={styles.profilePre}>{JSON.stringify(user, null, 2)}</Text>
          <AppButton title="Logout" onPress={logout} style={styles.submitBtn} />
          <TouchableOpacity
            onPress={() => router.replace('/(tabs)/home')}
            style={styles.switchAuth}
          >
            <Text style={styles.linkText}>
              {localize('Continuă în aplicație', 'Continue to application')}
            </Text>
          </TouchableOpacity>
        </AppCard>
      </ScrollView>
    );
  }

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
        <Text style={styles.tagline}>{t.loginTagline}</Text>
      </View>

      <AppCard style={styles.formCard}>
        <Text style={styles.formTitle}>
          {localize('Autentificare în BeGreen', 'Sign in to BeGreen')}
        </Text>
        <Text style={styles.demoNotice}>
          {localize(
            'Autentifică-te direct cu Auth0 sau introdu emailul și parola.',
            'Authenticate directly with Auth0 or enter your email and password.'
          )}
        </Text>

        {error && (
          <Text style={styles.errorText} accessibilityRole="alert">
            Error: {error.message}
          </Text>
        )}

        {errorMsg && (
          <Text
            style={styles.errorText}
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
          >
            {errorMsg}
          </Text>
        )}

        <View style={styles.auth0Row}>
          <AppButton
            title="Signup"
            onPress={signup}
            style={styles.auth0Btn}
          />
          <AppButton
            title="Login"
            variant="outline"
            onPress={() => login()}
            style={styles.auth0Btn}
          />
        </View>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>
            {localize('sau cont local', 'or local account')}
          </Text>
          <View style={styles.dividerLine} />
        </View>

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
            {localize('Nu ai cont? ', 'No account? ')}
            <Text style={styles.linkText}>{localize('Creează un cont', 'Create an account')}</Text>
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
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
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
  auth0Row: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  auth0Btn: {
    minHeight: 46,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
    gap: spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  demoNotice: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  profilePre: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceMuted || '#F0F0F0',
    padding: spacing.md,
    borderRadius: borderRadius.md,
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
