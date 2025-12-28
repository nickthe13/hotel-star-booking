import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  LoyaltyAccount,
  LoyaltyAccountWithDetails,
  LoyaltyTransaction,
  LoyaltyTransactionType,
  LoyaltyTier,
  TierProgress,
  RedemptionCalculation,
  PaginatedTransactions,
  TIER_INFO,
  POINTS_CONFIG,
} from '../models/loyalty.model';

@Injectable({
  providedIn: 'root',
})
export class LoyaltyService {
  private readonly API_URL = `${environment.apiUrl}/${environment.apiVersion}`;

  loyaltyAccount = signal<LoyaltyAccount | null>(null);
  tierProgress = signal<TierProgress | null>(null);
  loading = signal<boolean>(false);

  // Mock data for development
  private mockAccount: LoyaltyAccount = {
    id: 'loyalty-1',
    userId: '1',
    currentPoints: 1250,
    lifetimePoints: 3500,
    lifetimeSpending: 2150,
    tier: LoyaltyTier.GOLD,
    tierUpdatedAt: '2025-10-15T10:00:00Z',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-12-28T00:00:00Z',
  };

  private mockTransactions: LoyaltyTransaction[] = [
    {
      id: 'txn-1',
      loyaltyAccountId: 'loyalty-1',
      bookingId: '1',
      type: LoyaltyTransactionType.EARN,
      points: 188,
      description: 'Points earned for booking at Grand Plaza Hotel',
      balanceAfter: 1250,
      createdAt: '2025-12-15T14:30:00Z',
      booking: {
        id: '1',
        checkIn: '2025-12-15',
        checkOut: '2025-12-20',
        room: {
          name: 'Deluxe Suite',
          hotel: { name: 'Grand Plaza Hotel' },
        },
      },
    },
    {
      id: 'txn-2',
      loyaltyAccountId: 'loyalty-1',
      type: LoyaltyTransactionType.BONUS,
      points: 0,
      description: 'Tier upgraded from Silver to Gold',
      balanceAfter: 1062,
      createdAt: '2025-10-15T10:00:00Z',
      metadata: { previousTier: 'SILVER', newTier: 'GOLD' },
    },
    {
      id: 'txn-3',
      loyaltyAccountId: 'loyalty-1',
      bookingId: '2',
      type: LoyaltyTransactionType.REDEEM,
      points: -500,
      description: 'Redeemed 500 points for $5.00 discount',
      balanceAfter: 1062,
      createdAt: '2025-11-10T09:00:00Z',
      booking: {
        id: '2',
        checkIn: '2025-11-10',
        checkOut: '2025-11-15',
        room: {
          name: 'Ocean View Room',
          hotel: { name: 'Sunset Beach Resort' },
        },
      },
    },
    {
      id: 'txn-4',
      loyaltyAccountId: 'loyalty-1',
      bookingId: '2',
      type: LoyaltyTransactionType.EARN,
      points: 1125,
      description: 'Points earned for booking at Sunset Beach Resort',
      balanceAfter: 1562,
      createdAt: '2025-11-10T09:00:00Z',
      booking: {
        id: '2',
        checkIn: '2025-11-10',
        checkOut: '2025-11-15',
        room: {
          name: 'Ocean View Room',
          hotel: { name: 'Sunset Beach Resort' },
        },
      },
    },
  ];

  constructor(private http: HttpClient) {}

  getAccount(): Observable<LoyaltyAccount> {
    // In production:
    // return this.http.get<LoyaltyAccount>(`${this.API_URL}/loyalty/account`).pipe(
    //   tap(account => this.loyaltyAccount.set(account))
    // );

    this.loyaltyAccount.set(this.mockAccount);
    return of(this.mockAccount);
  }

  getAccountWithDetails(): Observable<LoyaltyAccountWithDetails> {
    // In production:
    // return this.http.get<LoyaltyAccountWithDetails>(`${this.API_URL}/loyalty/account/details`);

    const tierProgress = this.calculateTierProgress(this.mockAccount);
    const recentTransactions = this.mockTransactions.slice(0, 5);

    return of({
      ...this.mockAccount,
      tierProgress,
      recentTransactions,
    });
  }

  getTierProgress(): Observable<TierProgress> {
    // In production:
    // return this.http.get<TierProgress>(`${this.API_URL}/loyalty/tier-progress`).pipe(
    //   tap(progress => this.tierProgress.set(progress))
    // );

    const progress = this.calculateTierProgress(this.mockAccount);
    this.tierProgress.set(progress);
    return of(progress);
  }

  getTransactions(
    page = 1,
    limit = 20
  ): Observable<PaginatedTransactions> {
    // In production:
    // return this.http.get<PaginatedTransactions>(
    //   `${this.API_URL}/loyalty/transactions?page=${page}&limit=${limit}`
    // );

    const start = (page - 1) * limit;
    const end = start + limit;
    const transactions = this.mockTransactions.slice(start, end);

    return of({
      transactions,
      total: this.mockTransactions.length,
      page,
      totalPages: Math.ceil(this.mockTransactions.length / limit),
    });
  }

