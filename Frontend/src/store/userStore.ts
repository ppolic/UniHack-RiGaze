import { create } from 'zustand';
import { UserProfile, UserPreferences } from '../types/user';
import {
  API_CONFIG,
  isRealJwtToken,
  registerAuthTokenGetter,
} from '../services/api';
import { authService } from '../services/authService';

export type DemoUserRole = 'student' | 'accessibility' | 'teen_15' | 'child_12';

interface SavedProfileOverrides {
  fullName?: string;
  preferences?: Partial<UserPreferences>;
}

const PROFILE_STORAGE_PREFIX = 'begreen_profile_overrides_';

function getSafeWebStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // Ignore storage access errors in restricted environments.
  }
  return null;
}

export function loadSavedProfileOverrides(
  userId: string
): SavedProfileOverrides | null {
  const storage = getSafeWebStorage();
  if (!storage || !userId) return null;
  try {
    const raw = storage.getItem(`${PROFILE_STORAGE_PREFIX}${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedProfileOverrides;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function saveProfileOverrides(user: UserProfile): void {
  const storage = getSafeWebStorage();
  if (!storage || !user?.id) return;
  try {
    const payload: SavedProfileOverrides = {
      fullName: user.fullName,
      preferences: user.preferences,
    };
    storage.setItem(
      `${PROFILE_STORAGE_PREFIX}${user.id}`,
      JSON.stringify(payload)
    );
  } catch {
    // Ignore quota or serialization errors.
  }
}

export function applySavedProfileOverrides(user: UserProfile): UserProfile {
  const saved = loadSavedProfileOverrides(user.id);
  if (!saved) return user;
  return {
    ...user,
    ...(typeof saved.fullName === 'string' && saved.fullName.trim()
      ? { fullName: saved.fullName.trim() }
      : {}),
    preferences: {
      ...user.preferences,
      ...(saved.preferences ?? {}),
    },
  };
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
  saveProfileChanges: (
    updates: { fullName?: string; preferences?: Partial<UserPreferences> },
    fallbackUser?: UserProfile | null,
    fallbackToken?: string | null
  ) => Promise<{ savedLocally: boolean; syncedToBackend: boolean }>;
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

  setUser: (user) => {
    if (user) {
      saveProfileOverrides(user);
    }
    set({ user, isAuthenticated: !!user && !!get().token });
  },

  updatePreferences: (newPrefs) => {
    const current = get();
    if (!current.user) return;

    const updatedUser: UserProfile = {
      ...current.user,
      preferences: { ...current.user.preferences, ...newPrefs },
    };

    saveProfileOverrides(updatedUser);
    set({ user: updatedUser });

    const hasBackendFields =
      newPrefs.hasDisability !== undefined ||
      newPrefs.hasOwnBicycle !== undefined ||
      newPrefs.hasOwnScooter !== undefined ||
      newPrefs.hasOwnCar !== undefined;

    if (hasBackendFields && !API_CONFIG.USE_MOCK_FALLBACK && isRealJwtToken(current.token)) {
      void authService
        .updateProfile(
          {
            hasDisability: newPrefs.hasDisability,
            hasOwnBicycle: newPrefs.hasOwnBicycle,
            hasOwnScooter: newPrefs.hasOwnScooter,
            hasOwnCar: newPrefs.hasOwnCar,
          },
          updatedUser
        )
        .catch(() => {
          // Offline or backend sync error: local preferences remain saved.
        });
    }
  },

  saveProfileChanges: async (updates, fallbackUser, fallbackToken) => {
    const current = get();
    const activeUser = current.user ?? fallbackUser ?? null;
    const activeToken = current.token ?? fallbackToken ?? null;
    if (!activeUser) {
      return { savedLocally: false, syncedToBackend: false };
    }

    const nextUser: UserProfile = {
      ...activeUser,
      ...(updates.fullName !== undefined ? { fullName: updates.fullName } : {}),
      preferences: {
        ...activeUser.preferences,
        ...(updates.preferences ?? {}),
      },
    };

    saveProfileOverrides(nextUser);
    set({
      user: nextUser,
      token: activeToken,
      isAuthenticated: !!activeToken,
    });

    if (!API_CONFIG.USE_MOCK_FALLBACK && isRealJwtToken(activeToken)) {
      try {
        const res = await authService.updateProfile(
          {
            fullName: nextUser.fullName,
            hasDisability: nextUser.preferences.hasDisability,
            hasOwnBicycle: nextUser.preferences.hasOwnBicycle,
            hasOwnScooter: nextUser.preferences.hasOwnScooter,
            hasOwnCar: nextUser.preferences.hasOwnCar,
          },
          nextUser
        );
        const mergedUser: UserProfile = {
          ...res.user,
          preferences: {
            ...nextUser.preferences,
            ...res.user.preferences,
            wcagLargeText: nextUser.preferences.wcagLargeText,
            wcagTextRouteMode: nextUser.preferences.wcagTextRouteMode,
          },
        };
        saveProfileOverrides(mergedUser);
        set({
          token: res.token || activeToken,
          user: mergedUser,
          isAuthenticated: true,
        });
        return { savedLocally: true, syncedToBackend: true };
      } catch {
        return { savedLocally: true, syncedToBackend: false };
      }
    }

    return { savedLocally: true, syncedToBackend: false };
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
