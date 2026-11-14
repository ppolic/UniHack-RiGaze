import { apiFetch } from './api';
import { assertSession, captureSession, isRecord, nonnegative, nonnegativeInteger, positiveId, verifyAccount } from './fe2Session';
import { RewardCoupon, RewardRedemption, RedemptionRecord, TripHistoryItem } from '../types/rewards';
import { useUserStore } from '../store/userStore';
import { getAppLanguage, getTranslations } from '../hooks/useTranslation';

const localize = (ro: string, en: string) => getAppLanguage() === 'en' ? en : ro;

let redeeming = false;
let mutationVersion = 0;

function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})T/.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export const rewardsService = {
  async getBalance(): Promise<number> {
    const session = captureSession();
    const initial = useUserStore.getState().user!;
    const startedVersion = mutationVersion;
    const account = await verifyAccount(session);
    const latest = useUserStore.getState();
    if (latest.user && latest.user.totalEcoPoints === initial.totalEcoPoints && startedVersion === mutationVersion && !redeeming) {
      latest.setUser({ ...latest.user, totalEcoPoints: account.balance });
    }
    return account.balance;
  },

  async getCoupons(): Promise<RewardCoupon[]> {
    const session = captureSession();
    const response = await apiFetch<unknown>('/rewards', {}, session.token);
    assertSession(session);
    if (!Array.isArray(response)) throw new Error(localize("Catalogul returnat de server nu este valid.", "The server returned an invalid reward catalog."));
    const ids = new Set<number>();
    return response.flatMap((item: unknown) => {
      if (!isRecord(item) || !positiveId(item.id) || ids.has(item.id) || typeof item.name !== 'string' || !item.name.trim() ||
          !(item.description === null || item.description === undefined || typeof item.description === 'string') ||
          !nonnegativeInteger(item.pointsCost) || typeof item.isActive !== 'boolean') {
        throw new Error(localize("O recompensă din catalog nu poate fi verificată.", "A reward in the catalog could not be verified."));
      }
      ids.add(item.id);
      return item.isActive ? [{
        id: String(item.id), title: item.name, description: item.description ?? '', pointsCost: item.pointsCost,
      }] : [];
    });
  },

  async redeemCoupon(couponId: string): Promise<RewardRedemption> {
    if (!/^[1-9]\d*$/.test(couponId) || !Number.isSafeInteger(Number(couponId))) {
      throw new Error(localize("Identificatorul recompensei nu este valid.", "The reward identifier is invalid."));
    }
    if (redeeming) throw new Error(localize("O activare este deja în curs. Așteaptă confirmarea serverului.", "A redemption is already pending. Wait for the server confirmation."));
    const session = captureSession();
    redeeming = true;
    mutationVersion += 1;
    try {
      const response = await apiFetch<unknown>('/rewards/' + couponId + '/redeem', { method: 'POST' }, session.token);
      assertSession(session);
      if (!isRecord(response) || response.rewardId !== Number(couponId) || !positiveId(response.transactionId) ||
          !nonnegativeInteger(response.pointsSpent) || !nonnegativeInteger(response.newBalance) ||
          typeof response.discountCode !== 'string' || !response.discountCode.trim()) {
        throw new Error(localize("Activarea nu a putut fi confirmată. Reîncarcă soldul și istoricul înainte de a reîncerca.", "Redemption could not be confirmed. Reload your balance and history before retrying."));
      }
      return {
        success: true, rewardId: couponId, transactionId: String(response.transactionId),
        promoCode: response.discountCode.trim(), newBalance: response.newBalance, pointsSpent: response.pointsSpent,
      };
    } finally {
      redeeming = false;
      mutationVersion += 1;
    }
  },

  async getRedemptions(): Promise<RedemptionRecord[]> {
    const session = captureSession();
    const records: RedemptionRecord[] = [];
    const ids = new Set<number>();
    let offset = 0;
    let expectedCount: number | undefined;
    // The API has no redemption-only filter; paginate the confirmed ledger.
    // Reject incomplete/unstable histories instead of treating them as empty.
    for (let page = 0; page < 50; page += 1) {
      const response = await apiFetch<unknown>('/points?skip=' + offset + '&take=200', {}, session.token);
      assertSession(session);
      if (!isRecord(response) || !nonnegativeInteger(response.totalCount) || !Array.isArray(response.transactions) ||
          !Number.isSafeInteger(response.balance) || response.totalCount < response.transactions.length ||
          (expectedCount !== undefined && response.totalCount !== expectedCount)) {
        throw new Error(localize("Istoricul activărilor s-a schimbat sau nu este valid. Reîncarcă datele.", "Redemption history changed or is invalid. Reload the data."));
      }
      expectedCount = response.totalCount;
      if (response.transactions.length === 0 && offset < expectedCount) {
        throw new Error(localize("Istoricul activărilor este incomplet. Încearcă din nou.", "Redemption history is incomplete. Please retry."));
      }
      for (const item of response.transactions) {
        if (!isRecord(item) || !positiveId(item.id) || ids.has(item.id) || !Number.isSafeInteger(item.points) ||
            typeof item.type !== 'string' || !validDate(item.createdAt) ||
            !(item.description === null || item.description === undefined || typeof item.description === 'string')) {
          throw new Error(localize("O tranzacție nu poate fi verificată. Reîncarcă istoricul.", "A transaction could not be verified. Reload the history."));
        }
        ids.add(item.id);
        if (item.type === 'Redeemed') {
          if ((item.points as number) > 0 || !(item.rewardId === null || positiveId(item.rewardId))) {
            throw new Error(localize("Datele unei activări nu sunt valide.", "A redemption record is invalid."));
          }
          records.push({
            transactionId: String(item.id), rewardId: item.rewardId === null ? null : String(item.rewardId),
            pointsSpent: -(item.points as number), createdAt: item.createdAt, description: item.description ?? null,
          });
        }
      }
      offset += response.transactions.length;
      if (offset === expectedCount) return records;
      if (offset > expectedCount) throw new Error(localize("Istoricul activărilor este inconsistent. Reîncarcă datele.", "Redemption history is inconsistent. Reload the data."));
    }
    throw new Error(localize("Istoricul contului este prea mare pentru încărcarea completă. Este necesară filtrarea activărilor pe server.", "The account history is too large to load completely. Redemption filtering is required on the server."));
  },

  async getTripHistory(): Promise<TripHistoryItem[]> {
    const session = captureSession();
    const initial = useUserStore.getState().user!;
    const startedVersion = mutationVersion;
    const summary = await apiFetch<unknown>('/trips', {}, session.token);
    assertSession(session);
    if (!isRecord(summary) || summary.userId !== session.userId || !Array.isArray(summary.trips) ||
        !nonnegativeInteger(summary.totalTripsCount) || !nonnegative(summary.totalCo2SavedKg) ||
        !nonnegativeInteger(summary.currentPointsBalance)) {
      throw new Error(localize("Istoricul călătoriilor returnat de server nu este valid.", "The server returned invalid trip history."));
    }
    const ids = new Set<number>();
    const trips = summary.trips.map((item: unknown): TripHistoryItem => {
      if (!isRecord(item) || !positiveId(item.id) || ids.has(item.id) || typeof item.mode !== 'string' || !item.mode.trim() ||
          !(item.originName === null || item.originName === undefined || typeof item.originName === 'string') ||
          !(item.destinationName === null || item.destinationName === undefined || typeof item.destinationName === 'string') ||
          !nonnegative(item.distanceKm) || !nonnegative(item.durationMinutes) || !nonnegative(item.co2SavedGrams) ||
          !nonnegativeInteger(item.pointsEarned) || !validDate(item.startedAt)) {
        throw new Error(localize("Datele unei călătorii nu pot fi verificate.", "A trip record could not be verified."));
      }
      ids.add(item.id);
      return {
        id: String(item.id), date: new Date(item.startedAt).toLocaleString(getAppLanguage() === 'en' ? 'en-GB' : 'ro-RO'),
        originName: item.originName?.trim() || getTranslations().svcDefaultStopA,
        destinationName: item.destinationName?.trim() || getTranslations().svcDefaultStopB,
        mode: item.mode, distanceKm: item.distanceKm, durationMinutes: item.durationMinutes,
        co2SavedGrams: Math.round(item.co2SavedGrams), pointsEarned: item.pointsEarned,
      };
    });
    // Keep updates made by FE1 or Profile while this request was pending.
    const latest = useUserStore.getState();
    if (latest.user) {
      latest.setUser({
        ...latest.user,
        totalEcoPoints: latest.user.totalEcoPoints === initial.totalEcoPoints && startedVersion === mutationVersion && !redeeming
          ? summary.currentPointsBalance : latest.user.totalEcoPoints,
        totalCo2SavedKg: latest.user.totalCo2SavedKg === initial.totalCo2SavedKg ? summary.totalCo2SavedKg : latest.user.totalCo2SavedKg,
        completedTripsCount: latest.user.completedTripsCount === initial.completedTripsCount ? summary.totalTripsCount : latest.user.completedTripsCount,
      });
    }
    return trips;
  },
};
