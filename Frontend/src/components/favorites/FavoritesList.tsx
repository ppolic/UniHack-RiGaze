import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { favoritesService } from '../../services/favoritesService';
import { fe2ErrorMessage } from '../../services/fe2Session';
import { FavoriteRoute } from '../../types/favorites';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { AppCard } from '../common/AppCard';
import { AppButton } from '../common/AppButton';

type FavoritesState = { status: 'loading' } | { status: 'error'; message: string } |
  { status: 'success'; routes: FavoriteRoute[] };
const modes: Record<string, string> = {
  Walk: 'Pe jos', Bike: 'Bicicletă', Scooter: 'Trotinetă', PublicTransport: 'Transport public',
  Car: 'Mașină', Carpool: 'Mașină partajată', Combined: 'Transport combinat',
};

export function FavoritesList() {
  const { user, token } = useAuth();
  const [state, setState] = useState<FavoritesState>({ status: 'loading' });
  const [version, setVersion] = useState(0);
  const loading = useRef(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    loading.current = true;
    setState({ status: 'loading' });
    void favoritesService.getFavorites().then((routes) => {
      if (active) setState({ status: 'success', routes });
    }).catch((error: unknown) => {
      if (active) setState({ status: 'error', message: fe2ErrorMessage(error, 'Nu am putut încărca favoritele. Verifică conexiunea și încearcă din nou.') });
    }).finally(() => {
      if (active) loading.current = false;
    });
    return () => { active = false; };
  }, [version, user?.id, token]));

  const reload = () => {
    if (loading.current) return;
    loading.current = true;
    setState({ status: 'loading' });
    setVersion((current) => current + 1);
  };

  return (
    <View style={styles.list}>
      <AppCard style={styles.notice}>
        <Text style={styles.title} accessibilityRole="header">Favorite din serviciul EcoMutare</Text>
        <Text style={styles.description}>
          Sunt afișate doar rutele pe care serverul le asociază contului tău. Lista poate include exemple inițializate de server; proveniența și păstrarea după repornire nu sunt confirmate de API.
        </Text>
        <Text style={styles.description}>
          Adăugarea și ștergerea sunt indisponibile până când serverul confirmă salvarea durabilă și dreptul de modificare a rutelor.
        </Text>
        <AppButton title="Adăugare indisponibilă" disabled onPress={() => {}} textStyle={styles.buttonText} />
      </AppCard>
      <View style={styles.heading}>
        <Text style={styles.title} accessibilityRole="header">Rute asociate contului</Text>
        <AppButton title="Reîncarcă" variant="outline" onPress={reload} disabled={state.status === 'loading'} />
      </View>
      {state.status === 'loading' && (
        <View style={styles.card} accessible accessibilityRole="progressbar" accessibilityLabel="Se încarcă favoritele" accessibilityState={{ busy: true }}>
          <ActivityIndicator size="large" color={colors.primary} accessible={false} />
          <Text style={styles.description}>Se încarcă favoritele…</Text>
        </View>
      )}
      {state.status === 'error' && (
        <AppCard style={styles.card}>
          <Text style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="assertive">{state.message}</Text>
          <AppButton title="Încearcă din nou" onPress={reload} />
        </AppCard>
      )}
      {state.status === 'success' && state.routes.length === 0 && (
        <AppCard style={styles.card}>
          <Text style={styles.title}>Nicio rută asociată contului</Text>
          <Text style={styles.description}>Serverul nu a returnat rute favorite care aparțin acestui cont. Exemplele comune nu sunt incluse.</Text>
        </AppCard>
      )}
      {state.status === 'success' && state.routes.map((route) => (
        <AppCard key={route.id} style={styles.card}>
          <Text style={styles.title} accessibilityRole="header">{route.name}</Text>
          <Text style={styles.description}>{route.originName} → {route.destinationName}</Text>
          <Text style={styles.detail}>{modes[route.preferredMode]}</Text>
          {route.requiresStepFreeAccess && <Text style={styles.description}>Preferință salvată: acces fără trepte</Text>}
          <AppButton title="Ștergere indisponibilă" variant="outline" disabled onPress={() => {}} textStyle={styles.buttonText} />
        </AppCard>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.lg },
  notice: { gap: spacing.md, backgroundColor: colors.warningLight },
  card: { gap: spacing.lg },
  heading: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, alignItems: 'center', justifyContent: 'space-between' },
  title: { ...typography.h3, color: colors.textPrimary, flexShrink: 1 },
  description: { ...typography.body, color: colors.textSecondary },
  detail: { ...typography.bodyMedium, color: colors.textPrimary },
  error: { ...typography.body, color: colors.danger },
  buttonText: { flexShrink: 1, textAlign: 'center' },
});
