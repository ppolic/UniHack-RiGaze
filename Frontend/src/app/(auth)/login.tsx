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

export default function LoginScreen() {
  const router = useRouter();
  const { loginAsDemoUser } = useAuth();
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
      <View style={styles.header}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoText}>🌱</Text>
        </View>
        <Text style={styles.appTitle}>EcoMutare</Text>
        <Text style={styles.tagline}>
          Getting from A to B shouldn't cost the planet.
        </Text>
      </View>

      <AppCard style={styles.formCard}>
        <Text style={styles.formTitle}>DEMO MODE — Demo pristup</Text>
        <Text style={styles.demoNotice}>
          Email i lozinka služe samo za prikaz obrasca i ne provjeravaju se na serveru.
          Ne unosite stvarne lozinke. Nastavak otvara studentski demo profil, bez
          autentifikacije stvarnog računa.
        </Text>
        <AppInput
          label="Email adresa"
          accessibilityLabel="Email adresa — demo, ne provjerava se"
          value={email}
          onChangeText={setEmail}
          placeholder="unesite email"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          returnKeyType="done"
          onSubmitEditing={handleLogin}
        />
        <AppInput
          label="Lozinka"
          accessibilityLabel="Lozinka — samo demo, ne unosite stvarnu lozinku"
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
          title="Otvori studentski demo"
          onPress={handleLogin}
          style={styles.submitBtn}
        />

        <TouchableOpacity
          onPress={() => router.push('/(auth)/register')}
          style={styles.switchAuth}
        >
          <Text style={styles.switchAuthText}>
            Želite vlastiti demo profil? <Text style={styles.linkText}>Izradite demo profil</Text>
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
            onPress={handleLogin}
            style={styles.demoBtn}
          />
          <AppButton
            title="♿ Pristupačnost (Kolica)"
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
