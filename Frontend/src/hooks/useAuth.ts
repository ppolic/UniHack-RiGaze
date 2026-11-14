import { useAuth0 } from '@auth0/auth0-react';
import { useUserStore } from '../store/userStore';
import { UserProfile } from '../types/user';

export function useAuth() {
  const store = useUserStore();
  const auth0 = useAuth0();

  const isAuth0 = auth0.isAuthenticated && !!auth0.user;

  const user: UserProfile | null =
    store.user ??
    (isAuth0 && auth0.user
      ? {
          id: auth0.user.sub || 'auth0|user',
          email: auth0.user.email || '',
          fullName:
            auth0.user.name ||
            auth0.user.nickname ||
            auth0.user.email ||
            'Auth0 User',
          birthDate: '2000-01-01',
          age: 24,
          preferences: {
            hasDisability: false,
            hasOwnBicycle: false,
            hasOwnScooter: false,
            hasOwnCar: false,
            preferredModes: ['PublicTransit', 'Walking'],
            wcagLargeText: false,
            wcagTextRouteMode: false,
          },
          totalEcoPoints: 100,
          totalCo2SavedKg: 0,
          completedTripsCount: 0,
        }
      : null);

  const isAuthenticated = store.isAuthenticated || isAuth0;
  const isLoading = store.isLoading || auth0.isLoading;
  const token = store.token || (isAuth0 ? 'auth0-session' : null);

  const logout = () => {
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
  };
}
