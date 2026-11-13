import { create } from 'zustand';
import { UserProfile, UserPreferences } from '../types/user';

interface UserStoreState {
  token: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  setToken: (token: string | null) => void;
  setUser: (user: UserProfile | null) => void;
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
  addEcoPoints: (points: number, co2SavedGrams: number) => void;
  logout: () => void;
  loginAsDemoUser: (role?: 'student' | 'accessibility') => void;
}

const DEFAULT_DEMO_USER: UserProfile = {
  id: 'usr_demo_101',
  email: 'student@ecomutare.tm',
  fullName: 'Alexandru Popa',
  birthDate: '2004-05-14',
  age: 22,
  preferences: {
    hasDisability: false,
    hasOwnBicycle: true,
    hasOwnScooter: false,
    hasOwnCar: true,
    preferredModes: ['Bicycle', 'PublicTransit'],
  },
  totalEcoPoints: 340,
  totalCo2SavedKg: 18.4,
  completedTripsCount: 14,
};

const ACCESSIBLE_DEMO_USER: UserProfile = {
  id: 'usr_demo_wheelchair',
  email: 'maria.accessible@ecomutare.tm',
  fullName: 'Maria Ionescu',
  birthDate: '1998-09-21',
  age: 28,
  preferences: {
    hasDisability: true,
    hasOwnBicycle: false,
    hasOwnScooter: false,
    hasOwnCar: true,
    preferredModes: ['PublicTransit', 'CarWithParking'],
  },
  totalEcoPoints: 520,
  totalCo2SavedKg: 24.1,
  completedTripsCount: 19,
};

export const useUserStore = create<UserStoreState>((set) => ({
  token: 'mock-jwt-token-eco-mutare',
  user: DEFAULT_DEMO_USER,
  isAuthenticated: true,
  isLoading: false,

  setToken: (token) => set({ token, isAuthenticated: !!token }),
  setUser: (user) => set({ user, isAuthenticated: !!user }),

  updatePreferences: (newPrefs) =>
    set((state) => {
      if (!state.user) return state;
      return {
        user: {
          ...state.user,
          preferences: { ...state.user.preferences, ...newPrefs },
        },
      };
    }),

  addEcoPoints: (points, co2SavedGrams) =>
    set((state) => {
      if (!state.user) return state;
      return {
        user: {
          ...state.user,
          totalEcoPoints: state.user.totalEcoPoints + points,
          totalCo2SavedKg: Number((state.user.totalCo2SavedKg + co2SavedGrams / 1000).toFixed(2)),
          completedTripsCount: state.user.completedTripsCount + 1,
        },
      };
    }),

  logout: () => set({ token: null, user: null, isAuthenticated: false }),

  loginAsDemoUser: (role = 'student') =>
    set({
      token: 'demo-token-' + role,
      user: role === 'accessibility' ? ACCESSIBLE_DEMO_USER : DEFAULT_DEMO_USER,
      isAuthenticated: true,
    }),
}));
