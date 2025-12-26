import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaymentService } from '../../../core/services/payment.service';
import { PaymentTransaction, PaymentStatus } from '../../../core/models/payment.model';

@Component({
  selector: 'app-payment-history',
  imports: [CommonModule],
  templateUrl: './payment-history.component.html',
  styleUrl: './payment-history.component.scss'
})
export class PaymentHistoryComponent implements OnInit {
  transactions = signal<PaymentTransaction[]>([]);
  loading = signal<boolean>(false);
  error = signal<string>('');

  // Filter signals
  statusFilter = signal<PaymentStatus | 'all'>('all');
  searchQuery = signal<string>('');

  // Expose enum to template
  readonly PaymentStatus = PaymentStatus;

  // Computed filtered transactions
  filteredTransactions = computed(() => {
    let txns = this.transactions();
    const query = this.searchQuery().toLowerCase();
    const status = this.statusFilter();

    // Filter by search query
    if (query) {
      txns = txns.filter(txn =>
        txn.bookingId.toLowerCase().includes(query) ||
        txn.id.toLowerCase().includes(query) ||
        txn.metadata?.hotelName?.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (status !== 'all') {
      txns = txns.filter(txn => txn.status === status);
    }

    // Sort by date (newest first)
    return txns.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  });

  constructor(private paymentService: PaymentService) {}

  ngOnInit(): void {
    this.loadPaymentHistory();
  }

  loadPaymentHistory(): void {
    this.loading.set(true);
    this.error.set('');

    this.paymentService.getUserPaymentHistory().subscribe({
      next: (transactions) => {
        this.transactions.set(transactions);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load payment history');
        this.loading.set(false);
        console.error('Error loading payment history:', err);
      }
    });
  }

  onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  onStatusFilterChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.statusFilter.set(select.value as PaymentStatus | 'all');
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.statusFilter.set('all');
  }

  getStatusBadgeClass(status: PaymentStatus): string {
    switch (status) {
      case PaymentStatus.SUCCEEDED:
        return 'badge--success';
      case PaymentStatus.PENDING:
      case PaymentStatus.PROCESSING:
        return 'badge--warning';
      case PaymentStatus.FAILED:
      case PaymentStatus.CANCELLED:
        return 'badge--danger';
      case PaymentStatus.REFUNDED:
      case PaymentStatus.PARTIALLY_REFUNDED:
        return 'badge--info';
      default:
        return '';
    }
  }

  getStatusLabel(status: PaymentStatus): string {
    return status.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  viewReceipt(transaction: PaymentTransaction): void {
    // In production, this would download or open a receipt PDF
    console.log('Viewing receipt for transaction:', transaction.id);
    alert(`Receipt for Transaction ${transaction.id}\n\nAmount: ${this.formatCurrency(transaction.amount)}\nStatus: ${this.getStatusLabel(transaction.status)}\nDate: ${this.formatDate(transaction.createdAt)}\n\nBooking ID: ${transaction.bookingId}`);
  }
}
