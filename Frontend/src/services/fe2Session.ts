import { apiFetch, ApiHttpError, isRealJwtToken } from './api';
import { useUserStore } from '../store/userStore';

let generation = 0;
useUserStore.subscribe((next, previous) => {
  if (next.user?.id !== previous.user?.id || next.token !== previous.token || next.isAuthenticated !== previous.isAuthenticated) generation += 1;
});

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
export const nonnegative = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;
export const nonnegativeInteger = (value: unknown): value is number => nonnegative(value) && Number.isSafeInteger(value);
export const positiveId = (value: unknown): value is number => nonnegativeInteger(value) && value > 0;

export function captureSession() {
  const { user, token, isAuthenticated } = useUserStore.getState();
  if (!isAuthenticated || !user || !isRealJwtToken(token) || !/^[1-9]\d*$/.test(user.id) || !Number.isSafeInteger(Number(user.id))) {
    throw new Error('Autentifică-te din nou pentru a continua.');
  }
  return { userId: Number(user.id), token, generation };
}

export function assertSession(session: ReturnType<typeof captureSession>) {
  const current = captureSession();
  if (current.userId !== session.userId || current.token !== session.token || current.generation !== session.generation) {
    throw new Error('Sesiunea s-a schimbat. Reîncarcă datele după autentificare.');
  }
}

function verifiedAge(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T|$)/.exec(value);
  if (!match || !Number.isFinite(Date.parse(value))) return null;
  const [, yearText, monthText, dayText] = match;
  const [year, month, day] = [yearText, monthText, dayText].map(Number);
  const birthDate = new Date(0);
  birthDate.setHours(0, 0, 0, 0);
  birthDate.setFullYear(year, month - 1, day);
  const today = new Date();
  if (year < 1 || birthDate.getFullYear() !== year || birthDate.getMonth() !== month - 1 || birthDate.getDate() !== day || birthDate > today) return null;
  const beforeBirthday = today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day);
  return today.getFullYear() - year - (beforeBirthday ? 1 : 0);
}

export async function verifyAccount(session: ReturnType<typeof captureSession>) {
  const response = await apiFetch<unknown>('/auth/me', {}, session.token);
  assertSession(session);
  if (!isRecord(response) || response.userId !== session.userId || !nonnegativeInteger(response.pointsBalance)) {
    throw new Error('Serverul nu a confirmat datele contului.');
  }
  return { balance: response.pointsBalance, age: verifiedAge(response.birthDate) };
}

export function fe2ErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiHttpError) {
    if (error.status === 401 || error.status === 403) return 'Sesiunea a expirat sau accesul a fost refuzat. Autentifică-te din nou.';
    if (error.status === 409) return 'Serverul a refuzat o activare repetată sau o recompensă inactivă. Reîncarcă datele înainte de a continua.';
    if (error.status === 400) return 'Serverul a respins operația. Verifică soldul și datele înainte de a încerca din nou.';
    return fallback;
  }
  return error instanceof Error && error.name !== 'AbortError' && !(error instanceof TypeError) && !(error instanceof SyntaxError) ? error.message : fallback;
}
