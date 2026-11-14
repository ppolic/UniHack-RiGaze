import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useAuth0 } from '@auth0/auth0-react';
import { useUserStore } from '../../store/userStore';
import { useTranslation } from '../../hooks/useTranslation';
import { AppButton } from '../common/AppButton';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { cancelAuth0BackendSession, expireAuth0BackendSession, isAuth0SessionBlocked, requestAuth0BackendSession, resetAuth0Identity } from '../../services/auth0BackendSession';

type State = { subject: string; status: 'loading' | 'ready' | 'error'; token?: string; expiresAtUtc?: string };

/** Mounted once under Auth0Provider; individual useAuth consumers never synchronize. */
export function BackendSessionBridge({ children }: { children: React.ReactNode }) {
  const auth0 = useAuth0();
  const store = useUserStore();
  const { t } = useTranslation();
  const subject = auth0.isAuthenticated ? auth0.user?.sub : undefined;
  const currentSubject = useRef(subject);
  currentSubject.current = subject;
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<State | null>(null);

  useEffect(() => {
    if (auth0.isLoading) return;
    if (!subject) { resetAuth0Identity(); setState(null); return; }
    if (isAuth0SessionBlocked(subject)) return;
    let active = true;
    setState({ subject, status: 'loading' });
    const request = requestAuth0BackendSession(subject, (options) => auth0.getAccessTokenSilently(options));
    void request.promise.then((session) => {
      if (!active || currentSubject.current !== subject) return;
      if (request.commit(session)) {
        setState({ subject, status: 'ready', token: session.token, expiresAtUtc: session.expiresAtUtc });
      } else {
        const latest = useUserStore.getState();
        // A concurrent explicit backend login wins over an older Auth0 response.
        setState({ subject, status: latest.isAuthenticated && latest.user && latest.token ? 'ready' : 'error' });
      }
    }).catch(() => {
      if (active && currentSubject.current === subject) setState({ subject, status: 'error' });
    });
    return () => { active = false; };
  }, [subject, auth0.isLoading, auth0.getAccessTokenSilently, attempt]);

  useEffect(() => {
    if (state?.status !== 'ready' || !state.expiresAtUtc || !state.token) return;
    const token = state.token;
    const expires = Date.parse(state.expiresAtUtc);
    let timer: ReturnType<typeof setTimeout>;
    const check = () => {
      if (useUserStore.getState().token !== token) return;
      const remaining = expires - Date.now();
      if (remaining > 0) { timer = setTimeout(check, Math.min(remaining, 2147483647)); return; }
      expireAuth0BackendSession(token);
      setState({ subject: state.subject, status: 'error' });
    };
    check();
    return () => clearTimeout(timer);
  }, [state]);

  if (auth0.isLoading || !subject || isAuth0SessionBlocked(subject)) return <>{children}</>;
  if (state?.subject === subject && state.status === 'ready' && store.isAuthenticated) return <>{children}</>;
  const failed = state?.subject === subject && state.status === 'error';
  return (
    <View style={styles.screen}>
      {failed ? (
        <>
          <Text style={styles.error} accessibilityRole="alert">{t.authUnconfirmedError}</Text>
          <AppButton title={t.retry} onPress={() => setAttempt((value) => value + 1)} />
        </>
      ) : (
        <View accessibilityLiveRegion="polite" accessibilityState={{ busy: true }}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.text}>{t.loading}</Text>
        </View>
      )}
      <AppButton title={t.logoutBtn} variant="outline" onPress={() => {
        cancelAuth0BackendSession(subject);
        store.logout();
        void auth0.logout({ logoutParams: { returnTo: window.location.origin } }).catch(() => {});
      }} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', padding: spacing['2xl'], gap: spacing.lg, backgroundColor: colors.background },
  error: { ...typography.body, color: colors.danger },
  text: { ...typography.body, color: colors.textPrimary, textAlign: 'center' },
});
