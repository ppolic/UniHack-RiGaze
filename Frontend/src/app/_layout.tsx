import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BackendSessionBridge } from '../components/auth/BackendSessionBridge';
import { ENV } from '../config/env';
import { Auth0Provider } from '@auth0/auth0-react';
import { colors } from '../theme/colors';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from '../hooks/useTranslation';
import { AuthenticatedHeader } from '../components/common/AuthenticatedHeader';

function AppNavigation() {
  const { isAuthenticated, user } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('high-contrast-dark');
      document.documentElement.removeAttribute('data-theme');
      if (document.body) document.body.classList.remove('high-contrast-dark');
      const override = document.getElementById('begreen-dark-theme-override');
      if (override) override.remove();
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem('begreen_high_contrast_dark');
    }
  }, []);

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
              header: ({ navigation }) => <AuthenticatedHeader onBack={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('(tabs)', { screen: 'home' })} />,
              title: t.challengesHeaderTitle,
              headerTintColor: colors.primaryDark,
              headerStyle: { backgroundColor: colors.surface },
            }}
          />
          <Stack.Screen
            name="report-issue"
            options={{
              headerShown: true,
              header: ({ navigation }) => <AuthenticatedHeader onBack={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('(tabs)', { screen: 'home' })} />,
              title: t.reportIssueHeaderTitle,
              headerTintColor: colors.primaryDark,
              headerStyle: { backgroundColor: colors.surface },
            }}
          />
          <Stack.Screen
            name="dashboard"
            options={{
              headerShown: true,
              header: ({ navigation }) => <AuthenticatedHeader onBack={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('(tabs)', { screen: 'home' })} />,
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
  const domain = ENV.AUTH0_DOMAIN;
  const clientId = ENV.AUTH0_CLIENT_ID;
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
      <BackendSessionBridge><AppNavigation /></BackendSessionBridge>
    </Auth0Provider>
  );
}
