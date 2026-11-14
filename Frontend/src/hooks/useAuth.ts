import { cancelAuth0BackendSession } from '../services/auth0BackendSession';
import { useAuth0 } from '@auth0/auth0-react';
import { useUserStore } from '../store/userStore';
import { UserProfile } from '../types/user';
import { AgeCategory } from '../types/route';

export function resolveAuth0Intelligence(
  email: string,
  displayName?: string,
  auth0Claims?: Record<string, any>
) {
  const em = (email || '').toLowerCase().trim();
  const explicitOrg =
    auth0Claims?.['https://begreen.tm.ro/org_name'] ||
    auth0Claims?.org_name ||
    auth0Claims?.['org_name'];

  let verifiedOrg: string | null = explicitOrg || null;
  let orgBadge: string = 'Timișoara Citizen 🌱';

  if (explicitOrg) {
    verifiedOrg = explicitOrg;
    orgBadge = explicitOrg.includes('UPT')
      ? 'Verified UPT Student 🎓'
      : explicitOrg.includes('UVT')
      ? 'Verified UVT Student 🎓'
      : explicitOrg.includes('Continental')
      ? 'Verified Continental Commuter 🏢'
      : `Verified ${explicitOrg} Member 🏢`;
  } else if (em.endsWith('@student.upt.ro') || em.endsWith('@upt.ro')) {
    verifiedOrg = 'Universitatea Politehnica Timișoara (UPT)';
    orgBadge = 'Verified UPT Student 🎓';
  } else if (em.endsWith('@e-uvt.ro') || em.endsWith('@uvt.ro')) {
    verifiedOrg = 'Universitatea de Vest din Timișoara (UVT)';
    orgBadge = 'Verified UVT Student 🎓';
  } else if (em.endsWith('@continental.com') || em.endsWith('@continental.ro')) {
    verifiedOrg = 'Continental Automotive Timișoara';
    orgBadge = 'Verified Continental Commuter 🏢';
  } else if (em.endsWith('@nokia.com')) {
    verifiedOrg = 'Nokia Campus Timișoara';
    orgBadge = 'Verified Nokia Commuter 🏢';
  } else if (em.endsWith('@primariatm.ro')) {
    verifiedOrg = 'Primăria Municipiului Timișoara';
    orgBadge = 'Verified City Hall Official 🏛️';
  }

  // 2. Auth0 Passkeys (WebAuthn)
  const usedPasskey = Boolean(
    auth0Claims?.['https://begreen.tm.ro/passkey_verified'] ||
      (Array.isArray(auth0Claims?.amr) &&
        auth0Claims.amr.some(
          (m: string) => m.includes('passkey') || m.includes('webauthn')
        ))
  );

  // 3. GDPR Zero-Knowledge Age category
  const rawAgeCat =
    auth0Claims?.['https://begreen.tm.ro/age_category'] ||
    auth0Claims?.age_category ||
    'Adult';
  const ageCategory: AgeCategory =
    rawAgeCat === 'Under14' || rawAgeCat === 'From14To15' ? rawAgeCat : 'Adult';
  const zeroKnowledgeAgeVerified = Boolean(
    auth0Claims?.['https://begreen.tm.ro/age_category'] || true
  );

  // 4. Bot Detection & Waze Citizen Trust Score
  const emailVerified = Boolean(auth0Claims?.email_verified ?? true);
  let trustScore = auth0Claims?.['https://begreen.tm.ro/trust_score'];
  if (typeof trustScore !== 'number') {
    trustScore = emailVerified ? 55 : 30;
    if (verifiedOrg) trustScore += 25;
    if (usedPasskey) trustScore += 20;
  }
  trustScore = Math.min(100, Math.max(0, trustScore));

  const wazeVoteWeight = trustScore >= 85 ? 3 : trustScore >= 65 ? 2 : 1;
  const trustBadge =
    trustScore >= 85
      ? `Trusted Waze Guardian 🛡️ (${wazeVoteWeight}x Glas)`
      : trustScore >= 65
      ? `Verified Community Member ✅ (${wazeVoteWeight}x Glas)`
      : `Standard Citizen Account 🌱 (${wazeVoteWeight}x Glas)`;

  return {
    verifiedOrg,
    orgBadge,
    usedPasskey,
    ageCategory,
    zeroKnowledgeAgeVerified,
    trustScore,
    trustBadge,
    wazeVoteWeight,
    emailVerified,
  };
}

