import { create } from 'zustand';
import { UserProfile, UserPreferences } from '../types/user';
import {
  API_CONFIG,
  isRealJwtToken,
  registerAuthTokenGetter,
} from '../services/api';
import { authService } from '../services/authService';

export type DemoUserRole = 'student' | 'accessibility' | 'teen_15' | 'child_12';

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

export const useUserStore = create<UserStoreState>((set, get) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  isLoading: false,

  setToken: (token) => set({ token, isAuthenticated: !!token && !!get().user }),

  setUser: (user) => set({ user, isAuthenticated: !!user && !!get().token }),

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

  logout: () => set({ token: null, user: null, isAuthenticated: false }),

  // Legacy map callers keep their API, but demo actions cannot authenticate or switch users.
  loginAsDemoUser: async () => {},
}));

registerAuthTokenGetter(() => useUserStore.getState().token);
