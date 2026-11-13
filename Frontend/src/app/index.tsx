import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '../hooks/useAuth';

export default function Index() {
  const { isAuthenticated } = useAuth();

  // If already authenticated, redirect straight to the Map tabs
  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  // Otherwise direct to login screen
  return <Redirect href="/(auth)/login" />;
}
