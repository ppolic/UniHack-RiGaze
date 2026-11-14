/**
 * FE2: User & Profile Types
 */

import { AgeCategory } from './route';

export interface UserPreferences {
  hasDisability: boolean;
  hasOwnBicycle: boolean;
  hasOwnScooter: boolean;
  hasOwnCar: boolean;
  preferredModes: string[];
  wcagLargeText?: boolean;
  wcagTextRouteMode?: boolean;
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

  // Auth0 Innovative Features:
  verifiedOrganization?: string | null;
  organizationBadge?: string;
  passkeyEnabled?: boolean;
  ageCategory?: AgeCategory;
  zeroKnowledgeAgeVerified?: boolean;
  trustScore?: number;
  trustBadge?: string;
  wazeVoteWeight?: number;
  emailVerified?: boolean;
}

export interface AuthState {
  token: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
