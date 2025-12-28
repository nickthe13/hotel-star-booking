export enum LoyaltyTier {
  BRONZE = 'BRONZE',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
  PLATINUM = 'PLATINUM',
}

export enum LoyaltyTransactionType {
  EARN = 'EARN',
  REDEEM = 'REDEEM',
  BONUS = 'BONUS',
  ADJUSTMENT = 'ADJUSTMENT',
}

export interface LoyaltyAccount {
  id: string;
  userId: string;
  currentPoints: number;
  lifetimePoints: number;
  lifetimeSpending: number;
  tier: LoyaltyTier;
  tierUpdatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoyaltyTransaction {
  id: string;
  loyaltyAccountId: string;
  bookingId?: string;
  type: LoyaltyTransactionType;
  points: number;
  description?: string;
  balanceAfter: number;
  metadata?: any;
  createdAt: string;
  booking?: {
    id: string;
    checkIn: string;
    checkOut: string;
    room?: {
      name: string;
      hotel?: {
        name: string;
      };
    };
  };
}

export interface TierProgress {
  currentTier: LoyaltyTier;
  currentSpending: number;
  nextTier: LoyaltyTier | null;
  nextTierThreshold: number | null;
  amountToNextTier: number | null;
  progressPercentage: number;
  tierMultiplier: number;
  tierBenefits: string[];
}

export interface LoyaltyAccountWithDetails extends LoyaltyAccount {
  tierProgress: TierProgress;
  recentTransactions: LoyaltyTransaction[];
}

export interface RedemptionCalculation {
  maxPoints: number;
  maxDiscount: number;
  currentPoints: number;
}

export interface PaginatedTransactions {
  transactions: LoyaltyTransaction[];
  total: number;
  page: number;
  totalPages: number;
}

export interface TierInfo {
  name: string;
  minSpending: number;
  multiplier: number;
  benefits: string[];
  color: string;
  icon: string;
}

export const TIER_INFO: Record<LoyaltyTier, TierInfo> = {
  [LoyaltyTier.BRONZE]: {
    name: 'Bronze',
    minSpending: 0,
    multiplier: 1.0,
    benefits: ['1 point per $1 spent'],
    color: '#CD7F32',
    icon: 'star',
  },
  [LoyaltyTier.SILVER]: {
    name: 'Silver',
    minSpending: 500,
    multiplier: 1.25,
    benefits: ['1.25x points on bookings', 'Priority customer support'],
    color: '#C0C0C0',
    icon: 'star',
  },
  [LoyaltyTier.GOLD]: {
    name: 'Gold',
    minSpending: 2000,
    multiplier: 1.5,
    benefits: [
      '1.5x points on bookings',
      'Free room upgrades when available',
      'Late checkout',
    ],
    color: '#FFD700',
    icon: 'star',
  },
  [LoyaltyTier.PLATINUM]: {
    name: 'Platinum',
    minSpending: 5000,
    multiplier: 2.0,
    benefits: [
      '2x points on bookings',
      'Guaranteed room upgrades',
      'Airport transfers',
      'Exclusive member events',
    ],
    color: '#E5E4E2',
    icon: 'diamond',
  },
};

export const POINTS_CONFIG = {
  POINTS_PER_DOLLAR: 1,
  POINTS_TO_DOLLAR_RATIO: 100,
  MAX_REDEMPTION_PERCENTAGE: 0.5,
};
