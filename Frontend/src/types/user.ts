/**
 * FE2: User & Profile Types
 */

export interface UserPreferences {
  hasDisability: boolean;
  hasOwnBicycle: boolean;
  hasOwnScooter: boolean;
  hasOwnCar: boolean;
  preferredModes: string[];
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  birthDate: string; // YYYY-MM-DD
  age: number;
  preferences: UserPreferences;
  totalEcoPoints: number;
  totalCo2SavedKg: number;
  completedTripsCount: number;
}

export interface AuthState {
  token: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
