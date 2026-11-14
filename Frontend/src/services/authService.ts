import { apiFetch, API_CONFIG, ApiHttpError } from './api';
import { UserProfile } from '../types/user';
import { AgeCategory } from '../types/route';

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

export interface UpdateProfilePayload {
  fullName?: string;
  birthDate?: string;
  hasDisability?: boolean;
  hasOwnBicycle?: boolean;
  hasOwnScooter?: boolean;
  hasOwnCar?: boolean;
}

export interface BackendAuthResponse {
  token: string;
  expiresAtUtc?: string;
  userId: number;
  email: string;
  displayName: string;
  pointsBalance: number;
  birthDate?: string | null;
  ageCategory: AgeCategory;
  hasDisability: boolean;
  ownsBike: boolean;
  ownsScooter: boolean;
  ownsCar: boolean;
  verifiedOrganization?: string | null;
  organizationBadge?: string;
  passkeyEnabled?: boolean;
  trustScore?: number;
  trustBadge?: string;
}

export interface AuthResponse {
  token: string;
  user: UserProfile;
}

export const DEMO_CREDENTIALS: Record<
  'student' | 'accessibility' | 'teen_15' | 'child_12',
  { email: string; password: string }
> = {
  student: { email: 'ana.student@upt.ro', password: 'Demo123!' },
  accessibility: { email: 'marko.kolica@uvt.ro', password: 'Demo123!' },
  teen_15: { email: 'elena.tinejdzer@tm.ro', password: 'Demo123!' },
  child_12: { email: 'david.ucenik@tm.ro', password: 'Demo123!' },
};

function computeAge(birthDateIso?: string | null, ageCategory?: AgeCategory): number {
  if (birthDateIso) {
    const datePart = birthDateIso.split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    if (year && month && day) {
      const today = new Date();
      let age = today.getFullYear() - year;
      const beforeBirthday =
        today.getMonth() + 1 < month ||
        (today.getMonth() + 1 === month && today.getDate() < day);
      if (beforeBirthday) age -= 1;
      if (Number.isFinite(age) && age >= 0) return age;
    }
  }
  if (ageCategory === 'Under14') return 12;
  if (ageCategory === 'From14To15') return 15;
  return 22;
}

export function mapAuthResponseToUserProfile(
  res: BackendAuthResponse,
  existing?: Partial<UserProfile>
): UserProfile {
  const birthDate = res.birthDate ? res.birthDate.split('T')[0] : existing?.birthDate || '2003-05-14';
  const preferredModes = res.hasDisability
    ? ['PublicTransit', 'CarWithParking']
    : res.ownsBike
    ? ['Bicycle', 'PublicTransit']
    : ['PublicTransit', 'Walking'];

  return {
    id: String(res.userId),
    email: res.email,
    fullName: res.displayName,
    birthDate,
    age: computeAge(res.birthDate, res.ageCategory),
    preferences: {
      hasDisability: res.hasDisability,
      hasOwnBicycle: res.ownsBike,
      hasOwnScooter: res.ownsScooter,
      hasOwnCar: res.ownsCar,
      preferredModes,
      wcagLargeText: existing?.preferences?.wcagLargeText ?? false,
      wcagTextRouteMode: existing?.preferences?.wcagTextRouteMode ?? false,
    },
    totalEcoPoints: res.pointsBalance,
    totalCo2SavedKg: existing?.totalCo2SavedKg ?? 0,
    completedTripsCount: existing?.completedTripsCount ?? 0,
  };
}

export const authService = {
  async login(payload: LoginPayload): Promise<AuthResponse> {
    if (API_CONFIG.USE_MOCK_FALLBACK) {
      return {
        token: 'mock-jwt-token-12345',
        user: {
          id: 'usr_1',
          email: payload.email,
          fullName: 'Ana Popescu (Studentica UPT)',
          birthDate: '2003-05-14',
          age: 23,
          preferences: {
            hasDisability: false,
            hasOwnBicycle: true,
            hasOwnScooter: false,
            hasOwnCar: false,
            preferredModes: ['Bicycle', 'PublicTransit'],
          },
          totalEcoPoints: 320,
          totalCo2SavedKg: 0.42,
          completedTripsCount: 2,
        },
      };
    }

    try {
      const res = await apiFetch<BackendAuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: payload.email.trim(),
          password: payload.password || 'Demo123!',
        }),
      });
      return {
        token: res.token,
        user: mapAuthResponseToUserProfile(res),
      };
    } catch (err) {
      if (err instanceof ApiHttpError && (err.status === 400 || err.status === 401)) {
        throw err;
      }
      throw err;
    }
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
          age: computeAge(payload.birthDate),
          preferences: {
            hasDisability: payload.hasDisability,
            hasOwnBicycle: payload.hasOwnBicycle,
            hasOwnScooter: payload.hasOwnScooter,
            hasOwnCar: payload.hasOwnCar,
            preferredModes: payload.hasDisability
              ? ['PublicTransit', 'CarWithParking']
              : ['Bicycle', 'PublicTransit'],
          },
          totalEcoPoints: 50,
          totalCo2SavedKg: 0,
          completedTripsCount: 0,
        },
      };
    }

    const rawPassword = payload.password?.trim() || '';
    const password = rawPassword.length >= 8 ? rawPassword : 'Demo123!';
    const res = await apiFetch<BackendAuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: payload.email.trim(),
        password,
        displayName: payload.fullName.trim(),
        birthDate: `${payload.birthDate.trim()}T00:00:00Z`,
        hasDisability: payload.hasDisability,
        ownsBike: payload.hasOwnBicycle,
        ownsScooter: payload.hasOwnScooter,
        ownsCar: payload.hasOwnCar,
      }),
    });

    return {
      token: res.token,
      user: mapAuthResponseToUserProfile(res),
    };
  },

  async getMe(existing?: Partial<UserProfile>): Promise<AuthResponse> {
    const res = await apiFetch<BackendAuthResponse>('/auth/me');
    return {
      token: res.token,
      user: mapAuthResponseToUserProfile(res, existing),
    };
  },

  async updateProfile(
    patch: UpdateProfilePayload,
    existing?: Partial<UserProfile>
  ): Promise<AuthResponse> {
    const body: Record<string, unknown> = {};
    if (patch.fullName !== undefined) body.displayName = patch.fullName.trim();
    if (patch.birthDate !== undefined) body.birthDate = `${patch.birthDate.trim()}T00:00:00Z`;
    if (patch.hasDisability !== undefined) body.hasDisability = patch.hasDisability;
    if (patch.hasOwnBicycle !== undefined) body.ownsBike = patch.hasOwnBicycle;
    if (patch.hasOwnScooter !== undefined) body.ownsScooter = patch.hasOwnScooter;
    if (patch.hasOwnCar !== undefined) body.ownsCar = patch.hasOwnCar;

    const res = await apiFetch<BackendAuthResponse>('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(body),
    });

    return {
      token: res.token,
      user: mapAuthResponseToUserProfile(res, existing),
    };
  },
};
