import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaymentService } from '../../../core/services/payment.service';
import { PaymentTransaction, PaymentStatus } from '../../../core/models/payment.model';
import { FormatDatePipe } from '../../../shared/pipes/format-date.pipe';
import { FormatCurrencyPipe } from '../../../shared/pipes/format-currency.pipe';
import { getPaymentStatusClass, getPaymentStatusLabel } from '../../../shared/utils/status-helpers';

@Component({
  selector: 'app-payment-history',
  imports: [CommonModule, FormatDatePipe, FormatCurrencyPipe],
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
    return getPaymentStatusClass(status);
  }

  getStatusLabel(status: PaymentStatus): string {
    return getPaymentStatusLabel(status);
  }

  viewReceipt(transaction: PaymentTransaction): void {
    // In production, this would download or open a receipt PDF
    const currencyPipe = new FormatCurrencyPipe();
    const datePipe = new FormatDatePipe();
    console.log('Viewing receipt for transaction:', transaction.id);
    alert(`Receipt for Transaction ${transaction.id}\n\nAmount: ${currencyPipe.transform(transaction.amount)}\nStatus: ${this.getStatusLabel(transaction.status)}\nDate: ${datePipe.transform(transaction.createdAt, 'short')}\n\nBooking ID: ${transaction.bookingId}`);
  }
}
