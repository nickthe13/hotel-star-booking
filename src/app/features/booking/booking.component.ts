import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HotelService } from '../../core/services/hotel.service';
import { BookingService } from '../../core/services/booking.service';
import { Hotel, Room } from '../../core/models';

@Component({
  selector: 'app-booking',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
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
    private bookingService: BookingService
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

    this.loading.set(true);
    this.error.set('');

    const bookingData = {
      hotelId: hotel.id,
      roomId: this.bookingForm.value.roomId,
      checkIn: this.bookingForm.value.checkIn,
      checkOut: this.bookingForm.value.checkOut,
      guests: this.bookingForm.value.guests,
      specialRequests: this.bookingForm.value.specialRequests
    };

    this.bookingService.createBooking(bookingData).subscribe({
      next: (response) => {
        this.loading.set(false);
        this.success.set(true);
        this.confirmationNumber.set(response.confirmationNumber);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set('Failed to create booking. Please try again.');
      }
    });
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400'; // Fallback image
  }
}
