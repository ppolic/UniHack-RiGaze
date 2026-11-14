import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '../hooks/useAuth';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  // Authenticated startup opens Home; the Map keeps its existing route.
  if (isAuthenticated) {
    return <Redirect href="/(tabs)/home" />;
  }

  // Otherwise direct to login screen
  return <Redirect href="/(auth)/login" />;
}
