import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth0 } from '@auth0/auth0-react';
import { useAuth } from '../hooks/useAuth';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';

export default function AuthCallbackScreen() {
  const { isLoading: isAuth0Loading } = useAuth0();
  const { isLoading, isAuthenticated } = useAuth();

  const loading = isAuth0Loading || isLoading;
  const authenticated = isAuthenticated;

  if (!loading) {
    return <Redirect href={authenticated ? '/(tabs)' : '/(auth)/login'} />;
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.label}>Completing secure Auth0 sign in...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  label: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
});
