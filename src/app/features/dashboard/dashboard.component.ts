import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BookingService } from '../../core/services/booking.service';
import { AuthService } from '../../core/services/auth.service';
import { Booking, BookingStatus } from '../../core/models/booking.model';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterLink],
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
  BookingStatus = BookingStatus;

  constructor(
    private bookingService: BookingService,
    public authService: AuthService
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
  }

  confirmCancelBooking(): void {
    const bookingId = this.bookingToCancel();
    if (!bookingId) return;

    this.cancellingBookingId.set(bookingId);
    this.error.set('');

    this.bookingService.cancelBooking(bookingId).subscribe({
      next: () => {
        this.cancellingBookingId.set(null);
        this.closeCancelModal();
        this.successMessage.set('Booking cancelled successfully! It will be removed shortly.');
        this.loadBookings();

        // Remove the cancelled booking after 3 seconds
        setTimeout(() => {
          this.bookingService.removeBooking(bookingId).subscribe({
            next: () => {
              this.loadBookings();
            }
          });
        }, 3000);

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
}
