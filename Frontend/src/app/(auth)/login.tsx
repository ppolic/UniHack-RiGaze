import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/authService';
import { ApiHttpError } from '../../services/api';
import { DemoUserRole } from '../../store/userStore';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { AppInput } from '../../components/common/AppInput';
import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';

export default function LoginScreen() {
  const router = useRouter();
  const { loginAsDemoUser, setUser, setToken } = useAuth();
  const [email, setEmail] = useState('ana.student@upt.ro');
  const [password, setPassword] = useState('Demo123!');
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
      router.replace('/(tabs)');
    } catch (err: any) {
      if (err instanceof ApiHttpError) {
        setErrorMsg(err.message || 'Pogrešan email ili lozinka.');
      } else {
        await loginAsDemoUser('student');
        router.replace('/(tabs)');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (role: DemoUserRole) => {
    if (loading) return;
    setErrorMsg(null);
    setLoading(true);
    try {
      await loginAsDemoUser(role);
      router.replace('/(tabs)');
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
        <View style={styles.logoBadge}>
          <Text style={styles.logoText}>🌱</Text>
        </View>
        <Text style={styles.appTitle}>BeGreen</Text>
        <Text style={styles.tagline}>
          Getting from A to B shouldn't cost the planet.
        </Text>
      </View>

      <AppCard style={styles.formCard}>
        <Text style={styles.formTitle}>Prijava u BeGreen</Text>
        <Text style={styles.demoNotice}>
          Prijavite se putem EcoMutare računa (npr. ana.student@upt.ro / Demo123!) ili
          odaberite jedan od brzih demo profila ispod.
        </Text>
        {errorMsg && (
          <Text style={styles.errorText} accessibilityRole="alert" accessibilityLiveRegion="assertive">
            {errorMsg}
          </Text>
        )}
        <AppInput
          label="Email adresa"
          accessibilityLabel="Email adresa"
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            setErrorMsg(null);
          }}
          placeholder="ana.student@upt.ro"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          returnKeyType="next"
        />
        <AppInput
          label="Lozinka"
          accessibilityLabel="Lozinka"
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
          title="Prijavi se"
          loading={loading}
          onPress={handleLogin}
          style={styles.submitBtn}
        />

        <TouchableOpacity
          onPress={() => router.push('/(auth)/register')}
          style={styles.switchAuth}
        >
          <Text style={styles.switchAuthText}>
            Nemate račun? <Text style={styles.linkText}>Registrirajte se</Text>
          </Text>
        </TouchableOpacity>
      </AppCard>

      {/* Hackathon Quick Demo Presets */}
      <View style={styles.demoBox}>
        <Text style={styles.demoTitle}>⚡ Brzi Demo Pristup (za žiri i testiranje):</Text>
        <View style={styles.demoButtonsRow}>
          <AppButton
            title="👤 Student (Bicikl/JPP)"
            variant="outline"
            size="sm"
            disabled={loading}
            onPress={() => handleQuickDemo('student')}
            style={styles.demoBtn}
          />
          <AppButton
            title="♿ Pristupačnost (Kolica)"
            variant="outline"
            size="sm"
            disabled={loading}
            onPress={() => handleQuickDemo('accessibility')}
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