  calculateRedemption(bookingAmount: number): Observable<RedemptionCalculation> {
    // In production:
    // return this.http.post<RedemptionCalculation>(
    //   `${this.API_URL}/loyalty/calculate-redemption`,
    //   { bookingAmount }
    // );

    const currentPoints = this.mockAccount.currentPoints;
    const maxDiscountAllowed = bookingAmount * POINTS_CONFIG.MAX_REDEMPTION_PERCENTAGE;
    const maxPointsForDiscount = maxDiscountAllowed * POINTS_CONFIG.POINTS_TO_DOLLAR_RATIO;
    const maxPoints = Math.min(currentPoints, Math.floor(maxPointsForDiscount));
    const maxDiscount = maxPoints / POINTS_CONFIG.POINTS_TO_DOLLAR_RATIO;

    return of({
      maxPoints,
      maxDiscount,
      currentPoints,
    });
  }

  redeemPoints(
    bookingId: string,
    points: number
  ): Observable<{ pointsRedeemed: number; discountAmount: number }> {
    // In production:
    // return this.http.post<{ pointsRedeemed: number; discountAmount: number }>(
    //   `${this.API_URL}/loyalty/redeem`,
    //   { bookingId, points }
    // );

    const discountAmount = points / POINTS_CONFIG.POINTS_TO_DOLLAR_RATIO;

    // Update mock data
    this.mockAccount.currentPoints -= points;
    this.loyaltyAccount.set({ ...this.mockAccount });

    // Add transaction
    const newTransaction: LoyaltyTransaction = {
      id: `txn-${Date.now()}`,
      loyaltyAccountId: this.mockAccount.id,
      bookingId,
      type: LoyaltyTransactionType.REDEEM,
      points: -points,
      description: `Redeemed ${points} points for $${discountAmount.toFixed(2)} discount`,
      balanceAfter: this.mockAccount.currentPoints,
      createdAt: new Date().toISOString(),
    };
    this.mockTransactions.unshift(newTransaction);

    return of({
      pointsRedeemed: points,
      discountAmount,
    });
  }

  applyPointsToBooking(
    bookingId: string,
    points: number
  ): Observable<{ discountAmount: number; newTotal: number }> {
    // In production:
    // return this.http.post<{ discountAmount: number; newTotal: number }>(
    //   `${this.API_URL}/bookings/${bookingId}/apply-points`,
    //   { points }
    // );

    const discountAmount = points / POINTS_CONFIG.POINTS_TO_DOLLAR_RATIO;

    // Update mock data
    this.mockAccount.currentPoints -= points;
    this.loyaltyAccount.set({ ...this.mockAccount });

    return of({
      discountAmount,
      newTotal: 0, // Would be calculated based on actual booking
    });
  }

  // Helper methods
  calculateTierProgress(account: LoyaltyAccount): TierProgress {
    const currentTier = account.tier;
    const currentTierInfo = TIER_INFO[currentTier];

    let nextTier: LoyaltyTier | null = null;
    let nextTierThreshold: number | null = null;
    let amountToNextTier: number | null = null;
    let progressPercentage = 100;

    const tierOrder: LoyaltyTier[] = [
      LoyaltyTier.BRONZE,
      LoyaltyTier.SILVER,
      LoyaltyTier.GOLD,
      LoyaltyTier.PLATINUM,
    ];
    const currentIndex = tierOrder.indexOf(currentTier);

    if (currentIndex < tierOrder.length - 1) {
      nextTier = tierOrder[currentIndex + 1];
      const nextTierInfo = TIER_INFO[nextTier];
      nextTierThreshold = nextTierInfo.minSpending;
      amountToNextTier = Math.max(0, nextTierInfo.minSpending - account.lifetimeSpending);

      const currentTierMin = currentTierInfo.minSpending;
      const tierRange = nextTierInfo.minSpending - currentTierMin;
      const progressInTier = account.lifetimeSpending - currentTierMin;
      progressPercentage = Math.min(100, (progressInTier / tierRange) * 100);
    }

    return {
      currentTier,
      currentSpending: account.lifetimeSpending,
      nextTier,
      nextTierThreshold,
      amountToNextTier,
      progressPercentage,
      tierMultiplier: currentTierInfo.multiplier,
      tierBenefits: currentTierInfo.benefits,
    };
  }

  getTierColor(tier: LoyaltyTier): string {
    return TIER_INFO[tier]?.color || '#CD7F32';
  }

  getTierName(tier: LoyaltyTier): string {
    return TIER_INFO[tier]?.name || 'Bronze';
  }

  formatPoints(points: number): string {
    return points.toLocaleString();
  }

  pointsToDiscount(points: number): number {
    return points / POINTS_CONFIG.POINTS_TO_DOLLAR_RATIO;
  }

  discountToPoints(discount: number): number {
    return Math.floor(discount * POINTS_CONFIG.POINTS_TO_DOLLAR_RATIO);
  }

  calculatePointsToEarn(amount: number, tier: LoyaltyTier): number {
    const basePoints = Math.floor(amount * POINTS_CONFIG.POINTS_PER_DOLLAR);
    const multiplier = TIER_INFO[tier].multiplier;
    return Math.floor(basePoints * multiplier);
  }

  refreshAccount(): void {
    this.getAccount().subscribe();
    this.getTierProgress().subscribe();
  }
}
