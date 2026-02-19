import { Component, OnInit, signal, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoyaltyService } from '../../../core/services/loyalty.service';
import {
  LoyaltyAccount,
  TierProgress,
  LoyaltyTier,
  TIER_INFO,
} from '../../../core/models/loyalty.model';
import { FormatCurrencyPipe } from '../../pipes/format-currency.pipe';

@Component({
  selector: 'app-loyalty-card',
  imports: [CommonModule, FormatCurrencyPipe],
  templateUrl: './loyalty-card.component.html',
  styleUrl: './loyalty-card.component.scss',
})
export class LoyaltyCardComponent implements OnInit {
  @Input() compact = false;

  loyaltyAccount = signal<LoyaltyAccount | null>(null);
  tierProgress = signal<TierProgress | null>(null);
  loading = signal<boolean>(false);

  constructor(private loyaltyService: LoyaltyService) {}

  ngOnInit(): void {
    this.loadLoyaltyData();
  }

  loadLoyaltyData(): void {
    this.loading.set(true);
    this.loyaltyService.getAccountWithDetails().subscribe({
      next: (data) => {
        this.loyaltyAccount.set(data);
        this.tierProgress.set(data.tierProgress);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
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

}
