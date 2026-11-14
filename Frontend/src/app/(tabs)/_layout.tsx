import React from 'react';
import { Tabs } from 'expo-router';
import { Text, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { borderRadius } from '../../theme/spacing';
import { useTranslation } from '../../hooks/useTranslation';

export const unstable_settings = { initialRouteName: 'home' };

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Text style={styles.iconEmoji}>{emoji}</Text>
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { language, t } = useTranslation();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primaryDark,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelPosition: 'below-icon',
        tabBarLabel: ({ color, children }) => (
          <Text style={[styles.label, { color }]} numberOfLines={2}>{children}</Text>
        ),
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 76 + insets.bottom,
          paddingBottom: Math.max(8, insets.bottom),
          paddingTop: 6,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.tabMap,
          tabBarIcon: ({ focused }) => <TabIcon emoji="🗺️" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: language === 'en' ? 'Favorites & History' : 'Favorite și istoric',
          tabBarIcon: ({ focused }) => <TabIcon emoji="♡" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="home"
        options={{
          title: language === 'en' ? 'Home' : 'Acasă',
          tabBarIcon: ({ focused }) => <TabIcon emoji="⌂" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="rewards"
        options={{
          title: t.points.charAt(0).toUpperCase() + t.points.slice(1),
          tabBarIcon: ({ focused }) => <TabIcon emoji="✧" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t.tabProfile,
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 11, lineHeight: 14, fontWeight: '600', textAlign: 'center', paddingHorizontal: 2 },
  iconWrap: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: colors.surfaceMuted,
  },
  iconEmoji: {
    fontSize: 18,
  },
});
