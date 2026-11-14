/**
 * Centralizirana konfiguracija okoline (zero hardcoding).
 * Sve vrijednosti dolaze isključivo iz EXPO_PUBLIC_* environment varijabli
 * (ili opcionalno iz /auth/auth0-config discoveryja na backendu).
 */

function readEnv(value?: string): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeUrl(value?: string): string {
  return readEnv(value).replace(/\/+$/, '');
}

function normalizeDomain(value?: string): string {
  return readEnv(value)
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '');
}

export const ENV = {
  API_URL: normalizeUrl(process.env.EXPO_PUBLIC_API_URL),
  AUTH0_DOMAIN: normalizeDomain(process.env.EXPO_PUBLIC_AUTH0_DOMAIN),
  AUTH0_CLIENT_ID: readEnv(process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID),
  AUTH0_AUDIENCE: readEnv(process.env.EXPO_PUBLIC_AUTH0_AUDIENCE),
} as const;

export function isAuth0EnvReady(): boolean {
  return Boolean(ENV.AUTH0_DOMAIN && ENV.AUTH0_CLIENT_ID && ENV.AUTH0_AUDIENCE);
}
