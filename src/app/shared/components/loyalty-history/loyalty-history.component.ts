import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoyaltyService } from '../../../core/services/loyalty.service';
import {
  LoyaltyTransaction,
  LoyaltyTransactionType,
  PaginatedTransactions,
} from '../../../core/models/loyalty.model';

@Component({
  selector: 'app-loyalty-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loyalty-history.component.html',
  styleUrl: './loyalty-history.component.scss',
})
export class LoyaltyHistoryComponent implements OnInit {
  transactions = signal<LoyaltyTransaction[]>([]);
  loading = signal<boolean>(false);
  currentPage = signal<number>(1);
  totalPages = signal<number>(1);
  total = signal<number>(0);

  private readonly pageSize = 10;

  constructor(private loyaltyService: LoyaltyService) {}

  ngOnInit(): void {
    this.loadTransactions();
  }

  loadTransactions(): void {
    this.loading.set(true);
    this.loyaltyService.getTransactions(this.currentPage(), this.pageSize).subscribe({
      next: (data: PaginatedTransactions) => {
        this.transactions.set(data.transactions);
        this.totalPages.set(data.totalPages);
        this.total.set(data.total);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((p) => p + 1);
      this.loadTransactions();
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update((p) => p - 1);
      this.loadTransactions();
    }
  }

  getTransactionIcon(type: LoyaltyTransactionType): string {
    switch (type) {
      case LoyaltyTransactionType.EARN:
        return '+';
      case LoyaltyTransactionType.REDEEM:
        return '-';
      case LoyaltyTransactionType.BONUS:
        return '★';
      case LoyaltyTransactionType.ADJUSTMENT:
        return '⟳';
      default:
        return '•';
    }
  }

  getTransactionClass(type: LoyaltyTransactionType): string {
    switch (type) {
      case LoyaltyTransactionType.EARN:
        return 'earn';
      case LoyaltyTransactionType.REDEEM:
        return 'redeem';
      case LoyaltyTransactionType.BONUS:
        return 'bonus';
      case LoyaltyTransactionType.ADJUSTMENT:
        return 'adjustment';
      default:
        return '';
    }
  }

  getTransactionLabel(type: LoyaltyTransactionType): string {
    switch (type) {
      case LoyaltyTransactionType.EARN:
        return 'Earned';
      case LoyaltyTransactionType.REDEEM:
        return 'Redeemed';
      case LoyaltyTransactionType.BONUS:
        return 'Bonus';
      case LoyaltyTransactionType.ADJUSTMENT:
        return 'Adjustment';
      default:
        return 'Other';
    }
  }

  formatPoints(points: number): string {
    const prefix = points > 0 ? '+' : '';
    return `${prefix}${points.toLocaleString()}`;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  }
}
