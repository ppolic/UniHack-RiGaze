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
import { useRouter } from 'expo-router';
import { useTranslation } from '../../hooks/useTranslation';

export default function ProfileScreen() {
  const { user, setUser, logout } = useAuth();
  const { t } = useTranslation();
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
      setNameError(t.displayNameEmptyError);
      return;
    }

    setUser({ ...currentUser, fullName });
    handleCancel();
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
                    label={t.displayNameLabel}
                    accessibilityLabel={t.displayNameLabel}
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
                  <AppButton title={t.save} onPress={handleSave} style={styles.editButton} />
                  <AppButton
                    title={t.cancel}
                    variant="outline"
                    onPress={handleCancel}
                    style={styles.editButton}
                  />
                </View>
              </AppCard>
            ) : (
              <AppButton title={t.editProfileBtn} variant="outline" onPress={handleEdit} />
            )}
          </View>
        )}

        <View style={styles.logoutWrapper}>
          <AppButton
            title={t.logoutBtn}
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
