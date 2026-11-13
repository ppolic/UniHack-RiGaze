/**
 * FE2: Eco-Rewards & Coupons Types
 */

export interface RewardCoupon {
  id: string;
  partnerName: string;
  title: string;
  description: string;
  pointsCost: number;
  category: 'coffee' | 'transit' | 'groceries' | 'bookstore' | 'repair';
  discountValue: string;
  expiryDate: string;
  isRedeemed?: boolean;
  qrCodeMockUrl?: string;
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
