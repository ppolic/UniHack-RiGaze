/**
 * Base API Client for EcoMutare
 * Supports dynamic IP switching for physical devices on local network.
 */

export const API_CONFIG = {
  // Zamijeni s lokalnim IP-jem računala ako testiraš s mobitela preko Expo Go (npr. 'http://192.168.1.15:5279')
  BASE_URL: 'http://localhost:5279',
  USE_MOCK_FALLBACK: true,
  TIMEOUT_MS: 4000,
};

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
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
      throw new Error(`API Error [${response.status}]: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}
