import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { AppInput } from '../../components/common/AppInput';
import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';

export default function RegisterScreen() {
  const router = useRouter();
  const { setUser, setToken } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [birthDate, setBirthDate] = useState('2004-06-15');
  const [hasDisability, setHasDisability] = useState(false);
  const [hasOwnBicycle, setHasOwnBicycle] = useState(true);
  const [hasOwnCar, setHasOwnCar] = useState(false);

  const handleRegister = () => {
    setUser({
      id: `usr_${Date.now()}`,
      email: email || 'novi.korisnik@ecomutare.tm',
      fullName: fullName || 'Novi Građanin',
      birthDate,
      age: 22,
      preferences: {
        hasDisability,
        hasOwnBicycle,
        hasOwnScooter: false,
        hasOwnCar,
        preferredModes: hasDisability ? ['PublicTransit'] : ['Bicycle', 'PublicTransit'],
      },
      totalEcoPoints: 50, // Bonus dobrodošlice
      totalCo2SavedKg: 0,
      completedTripsCount: 0,
    });
    setToken('token-registered');
    router.replace('/(tabs)');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Novi Eco Profil</Text>
        <Text style={styles.subtitle}>
          Postavite profil kako bismo prilagodili zelene rute vašim potrebama.
        </Text>
      </View>

      <AppCard style={styles.formCard}>
        <AppInput
          label="Ime i prezime"
          value={fullName}
          onChangeText={setFullName}
          placeholder="npr. Ana Horvat"
        />
        <AppInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="korisnik@ecomutare.tm"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <AppInput
          label="Datum rođenja (YYYY-MM-DD)"
          value={birthDate}
          onChangeText={setBirthDate}
          placeholder="2004-06-15"
        />

        <Text style={styles.sectionHeader}>Pristupačnost i Vlastita Vozila</Text>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleText}>Osoba s invaliditetom (kolica)</Text>
          <Switch
            value={hasDisability}
            onValueChange={setHasDisability}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleText}>Posjedujem vlastiti bicikl</Text>
          <Switch
            value={hasOwnBicycle}
            onValueChange={setHasOwnBicycle}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleText}>Posjedujem automobil</Text>
          <Switch
            value={hasOwnCar}
            onValueChange={setHasOwnCar}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>

        <AppButton
          title="Dovrši registraciju (+50 eko-bodova)"
          onPress={handleRegister}
          style={styles.submitBtn}
        />

        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.switchAuth}
        >
          <Text style={styles.switchAuthText}>
            Već imate profil? <Text style={styles.linkText}>Prijavite se</Text>
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
