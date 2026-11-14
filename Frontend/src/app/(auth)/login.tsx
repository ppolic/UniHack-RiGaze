import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth0 } from '@auth0/auth0-react';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { useTranslation } from '../../hooks/useTranslation';

export default function LoginScreen() {
  const router = useRouter();
  const { language, toggleLanguage, t } = useTranslation();
  const localize = (ro: string, en: string) => (language === 'en' ? en : ro);

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
            'Autentifică-te sau creează un cont folosind Auth0.',
            'Sign in or create an account with Auth0.'
          )}
        </Text>

        {error && (
          <Text style={styles.errorText} accessibilityRole="alert">
            Error: {error.message}
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
  },
  auth0Btn: {
    minHeight: 46,
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
  linkText: {
    color: colors.primary,
    fontWeight: '700',
  },
});
