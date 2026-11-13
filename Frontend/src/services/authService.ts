import { apiFetch, API_CONFIG } from './api';
import { UserProfile } from '../types/user';

export interface LoginPayload {
  email: string;
  password?: string;
}

export interface RegisterPayload {
  email: string;
  password?: string;
  fullName: string;
  birthDate: string;
  hasDisability: boolean;
  hasOwnBicycle: boolean;
  hasOwnScooter: boolean;
  hasOwnCar: boolean;
}

export interface AuthResponse {
  token: string;
  user: UserProfile;
}

export const authService = {
  async login(payload: LoginPayload): Promise<AuthResponse> {
    if (API_CONFIG.USE_MOCK_FALLBACK) {
      return {
        token: 'mock-jwt-token-12345',
        user: {
          id: 'usr_1',
          email: payload.email,
          fullName: 'Timișoara Citizen',
          birthDate: '2002-04-10',
          age: 24,
          preferences: {
            hasDisability: false,
            hasOwnBicycle: true,
            hasOwnScooter: false,
            hasOwnCar: true,
            preferredModes: ['Bicycle', 'PublicTransit'],
          },
          totalEcoPoints: 280,
          totalCo2SavedKg: 14.2,
          completedTripsCount: 11,
        },
      };
    }
    return apiFetch<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async register(payload: RegisterPayload): Promise<AuthResponse> {
    if (API_CONFIG.USE_MOCK_FALLBACK) {
      return {
        token: 'mock-jwt-token-registered',
        user: {
          id: 'usr_new',
          email: payload.email,
          fullName: payload.fullName,
          birthDate: payload.birthDate,
          age: 22,
          preferences: {
            hasDisability: payload.hasDisability,
            hasOwnBicycle: payload.hasOwnBicycle,
            hasOwnScooter: payload.hasOwnScooter,
            hasOwnCar: payload.hasOwnCar,
            preferredModes: payload.hasDisability ? ['PublicTransit', 'CarWithParking'] : ['Bicycle', 'PublicTransit'],
          },
          totalEcoPoints: 50, // Welcome bonus
          totalCo2SavedKg: 0,
          completedTripsCount: 0,
        },
      };
    }
    return apiFetch<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
