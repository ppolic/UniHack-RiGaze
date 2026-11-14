import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView, Keyboard } from 'react-native';
import { spacing } from '../../theme/spacing';
import { colors } from '../../theme/colors';
import { ProfileDetails } from '../../components/profile/ProfileDetails';
import { AppButton } from '../../components/common/AppButton';
import { AppInput } from '../../components/common/AppInput';
import { AppCard } from '../../components/common/AppCard';
import { useAuth } from '../../hooks/useAuth';
import { useUserStore } from '../../store/userStore';
import { authService } from '../../services/authService';
import { API_CONFIG, isRealJwtToken } from '../../services/api';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const { user, setUser, logout } = useAuth();
  const router = useRouter();
  const [draft, setDraft] = useState<{ userId: string; name: string } | null>(null);
  const [nameError, setNameError] = useState<string>();

  const handleEdit = () => {
    if (!user) return;
    setDraft({ userId: user.id, name: user.fullName });
    setNameError(undefined);
  };

  const handleCancel = () => {
    setDraft(null);
    setNameError(undefined);
    Keyboard.dismiss();
  };

  const handleSave = () => {
    // Preserve preferences and totals changed elsewhere while the editor was open.
    const currentUser = useUserStore.getState().user;
    if (!draft || !currentUser || currentUser.id !== draft.userId) {
      handleCancel();
      return;
    }

    const fullName = draft.name.trim();
    if (!fullName) {
      setNameError('Unesite ime za prikaz. Ime ne može biti prazno.');
      return;
    }

    setUser({ ...currentUser, fullName });
    handleCancel();

    const currentToken = useUserStore.getState().token;
    if (!API_CONFIG.USE_MOCK_FALLBACK && isRealJwtToken(currentToken)) {
      void authService.updateProfile({ fullName }, currentUser).catch(() => {
        // Lokalno ime već je ažurirano; tihi fallback ako backend nije dostupan
      });
    }
  };

  const handleLogout = () => {
    logout();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <ProfileDetails />

        {user && (
          <View style={styles.editorWrapper}>
            {draft?.userId === user.id ? (
              <AppCard>
                <View accessibilityLiveRegion="polite">
                  <AppInput
                    label="Ime za prikaz"
                    accessibilityLabel="Ime za prikaz"
                    accessibilityHint={nameError}
                    value={draft.name}
                    onChangeText={(name) => {
                      setDraft({ ...draft, name });
                      setNameError(undefined);
                    }}
                    error={nameError}
                    autoFocus
                    autoCapitalize="words"
                    autoComplete="name"
                    returnKeyType="done"
                    submitBehavior="submit"
                    onSubmitEditing={handleSave}
                    onKeyPress={({ nativeEvent }) => {
                      if (nativeEvent.key === 'Escape') handleCancel();
                    }}
                  />
                </View>
                <View style={styles.editActions}>
                  <AppButton title="Spremi" onPress={handleSave} style={styles.editButton} />
                  <AppButton
                    title="Odustani"
                    variant="outline"
                    onPress={handleCancel}
                    style={styles.editButton}
                  />
                </View>
              </AppCard>
            ) : (
              <AppButton title="Uredi profil" variant="outline" onPress={handleEdit} />
            )}
          </View>
        )}

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
  editorWrapper: {
    paddingHorizontal: spacing.md,
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  editButton: {
    flexGrow: 1,
  },
  logoutWrapper: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
  },
});
