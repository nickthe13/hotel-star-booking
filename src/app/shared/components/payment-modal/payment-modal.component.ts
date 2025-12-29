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
    if (!this.authService.isAuthenticated()) {
      // Save current state and redirect to login
      this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: this.router.url }
      });
      return;
    }

    this.createPaymentIntent();
  }

  createPaymentIntent(): void {
    if (!this.bookingData) return;

    this.loading.set(true);
    this.error.set('');

    const paymentRequest: CreatePaymentIntentRequest = {
      amount: this.finalPrice() * 100, // Convert to cents
      currency: 'usd',
      savePaymentMethod: false,
      metadata: {
        hotelId: this.bookingData.hotel.id,
        hotelName: this.bookingData.hotel.name,
        roomType: this.bookingData.room.roomType,
        checkIn: this.bookingData.checkIn,
        checkOut: this.bookingData.checkOut
      }
    };

    this.paymentService.createPaymentIntent(paymentRequest).subscribe({
      next: (response) => {
        this.paymentIntent.set(response);
        this.paymentStep.set('payment');
        this.loading.set(false);
        this.loadSavedPaymentMethods();
      },
      error: () => {
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
    if (!this.bookingData) return;

    this.processingPayment.set(true);

    const bookingRequest = {
      hotelId: this.bookingData.hotel.id,
      roomId: this.bookingData.room.id,
      checkIn: this.bookingData.checkIn,
      checkOut: this.bookingData.checkOut,
      guests: this.bookingData.guests,
      specialRequests: this.bookingData.specialRequests,
      paymentIntentId: paymentIntentId
    };

    this.bookingService.createBookingWithPayment(bookingRequest).subscribe({
      next: (response) => {
        this.processingPayment.set(false);
        this.confirmationNumber.set(response.confirmationNumber);
        this.bookingId.set(response.booking.id);
        this.paymentStep.set('confirmation');

        // Send receipt email
        if (response.paymentTransaction) {
          this.emailService.sendPaymentReceipt(
            response.booking.id,
            response.paymentTransaction.id
          ).subscribe();
        }

        // Emit completion event
        this.bookingComplete.emit({
          confirmationNumber: response.confirmationNumber,
          bookingId: response.booking.id
        });
      },
      error: () => {
        this.processingPayment.set(false);
        this.error.set('Booking creation failed. Payment was successful - please contact support.');
      }
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
