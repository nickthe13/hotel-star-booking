import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BookingService } from '../../core/services/booking.service';
import { AuthService } from '../../core/services/auth.service';
import { PaymentService } from '../../core/services/payment.service';
import { Booking, BookingStatus } from '../../core/models/booking.model';
import { PaymentStatus, RefundResponse } from '../../core/models/payment.model';
import { LoyaltyCardComponent } from '../../shared/components/loyalty-card/loyalty-card.component';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterLink, LoyaltyCardComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  bookings = signal<Booking[]>([]);
  loading = signal<boolean>(false);
  error = signal<string>('');
  cancellingBookingId = signal<string | null>(null);
  successMessage = signal<string>('');
  showCancelModal = signal<boolean>(false);
  bookingToCancel = signal<string | null>(null);
  refundResult = signal<RefundResponse | null>(null);
  processingRefund = signal<boolean>(false);
  BookingStatus = BookingStatus;
  PaymentStatus = PaymentStatus;

  // Computed property to get the booking being cancelled
  bookingToCancelDetails = computed(() => {
    const bookingId = this.bookingToCancel();
    if (!bookingId) return null;
    return this.bookings().find(b => b.id === bookingId) || null;
  });

  // Check if cancellation is within 24 hours of check-in
  isWithin24Hours = computed(() => {
    const booking = this.bookingToCancelDetails();
    if (!booking) return false;
    const checkInDate = new Date(booking.checkIn);
    const now = new Date();
    const hoursUntilCheckIn = (checkInDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilCheckIn < 24 && hoursUntilCheckIn > 0;
  });

  // Calculate refund amount (full refund if > 24hrs, 50% if within 24hrs)
  refundAmount = computed(() => {
    const booking = this.bookingToCancelDetails();
    if (!booking || !booking.isPaid) return 0;
    return this.isWithin24Hours() ? booking.totalPrice * 0.5 : booking.totalPrice;
  });

  constructor(
    private bookingService: BookingService,
    public authService: AuthService,
    private paymentService: PaymentService
  ) {}

  ngOnInit(): void {
    this.loadBookings();
  }

  loadBookings(): void {
    this.loading.set(true);
    this.error.set('');

    this.bookingService.getUserBookings().subscribe({
      next: (bookings) => {
        this.bookings.set(bookings);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load bookings. Please try again.');
        this.loading.set(false);
      }
    });
  }

  openCancelModal(bookingId: string): void {
    this.bookingToCancel.set(bookingId);
    this.showCancelModal.set(true);
  }

  closeCancelModal(): void {
    this.showCancelModal.set(false);
    this.bookingToCancel.set(null);
    this.refundResult.set(null);
    this.processingRefund.set(false);
  }

  confirmCancelBooking(): void {
    const bookingId = this.bookingToCancel();
    const booking = this.bookingToCancelDetails();
    if (!bookingId || !booking) return;

    this.cancellingBookingId.set(bookingId);
    this.error.set('');

    // If booking is paid, process refund first
    if (booking.isPaid && booking.stripePaymentIntentId) {
      this.processingRefund.set(true);
      const refundAmount = this.refundAmount();

      this.bookingService.cancelBookingWithRefund(bookingId, refundAmount).subscribe({
        next: (result) => {
          this.cancellingBookingId.set(null);
          this.processingRefund.set(false);
          this.refundResult.set(result.refund || null);

          const refundMessage = this.isWithin24Hours()
            ? `Booking cancelled. 50% refund of ${this.formatCurrency(refundAmount)} processed (late cancellation fee applied).`
            : `Booking cancelled. Full refund of ${this.formatCurrency(refundAmount)} processed.`;

          this.successMessage.set(refundMessage);
          this.loadBookings();
          this.closeCancelModal();

          // Clear success message after 8 seconds (longer to read refund details)
          setTimeout(() => {
            this.successMessage.set('');
          }, 8000);
        },
        error: (err) => {
          this.cancellingBookingId.set(null);
          this.processingRefund.set(false);
          this.error.set(err.message || 'Failed to process refund. Please contact support.');
        }
      });
    } else {
      // No payment to refund, just cancel
      this.bookingService.cancelBooking(bookingId).subscribe({
        next: () => {
          this.cancellingBookingId.set(null);
          this.closeCancelModal();
          this.successMessage.set('Booking cancelled successfully!');
          this.loadBookings();

          // Clear success message after 5 seconds
          setTimeout(() => {
            this.successMessage.set('');
          }, 5000);
        },
        error: () => {
          this.cancellingBookingId.set(null);
          this.error.set('Failed to cancel booking. Please try again.');
        }
      });
    }
  }

  getRefundPercentage(): number {
    return this.isWithin24Hours() ? 50 : 100;
  }

  getStatusClass(status: BookingStatus): string {
    switch (status) {
      case BookingStatus.CONFIRMED:
        return 'status--confirmed';
      case BookingStatus.PENDING:
        return 'status--pending';
      case BookingStatus.CANCELLED:
        return 'status--cancelled';
      case BookingStatus.COMPLETED:
        return 'status--completed';
      default:
        return '';
    }
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  calculateNights(checkIn: Date, checkOut: Date): number {
    const nights = Math.ceil(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)
    );
    return nights;
  }

  canCancelBooking(booking: Booking): boolean {
    return booking.status === BookingStatus.CONFIRMED || booking.status === BookingStatus.PENDING;
  }

  getPaymentStatusClass(status?: PaymentStatus): string {
    if (!status) return 'payment-status--unknown';

    switch (status) {
      case PaymentStatus.SUCCEEDED:
        return 'payment-status--success';
      case PaymentStatus.PENDING:
      case PaymentStatus.PROCESSING:
        return 'payment-status--warning';
      case PaymentStatus.FAILED:
      case PaymentStatus.CANCELLED:
        return 'payment-status--danger';
      case PaymentStatus.REFUNDED:
      case PaymentStatus.PARTIALLY_REFUNDED:
        return 'payment-status--info';
      default:
        return 'payment-status--unknown';
    }
  }

  getPaymentStatusLabel(status?: PaymentStatus): string {
    if (!status) return 'Not Paid';

    return status.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  viewPaymentReceipt(booking: Booking): void {
    if (!booking.paymentTransactionId) {
      alert('No payment receipt available for this booking.');
      return;
    }

    // In production, this would download or open a receipt PDF
    console.log('Viewing receipt for transaction:', booking.paymentTransactionId);
    alert(`Payment Receipt\n\nBooking ID: ${booking.id}\nTransaction ID: ${booking.paymentTransactionId}\nAmount: ${this.formatCurrency(booking.totalPrice)}\nStatus: ${this.getPaymentStatusLabel(booking.paymentStatus)}\nDate: ${this.formatDate(booking.createdAt)}`);
  }
}
