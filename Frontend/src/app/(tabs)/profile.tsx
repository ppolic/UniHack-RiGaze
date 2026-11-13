import React from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { spacing } from '../../theme/spacing';
import { colors } from '../../theme/colors';
import { ProfileDetails } from '../../components/profile/ProfileDetails';
import { AppButton } from '../../components/common/AppButton';
import { useAuth } from '../../hooks/useAuth';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const { logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <ProfileDetails />

        <View style={styles.logoutWrapper}>
          <AppButton
            title="Odjavi se"
            variant="outline"
            onPress={handleLogout}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    paddingBottom: spacing['2xl'],
  },
  logoutWrapper: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
  },
});
