import { apiFetch, API_CONFIG } from './api';
import { RewardCoupon, TripHistoryItem } from '../types/rewards';
import { getTranslations } from '../hooks/useTranslation';

function getMockRewards(): RewardCoupon[] {
  const tr = getTranslations();
  return [
    {
      id: 'rew_1',
      partnerName: 'Timișoara Specialty Coffee',
      title: tr.svcReward1Title,
      description: tr.svcReward1Desc,
      pointsCost: 80,
      category: 'coffee',
      discountValue: tr.svcReward1Discount,
      expiryDate: '2026-12-31',
    },
    {
      id: 'rew_2',
      partnerName: 'STPT Timișoara',
      title: tr.svcReward2Title,
      description: tr.svcReward2Desc,
      pointsCost: 120,
      category: 'transit',
      discountValue: '15 RON',
      expiryDate: '2026-12-31',
    },
    {
      id: 'rew_3',
      partnerName: 'VeloFix Workshop Timișoara',
      title: tr.svcReward3Title,
      description: tr.svcReward3Desc,
      pointsCost: 150,
      category: 'repair',
      discountValue: tr.svcReward3Discount,
      expiryDate: '2026-11-30',
    },
  ];
}

function getMockHistory(): TripHistoryItem[] {
  const tr = getTranslations();
  return [
    {
      id: 'tr_101',
      date: tr.svcHistToday,
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
      date: tr.svcHistYesterday,
      originName: 'Iulius Mall',
      destinationName: 'Piața Unirii',
      mode: 'PublicTransit',
      distanceKm: 2.1,
      durationMinutes: 12,
      co2SavedGrams: 280,
      pointsEarned: 35,
    },
  ];
}

export const rewardsService = {
  async getCoupons(): Promise<RewardCoupon[]> {
    if (API_CONFIG.USE_MOCK_FALLBACK) {
      return getMockRewards();
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
      return getMockHistory();
    }
    return apiFetch<TripHistoryItem[]>('/trips');
  },
};
