import React, { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useAuth0 } from '../../services/auth0Service';
import { useUserStore } from '../../store/userStore';
import { authService } from '../../services/authService';
import { resolveAuth0Intelligence } from '../../hooks/useAuth';
import { UserProfile } from '../../types/user';

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
        if (!active) return;
        if (Platform.OS !== 'web' || subject === 'auth0|begreen-mobile-demo') {
          syncedRef.current = subject;
          const fallbackUser: UserProfile = {
            id: '1',
            email: email || 'andrei.popescu@student.upt.ro',
            fullName: displayName || 'Andrei Popescu',
            birthDate: '2003-05-14',
            age: 23,
            totalEcoPoints: 420,
            totalCo2SavedKg: 14.8,
            completedTripsCount: 4,
            preferences: {
              preferredModes: ['Bike', 'Walk', 'PublicTransport'],
              hasDisability: false,
              wcagLargeText: false,
              wcagTextRouteMode: false,
              hasOwnBicycle: true,
              hasOwnScooter: false,
              hasOwnCar: false,
            },
            verifiedOrganization: intel.verifiedOrg,
            organizationBadge: intel.orgBadge,
            passkeyEnabled: intel.usedPasskey,
            ageCategory: intel.ageCategory,
            zeroKnowledgeAgeVerified: intel.zeroKnowledgeAgeVerified,
            trustScore: intel.trustScore,
            trustBadge: intel.trustBadge,
            wazeVoteWeight: intel.wazeVoteWeight,
            emailVerified: intel.emailVerified,
          };
          useUserStore.getState().setToken('mock-mobile-demo-token');
          useUserStore.getState().setUser(fallbackUser);
        }
      });

    return () => {
      active = false;
    };
  }, [subject, auth0.isLoading, auth0.user]);

  return <>{children}</>;
}
