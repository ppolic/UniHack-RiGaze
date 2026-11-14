import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

export default function RootLayout() {
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
            title: 'Green Intelligence – Gradski Dashboard',
            headerBackTitle: 'Natrag',
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
