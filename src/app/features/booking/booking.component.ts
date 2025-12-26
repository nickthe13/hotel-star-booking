import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HotelService } from '../../core/services/hotel.service';
import { BookingService } from '../../core/services/booking.service';
import { PaymentService } from '../../core/services/payment.service';
import { EmailService } from '../../core/services/email.service';
import { Hotel, Room, CreatePaymentIntentRequest, CreatePaymentIntentResponse, SavedPaymentMethod } from '../../core/models';
import { StripePaymentComponent } from '../../shared/components/stripe-payment/stripe-payment.component';

@Component({
  selector: 'app-booking',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, StripePaymentComponent],
  templateUrl: './booking.component.html',
  styleUrl: './booking.component.scss'
})
export class BookingComponent implements OnInit {
  bookingForm: FormGroup;
  hotel = signal<Hotel | undefined>(undefined);
  selectedRoom = signal<Room | undefined>(undefined);
  loading = signal<boolean>(false);
  error = signal<string>('');
  success = signal<boolean>(false);
  confirmationNumber = signal<string>('');

  // Payment step signals
  paymentStep = signal<'booking' | 'payment' | 'confirmation'>('booking');
  paymentIntent = signal<CreatePaymentIntentResponse | null>(null);
  savedPaymentMethods = signal<SavedPaymentMethod[]>([]);
  selectedPaymentMethodId = signal<string | null>(null);
  savePaymentMethod = signal<boolean>(false);
  processingPayment = signal<boolean>(false);
  paymentError = signal<string>('');

  minDate: string;
  minCheckoutDate: string = '';

