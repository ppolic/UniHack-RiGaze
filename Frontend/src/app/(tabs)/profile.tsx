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
import { useAuth0 } from '@auth0/auth0-react';
import { captureSession, verifyAccount } from '../../services/fe2Session';
import { useTranslation } from '../../hooks/useTranslation';

export default function ProfileScreen() {
  const { user, token, setUser, logout } = useAuth();
  const { user: auth0User, isAuthenticated: isAuth0Authenticated } = useAuth0();
  const router = useRouter();
  const { language, t, translateMessage } = useTranslation();
  const localize = (ro: string, en: string) => (language === 'en' ? en : ro);
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
      setNameError(t.displayNameEmptyError);
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
    <SafeAreaView style={styles.screen} edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <View style={styles.content}>
          <View style={styles.heading}>
            <Text style={styles.eyebrow}>{t.profileEyebrow}</Text>
            <Text style={styles.title} accessibilityRole="header">{t.tabProfile}</Text>
            <Text style={styles.description}>{t.profileSubtitle}</Text>
          </View>

          <ProfileDetails verifiedAge={verifiedAge}>
            {user && (draft?.userId === user.id ? (
              <View style={styles.editor}>
                <View accessibilityLiveRegion="polite">
                  <AppInput
                    label={t.displayNameLabel}
                    accessibilityLabel={t.displayNameLabel}
                    accessibilityHint={translateMessage(nameError)}
                    value={draft.name}
                    onChangeText={(name) => {
                      setDraft({ ...draft, name });
                      setNameError(undefined);
                    }}
                    error={translateMessage(nameError)}
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
                  {t.profileNameSyncNote}
                </Text>
                <View style={styles.editActions}>
                  <AppButton title={t.save} onPress={handleSave} style={styles.editButton} />
                  <AppButton title={t.cancel} variant="outline" onPress={handleCancel} style={styles.editButton} />
                </View>
              </View>
            ) : (
              <AppButton title={t.editProfileBtn} variant="outline" onPress={handleEdit} style={styles.actionButton} />
            ))}
          </ProfileDetails>

          <AppCard style={styles.sessionCard}>
            <Text style={styles.sectionTitle} accessibilityRole="header">
              {t.authIdentityTitle}
            </Text>
            <View style={{ gap: spacing.md, marginTop: spacing.xs }}>
              <View>
                <Text style={{ ...typography.captionMedium, color: colors.primary, fontWeight: '700' }}>
                  {t.authOrganizationsTitle}
                </Text>
                <Text style={{ ...typography.body, color: colors.textPrimary }}>
                  {user?.organizationBadge ?? t.authCitizen}
                </Text>
                <Text style={{ ...typography.caption, color: colors.textSecondary }}>
                  {t.authCarpoolPrefix} {user?.verifiedOrganization ?? t.authOrganizationDefault}.
                </Text>
              </View>

              <View>
                <Text style={{ ...typography.captionMedium, color: colors.primary, fontWeight: '700' }}>
                  {t.authPasskeysTitle}
                </Text>
                <Text style={{ ...typography.body, color: colors.textPrimary }}>
                  {user?.passkeyEnabled ? t.authPasskeyActive : t.authPasskeySupported}
                </Text>
                <Text style={{ ...typography.caption, color: colors.textSecondary }}>
                  {t.authPasskeyDescription}
                </Text>
              </View>

              <View>
                <Text style={{ ...typography.captionMedium, color: colors.primary, fontWeight: '700' }}>
                  {t.authAgeTitle}
                </Text>
                <Text style={{ ...typography.body, color: colors.textPrimary }}>
                  {t.authStatus}: {user?.ageCategory === 'Under14' ? t.authAgeChild : user?.ageCategory === 'From14To15' ? t.authAgeTeen : t.authAgeAdult}
                </Text>
                <Text style={{ ...typography.caption, color: colors.textSecondary }}>
                  {t.authAgeDescription}
                </Text>
              </View>

              <View>
                <Text style={{ ...typography.captionMedium, color: colors.primary, fontWeight: '700' }}>
                  {t.authTrustTitle}
                </Text>
                <Text style={{ ...typography.body, color: colors.textPrimary }}>
                  {user?.trustBadge ?? t.authTrustUnknown}
                </Text>
                <Text style={{ ...typography.caption, color: colors.textSecondary }}>
                  {t.authTrustDescription}
                </Text>
              </View>
            </View>
          </AppCard>

          <AppCard style={styles.sessionCard}>
            <Text style={styles.sectionTitle} accessibilityRole="header">{t.profileSessionTitle}</Text>
            <Text style={styles.description}>{t.profileSessionDesc}</Text>
            <AppButton title={t.logoutBtn} variant="outline" onPress={handleLogout} style={styles.actionButton} />
          </AppCard>

          {isAuth0Authenticated && auth0User && (
            <AppCard style={styles.sessionCard}>
              <Text style={styles.sectionTitle} accessibilityRole="header">{t.authRawProfile}</Text>
              <Text style={{ fontFamily: 'monospace', fontSize: 12, color: colors.textSecondary }}>
                {JSON.stringify(auth0User, null, 2)}
              </Text>
            </AppCard>
          )}
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
