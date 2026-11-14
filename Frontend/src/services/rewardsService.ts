import { apiFetch, API_CONFIG, ApiHttpError, isRealJwtToken } from './api';
import { RewardCoupon, TripHistoryItem } from '../types/rewards';
import { useUserStore } from '../store/userStore';

interface BackendRewardDto {
  id: number;
  name: string;
  description?: string | null;
  pointsCost: number;
  isActive: boolean;
}

interface BackendRedeemResponse {
  rewardId: number;
  rewardName: string;
  pointsSpent: number;
  newBalance: number;
  transactionId: number;
  discountCode: string;
}

interface BackendTripItemDto {
  id: number;
  mode: string;
  originName?: string | null;
  destinationName?: string | null;
  distanceKm: number;
  durationMinutes: number;
  co2SavedGrams: number;
  pointsEarned: number;
  startedAt: string;
}

interface BackendTripHistorySummaryResponse {
  userId: number;
  totalTripsCount: number;
  totalDistanceKm: number;
  totalCo2SavedKg: number;
  currentPointsBalance: number;
  trips: BackendTripItemDto[];
}

function mapRewardDto(dto: BackendRewardDto): RewardCoupon {
  const text = `${dto.name} ${dto.description || ''}`.toLowerCase();
  let category: RewardCoupon['category'] = 'transit';
  let partnerName = 'BeGreen Timișoara Partner';
  let discountValue = `${dto.pointsCost} eco-bodova`;

  if (text.includes('kav') || text.includes('coffee') || text.includes('tucano')) {
    category = 'coffee';
    partnerName = text.includes('tucano')
      ? 'Tucano Coffee Iulius Town'
      : 'Timișoara Specialty Coffee';
    discountValue = text.includes('10%') ? '10% popust' : 'Besplatna kava';
  } else if (text.includes('bicikl') || text.includes('velotm') || text.includes('romobil')) {
    category = 'repair';
    partnerName = text.includes('velotm') ? 'VeloTM Timișoara' : 'Mikromobilnost TM';
    discountValue = text.includes('30 min')
      ? '30 min besplatno'
      : text.includes('3')
      ? '3 otključavanja'
      : 'Besplatna vožnja';
  } else if (text.includes('karta') || text.includes('stpt') || text.includes('prijevoz')) {
    category = 'transit';
    partnerName = 'STPT Timișoara';
    discountValue = text.includes('dnevna') ? 'Dnevna karta' : '1x vožnja besplatno';
  }

  return {
    id: String(dto.id),
    partnerName,
    title: dto.name,
    description: dto.description || 'Nagrada za održivu mobilnost u Timișoari.',
    pointsCost: dto.pointsCost,
    category,
    discountValue,
    expiryDate: '2026-12-31',
  };
}

