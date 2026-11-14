import React, { useEffect, useRef } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useUserStore } from '../../store/userStore';
import { authService } from '../../services/authService';
import { resolveAuth0Intelligence } from '../../hooks/useAuth';

/**
 * Resilient bridge between Auth0 authentication and the local backend.
 * Synchronizes the Auth0 session into userStore when available,
 * but never blocks or traps the user in an error loop if the backend is unavailable.
 */
export function BackendSessionBridge({ children }: { children: React.ReactNode }) {
  const auth0 = useAuth0();
  const subject = auth0.isAuthenticated ? auth0.user?.sub : undefined;
  const syncedRef = useRef<string | null>(null);

  useEffect(() => {
    if (auth0.isLoading) return;
    if (!subject || !auth0.user) {
      syncedRef.current = null;
      return;
    }

    if (syncedRef.current === subject) return;

    let active = true;
    const email = auth0.user.email || '';
    const displayName = auth0.user.name || auth0.user.nickname || email.split('@')[0];
    const intel = resolveAuth0Intelligence(email, displayName, auth0.user as Record<string, any>);

    authService
      .loginWithAuth0({
        email,
        displayName,
        auth0Sub: subject,
        organizationName: intel.verifiedOrg || undefined,
        usedPasskey: intel.usedPasskey,
        zeroKnowledgeAgeCategory: intel.ageCategory,
      })
      .then((session) => {
        if (!active) return;
        syncedRef.current = subject;
        useUserStore.getState().setToken(session.token);
        useUserStore.getState().setUser(session.user);
      })
      .catch((err) => {
        console.warn('[BeGreen] Auth0 backend session sync fallback:', err?.message);
      });

    return () => {
      active = false;
    };
  }, [subject, auth0.isLoading, auth0.user]);

  return <>{children}</>;
}
