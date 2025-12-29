import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
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
  private readonly API_URL = environment.apiUrl;

  loyaltyAccount = signal<LoyaltyAccount | null>(null);
  tierProgress = signal<TierProgress | null>(null);
  loading = signal<boolean>(false);

  constructor(private http: HttpClient) {}

  private mapAccountFromApi(apiAccount: any): LoyaltyAccount {
    return {
      id: apiAccount.id,
      userId: apiAccount.userId,
      currentPoints: apiAccount.currentPoints || 0,
      lifetimePoints: apiAccount.lifetimePoints || 0,
      lifetimeSpending: apiAccount.lifetimeSpending || 0,
      tier: apiAccount.tier as LoyaltyTier,
      tierUpdatedAt: apiAccount.tierUpdatedAt,
      createdAt: apiAccount.createdAt,
      updatedAt: apiAccount.updatedAt,
    };
  }

  private mapTransactionFromApi(apiTransaction: any): LoyaltyTransaction {
    return {
      id: apiTransaction.id,
      loyaltyAccountId: apiTransaction.loyaltyAccountId,
      bookingId: apiTransaction.bookingId,
      type: apiTransaction.type as LoyaltyTransactionType,
      points: apiTransaction.points,
      description: apiTransaction.description,
      balanceAfter: apiTransaction.balanceAfter,
      createdAt: apiTransaction.createdAt,
      metadata: apiTransaction.metadata,
      booking: apiTransaction.booking ? {
        id: apiTransaction.booking.id,
        checkIn: apiTransaction.booking.checkIn,
        checkOut: apiTransaction.booking.checkOut,
        room: apiTransaction.booking.room ? {
          name: apiTransaction.booking.room.name,
          hotel: apiTransaction.booking.room.hotel ? {
            name: apiTransaction.booking.room.hotel.name
          } : undefined
        } : undefined
      } : undefined
    };
  }

  getAccount(): Observable<LoyaltyAccount> {
    this.loading.set(true);

    return this.http.get<any>(`${this.API_URL}/loyalty/account`).pipe(
      map(response => this.mapAccountFromApi(response)),
      tap(account => {
        this.loyaltyAccount.set(account);
        this.loading.set(false);
      }),
      catchError((error: HttpErrorResponse) => {
        this.loading.set(false);
        // Return a default account for new users
        const defaultAccount: LoyaltyAccount = {
          id: '',
          userId: '',
          currentPoints: 0,
          lifetimePoints: 0,
          lifetimeSpending: 0,
          tier: LoyaltyTier.BRONZE,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        this.loyaltyAccount.set(defaultAccount);
        return of(defaultAccount);
      })
    );
  }

  getAccountWithDetails(): Observable<LoyaltyAccountWithDetails> {
    this.loading.set(true);

    return this.http.get<any>(`${this.API_URL}/loyalty/account`).pipe(
      map(response => {
        const account = this.mapAccountFromApi(response);
        const tierProgress = this.calculateTierProgress(account);
        const recentTransactions = (response.transactions || [])
          .slice(0, 5)
          .map((t: any) => this.mapTransactionFromApi(t));

        return {
          ...account,
          tierProgress,
          recentTransactions,
        };
      }),
      tap(() => this.loading.set(false)),
      catchError((error: HttpErrorResponse) => {
        this.loading.set(false);
        // Return default for new users
        const defaultAccount: LoyaltyAccountWithDetails = {
          id: '',
          userId: '',
          currentPoints: 0,
          lifetimePoints: 0,
          lifetimeSpending: 0,
          tier: LoyaltyTier.BRONZE,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tierProgress: this.calculateTierProgress({
            id: '',
            userId: '',
            currentPoints: 0,
            lifetimePoints: 0,
            lifetimeSpending: 0,
            tier: LoyaltyTier.BRONZE,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }),
          recentTransactions: [],
        };
        return of(defaultAccount);
      })
    );
  }

  getTierProgress(): Observable<TierProgress> {
    return this.getAccount().pipe(
      map(account => {
        const progress = this.calculateTierProgress(account);
        this.tierProgress.set(progress);
        return progress;
      })
    );
  }

  getTransactions(page = 1, limit = 20): Observable<PaginatedTransactions> {
    return this.http.get<any>(`${this.API_URL}/loyalty/transactions`, {
      params: { page: page.toString(), limit: limit.toString() }
    }).pipe(
      map(response => ({
        transactions: (response.transactions || response.data || []).map((t: any) => this.mapTransactionFromApi(t)),
        total: response.total || 0,
        page: response.page || page,
        totalPages: response.totalPages || Math.ceil((response.total || 0) / limit),
      })),
      catchError((error: HttpErrorResponse) => {
        console.error('Error fetching transactions:', error);
        return of({
          transactions: [],
          total: 0,
          page,
          totalPages: 0,
        });
      })
    );
  }

  calculateRedemption(bookingAmount: number): Observable<RedemptionCalculation> {
    return this.http.post<any>(`${this.API_URL}/loyalty/calculate-redemption`, {
      bookingAmount
    }).pipe(
      map(response => ({
        maxPoints: response.maxPoints || 0,
        maxDiscount: response.maxDiscount || 0,
        currentPoints: response.currentPoints || this.loyaltyAccount()?.currentPoints || 0,
      })),
      catchError(() => {
        // Fallback to client-side calculation
        const currentPoints = this.loyaltyAccount()?.currentPoints || 0;
        const maxDiscountAllowed = bookingAmount * POINTS_CONFIG.MAX_REDEMPTION_PERCENTAGE;
        const maxPointsForDiscount = maxDiscountAllowed * POINTS_CONFIG.POINTS_TO_DOLLAR_RATIO;
        const maxPoints = Math.min(currentPoints, Math.floor(maxPointsForDiscount));
        const maxDiscount = maxPoints / POINTS_CONFIG.POINTS_TO_DOLLAR_RATIO;

        return of({
          maxPoints,
          maxDiscount,
          currentPoints,
        });
      })
    );
  }

  redeemPoints(
    bookingId: string,
    points: number
  ): Observable<{ pointsRedeemed: number; discountAmount: number }> {
    return this.http.post<any>(`${this.API_URL}/loyalty/redeem`, {
      bookingId,
      points
    }).pipe(
      tap(response => {
        // Update local account after redemption
        const account = this.loyaltyAccount();
        if (account) {
          this.loyaltyAccount.set({
            ...account,
            currentPoints: account.currentPoints - points,
          });
        }
      }),
      map(response => ({
        pointsRedeemed: response.pointsRedeemed || points,
        discountAmount: response.discountAmount || (points / POINTS_CONFIG.POINTS_TO_DOLLAR_RATIO),
      })),
      catchError((error: HttpErrorResponse) => {
        const message = error.error?.message || 'Failed to redeem points';
        return throwError(() => new Error(message));
      })
    );
  }

  applyPointsToBooking(
    bookingId: string,
    points: number
  ): Observable<{ discountAmount: number; newTotal: number }> {
    return this.http.post<any>(`${this.API_URL}/bookings/${bookingId}/apply-points`, {
      points
    }).pipe(
      tap(response => {
        // Update local account after redemption
        const account = this.loyaltyAccount();
        if (account) {
          this.loyaltyAccount.set({
            ...account,
            currentPoints: account.currentPoints - points,
          });
        }
      }),
      map(response => ({
        discountAmount: response.discountAmount || (points / POINTS_CONFIG.POINTS_TO_DOLLAR_RATIO),
        newTotal: response.newTotal || 0,
      })),
      catchError((error: HttpErrorResponse) => {
        const message = error.error?.message || 'Failed to apply points';
        return throwError(() => new Error(message));
      })
    );
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