function formatTripDate(isoDate: string): string {
  const dt = new Date(isoDate);
  if (!Number.isFinite(dt.getTime())) return isoDate;
  return dt.toLocaleString('hr-HR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const MOCK_REWARDS: RewardCoupon[] = [
  {
    id: 'rew_1',
    partnerName: 'Timișoara Specialty Coffee',
    title: 'Besplatna kava uz vlastitu šalicu',
    description: 'Zamijenite svoje eko-bodove za svježe prženu kavu u centru grada.',
    pointsCost: 80,
    category: 'coffee',
    discountValue: '100% popust',
    expiryDate: '2026-12-31',
  },
  {
    id: 'rew_2',
    partnerName: 'STPT Timișoara',
    title: 'Jednodnevna karta za tramvaj i bus',
    description: 'Besplatna vožnja cjelokupnom STPT mrežom javnog prijevoza.',
    pointsCost: 120,
    category: 'transit',
    discountValue: '15 RON',
    expiryDate: '2026-12-31',
  },
  {
    id: 'rew_3',
    partnerName: 'VeloFix Workshop Timișoara',
    title: '30% popusta na servis bicikla',
    description: 'Pregled kočnica, podmazivanje lanca i centriranje kotača.',
    pointsCost: 150,
    category: 'repair',
    discountValue: '30% popust',
    expiryDate: '2026-11-30',
  },
];

const MOCK_HISTORY: TripHistoryItem[] = [
  {
    id: 'tr_101',
    date: 'Danas, 10:15',
    originName: 'Piața Victoriei',
    destinationName: 'UPT Politehnica',
    mode: 'Bicycle',
    distanceKm: 1.45,
    durationMinutes: 6,
    co2SavedGrams: 390,
    pointsEarned: 50,
  },
  {
    id: 'tr_102',
    date: 'Jučer, 17:30',
    originName: 'Iulius Mall',
    destinationName: 'Piața Unirii',
    mode: 'PublicTransit',
    distanceKm: 2.1,
    durationMinutes: 12,
    co2SavedGrams: 280,
    pointsEarned: 35,
  },
];

export const rewardsService = {
  async getCoupons(): Promise<RewardCoupon[]> {
    if (API_CONFIG.USE_MOCK_FALLBACK) {
      return MOCK_REWARDS;
    }
    try {
      const items = await apiFetch<BackendRewardDto[]>('/rewards');
      if (Array.isArray(items) && items.length > 0) {
        return items.filter((r) => r.isActive).map(mapRewardDto);
      }
      return MOCK_REWARDS;
    } catch (err) {
      console.warn('API /rewards unreachable, using local catalog fallback:', err);
      return MOCK_REWARDS;
    }
  },

  async redeemCoupon(
    couponId: string
  ): Promise<{ success: boolean; promoCode: string; newBalance?: number; pointsSpent?: number }> {
    if (API_CONFIG.USE_MOCK_FALLBACK) {
      return { success: true, promoCode: `ECO-TM-${Math.floor(1000 + Math.random() * 9000)}` };
    }

    const numericId = /^\d+$/.test(couponId)
      ? couponId
      : couponId.replace(/\D+/g, '');

    if (!numericId) {
      return { success: true, promoCode: `ECO-TM-${Math.floor(1000 + Math.random() * 9000)}` };
    }

    const token = useUserStore.getState().token;
    if (!isRealJwtToken(token)) {
      throw new Error('Prijava s backendom nije aktivna. Osvježite prijavu i pokušajte ponovno.');
    }

    try {
      const res = await apiFetch<BackendRedeemResponse>(`/rewards/${numericId}/redeem`, {
        method: 'POST',
      });
      return {
        success: true,
        promoCode: res.discountCode,
        newBalance: res.newBalance,
        pointsSpent: res.pointsSpent,
      };
    } catch (err) {
      if (err instanceof ApiHttpError) {
        throw err;
      }
      throw new Error('Backend trenutno nije dostupan za otkup nagrade.');
    }
  },

  async getTripHistory(): Promise<TripHistoryItem[]> {
    if (API_CONFIG.USE_MOCK_FALLBACK) {
      return MOCK_HISTORY;
    }

    const store = useUserStore.getState();
    if (!isRealJwtToken(store.token)) {
      return MOCK_HISTORY;
    }

    try {
      const summary = await apiFetch<BackendTripHistorySummaryResponse>('/trips');
      if (store.user && Number(store.user.id) === summary.userId) {
        store.setUser({
          ...store.user,
          totalEcoPoints: summary.currentPointsBalance,
          totalCo2SavedKg: summary.totalCo2SavedKg,
          completedTripsCount: summary.totalTripsCount,
        });
      }

      return (summary.trips || []).map((t) => ({
        id: String(t.id),
        date: formatTripDate(t.startedAt),
        originName: t.originName || 'Polazište',
        destinationName: t.destinationName || 'Odredište',
        mode: t.mode,
        distanceKm: t.distanceKm,
        durationMinutes: t.durationMinutes,
        co2SavedGrams: Math.round(t.co2SavedGrams),
        pointsEarned: t.pointsEarned,
      }));
    } catch (err) {
      console.warn('API /trips unreachable, using mock history:', err);
      return MOCK_HISTORY;
    }
  },
};
