import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { typography } from '../../theme/typography';
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
import { useFocusEffect, useRouter } from 'expo-router';
import { captureSession, verifyAccount } from '../../services/fe2Session';

export default function ProfileScreen() {
  const { user, token, setUser, logout } = useAuth();
  const router = useRouter();
  const [draft, setDraft] = useState<{ userId: string; name: string } | null>(null);
  const [nameError, setNameError] = useState<string>();
  const [verifiedAge, setVerifiedAge] = useState<number | null>(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    setVerifiedAge(null);
    const loadAge = async () => {
      try {
        const account = await verifyAccount(captureSession());
        if (active) setVerifiedAge(account.age);
      } catch {
        if (active) setVerifiedAge(null);
      }
    };
    void loadAge();
    return () => { active = false; };
  }, [user?.id, token]));

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
      setNameError('Introdu un nume pentru afișare. Numele nu poate fi gol.');
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
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <View style={styles.content}>
          <View style={styles.heading}>
            <Text style={styles.eyebrow}>CONTUL TĂU</Text>
            <Text style={styles.title} accessibilityRole="header">Profil</Text>
            <Text style={styles.description}>Preferințele tale, pentru călătorii care ți se potrivesc.</Text>
          </View>

          <ProfileDetails verifiedAge={verifiedAge}>
            {user && (draft?.userId === user.id ? (
              <View style={styles.editor}>
                <View accessibilityLiveRegion="polite">
                  <AppInput
                    label="Nume afișat"
                    accessibilityLabel="Nume afișat"
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
                <Text style={styles.caption}>
                  Numele se actualizează imediat în aplicație. Dacă serverul nu este disponibil, modificarea poate să nu se păstreze la următoarea autentificare.
                </Text>
                <View style={styles.editActions}>
                  <AppButton title="Salvează" onPress={handleSave} style={styles.editButton} />
                  <AppButton title="Renunță" variant="outline" onPress={handleCancel} style={styles.editButton} />
                </View>
              </View>
            ) : (
              <AppButton title="Editează numele" variant="outline" onPress={handleEdit} style={styles.actionButton} />
            ))}
          </ProfileDetails>

          <AppCard style={styles.sessionCard}>
            <Text style={styles.sectionTitle} accessibilityRole="header">Sesiunea ta</Text>
            <Text style={styles.description}>Deconectarea închide sesiunea curentă. Pentru a reveni în cont, va trebui să te autentifici din nou.</Text>
            <AppButton title="Deconectează-te" variant="outline" onPress={handleLogout} style={styles.actionButton} />
          </AppCard>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.xl, paddingBottom: spacing['3xl'], alignItems: 'center' },
  content: { width: '100%', maxWidth: 760, gap: spacing['2xl'] },
  heading: { gap: spacing.sm },
  eyebrow: { ...typography.captionMedium, color: colors.primary, letterSpacing: 1 },
  title: { ...typography.h1, color: colors.textPrimary },
  description: { ...typography.body, color: colors.textSecondary },
  caption: { ...typography.caption, color: colors.textSecondary },
  sectionTitle: { ...typography.h3, color: colors.textPrimary },
  editor: { gap: spacing.md },
  editActions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  editButton: { flexGrow: 1, minHeight: 48 },
  actionButton: { minHeight: 48 },
  sessionCard: { gap: spacing.lg },
});
