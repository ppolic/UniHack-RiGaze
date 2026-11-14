import { apiFetch } from './api';
import { assertSession, captureSession, isRecord, nonnegative, nonnegativeInteger, positiveId, verifyAccount } from './fe2Session';
import { RewardCoupon, RewardRedemption, RedemptionRecord, TripHistoryItem } from '../types/rewards';
import { useUserStore } from '../store/userStore';
import { getAppLanguage, getTranslations } from '../hooks/useTranslation';

let redeeming = false;
let mutationVersion = 0;

interface DemoRewardsState {
  balance: number;
  redemptions: (RedemptionRecord & { promoCode?: string })[];
}

const DEFAULT_DEMO_BALANCE = 420;
const demoStateByUser = new Map<string, DemoRewardsState>();

function getLocalizedDemoCoupons(): RewardCoupon[] {
  const isEn = getAppLanguage() === 'en';
  const nextMonth = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  return [
    {
      id: '101',
      partnerName: 'STPT Timișoara',
      title: isEn
        ? 'STPT: 1 Free Public Transit Ride'
        : 'STPT: 1 Călătorie Gratuită',
      description: isEn
        ? 'Valid on all STPT tram, trolleybus, and bus lines across Timișoara.'
        : 'Valabil pe toate liniile de tramvai, troleibuz și autobuz STPT din Timișoara.',
      pointsCost: 50,
      category: 'transit',
      discountValue: '100%',
      expiryDate: nextMonth,
    },
    {
      id: '102',
      partnerName: 'Ovazio Coffee Timișoara',
      title: isEn
        ? 'Ovazio Specialty Coffee: 50% Off'
        : 'Ovazio Specialty Coffee: Reducere 50%',
      description: isEn
        ? '50% discount on any espresso or flat white when arriving by bike or on foot.'
        : 'Reducere 50% la orice espresso sau flat white când vii cu bicicleta sau pe jos.',
      pointsCost: 80,
      category: 'coffee',
      discountValue: '-50%',
      expiryDate: nextMonth,
    },
    {
      id: '103',
      partnerName: 'VeloTM',
      title: isEn
        ? 'VeloTM: 24h City Bike Pass'
        : 'VeloTM: Abonament Bicicletă 24h',
      description: isEn
        ? 'Unlock unlimited 60-minute rides on Timișoara VeloTM bike-sharing stations.'
        : 'Deblochează curse nelimitate de 60 minute în stațiile VeloTM din Timișoara.',
      pointsCost: 100,
      category: 'transit',
      discountValue: '24h',
      expiryDate: nextMonth,
    },
    {
      id: '104',
      partnerName: 'Cărturești Timișoara',
      title: isEn
        ? 'Cărturești: 15 RON Book Voucher'
        : 'Cărturești: Voucher 15 RON',
      description: isEn
        ? '15 RON discount on books and stationery in Iulius Town or Mercy Street.'
        : 'Reducere de 15 RON la cărți și papetărie în Iulius Town sau Str. Mercy.',
      pointsCost: 150,
      category: 'bookstore',
      discountValue: '15 RON',
      expiryDate: nextMonth,
    },
    {
      id: '105',
      partnerName: 'Biocoop Piața Unirii',
      title: isEn
        ? 'Biocoop: 20% Off Local Produce'
        : 'Biocoop: 20% Reducere Produse Locale',
      description: isEn
        ? 'Save 20% on organic seasonal vegetables and zero-waste groceries.'
        : 'Economisești 20% la legume bio de sezon și produse zero-waste.',
      pointsCost: 200,
      category: 'groceries',
      discountValue: '-20%',
      expiryDate: nextMonth,
    },
    {
      id: '106',
      partnerName: 'BikeFix Bega',
      title: isEn
        ? 'BikeFix Bega: Free Safety Tune-Up'
        : 'BikeFix Bega: Revizie Gratuită Bicicletă',
      description: isEn
        ? 'Complete brake check, chain lubrication, and tire pressure service near Bega.'
        : 'Verificare frâne, ungere lanț și presiune anvelope lângă canalul Bega.',
      pointsCost: 300,
      category: 'repair',
      discountValue: isEn ? 'Free' : 'Gratuit',
      expiryDate: nextMonth,
    },
  ];
}

