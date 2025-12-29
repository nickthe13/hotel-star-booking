import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Hotel, Room, DateRange } from '../../../core/models';
import { AvailabilityCalendarComponent } from '../availability-calendar/availability-calendar.component';

export interface BookingDetails {
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
  selector: 'app-booking-stepper',
  imports: [CommonModule, FormsModule, AvailabilityCalendarComponent],
  templateUrl: './booking-stepper.component.html',
  styleUrl: './booking-stepper.component.scss'
})
export class BookingStepperComponent {
  @Input() hotel!: Hotel;
  @Input() selectedRoom: Room | undefined;
  @Input() checkIn: string | null = null;
  @Input() checkOut: string | null = null;

  @Output() dateRangeSelected = new EventEmitter<DateRange>();
  @Output() dateRangeCleared = new EventEmitter<void>();
  @Output() confirmBooking = new EventEmitter<BookingDetails>();

  // Current step (1, 2, or 3)
  currentStep = signal<number>(1);

  // Guest details
  guests = signal<number>(2);
  specialRequests = signal<string>('');

  // Step completion status
  step1Complete = computed(() => {
    return this.checkIn !== null && this.checkOut !== null;
  });

  step2Complete = computed(() => {
    return this.step1Complete() && this.guests() >= 1;
  });

  // Calculate nights
  nights = computed(() => {
    if (!this.checkIn || !this.checkOut) return 0;
    const checkInDate = new Date(this.checkIn);
    const checkOutDate = new Date(this.checkOut);
    const diffTime = checkOutDate.getTime() - checkInDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  });

  // Calculate total price based on selected room
  totalPrice = computed(() => {
    const pricePerNight = this.selectedRoom?.pricePerNight ?? this.hotel?.pricePerNight ?? 0;
    return pricePerNight * this.nights();
  });

  // Get effective price per night
  pricePerNight = computed(() => {
    return this.selectedRoom?.pricePerNight ?? this.hotel?.pricePerNight ?? 0;
  });

  goToStep(step: number): void {
    // Can only go to step if previous steps are complete
    if (step === 1) {
      this.currentStep.set(1);
    } else if (step === 2 && this.step1Complete()) {
      this.currentStep.set(2);
    } else if (step === 3 && this.step2Complete()) {
      this.currentStep.set(3);
    }
  }

  continueToNext(): void {
    const current = this.currentStep();
    if (current === 1 && this.step1Complete()) {
      this.currentStep.set(2);
    } else if (current === 2 && this.step2Complete()) {
      this.currentStep.set(3);
    }
  }

  onDateRangeSelected(dateRange: DateRange): void {
    this.dateRangeSelected.emit(dateRange);
  }

  onDateRangeCleared(): void {
    this.dateRangeCleared.emit();
    // Reset to step 1 if dates are cleared
    this.currentStep.set(1);
  }

  updateGuests(value: number): void {
    if (value >= 1 && value <= (this.selectedRoom?.capacity ?? 10)) {
      this.guests.set(value);
    }
  }

  updateSpecialRequests(value: string): void {
    this.specialRequests.set(value);
  }

  onConfirmBooking(): void {
    if (!this.hotel || !this.selectedRoom || !this.checkIn || !this.checkOut) {
      return;
    }

    const bookingDetails: BookingDetails = {
      hotel: this.hotel,
      room: this.selectedRoom,
      checkIn: this.checkIn,
      checkOut: this.checkOut,
      guests: this.guests(),
      specialRequests: this.specialRequests(),
      nights: this.nights(),
      totalPrice: this.totalPrice()
    };

    this.confirmBooking.emit(bookingDetails);
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return 'Select date';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  canConfirm(): boolean {
    return this.step2Complete() && this.selectedRoom !== undefined;
  }
}
