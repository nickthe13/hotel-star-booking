import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  LoyaltyTier,
  LoyaltyTransactionType,
  LoyaltyAccount,
  LoyaltyTransaction,
} from '@prisma/client';
import {
  TIER_CONFIG,
  POINTS_CONFIG,
  getTierForSpending,
  getNextTier,
} from './constants/tier-config';

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

export interface RedemptionCalculation {
  maxPoints: number;
  maxDiscount: number;
  currentPoints: number;
}

export interface LoyaltyAccountWithDetails extends LoyaltyAccount {
  tierProgress: TierProgress;
  recentTransactions: LoyaltyTransaction[];
}

@Injectable()
export class LoyaltyService {
  constructor(private prisma: PrismaService) {}

  async getOrCreateAccount(userId: string): Promise<LoyaltyAccount> {
    let account = await this.prisma.loyaltyAccount.findUnique({
      where: { userId },
    });

    if (!account) {
      account = await this.prisma.loyaltyAccount.create({
        data: { userId },
      });
    }

    return account;
  }

  async getAccountWithDetails(
    userId: string,
    transactionLimit = 10,
  ): Promise<LoyaltyAccountWithDetails> {
    const account = await this.getOrCreateAccount(userId);
    const tierProgress = this.calculateTierProgress(account);
    const recentTransactions = await this.prisma.loyaltyTransaction.findMany({
      where: { loyaltyAccountId: account.id },
      orderBy: { createdAt: 'desc' },
      take: transactionLimit,
    });

    return {
      ...account,
      tierProgress,
      recentTransactions,
    };
  }

  calculatePointsToEarn(amount: number, tier: LoyaltyTier): number {
    const basePoints = Math.floor(amount * POINTS_CONFIG.POINTS_PER_DOLLAR);
    const multiplier = TIER_CONFIG[tier].multiplier;
    return Math.floor(basePoints * multiplier);
  }

  async awardPoints(
    userId: string,
    bookingId: string,
    amount: number,
    description?: string,
  ): Promise<LoyaltyTransaction> {
    const account = await this.getOrCreateAccount(userId);
    const pointsToAward = this.calculatePointsToEarn(amount, account.tier);

    const [transaction] = await this.prisma.$transaction([
      this.prisma.loyaltyTransaction.create({
        data: {
          loyaltyAccountId: account.id,
          bookingId,
          type: LoyaltyTransactionType.EARN,
          points: pointsToAward,
          description:
            description || `Earned ${pointsToAward} points from booking`,
          balanceAfter: account.currentPoints + pointsToAward,
          metadata: {
            amount,
            tier: account.tier,
            multiplier: TIER_CONFIG[account.tier].multiplier,
          },
        },
      }),
      this.prisma.loyaltyAccount.update({
        where: { id: account.id },
        data: {
          currentPoints: { increment: pointsToAward },
          lifetimePoints: { increment: pointsToAward },
          lifetimeSpending: { increment: amount },
        },
      }),
      this.prisma.booking.update({
        where: { id: bookingId },
        data: { pointsEarned: pointsToAward },
      }),
    ]);

    // Check for tier upgrade
    await this.updateTierIfNeeded(userId);

    return transaction;
  }

  calculateMaxRedeemablePoints(
    currentPoints: number,
    bookingAmount: number,
  ): RedemptionCalculation {
    const maxDiscountAllowed =
      bookingAmount * POINTS_CONFIG.MAX_REDEMPTION_PERCENTAGE;
    const maxPointsForDiscount =
      maxDiscountAllowed * POINTS_CONFIG.POINTS_TO_DOLLAR_RATIO;
    const maxPoints = Math.min(currentPoints, Math.floor(maxPointsForDiscount));
    const maxDiscount = maxPoints / POINTS_CONFIG.POINTS_TO_DOLLAR_RATIO;

    return {
      maxPoints,
      maxDiscount,
      currentPoints,
    };
  }

