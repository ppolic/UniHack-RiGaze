import { apiFetch } from './api';
import { getTranslations } from '../hooks/useTranslation';
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

function authenticatedResponse(res: BackendAuthResponse): AuthResponse {
  if (!res || typeof res.token !== 'string' || !res.token.trim() ||
      !Number.isSafeInteger(res.userId) || res.userId <= 0) {
    throw new Error(getTranslations().authUnconfirmedError);
  }
  return { token: res.token, user: mapAuthResponseToUserProfile(res) };
}

export const authService = {
  async establishAuth0Session(accessToken: string): Promise<AuthResponse & { expiresAtUtc: string }> {
    const res = await apiFetch<BackendAuthResponse>('/auth/me', {}, accessToken);
    if (!res || !Number.isSafeInteger(res.userId) || res.userId <= 0 || res.userId > 2147483647 ||
        typeof res.email !== 'string' || !res.email.trim() || typeof res.displayName !== 'string' || !res.displayName.trim() ||
        !Number.isSafeInteger(res.pointsBalance) || res.pointsBalance < 0 ||
        !['Under14', 'From14To15', 'Adult'].includes(res.ageCategory) ||
        [res.hasDisability, res.ownsBike, res.ownsScooter, res.ownsCar].some((value) => typeof value !== 'boolean') ||
        typeof res.expiresAtUtc !== 'string' || !Number.isFinite(Date.parse(res.expiresAtUtc)) ||
        Date.parse(res.expiresAtUtc) <= Date.now() || typeof res.token !== 'string') {
      throw new Error('Backend session was not confirmed.');
    }
    // The protected backend validates Auth0's token. These checks validate the
    // returned session's structure/identity/lifetime, not its signature in JavaScript.
    try {
      const parts = res.token.split('.');
      if (parts.length !== 3 || parts.some((part) => !/^[A-Za-z0-9_-]+$/.test(part))) throw new Error();
      const decode = (part: string) => JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=')));
      const header = decode(parts[0]);
      const claims = decode(parts[1]);
      if (header.alg !== 'HS256' || claims.sub !== String(res.userId) ||
          typeof claims.exp !== 'number' || claims.exp * 1000 <= Date.now() ||
          Math.abs(claims.exp * 1000 - Date.parse(res.expiresAtUtc)) > 2000) throw new Error();
    } catch {
      throw new Error('Backend session was not confirmed.');
    }
    return { ...authenticatedResponse(res), expiresAtUtc: res.expiresAtUtc };
  },

  async login(payload: LoginPayload): Promise<AuthResponse> {
    const res = await apiFetch<BackendAuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: payload.email.trim(),
        password: payload.password ?? '',
      }),
    });
    return authenticatedResponse(res);
  },

  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const res = await apiFetch<BackendAuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: payload.email.trim(),
        password: payload.password ?? '',
        displayName: payload.fullName.trim(),
        birthDate: `${payload.birthDate.trim()}T00:00:00Z`,
        hasDisability: payload.hasDisability,
        ownsBike: payload.hasOwnBicycle,
        ownsScooter: payload.hasOwnScooter,
        ownsCar: payload.hasOwnCar,
      }),
    });
    return authenticatedResponse(res);
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
