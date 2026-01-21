import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Hotel, Room, CreatePaymentIntentRequest, CreatePaymentIntentResponse, SavedPaymentMethod } from '../../../core/models';
import { BookingService } from '../../../core/services/booking.service';
import { PaymentService } from '../../../core/services/payment.service';
import { EmailService } from '../../../core/services/email.service';
import { LoyaltyService } from '../../../core/services/loyalty.service';
import { AuthService } from '../../../core/services/auth.service';
import { ModalComponent } from '../modal/modal.component';
import { StripePaymentComponent } from '../stripe-payment/stripe-payment.component';
import { PointsRedemptionComponent } from '../points-redemption/points-redemption.component';

export interface PaymentModalData {
  hotel: Hotel;
  room: Room;
  checkIn: string;
  checkOut: string;
  guests: number;
  specialRequests: string;
  nights: number;
  totalPrice: number;
}

@Component({
  selector: 'app-payment-modal',
  imports: [CommonModule, ModalComponent, StripePaymentComponent, PointsRedemptionComponent],
  templateUrl: './payment-modal.component.html',
  styleUrl: './payment-modal.component.scss'
})
export class PaymentModalComponent {
  @Input() isOpen: boolean = false;
  @Input() bookingData: PaymentModalData | null = null;

  @Output() closeModal = new EventEmitter<void>();
  @Output() bookingComplete = new EventEmitter<{ confirmationNumber: string; bookingId: string }>();

  // Payment state
  paymentStep = signal<'review' | 'payment' | 'confirmation'>('review');
  paymentIntent = signal<CreatePaymentIntentResponse | null>(null);
  savedPaymentMethods = signal<SavedPaymentMethod[]>([]);
  processingPayment = signal<boolean>(false);
  loading = signal<boolean>(false);
  error = signal<string>('');

  // Loyalty
  pointsToRedeem = signal<number>(0);
  pointsDiscount = signal<number>(0);

  // Confirmation
  confirmationNumber = signal<string>('');
  bookingId = signal<string>('');

  // Pending booking (created before payment)
  pendingBookingId = signal<string>('');

  constructor(
    private bookingService: BookingService,
    private paymentService: PaymentService,
    private emailService: EmailService,
    private loyaltyService: LoyaltyService,
    private authService: AuthService,
    private router: Router
  ) {}

  // Computed values
  finalPrice = computed(() => {
    return (this.bookingData?.totalPrice ?? 0) - this.pointsDiscount();
  });

  get modalTitle(): string {
    switch (this.paymentStep()) {
      case 'review':
        return 'Review & Pay';
      case 'payment':
        return 'Complete Payment';
      case 'confirmation':
        return 'Booking Confirmed!';
      default:
        return 'Payment';
    }
  }

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  onPointsRedemptionChange(data: { points: number; discount: number }): void {
    this.pointsToRedeem.set(data.points);
    this.pointsDiscount.set(data.discount);
  }

  proceedToPayment(): void {
    console.log('proceedToPayment called');
    console.log('isAuthenticated:', this.authService.isAuthenticated());
    console.log('bookingData:', this.bookingData);

    if (!this.authService.isAuthenticated()) {
      console.log('User not authenticated, redirecting to login');
      // Save current state and redirect to login
      this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: this.router.url }
      });
      return;
    }

    // First create the booking, then create payment intent
    this.createBookingAndPaymentIntent();
  }

  createBookingAndPaymentIntent(): void {
    console.log('createBookingAndPaymentIntent called');

    if (!this.bookingData) {
      console.log('No bookingData, returning');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    const user = this.authService.user();
    console.log('User:', user);

    // Step 1: Create booking with PENDING_PAYMENT status
    const bookingRequest = {
      hotelId: this.bookingData.hotel.id,
      roomId: this.bookingData.room.id,
      checkIn: this.bookingData.checkIn,
      checkOut: this.bookingData.checkOut,
      guests: this.bookingData.guests,
      specialRequests: this.bookingData.specialRequests,
      guestName: user?.name || 'Guest',
      guestEmail: user?.email || ''
    };

    console.log('Creating booking with:', bookingRequest);

    this.bookingService.createBooking(bookingRequest).subscribe({
      next: (confirmation) => {
        console.log('Booking created:', confirmation);
        // Save booking ID for payment
        this.pendingBookingId.set(confirmation.booking.id);

        // Step 2: Create payment intent with booking ID
        this.createPaymentIntent(confirmation.booking.id);
      },
      error: (err) => {
        console.error('Booking creation error:', err);
        this.loading.set(false);
        this.error.set(err.message || 'Failed to create booking. Please try again.');
      }
    });
  }

  createPaymentIntent(bookingId: string): void {
    console.log('createPaymentIntent called with bookingId:', bookingId);

    if (!this.bookingData) return;

    const paymentRequest: CreatePaymentIntentRequest = {
      bookingId: bookingId,
      amount: this.finalPrice() * 100, // Convert to cents
      currency: 'usd',
      savePaymentMethod: false
    };

    console.log('Creating payment intent with:', paymentRequest);

    this.paymentService.createPaymentIntent(paymentRequest).subscribe({
      next: (response) => {
        console.log('Payment intent created:', response);
        this.paymentIntent.set(response);
        this.paymentStep.set('payment');
        this.loading.set(false);
        this.loadSavedPaymentMethods();
      },
      error: (err) => {
        console.error('Payment intent error:', err);
        this.loading.set(false);
        this.error.set('Failed to initialize payment. Please try again.');
      }
    });
  }

  loadSavedPaymentMethods(): void {
    this.paymentService.getUserPaymentMethods().subscribe({
      next: (methods) => this.savedPaymentMethods.set(methods),
      error: () => {} // Silently fail - user can still use new card
    });
  }

  onPaymentSuccess(paymentIntentId: string): void {
    if (!this.bookingData || !this.pendingBookingId()) return;

    this.processingPayment.set(true);
    const bookingId = this.pendingBookingId();

    // Booking was already created - just need to confirm payment was successful
    // The backend webhook should handle updating the booking status
    this.processingPayment.set(false);
    this.confirmationNumber.set(`CONF-${bookingId}`);
    this.bookingId.set(bookingId);
    this.paymentStep.set('confirmation');

    // Send receipt email
    this.emailService.sendPaymentReceipt(bookingId, paymentIntentId).subscribe();

    // Emit completion event
    this.bookingComplete.emit({
      confirmationNumber: `CONF-${bookingId}`,
      bookingId: bookingId
    });
  }

  onPaymentError(errorMessage: string): void {
    this.error.set(errorMessage);
    this.processingPayment.set(false);
  }

  goBackToReview(): void {
    this.paymentStep.set('review');
    this.paymentIntent.set(null);
    this.error.set('');
  }

  handleClose(): void {
    // Don't allow closing during payment processing
    if (this.processingPayment()) {
      return;
    }

    // Reset state
    this.paymentStep.set('review');
    this.paymentIntent.set(null);
    this.error.set('');
    this.pointsToRedeem.set(0);
    this.pointsDiscount.set(0);
    this.pendingBookingId.set('');

    this.closeModal.emit();
  }

  goToDashboard(): void {
    this.handleClose();
    this.router.navigate(['/dashboard']);
  }

  continueBooking(): void {
    this.handleClose();
  }
}
