import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { AppInput } from '../../components/common/AppInput';
import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { useTranslation } from '../../hooks/useTranslation';

export default function LoginScreen() {
  const router = useRouter();
  const { loginAsDemoUser } = useAuth();
  const { language, toggleLanguage, t } = useTranslation();
  const [email, setEmail] = useState('student@ecomutare.tm');
  const [password, setPassword] = useState('password123');

  const handleLogin = () => {
    loginAsDemoUser('student');
    router.replace('/(tabs)');
  };

  const handleDemoAccessibilityLogin = () => {
    loginAsDemoUser('accessibility');
    router.replace('/(tabs)');
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
              ? 'Schimbă limba în engleză'
              : 'Switch language to Romanian'
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
        <Text style={styles.formTitle}>{t.loginFormTitle}</Text>
        <Text style={styles.demoNotice}>{t.loginNotice}</Text>
        <AppInput
          label={t.emailAddressLabel}
          accessibilityLabel={t.emailAddressLabel}
          value={email}
          onChangeText={setEmail}
          placeholder={t.emailPlaceholder}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          returnKeyType="done"
          onSubmitEditing={handleLogin}
        />
        <AppInput
          label={t.passwordLabel}
          accessibilityLabel={t.passwordLabel}
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          secureTextEntry
          autoComplete="off"
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="done"
          onSubmitEditing={handleLogin}
        />

        <AppButton
          title={t.openStudentDemoBtn}
          onPress={handleLogin}
          style={styles.submitBtn}
        />

        <TouchableOpacity
          onPress={() => router.push('/(auth)/register')}
          style={styles.switchAuth}
        >
          <Text style={styles.switchAuthText}>
            {t.wantCustomDemo}
            <Text style={styles.linkText}>{t.createDemoProfileLink}</Text>
          </Text>
        </TouchableOpacity>
      </AppCard>

      {/* Hackathon Quick Demo Presets */}
      <View style={styles.demoBox}>
        <Text style={styles.demoTitle}>{t.quickDemoTitle}</Text>
        <View style={styles.demoButtonsRow}>
          <AppButton
            title={t.quickDemoStudent}
            variant="outline"
            size="sm"
            onPress={handleLogin}
            style={styles.demoBtn}
          />
          <AppButton
            title={t.quickDemoAccess}
            variant="outline"
            size="sm"
            onPress={handleDemoAccessibilityLogin}
            style={styles.demoBtn}
          />
        </View>
      </View>
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
  demoBox: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  demoTitle: {
    ...typography.captionMedium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  demoButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  demoBtn: {
    flex: 1,
    backgroundColor: colors.surface,
  },
});
