import { create } from 'zustand';
import { UserProfile, UserPreferences } from '../types/user';

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
  addEcoPoints: (points: number, co2SavedGrams: number) => void;
  logout: () => void;
  loginAsDemoUser: (role?: DemoUserRole) => void;
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

const TEEN_15_DEMO_USER: UserProfile = {
  id: 'usr_demo_teen15',
  email: 'andrei.teen@ecomutare.tm',
  fullName: 'Andrei Munteanu (15g)',
  birthDate: '2011-03-10',
  age: 15,
  preferences: {
    hasDisability: false,
    hasOwnBicycle: true,
    hasOwnScooter: true,
    hasOwnCar: false,
    preferredModes: ['Bicycle', 'Scooter'],
  },
  totalEcoPoints: 210,
  totalCo2SavedKg: 11.2,
  completedTripsCount: 9,
};

const CHILD_12_DEMO_USER: UserProfile = {
  id: 'usr_demo_child12',
  email: 'elena.elev@ecomutare.tm',
  fullName: 'Elena Dumitru (12g)',
  birthDate: '2014-07-04',
  age: 12,
  preferences: {
    hasDisability: false,
    hasOwnBicycle: false,
    hasOwnScooter: false,
    hasOwnCar: false,
    preferredModes: ['PublicTransit', 'Walking'],
  },
  totalEcoPoints: 180,
  totalCo2SavedKg: 8.5,
  completedTripsCount: 7,
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

  loginAsDemoUser: (role = 'student') => {
    const profileMap: Record<DemoUserRole, UserProfile> = {
      student: DEFAULT_DEMO_USER,
      accessibility: ACCESSIBLE_DEMO_USER,
      teen_15: TEEN_15_DEMO_USER,
      child_12: CHILD_12_DEMO_USER,
    };
    set({
      token: 'demo-token-' + role,
      user: profileMap[role] || DEFAULT_DEMO_USER,
      isAuthenticated: true,
    });
  },
}));