  // Computed signal for available rooms
  availableRooms = computed(() => {
    const hotel = this.hotel();
    return hotel?.rooms?.filter(room => room.available) || [];
  });

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private hotelService: HotelService,
    private bookingService: BookingService,
    private paymentService: PaymentService,
    private emailService: EmailService
  ) {
    // Set minimum date to today
    const today = new Date();
    this.minDate = today.toISOString().split('T')[0];

    this.bookingForm = this.fb.group({
      roomId: ['', Validators.required],
      checkIn: ['', Validators.required],
      checkOut: ['', Validators.required],
      guests: [2, [Validators.required, Validators.min(1), Validators.max(10)]],
      specialRequests: ['']
    });

    // Update minimum checkout date when check-in changes
    this.bookingForm.get('checkIn')?.valueChanges.subscribe((checkInDate) => {
      if (checkInDate) {
        const checkIn = new Date(checkInDate);
        checkIn.setDate(checkIn.getDate() + 1);
        this.minCheckoutDate = checkIn.toISOString().split('T')[0];

        // Reset checkout if it's before the new minimum
        const checkOut = this.bookingForm.get('checkOut')?.value;
        if (checkOut && new Date(checkOut) <= new Date(checkInDate)) {
          this.bookingForm.patchValue({ checkOut: '' });
        }
      }
    });

    // Update selected room when roomId changes
    this.bookingForm.get('roomId')?.valueChanges.subscribe((roomId) => {
      const hotel = this.hotel();
      if (hotel && roomId) {
        const room = hotel.rooms?.find(r => r.id === roomId);
        this.selectedRoom.set(room);
      } else {
        this.selectedRoom.set(undefined);
      }
    });
  }

  ngOnInit(): void {
    // Scroll to top when component loads
    window.scrollTo(0, 0);

    const hotelId = this.route.snapshot.paramMap.get('hotelId');
    if (hotelId) {
      this.loadHotel(hotelId);
    } else {
      this.error.set('No hotel selected');
    }

    // Load saved payment methods
    this.loadSavedPaymentMethods();
  }

  loadSavedPaymentMethods(): void {
    this.paymentService.getUserPaymentMethods().subscribe({
      next: (methods) => this.savedPaymentMethods.set(methods),
      error: (err) => console.error('Failed to load payment methods', err)
    });
  }

  loadHotel(hotelId: string): void {
    this.hotelService.getHotelById(hotelId).subscribe({
      next: (hotel) => {
        if (hotel) {
          this.hotel.set(hotel);
        } else {
          this.error.set('Hotel not found');
        }
      },
      error: () => {
        this.error.set('Failed to load hotel details');
      }
    });
  }

  calculateNights(): number {
    const checkIn = this.bookingForm.get('checkIn')?.value;
    const checkOut = this.bookingForm.get('checkOut')?.value;

    if (checkIn && checkOut) {
      const nights = this.bookingService.calculateNights(
        new Date(checkIn),
        new Date(checkOut)
      );
      return nights > 0 ? nights : 0;
    }
    return 0;
  }

  calculateTotalPrice(): number {
    const room = this.selectedRoom();
    if (!room) return 0;

    const nights = this.calculateNights();
    return room.pricePerNight * nights;
  }

  onSubmit(): void {
    if (this.bookingForm.invalid) {
      Object.keys(this.bookingForm.controls).forEach(key => {
        this.bookingForm.get(key)?.markAsTouched();
      });
      return;
    }

    const hotel = this.hotel();
    if (!hotel) {
      this.error.set('Hotel not found');
      return;
    }

    // Proceed to payment step
    this.createPaymentIntent();
  }

  createPaymentIntent(): void {
    this.loading.set(true);
    this.error.set('');

    const hotel = this.hotel();
    const room = this.selectedRoom();

    if (!hotel || !room) {
      this.error.set('Hotel or room not found');
      this.loading.set(false);
      return;
    }

    const totalPrice = this.calculateTotalPrice();

    const paymentRequest: CreatePaymentIntentRequest = {
      amount: totalPrice * 100, // Convert to cents
      currency: 'usd',
      savePaymentMethod: this.savePaymentMethod(),
      paymentMethodId: this.selectedPaymentMethodId() || undefined,
      metadata: {
        hotelId: hotel.id,
        hotelName: hotel.name,
        roomType: room.roomType,
        checkIn: this.bookingForm.value.checkIn,
        checkOut: this.bookingForm.value.checkOut
      }
    };

    this.paymentService.createPaymentIntent(paymentRequest).subscribe({
      next: (response) => {
        this.paymentIntent.set(response);
        this.paymentStep.set('payment');
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set('Failed to initialize payment. Please try again.');
      }
    });
  }

  onPaymentSuccess(paymentIntentId: string): void {
    this.processingPayment.set(true);

    const hotel = this.hotel();
    if (!hotel) {
      this.paymentError.set('Hotel information not found');
      this.processingPayment.set(false);
      return;
    }

    // Now create the booking with payment confirmation
    const bookingData = {
      hotelId: hotel.id,
      roomId: this.bookingForm.value.roomId,
      checkIn: this.bookingForm.value.checkIn,
      checkOut: this.bookingForm.value.checkOut,
      guests: this.bookingForm.value.guests,
      specialRequests: this.bookingForm.value.specialRequests,
      paymentIntentId: paymentIntentId
    };

    this.bookingService.createBookingWithPayment(bookingData).subscribe({
      next: (response) => {
        this.processingPayment.set(false);
        this.success.set(true);
        this.confirmationNumber.set(response.confirmationNumber);
        this.paymentStep.set('confirmation');

        // Send receipt email
        if (response.paymentTransaction) {
          this.emailService.sendPaymentReceipt(
            response.booking.id,
            response.paymentTransaction.id
          ).subscribe();
        }
      },
      error: (err) => {
        this.processingPayment.set(false);
        this.paymentError.set('Booking creation failed. Payment was successful - please contact support.');
      }
    });
  }

  onPaymentError(error: string): void {
    this.paymentError.set(error);
    this.processingPayment.set(false);
  }

  goBackToBooking(): void {
    this.paymentStep.set('booking');
    this.paymentIntent.set(null);
    this.paymentError.set('');
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400'; // Fallback image
  }
}
