/**
 * FE2: Eco-Rewards & Coupons Types
 */

export interface RewardCoupon {
  id: string;
  partnerName?: string;
  title: string;
  description: string;
  pointsCost: number;
  category?: 'coffee' | 'transit' | 'groceries' | 'bookstore' | 'repair';
  discountValue?: string;
  expiryDate?: string;
  isRedeemed?: boolean;
  qrCodeMockUrl?: string;
}

export interface RewardRedemption {
  success: true;
  rewardId: string;
  transactionId: string;
  promoCode: string;
  newBalance: number;
  pointsSpent: number;
}

/** Server ledger entry. No coupon code is present in GET /points. */
export interface RedemptionRecord {
  transactionId: string;
  rewardId: string | null;
  pointsSpent: number;
  createdAt: string;
  description: string | null;
}

export interface TripHistoryItem {
  id: string;
  date: string;
  originName: string;
  destinationName: string;
  mode: string;
  distanceKm: number;
  durationMinutes: number;
  co2SavedGrams: number;
  pointsEarned: number;
}
