import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { getTranslations, useTranslation } from '../../hooks/useTranslation';
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

export function FavoritesList() {
  const { user, token } = useAuth();
  const { t } = useTranslation();
  const [state, setState] = useState<FavoritesState>({ status: 'loading' });
  const [version, setVersion] = useState(0);
  const loading = useRef(false);

  const modes: Record<string, string> = {
    Walk: t.modeWalk,
    Bike: t.modeBike,
    Scooter: t.modeScooter,
    PublicTransport: t.modePublicTransport,
    Car: t.modeCar,
    Carpool: t.modeCarpool,
    Combined: t.modeCombined,
  };

  useFocusEffect(useCallback(() => {
    let active = true;
    loading.current = true;
    setState({ status: 'loading' });
    void favoritesService.getFavorites().then((routes) => {
      if (active) setState({ status: 'success', routes });
    }).catch((error: unknown) => {
      if (active) setState({ status: 'error', message: fe2ErrorMessage(error, getTranslations().favoritesLoadError) });
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
        <Text style={styles.title} accessibilityRole="header">{t.favoritesNoticeTitle}</Text>
        <Text style={styles.description}>
          {t.favoritesNoticeBody1}
        </Text>
        <Text style={styles.description}>
          {t.favoritesNoticeBody2}
        </Text>
        <AppButton title={t.favoritesAddDisabledBtn} disabled onPress={() => {}} textStyle={styles.buttonText} />
      </AppCard>
      <View style={styles.heading}>
        <Text style={styles.title} accessibilityRole="header">{t.favoritesAccountRoutesTitle}</Text>
        <AppButton title={t.reloadBtn} variant="outline" onPress={reload} disabled={state.status === 'loading'} />
      </View>
      {state.status === 'loading' && (
        <View style={styles.card} accessible accessibilityRole="progressbar" accessibilityLabel={t.favoritesLoadingA11y} accessibilityState={{ busy: true }}>
          <ActivityIndicator size="large" color={colors.primary} accessible={false} />
          <Text style={styles.description}>{t.favoritesLoading}</Text>
        </View>
      )}
      {state.status === 'error' && (
        <AppCard style={styles.card}>
          <Text style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="assertive">{state.message}</Text>
          <AppButton title={t.retry} onPress={reload} />
        </AppCard>
      )}
      {state.status === 'success' && state.routes.length === 0 && (
        <AppCard style={styles.card}>
          <Text style={styles.title}>{t.favoritesEmptyTitle}</Text>
          <Text style={styles.description}>{t.favoritesEmptyDesc}</Text>
        </AppCard>
      )}
      {state.status === 'success' && state.routes.map((route) => (
        <AppCard key={route.id} style={styles.card}>
          <Text style={styles.title} accessibilityRole="header">{route.name}</Text>
          <Text style={styles.description}>{route.originName} → {route.destinationName}</Text>
          <Text style={styles.detail}>{modes[route.preferredMode]}</Text>
          {route.requiresStepFreeAccess && <Text style={styles.description}>{t.favoritesStepFreePref}</Text>}
          <AppButton title={t.favoritesDeleteDisabledBtn} variant="outline" disabled onPress={() => {}} textStyle={styles.buttonText} />
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
