import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Auth0Provider } from '@auth0/auth0-react';
import { colors } from '../theme/colors';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from '../hooks/useTranslation';

function AppNavigation() {
  const { isAuthenticated, user } = useAuth();
  const { language, t } = useTranslation();

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Protected guard={isAuthenticated && !!user}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="challenges"
            options={{
              headerShown: true,
              title: language === 'en' ? 'Challenges' : 'Provocări',
              headerTintColor: colors.primaryDark,
              headerStyle: { backgroundColor: colors.surface },
            }}
          />
          <Stack.Screen
            name="report-issue"
            options={{
              headerShown: true,
              title: language === 'en' ? 'Report an issue' : 'Raportează o problemă',
              headerTintColor: colors.primaryDark,
              headerStyle: { backgroundColor: colors.surface },
            }}
          />
          <Stack.Screen
            name="dashboard"
            options={{
              headerShown: true,
              title: t.dashboardHeaderTitle,
              headerBackTitle: t.backLabel,
              headerStyle: { backgroundColor: colors.surface },
              headerTintColor: colors.primaryDark,
              headerTitleStyle: {
                color: colors.textPrimary,
                fontWeight: '700',
              },
            }}
          />
        </Stack.Protected>
      </Stack>
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  const domain = 'dev-m0hdd241fan6xxnl.eu.auth0.com';
  const clientId = 'idErTj8DzFTs4nrYMVoHovjVZZiHNXEX';
  const redirectUri =
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5279';

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: redirectUri,
      }}
    >
      <AppNavigation />
    </Auth0Provider>
  );
}
