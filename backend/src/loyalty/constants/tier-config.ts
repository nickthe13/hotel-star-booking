import { LoyaltyTier } from '@prisma/client';

export interface TierConfig {
  minSpending: number;
  multiplier: number;
  name: string;
  benefits: string[];
}

export const TIER_CONFIG: Record<LoyaltyTier, TierConfig> = {
  BRONZE: {
    minSpending: 0,
    multiplier: 1.0,
    name: 'Bronze',
    benefits: ['1 point per $1 spent'],
  },
  SILVER: {
    minSpending: 500,
    multiplier: 1.25,
    name: 'Silver',
    benefits: ['1.25x points on bookings', 'Priority customer support'],
  },
  GOLD: {
    minSpending: 2000,
    multiplier: 1.5,
    name: 'Gold',
    benefits: [
      '1.5x points on bookings',
      'Free room upgrades when available',
      'Late checkout',
    ],
  },
  PLATINUM: {
    minSpending: 5000,
    multiplier: 2.0,
    name: 'Platinum',
    benefits: [
      '2x points on bookings',
      'Guaranteed room upgrades',
      'Airport transfers',
      'Exclusive member events',
    ],
  },
};

export const POINTS_CONFIG = {
  POINTS_PER_DOLLAR: 1,
  POINTS_TO_DOLLAR_RATIO: 100, // 100 points = $1
  MAX_REDEMPTION_PERCENTAGE: 0.5, // Max 50% of booking can be paid with points
};

export function getTierForSpending(lifetimeSpending: number): LoyaltyTier {
  if (lifetimeSpending >= TIER_CONFIG.PLATINUM.minSpending) {
    return 'PLATINUM';
  }
  if (lifetimeSpending >= TIER_CONFIG.GOLD.minSpending) {
    return 'GOLD';
  }
  if (lifetimeSpending >= TIER_CONFIG.SILVER.minSpending) {
    return 'SILVER';
  }
  return 'BRONZE';
}

export function getNextTier(
  currentTier: LoyaltyTier,
): LoyaltyTier | null {
  const tierOrder: LoyaltyTier[] = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];
  const currentIndex = tierOrder.indexOf(currentTier);
  if (currentIndex < tierOrder.length - 1) {
    return tierOrder[currentIndex + 1];
  }
  return null;
}
