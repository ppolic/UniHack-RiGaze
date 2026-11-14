/**
 * Base API Client for EcoMutare
 * Supports dynamic IP switching for physical devices on local network.
 */

const ENV_API_URL =
  typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL
    ? process.env.EXPO_PUBLIC_API_URL.trim().replace(/\/+$/, '')
    : null;

export const API_CONFIG = {
  // Zamijeni s lokalnim IP-jem računala ako testiraš s mobitela preko Expo Go (npr. 'http://192.168.1.15:5279')
  BASE_URL: ENV_API_URL || 'http://localhost:5279',
  USE_MOCK_FALLBACK: false,
  TIMEOUT_MS: 6000,
};

let authTokenGetter: (() => string | null) | null = null;

export function registerAuthTokenGetter(getter: () => string | null): void {
  authTokenGetter = getter;
}

export function isRealJwtToken(token?: string | null): token is string {
  return (
    typeof token === 'string' &&
    token.length > 0 &&
    !token.startsWith('mock-') &&
    !token.startsWith('demo-') &&
    token !== 'token-registered'
  );
}

export class ApiHttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiHttpError';
    this.status = status;
  }
}

export function setUseMockFallback(enabled: boolean): void {
  API_CONFIG.USE_MOCK_FALLBACK = enabled;
}

export function setApiBaseUrl(url: string): void {
  const cleaned = url.trim().replace(/\/+$/, '');
  if (cleaned) {
    API_CONFIG.BASE_URL = cleaned;
  }
}

export async function checkBackendHealth(): Promise<{
  ok: boolean;
  latencyMs?: number;
  message: string;
}> {
  const startedAt = Date.now();
  try {
    const health = await apiFetch<{ status?: string; mySqlConnected?: boolean }>('/health');
    const latencyMs = Date.now() - startedAt;
    const modeLabel = health?.mySqlConnected === false ? ' (In-Memory Fallback)' : '';
    return {
      ok: true,
      latencyMs,
      message: `Backend aktivan (${latencyMs} ms)${modeLabel}`,
    };
  } catch {
    try {
      await apiFetch('/routes/plan', {
        method: 'POST',
        body: JSON.stringify({
          origin: { lat: 45.7538, lng: 21.2257 },
          destination: { lat: 45.7489, lng: 21.2272 },
          profile: {
            ageCategory: 'Adult',
            hasDisability: false,
            ownsBike: true,
            ownsScooter: false,
            ownsCar: true,
          },
        }),
      });
      const latencyMs = Date.now() - startedAt;
      return {
        ok: true,
        latencyMs,
        message: `Backend aktivan (${latencyMs} ms)`,
      };
    } catch (err: any) {
      return {
        ok: false,
        message:
          err?.name === 'AbortError'
            ? `Timeout (${API_CONFIG.TIMEOUT_MS} ms) — koristite Offline Demo`
            : `Nedostupno (${API_CONFIG.BASE_URL}) — siguran Offline Demo je spreman`,
      };
    }
  }
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  const resolvedToken = token !== undefined ? token : authTokenGetter?.();
  if (isRealJwtToken(resolvedToken) && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${resolvedToken}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);

  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errBody = await response.json().catch(() => null);
      const serverMsg =
        errBody?.detail || errBody?.title || errBody?.error || errBody?.message;
      throw new ApiHttpError(
        response.status,
        serverMsg || `API Error [${response.status}]: ${response.statusText}`
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}