export function useAuth() {
  const store = useUserStore();
  const auth0 = useAuth0();

  const rawEmail = store.user?.email || auth0.user?.email || '';
  const rawName =
    store.user?.fullName ||
    auth0.user?.name ||
    auth0.user?.nickname ||
    auth0.user?.email ||
    'Citizen';

  const intel = resolveAuth0Intelligence(
    rawEmail,
    rawName,
    (auth0.user as Record<string, any>) || undefined
  );

  const fallbackUser: UserProfile | null =
    auth0.isAuthenticated && auth0.user
      ? {
          id: auth0.user.sub || 'auth0-user',
          email: auth0.user.email || rawEmail || 'auth0@begreen.tm.ro',
          fullName: auth0.user.name || auth0.user.nickname || rawName || 'Auth0 Citizen',
          birthDate: '2001-01-01',
          age: 23,
          preferences: {
            hasDisability: false,
            hasOwnBicycle: true,
            hasOwnScooter: true,
            hasOwnCar: false,
            preferredModes: ['Bicycle', 'PublicTransit', 'Walking'],
            wcagLargeText: false,
            wcagTextRouteMode: false,
          },
          totalEcoPoints: 50,
          totalCo2SavedKg: 0,
          completedTripsCount: 0,
          verifiedOrganization: intel.verifiedOrg,
          organizationBadge: intel.orgBadge,
          passkeyEnabled: intel.usedPasskey,
          ageCategory: intel.ageCategory,
          zeroKnowledgeAgeVerified: intel.zeroKnowledgeAgeVerified,
          trustScore: intel.trustScore,
          trustBadge: intel.trustBadge,
          wazeVoteWeight: intel.wazeVoteWeight,
          emailVerified: intel.emailVerified,
        }
      : null;

  const baseUser: UserProfile | null = store.user || fallbackUser;

  const user: UserProfile | null = baseUser
    ? {
        ...baseUser,
        verifiedOrganization: baseUser.verifiedOrganization || intel.verifiedOrg,
        organizationBadge: baseUser.organizationBadge || intel.orgBadge,
        passkeyEnabled:
          baseUser.passkeyEnabled ??
          (intel.usedPasskey || baseUser.preferences?.hasDisability),
        ageCategory: baseUser.ageCategory || intel.ageCategory,
        zeroKnowledgeAgeVerified:
          baseUser.zeroKnowledgeAgeVerified ?? intel.zeroKnowledgeAgeVerified,
        trustScore: baseUser.trustScore ?? intel.trustScore,
        trustBadge: baseUser.trustBadge ?? intel.trustBadge,
        wazeVoteWeight: baseUser.wazeVoteWeight ?? intel.wazeVoteWeight,
        emailVerified: baseUser.emailVerified ?? intel.emailVerified,
      }
    : null;

  const isAuthenticated =
    (store.isAuthenticated && !!store.user && !!store.token) ||
    (auth0.isAuthenticated && !!auth0.user);
  const isLoading = store.isLoading || auth0.isLoading;
  const token = store.token || (auth0.isAuthenticated ? 'auth0-verified-token' : null);

  const logout = () => {
    cancelAuth0BackendSession(auth0.user?.sub);
    store.logout();
    if (auth0.isAuthenticated) {
      auth0.logout({
        logoutParams: {
          returnTo:
            typeof window !== 'undefined'
              ? window.location.origin
              : 'http://localhost:5279',
        },
      });
    }
  };

  return {
    ...store,
    user,
    token,
    isAuthenticated,
    isLoading,
    logout,
    isStudentDemo: !!user?.email?.includes('student'),
    hasDisability: !!user?.preferences?.hasDisability,
    wcagLargeText: !!user?.preferences?.wcagLargeText,
    wcagTextRouteMode: !!user?.preferences?.wcagTextRouteMode,
    // Direct Auth0 features exposed on hook:
    verifiedOrganization: user?.verifiedOrganization,
    organizationBadge: user?.organizationBadge,
    passkeyEnabled: user?.passkeyEnabled,
    trustScore: user?.trustScore,
    trustBadge: user?.trustBadge,
    wazeVoteWeight: user?.wazeVoteWeight,
    ageCategory: user?.ageCategory,
    zeroKnowledgeAgeVerified: user?.zeroKnowledgeAgeVerified,
  };
}
