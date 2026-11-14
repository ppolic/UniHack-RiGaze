import React from 'react';
import { Tabs } from 'expo-router';
import { Text, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { borderRadius } from '../../theme/spacing';
import { useTranslation } from '../../hooks/useTranslation';
import { useThemeMode } from '../../hooks/useThemeMode';
import { AuthenticatedHeader } from '../../components/common/AuthenticatedHeader';

export const unstable_settings = { initialRouteName: 'home' };

function TabIcon({ emoji, focused, isDarkMode }: { emoji: string; focused: boolean; isDarkMode?: boolean }) {
  return (
    <View style={[
      styles.iconWrap,
      focused && (isDarkMode ? styles.iconWrapActiveDark : styles.iconWrapActive)
    ]}>
      <Text style={styles.iconEmoji}>{emoji}</Text>
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { language, t } = useTranslation();
  const { isDarkMode } = useThemeMode();

  const tabBg = isDarkMode ? '#0E1612' : colors.surface;
  const tabBorder = isDarkMode ? '#2D4236' : colors.border;
  const activeColor = isDarkMode ? '#4ADE80' : colors.primaryDark;
  const inactiveColor = isDarkMode ? '#8EADA0' : colors.textSecondary;

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        header: () => <AuthenticatedHeader />,
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarLabelPosition: 'below-icon',
        tabBarLabel: ({ color, children }) => (
          <Text style={[styles.label, { color, fontWeight: '700' }]} numberOfLines={2}>{children}</Text>
        ),
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 2,
        },
        tabBarStyle: {
          backgroundColor: tabBg,
          borderTopColor: tabBorder,
          borderTopWidth: 1.5,
          height: 76 + insets.bottom,
          paddingBottom: Math.max(8, insets.bottom),
          paddingTop: 6,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          headerShown: false,
          title: t.tabMap,
          tabBarIcon: ({ focused }) => <TabIcon emoji="🗺️" focused={focused} isDarkMode={isDarkMode} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: language === 'en' ? 'Favorites & History' : 'Favorite și istoric',
          tabBarIcon: ({ focused }) => <TabIcon emoji="♡" focused={focused} isDarkMode={isDarkMode} />,
        }}
      />
      <Tabs.Screen
        name="home"
        options={{
          title: language === 'en' ? 'Home' : 'Acasă',
          tabBarIcon: ({ focused }) => <TabIcon emoji="⌂" focused={focused} isDarkMode={isDarkMode} />,
        }}
      />
      <Tabs.Screen
        name="rewards"
        options={{
          title: t.points.charAt(0).toUpperCase() + t.points.slice(1),
          tabBarIcon: ({ focused }) => <TabIcon emoji="✧" focused={focused} isDarkMode={isDarkMode} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t.tabProfile,
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} isDarkMode={isDarkMode} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 11, lineHeight: 14, fontWeight: '600', textAlign: 'center', paddingHorizontal: 2 },
  iconWrap: {
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: colors.surfaceMuted,
  },
  iconWrapActiveDark: {
    backgroundColor: '#1E2C24',
    borderWidth: 1,
    borderColor: '#4ADE80',
  },
  iconEmoji: {
    fontSize: 18,
  },
});
