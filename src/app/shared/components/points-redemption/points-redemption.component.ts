import {
  Component,
  OnInit,
  Input,
  Output,
  EventEmitter,
  signal,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoyaltyService } from '../../../core/services/loyalty.service';
import {
  LoyaltyAccount,
  RedemptionCalculation,
  LoyaltyTier,
  TIER_INFO,
  POINTS_CONFIG,
} from '../../../core/models/loyalty.model';

@Component({
  selector: 'app-points-redemption',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './points-redemption.component.html',
  styleUrl: './points-redemption.component.scss',
})
export class PointsRedemptionComponent implements OnInit, OnChanges {
  @Input() bookingAmount = 0;
  @Input() disabled = false;
  @Output() pointsChanged = new EventEmitter<{
    points: number;
    discount: number;
  }>();

  loyaltyAccount = signal<LoyaltyAccount | null>(null);
  redemptionInfo = signal<RedemptionCalculation | null>(null);
  selectedPoints = signal<number>(0);
  usePoints = signal<boolean>(false);
  loading = signal<boolean>(false);

  constructor(private loyaltyService: LoyaltyService) {}

  ngOnInit(): void {
    this.loadRedemptionInfo();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['bookingAmount'] && !changes['bookingAmount'].firstChange) {
      this.loadRedemptionInfo();
    }
  }

  loadRedemptionInfo(): void {
    this.loading.set(true);
    this.loyaltyService.getAccount().subscribe({
      next: (account) => {
        this.loyaltyAccount.set(account);
        this.loyaltyService.calculateRedemption(this.bookingAmount).subscribe({
          next: (info) => {
            this.redemptionInfo.set(info);
            this.loading.set(false);
          },
          error: () => this.loading.set(false),
        });
      },
      error: () => this.loading.set(false),
    });
  }

  onToggleUsePoints(): void {
    this.usePoints.update((v) => !v);
    if (!this.usePoints()) {
      this.selectedPoints.set(0);
      this.emitChange();
    }
  }

  onPointsChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = parseInt(input.value, 10) || 0;
    const info = this.redemptionInfo();

    if (info) {
      const validPoints = Math.min(Math.max(0, value), info.maxPoints);
      this.selectedPoints.set(validPoints);
      this.emitChange();
    }
  }

  onSliderChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = parseInt(input.value, 10) || 0;
    this.selectedPoints.set(value);
    this.emitChange();
  }

  setMaxPoints(): void {
    const info = this.redemptionInfo();
    if (info) {
      this.selectedPoints.set(info.maxPoints);
      this.emitChange();
    }
  }

  clearPoints(): void {
    this.selectedPoints.set(0);
    this.emitChange();
  }

  private emitChange(): void {
    const points = this.usePoints() ? this.selectedPoints() : 0;
    const discount = points / POINTS_CONFIG.POINTS_TO_DOLLAR_RATIO;
    this.pointsChanged.emit({ points, discount });
  }

  getDiscountAmount(): number {
    return this.selectedPoints() / POINTS_CONFIG.POINTS_TO_DOLLAR_RATIO;
  }

  getPointsToEarn(): number {
    const account = this.loyaltyAccount();
    if (!account) return 0;

    const finalAmount = this.bookingAmount - this.getDiscountAmount();
    return this.loyaltyService.calculatePointsToEarn(finalAmount, account.tier);
  }

  getTierName(tier: LoyaltyTier): string {
    return TIER_INFO[tier]?.name || 'Bronze';
  }

  getTierMultiplier(tier: LoyaltyTier): number {
    return TIER_INFO[tier]?.multiplier || 1;
  }

  formatPoints(points: number): string {
    return points.toLocaleString();
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  }
}
