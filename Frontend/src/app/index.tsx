import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { colors } from '../theme/colors';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Authenticated startup opens Home; the Map keeps its existing route.
  if (isAuthenticated) {
    return <Redirect href="/(tabs)/home" />;
  }

  // Otherwise direct to login screen
  return <Redirect href="/(auth)/login" />;
}