  async redeemPoints(
    userId: string,
    bookingId: string,
    pointsToRedeem: number,
  ): Promise<{ pointsRedeemed: number; discountAmount: number }> {
    const account = await this.getOrCreateAccount(userId);

    if (pointsToRedeem <= 0) {
      throw new BadRequestException('Points to redeem must be positive');
    }

    if (pointsToRedeem > account.currentPoints) {
      throw new BadRequestException('Insufficient points');
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.userId !== userId) {
      throw new BadRequestException('Booking does not belong to user');
    }

    const { maxPoints } = this.calculateMaxRedeemablePoints(
      account.currentPoints,
      booking.totalPrice,
    );

    const actualPointsToRedeem = Math.min(pointsToRedeem, maxPoints);
    const discountAmount =
      actualPointsToRedeem / POINTS_CONFIG.POINTS_TO_DOLLAR_RATIO;

    await this.prisma.$transaction([
      this.prisma.loyaltyTransaction.create({
        data: {
          loyaltyAccountId: account.id,
          bookingId,
          type: LoyaltyTransactionType.REDEEM,
          points: -actualPointsToRedeem,
          description: `Redeemed ${actualPointsToRedeem} points for $${discountAmount.toFixed(2)} discount`,
          balanceAfter: account.currentPoints - actualPointsToRedeem,
          metadata: {
            discountAmount,
            originalTotal: booking.totalPrice,
          },
        },
      }),
      this.prisma.loyaltyAccount.update({
        where: { id: account.id },
        data: {
          currentPoints: { decrement: actualPointsToRedeem },
        },
      }),
      this.prisma.booking.update({
        where: { id: bookingId },
        data: {
          pointsRedeemed: actualPointsToRedeem,
          discountFromPoints: discountAmount,
        },
      }),
    ]);

    return {
      pointsRedeemed: actualPointsToRedeem,
      discountAmount,
    };
  }

  async updateTierIfNeeded(
    userId: string,
  ): Promise<{ tierChanged: boolean; newTier?: LoyaltyTier }> {
    const account = await this.getOrCreateAccount(userId);
    const newTier = getTierForSpending(account.lifetimeSpending);

    if (newTier !== account.tier) {
      await this.prisma.$transaction([
        this.prisma.loyaltyAccount.update({
          where: { id: account.id },
          data: {
            tier: newTier,
            tierUpdatedAt: new Date(),
          },
        }),
        this.prisma.loyaltyTransaction.create({
          data: {
            loyaltyAccountId: account.id,
            type: LoyaltyTransactionType.BONUS,
            points: 0,
            description: `Tier upgraded from ${TIER_CONFIG[account.tier].name} to ${TIER_CONFIG[newTier].name}`,
            balanceAfter: account.currentPoints,
            metadata: {
              previousTier: account.tier,
              newTier,
            },
          },
        }),
      ]);

      return { tierChanged: true, newTier };
    }

    return { tierChanged: false };
  }

  calculateTierProgress(account: LoyaltyAccount): TierProgress {
    const currentTier = account.tier;
    const nextTier = getNextTier(currentTier);
    const currentTierConfig = TIER_CONFIG[currentTier];

    let nextTierThreshold: number | null = null;
    let amountToNextTier: number | null = null;
    let progressPercentage = 100;

    if (nextTier) {
      const nextTierConfig = TIER_CONFIG[nextTier];
      nextTierThreshold = nextTierConfig.minSpending;
      amountToNextTier = Math.max(
        0,
        nextTierConfig.minSpending - account.lifetimeSpending,
      );

      const currentTierMin = currentTierConfig.minSpending;
      const tierRange = nextTierConfig.minSpending - currentTierMin;
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
      tierMultiplier: currentTierConfig.multiplier,
      tierBenefits: currentTierConfig.benefits,
    };
  }

  async getTierProgress(userId: string): Promise<TierProgress> {
    const account = await this.getOrCreateAccount(userId);
    return this.calculateTierProgress(account);
  }

  async adjustPoints(
    userId: string,
    points: number,
    reason: string,
    adminId: string,
  ): Promise<LoyaltyTransaction> {
    const account = await this.getOrCreateAccount(userId);

    if (points < 0 && Math.abs(points) > account.currentPoints) {
      throw new BadRequestException(
        'Cannot remove more points than available',
      );
    }

    const [transaction] = await this.prisma.$transaction([
      this.prisma.loyaltyTransaction.create({
        data: {
          loyaltyAccountId: account.id,
          type: LoyaltyTransactionType.ADJUSTMENT,
          points,
          description: reason,
          balanceAfter: account.currentPoints + points,
          metadata: { adminId },
        },
      }),
      this.prisma.loyaltyAccount.update({
        where: { id: account.id },
        data: {
          currentPoints: { increment: points },
          lifetimePoints:
            points > 0
              ? { increment: points }
              : undefined,
        },
      }),
    ]);

    return transaction;
  }

  async getTransactionHistory(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{
    transactions: LoyaltyTransaction[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const account = await this.getOrCreateAccount(userId);
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.prisma.loyaltyTransaction.findMany({
        where: { loyaltyAccountId: account.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          booking: {
            select: {
              id: true,
              checkIn: true,
              checkOut: true,
              room: {
                select: {
                  name: true,
                  hotel: { select: { name: true } },
                },
              },
            },
          },
        },
      }),
      this.prisma.loyaltyTransaction.count({
        where: { loyaltyAccountId: account.id },
      }),
    ]);

    return {
      transactions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}