function getDemoState(userId: string): DemoRewardsState {
  const existing = demoStateByUser.get(userId);
  if (existing) return existing;

  const isEn = getAppLanguage() === 'en';
  const storeBalance = useUserStore.getState().user?.totalEcoPoints;
  const initialBalance =
    typeof storeBalance === 'number' && storeBalance > 100
      ? storeBalance
      : DEFAULT_DEMO_BALANCE;

  const created: DemoRewardsState = {
    balance: initialBalance,
    redemptions: [
      {
        transactionId: '9001',
        rewardId: null,
        pointsSpent: 60,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        description: isEn
          ? 'STPT: 24h Transit Pass (Demo)'
          : 'STPT: Abonament 24h (Demo)',
        promoCode: 'BG-STPT-2041',
      },
    ],
  };
  demoStateByUser.set(userId, created);
  return created;
}

function tryCaptureSession() {
  try {
    return captureSession();
  } catch {
    return null;
  }
}

function syncStoreBalance(balance: number) {
  const latest = useUserStore.getState();
  if (latest.user && latest.user.totalEcoPoints !== balance) {
    latest.setUser({ ...latest.user, totalEcoPoints: balance });
  }
}

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
    const session = tryCaptureSession();
    const initial = useUserStore.getState().user;
    if (!session || !initial) {
      const demo = getDemoState(initial?.id ?? 'demo-user');
      syncStoreBalance(demo.balance);
      return demo.balance;
    }

    const startedVersion = mutationVersion;
    try {
      const account = await verifyAccount(session);
      const latest = useUserStore.getState();
      if (latest.user && latest.user.totalEcoPoints === initial.totalEcoPoints && startedVersion === mutationVersion && !redeeming) {
        latest.setUser({ ...latest.user, totalEcoPoints: account.balance });
      }
      return account.balance;
    } catch {
      const demo = getDemoState(initial.id);
      syncStoreBalance(demo.balance);
      return demo.balance;
    }
  },

  async getCoupons(): Promise<RewardCoupon[]> {
    const t = getTranslations();
    const session = tryCaptureSession();
    if (!session) {
      return getLocalizedDemoCoupons();
    }

    try {
      const response = await apiFetch<unknown>('/rewards', {}, session.token);
      assertSession(session);
      if (!Array.isArray(response)) throw new Error(t.rewardsCatalogInvalid);
      const ids = new Set<number>();
      return response.flatMap((item: unknown) => {
        if (!isRecord(item) || !positiveId(item.id) || ids.has(item.id) || typeof item.name !== 'string' || !item.name.trim() ||
            !(item.description === null || item.description === undefined || typeof item.description === 'string') ||
            !nonnegativeInteger(item.pointsCost) || typeof item.isActive !== 'boolean') {
          throw new Error(t.rewardsCatalogItemInvalid);
        }
        ids.add(item.id);
        return item.isActive ? [{
          id: String(item.id), title: item.name, description: item.description ?? '', pointsCost: item.pointsCost,
        }] : [];
      });
    } catch {
      return getLocalizedDemoCoupons();
    }
  },

  async redeemCoupon(couponId: string): Promise<RewardRedemption> {
    const t = getTranslations();
    if (!/^[1-9]\d*$/.test(couponId) || !Number.isSafeInteger(Number(couponId))) {
      throw new Error(t.rewardsInvalidId);
    }
    if (redeeming) throw new Error(t.rewardsRedeemPending);
    const session = tryCaptureSession();
    redeeming = true;
    mutationVersion += 1;
    try {
      if (session) {
        const response = await apiFetch<unknown>('/rewards/' + couponId + '/redeem', { method: 'POST' }, session.token);
        assertSession(session);
        if (!isRecord(response) || response.rewardId !== Number(couponId) || !positiveId(response.transactionId) ||
            !nonnegativeInteger(response.pointsSpent) || !nonnegativeInteger(response.newBalance) ||
            typeof response.discountCode !== 'string' || !response.discountCode.trim()) {
          throw new Error(t.rewardsRedeemConfirmReload);
        }
        return {
          success: true, rewardId: couponId, transactionId: String(response.transactionId),
          promoCode: response.discountCode.trim(), newBalance: response.newBalance, pointsSpent: response.pointsSpent,
        };
      }

      const userId = useUserStore.getState().user?.id ?? 'demo-user';
      const demo = getDemoState(userId);
      const coupon = getLocalizedDemoCoupons().find((c) => c.id === couponId);
      if (!coupon) throw new Error(t.rewardsInvalidId);
      if (demo.balance < coupon.pointsCost) {
        throw new Error(t.rewardsMissingPoints(coupon.pointsCost - demo.balance));
      }

      const nextBalance = demo.balance - coupon.pointsCost;
      const txId = String(9000 + demo.redemptions.length + 1);
      const promoCode = `BG-${coupon.id}-${Math.floor(1000 + Math.random() * 9000)}`;
      demo.balance = nextBalance;
      demo.redemptions.unshift({
        transactionId: txId,
        rewardId: coupon.id,
        pointsSpent: coupon.pointsCost,
        createdAt: new Date().toISOString(),
        description: coupon.title,
        promoCode,
      });
      syncStoreBalance(nextBalance);

      return {
        success: true,
        rewardId: couponId,
        transactionId: txId,
        promoCode,
        newBalance: nextBalance,
        pointsSpent: coupon.pointsCost,
      };
    } finally {
      redeeming = false;
      mutationVersion += 1;
    }
  },

  async getRedemptions(): Promise<RedemptionRecord[]> {
    const t = getTranslations();
    const session = tryCaptureSession();
    const userId = useUserStore.getState().user?.id ?? 'demo-user';
    if (!session) {
      return getDemoState(userId).redemptions;
    }

    try {
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
          throw new Error(t.rewardsHistoryChanged);
        }
        expectedCount = response.totalCount;
        if (response.transactions.length === 0 && offset < expectedCount) {
          throw new Error(t.rewardsHistoryIncomplete);
        }
        for (const item of response.transactions) {
          if (!isRecord(item) || !positiveId(item.id) || ids.has(item.id) || !Number.isSafeInteger(item.points) ||
              typeof item.type !== 'string' || !validDate(item.createdAt) ||
              !(item.description === null || item.description === undefined || typeof item.description === 'string')) {
            throw new Error(t.rewardsTxUnverified);
          }
          ids.add(item.id);
          if (item.type === 'Redeemed') {
            if ((item.points as number) > 0 || !(item.rewardId === null || positiveId(item.rewardId))) {
              throw new Error(t.rewardsRecordInvalid);
            }
            records.push({
              transactionId: String(item.id), rewardId: item.rewardId === null ? null : String(item.rewardId),
              pointsSpent: -(item.points as number), createdAt: item.createdAt, description: item.description ?? null,
            });
          }
        }
        offset += response.transactions.length;
        if (offset === expectedCount) return records;
        if (offset > expectedCount) throw new Error(t.rewardsHistoryInconsistent);
      }
      throw new Error(t.rewardsHistoryTooLarge);
    } catch {
      return getDemoState(userId).redemptions;
    }
  },

  async getTripHistory(): Promise<TripHistoryItem[]> {
    const t = getTranslations();
    const session = captureSession();
    const initial = useUserStore.getState().user!;
    const startedVersion = mutationVersion;
    const summary = await apiFetch<unknown>('/trips', {}, session.token);
    assertSession(session);
    if (!isRecord(summary) || summary.userId !== session.userId || !Array.isArray(summary.trips) ||
        !nonnegativeInteger(summary.totalTripsCount) || !nonnegative(summary.totalCo2SavedKg) ||
        !nonnegativeInteger(summary.currentPointsBalance)) {
      throw new Error(t.rewardsTripsInvalid);
    }
    const ids = new Set<number>();
    const trips = summary.trips.map((item: unknown): TripHistoryItem => {
      if (!isRecord(item) || !positiveId(item.id) || ids.has(item.id) || typeof item.mode !== 'string' || !item.mode.trim() ||
          !(item.originName === null || item.originName === undefined || typeof item.originName === 'string') ||
          !(item.destinationName === null || item.destinationName === undefined || typeof item.destinationName === 'string') ||
          !nonnegative(item.distanceKm) || !nonnegative(item.durationMinutes) || !nonnegative(item.co2SavedGrams) ||
          !nonnegativeInteger(item.pointsEarned) || !validDate(item.startedAt)) {
        throw new Error(t.rewardsTripUnverified);
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
