import { create } from 'zustand';
import { UserProfile, UserPreferences } from '../types/user';
import {
  API_CONFIG,
  apiFetch,
  isRealJwtToken,
  registerAuthTokenGetter,
} from '../services/api';
import { authService, DEMO_CREDENTIALS } from '../services/authService';

export type DemoUserRole = 'student' | 'accessibility' | 'teen_15' | 'child_12';

interface BackendTripSummary {
  totalTripsCount: number;
  totalCo2SavedKg: number;
  currentPointsBalance: number;
}

interface UserStoreState {
  token: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setToken: (token: string | null) => void;
  setUser: (user: UserProfile | null) => void;
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
  addEcoPoints: (points: number, co2SavedGrams: number, backendNewBalance?: number) => void;
  logout: () => void;
  loginAsDemoUser: (role?: DemoUserRole) => Promise<void>;
}

const DEFAULT_DEMO_USER: UserProfile = {
  id: '1',
  email: 'ana.student@upt.ro',
  fullName: 'Ana Popescu (Studentica UPT)',
  birthDate: '2003-05-14',
  age: 23,
  preferences: {
    hasDisability: false,
    hasOwnBicycle: true,
    hasOwnScooter: false,
    hasOwnCar: false,
    preferredModes: ['Bicycle', 'PublicTransit'],
    wcagLargeText: false,
    wcagTextRouteMode: false,
  },
  totalEcoPoints: 320,
  totalCo2SavedKg: 0.42,
  completedTripsCount: 2,
};

const ACCESSIBLE_DEMO_USER: UserProfile = {
  id: '2',
  email: 'marko.kolica@uvt.ro',
  fullName: 'Marko Ionescu (Pristupačnost / Kolica)',
  birthDate: '1998-09-20',
  age: 28,
  preferences: {
    hasDisability: true,
    hasOwnBicycle: false,
    hasOwnScooter: false,
    hasOwnCar: true,
    preferredModes: ['PublicTransit', 'CarWithParking'],
    wcagLargeText: false,
    wcagTextRouteMode: false,
  },
  totalEcoPoints: 450,
  totalCo2SavedKg: 0.17,
  completedTripsCount: 1,
};

const TEEN_15_DEMO_USER: UserProfile = {
  id: '4',
  email: 'elena.tinejdzer@tm.ro',
  fullName: 'Elena Rusu (15 god. – Kaciga pravilo)',
  birthDate: '2011-07-22',
  age: 15,
  preferences: {
    hasDisability: false,
    hasOwnBicycle: true,
    hasOwnScooter: true,
    hasOwnCar: false,
    preferredModes: ['Bicycle', 'Scooter'],
    wcagLargeText: false,
    wcagTextRouteMode: false,
  },
  totalEcoPoints: 180,
  totalCo2SavedKg: 0,
  completedTripsCount: 0,
};

const CHILD_12_DEMO_USER: UserProfile = {
  id: '3',
  email: 'david.ucenik@tm.ro',
  fullName: 'David Munteanu (Učenik < 14 god.)',
  birthDate: '2014-03-10',
  age: 12,
  preferences: {
    hasDisability: false,
    hasOwnBicycle: true,
    hasOwnScooter: true,
    hasOwnCar: false,
    preferredModes: ['PublicTransit', 'Walking'],
    wcagLargeText: false,
    wcagTextRouteMode: false,
  },
  totalEcoPoints: 110,
  totalCo2SavedKg: 0,
  completedTripsCount: 0,
};

const DEMO_PROFILE_MAP: Record<DemoUserRole, UserProfile> = {
  student: DEFAULT_DEMO_USER,
  accessibility: ACCESSIBLE_DEMO_USER,
  teen_15: TEEN_15_DEMO_USER,
  child_12: CHILD_12_DEMO_USER,
};

let authSessionVersion = 0;

async function syncBackendStatsIfPossible(version: number, token: string) {
  try {
    const summary = await apiFetch<BackendTripSummary>('/trips?take=1', {}, token);
    if (authSessionVersion !== version) return;
    useUserStore.setState((state) => {
      if (!state.user) return state;
      return {
        user: {
          ...state.user,
          totalEcoPoints: summary.currentPointsBalance ?? state.user.totalEcoPoints,
          totalCo2SavedKg: summary.totalCo2SavedKg ?? state.user.totalCo2SavedKg,
          completedTripsCount: summary.totalTripsCount ?? state.user.completedTripsCount,
        },
      };
    });
  } catch {
    // Backend možda još nije dostupan; zadržavamo lokalne demo brojke
  }
}

