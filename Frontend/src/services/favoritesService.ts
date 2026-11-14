import { apiFetch } from './api';
import { getTranslations } from '../hooks/useTranslation';
import { assertSession, captureSession, isRecord, positiveId, verifyAccount } from './fe2Session';
import { FavoriteRoute } from '../types/favorites';
import { TransportMode } from '../types/route';

const modes = new Set(['Walk', 'Bike', 'Scooter', 'PublicTransport', 'Car', 'Carpool', 'Combined']);
function point(value: unknown): value is { lat: number; lng: number } {
  return isRecord(value) && typeof value.lat === 'number' && Number.isFinite(value.lat) && Math.abs(value.lat) <= 90 &&
    typeof value.lng === 'number' && Number.isFinite(value.lng) && Math.abs(value.lng) <= 180;
}

export const favoritesService = {
  async getFavorites(): Promise<FavoriteRoute[]> {
    const t = getTranslations();
    const session = captureSession();
    // The favorites controller is public and trusts its query userId.
    await verifyAccount(session);
    const response = await apiFetch<unknown>('/favorites?userId=' + session.userId, {}, session.token);
    assertSession(session);
    if (!Array.isArray(response)) throw new Error(t.favoritesListInvalidError);
    const ids = new Set<number>();
    return response.flatMap((item: unknown) => {
      if (!isRecord(item)) throw new Error(t.favoritesItemInvalidError);
      // Backend deliberately includes userId:null shared examples. Never present
      // those, foreign records or missing ownership as this user's favorites.
      if (item.userId !== session.userId) return [];
      if (!positiveId(item.id) || ids.has(item.id) || typeof item.name !== 'string' || !item.name.trim() ||
          typeof item.originName !== 'string' || typeof item.destinationName !== 'string' ||
          !point(item.origin) || !point(item.destination) || typeof item.preferredMode !== 'string' ||
          !modes.has(item.preferredMode) || typeof item.requiresStepFreeAccess !== 'boolean') {
        throw new Error(t.favoritesRecordUnverifiedError);
      }
      ids.add(item.id);
      return [{
        id: String(item.id), userId: String(item.userId), name: item.name,
        originName: item.originName, origin: { ...item.origin }, destinationName: item.destinationName,
        destination: { ...item.destination }, preferredMode: item.preferredMode as TransportMode,
        requiresStepFreeAccess: item.requiresStepFreeAccess,
      }];
    });
  },
  // No POST/DELETE wrapper until backend enforces ownership and stops swallowing
  // database failures. A 200 response currently cannot attest to persistence.
};
