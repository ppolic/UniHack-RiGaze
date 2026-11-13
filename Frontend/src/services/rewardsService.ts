import { apiFetch, API_CONFIG } from './api';
import { RewardCoupon, TripHistoryItem } from '../types/rewards';

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
    return apiFetch<RewardCoupon[]>('/rewards');
  },

  async redeemCoupon(couponId: string): Promise<{ success: boolean; promoCode: string }> {
    if (API_CONFIG.USE_MOCK_FALLBACK) {
      return { success: true, promoCode: `ECO-TM-${Math.floor(1000 + Math.random() * 9000)}` };
    }
    return apiFetch(`/rewards/${couponId}/redeem`, { method: 'POST' });
  },

  async getTripHistory(): Promise<TripHistoryItem[]> {
    if (API_CONFIG.USE_MOCK_FALLBACK) {
      return MOCK_HISTORY;
    }
    return apiFetch<TripHistoryItem[]>('/trips');
  },
};