export const useUserStore = create<UserStoreState>((set, get) => ({
  token: 'mock-jwt-token-eco-mutare',
  user: DEFAULT_DEMO_USER,
  isAuthenticated: true,
  isLoading: false,

  setToken: (token) => {
    if (isRealJwtToken(token)) {
      authSessionVersion += 1;
    }
    set({ token, isAuthenticated: !!token });
  },

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  updatePreferences: (newPrefs) => {
    const current = get();
    if (!current.user) return;

    set((state) => {
      if (!state.user) return state;
      return {
        user: {
          ...state.user,
          preferences: { ...state.user.preferences, ...newPrefs },
        },
      };
    });

    const hasBackendFields =
      newPrefs.hasDisability !== undefined ||
      newPrefs.hasOwnBicycle !== undefined ||
      newPrefs.hasOwnScooter !== undefined ||
      newPrefs.hasOwnCar !== undefined;

    if (hasBackendFields && !API_CONFIG.USE_MOCK_FALLBACK && isRealJwtToken(current.token)) {
      const updatedUser = get().user;
      void authService
        .updateProfile(
          {
            hasDisability: newPrefs.hasDisability,
            hasOwnBicycle: newPrefs.hasOwnBicycle,
            hasOwnScooter: newPrefs.hasOwnScooter,
            hasOwnCar: newPrefs.hasOwnCar,
          },
          updatedUser ?? undefined
        )
        .catch(() => {
          // Offline ili greška sinkronizacije: lokalne preferencije ostaju spremljene
        });
    }
  },

  addEcoPoints: (points, co2SavedGrams, backendNewBalance) =>
    set((state) => {
      if (!state.user) return state;
      return {
        user: {
          ...state.user,
          totalEcoPoints:
            typeof backendNewBalance === 'number'
              ? backendNewBalance
              : state.user.totalEcoPoints + points,
          totalCo2SavedKg: Number(
            (state.user.totalCo2SavedKg + co2SavedGrams / 1000).toFixed(2)
          ),
          completedTripsCount: state.user.completedTripsCount + 1,
        },
      };
    }),

  logout: () => {
    authSessionVersion += 1;
    set({ token: null, user: null, isAuthenticated: false });
  },

  loginAsDemoUser: async (role = 'student') => {
    const version = ++authSessionVersion;
    const prevPrefs = get().user?.preferences;
    const fallbackProfile = DEMO_PROFILE_MAP[role] || DEFAULT_DEMO_USER;

    set({
      token: 'demo-token-' + role,
      user: {
        ...fallbackProfile,
        preferences: {
          ...fallbackProfile.preferences,
          wcagLargeText: prevPrefs?.wcagLargeText ?? false,
          wcagTextRouteMode: prevPrefs?.wcagTextRouteMode ?? false,
        },
      },
      isAuthenticated: true,
    });

    if (API_CONFIG.USE_MOCK_FALLBACK) return;

    try {
      const creds = DEMO_CREDENTIALS[role] || DEMO_CREDENTIALS.student;
      const res = await authService.login(creds);
      if (authSessionVersion !== version) return;

      const mergedUser: UserProfile = {
        ...res.user,
        preferences: {
          ...res.user.preferences,
          wcagLargeText: prevPrefs?.wcagLargeText ?? false,
          wcagTextRouteMode: prevPrefs?.wcagTextRouteMode ?? false,
        },
        totalCo2SavedKg: fallbackProfile.totalCo2SavedKg,
        completedTripsCount: fallbackProfile.completedTripsCount,
      };

      set({
        token: res.token,
        user: mergedUser,
        isAuthenticated: true,
      });

      await syncBackendStatsIfPossible(version, res.token);
    } catch {
      // Backend nije pokrenut: lokalni demo profil već je aktivan
    }
  },
}));

registerAuthTokenGetter(() => useUserStore.getState().token);

// Tiha inicijalna prijava na backend pri pokretanju aplikacije kako bi JWT token odmah bio valjan
if (!API_CONFIG.USE_MOCK_FALLBACK) {
  const initialVersion = ++authSessionVersion;
  void authService
    .login(DEMO_CREDENTIALS.student)
    .then(async (res) => {
      if (authSessionVersion !== initialVersion) return;
      const current = useUserStore.getState();
      if (!current.isAuthenticated) return;

      useUserStore.setState({
        token: res.token,
        user: {
          ...res.user,
          preferences: {
            ...res.user.preferences,
            wcagLargeText: current.user?.preferences?.wcagLargeText ?? false,
            wcagTextRouteMode: current.user?.preferences?.wcagTextRouteMode ?? false,
          },
          totalCo2SavedKg: current.user?.totalCo2SavedKg ?? DEFAULT_DEMO_USER.totalCo2SavedKg,
          completedTripsCount:
            current.user?.completedTripsCount ?? DEFAULT_DEMO_USER.completedTripsCount,
        },
        isAuthenticated: true,
      });

      await syncBackendStatsIfPossible(initialVersion, res.token);
    })
    .catch(() => {
      // Backend nedostupan pri startu — lokalni demo profil ostaje aktivan
    });
}
