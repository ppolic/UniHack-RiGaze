import { apiFetch, ApiHttpError, isRealJwtToken } from './api';
import { useUserStore } from '../store/userStore';
import { ChallengeDefinition, CreateIssueReport, IssueReportReceipt, issueCategories } from '../types/community';

class CommunitySessionError extends Error {}
class CommunityResponseError extends Error {}
class CommunityBusyError extends Error {}

// Survives screen remounts; only one report submission may be in flight.
let reportPending = false;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isNonnegative = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

function currentSession() {
  const { user, token, isAuthenticated } = useUserStore.getState();
  if (!isAuthenticated || !user || !isRealJwtToken(token) || !/^[1-9]\d*$/.test(user.id)) {
    throw new CommunitySessionError('Autentifică-te din nou pentru a continua.');
  }
  return { userId: user.id, token };
}

function assertSession(session: ReturnType<typeof currentSession>) {
  const current = currentSession();
  if (current.userId !== session.userId || current.token !== session.token) {
    throw new CommunitySessionError('Sesiunea s-a schimbat. Revino în ecran și încearcă din nou.');
  }
}

async function verifiedSession() {
  const session = currentSession();
  // These two controllers lack [Authorize]. Verify the JWT using the existing
  // protected identity endpoint, and never use their demo userId query fallback.
  const identity = await apiFetch<unknown>('/auth/me', {}, session.token);
  assertSession(session);
  if (!isObject(identity) || identity.userId !== Number(session.userId)) {
    throw new CommunitySessionError('Serverul nu a confirmat sesiunea contului tău. Autentifică-te din nou.');
  }
  return session;
}

export function communityErrorMessage(error: unknown, operation: 'load' | 'submit'): string {
  if (error instanceof CommunitySessionError || error instanceof CommunityBusyError) return error.message;
  if (error instanceof ApiHttpError && (error.status === 401 || error.status === 403)) {
    return 'Sesiunea nu mai este validă. Autentifică-te din nou pentru a continua.';
  }
  if (operation === 'submit') {
    if (error instanceof ApiHttpError && error.status === 400) {
      return 'Serverul a respins datele. Verifică formularul și încearcă din nou.';
    }
    // A timeout or malformed response does not prove that the POST was rejected.
    return 'Nu am putut confirma trimiterea. Cererea poate să fi ajuns la server; retrimiterea poate crea un duplicat. Datele formularului au fost păstrate.';
  }
  return 'Nu am putut încărca provocările. Verifică conexiunea și încearcă din nou.';
}

export const communityService = {
  async getChallenges(): Promise<ChallengeDefinition[]> {
    const session = await verifiedSession();
    const response = await apiFetch<unknown>('/challenges/overview', {}, session.token);
    assertSession(session);
    if (!isObject(response) || response.userId !== Number(session.userId) || !Array.isArray(response.personalChallenges)) {
      throw new CommunityResponseError('Invalid challenges response.');
    }
    const ids = new Set<string>();
    return response.personalChallenges.map((item: unknown) => {
      if (!isObject(item) || typeof item.id !== 'string' || !item.id.trim() || ids.has(item.id) ||
          typeof item.title !== 'string' || !item.title.trim() || typeof item.description !== 'string' ||
          typeof item.category !== 'string' || !isNonnegative(item.targetValue) || typeof item.unit !== 'string' ||
          !isNonnegative(item.rewardPoints) || !Number.isSafeInteger(item.rewardPoints) ||
          typeof item.adaptedForAccessibility !== 'boolean') {
        throw new CommunityResponseError('Invalid challenge definition.');
      }
      ids.add(item.id);
      // Intentionally omit currentValue, progressPercent, isCompleted, isClaimed,
      // userName, balance and city rankings: the controller fabricates fallback data.
      return {
        id: item.id, title: item.title, description: item.description, category: item.category,
        targetValue: item.targetValue, unit: item.unit, rewardPoints: item.rewardPoints,
        adaptedForAccessibility: item.adaptedForAccessibility,
      };
    });
  },

  async createReport(request: CreateIssueReport): Promise<IssueReportReceipt> {
    if (!issueCategories.includes(request.category) || !request.description.trim() || request.description.trim().length > 600 ||
        (request.streetOrZone?.trim().length ?? 0) > 150 ||
        !Number.isFinite(request.latitude) || Math.abs(request.latitude) > 90 ||
        !Number.isFinite(request.longitude) || Math.abs(request.longitude) > 180) {
      throw new Error('Invalid report fields.');
    }
    if (reportPending) {
      throw new CommunityBusyError('O raportare este deja în curs de trimitere. Așteaptă confirmarea înainte de a încerca din nou.');
    }
    reportPending = true;
    try {
      const session = await verifiedSession();
      const response = await apiFetch<unknown>('/reports', {
        method: 'POST',
        body: JSON.stringify({
          category: request.category,
          description: request.description.trim(),
          streetOrZone: request.streetOrZone?.trim() || undefined,
          latitude: request.latitude,
          longitude: request.longitude,
          // Omit userId: the backend must derive identity from the Bearer token.
        }),
      }, session.token);
      assertSession(session);
      const report = isObject(response) ? response.report : undefined;
      if (!isObject(report) || typeof report.id !== 'number' || !Number.isSafeInteger(report.id) || report.id <= 0 ||
          report.category !== request.category || report.description !== request.description.trim() ||
          typeof report.streetOrZone !== 'string' || !isObject(report.location) ||
          typeof report.location.lat !== 'number' || !Number.isFinite(report.location.lat) ||
          typeof report.location.lng !== 'number' || !Number.isFinite(report.location.lng) ||
          Math.abs(report.location.lat - request.latitude) > 0.00000001 ||
          Math.abs(report.location.lng - request.longitude) > 0.00000001) {
        throw new CommunityResponseError('Report receipt was not confirmed.');
      }
      // awardedEcoPoints is not proof of a persisted award in the current backend.
      // Do not modify the shared balance or trip totals from this response.
      return {
        id: report.id, category: request.category, description: report.description,
        streetOrZone: report.streetOrZone, latitude: report.location.lat, longitude: report.location.lng,
      };
    } finally {
      reportPending = false;
    }
  },
};
