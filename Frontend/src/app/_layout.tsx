import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { useTranslation } from '../hooks/useTranslation';

export default function RootLayout() {
  const { t } = useTranslation();

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
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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
      </Stack>
    </SafeAreaProvider>
  );
}
