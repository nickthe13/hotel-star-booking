import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Booking } from '../../../core/models/booking.model';
import { CalendarDay, DateRange } from '../../../core/models/availability.model';
import { AvailabilityService } from '../../../core/services/availability.service';

@Component({
  selector: 'app-availability-calendar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './availability-calendar.component.html',
  styleUrl: './availability-calendar.component.scss'
})
export class AvailabilityCalendarComponent implements OnInit, OnChanges {
  @Input() bookings: Booking[] = [];
  @Input() pricePerNight: number = 0;
  @Input() initialCheckIn: string | null = null;
  @Input() initialCheckOut: string | null = null;
  @Input() minDate: string | null = null;
  @Input() showPrice: boolean = true;
  @Input() compact: boolean = false;

  @Output() dateRangeSelected = new EventEmitter<DateRange>();
  @Output() dateRangeCleared = new EventEmitter<void>();

  currentYear = signal<number>(new Date().getFullYear());
  currentMonth = signal<number>(new Date().getMonth());

  checkIn = signal<string | null>(null);
  checkOut = signal<string | null>(null);

  isSelectingCheckOut = signal<boolean>(false);

  calendarDays = computed(() => {
    return this.availabilityService.generateCalendarMonth(
      this.currentYear(),
      this.currentMonth(),
      this.bookings,
      { checkIn: this.checkIn(), checkOut: this.checkOut() },
      this.pricePerNight
    );
  });

  monthName = computed(() => {
    return this.availabilityService.getMonthName(this.currentMonth());
  });

  dayNames: string[];

  selectedNights = computed(() => {
    const checkIn = this.checkIn();
    const checkOut = this.checkOut();
    if (checkIn && checkOut) {
      return this.availabilityService.calculateNights(checkIn, checkOut);
    }
    return 0;
  });

  totalPrice = computed(() => {
    return this.selectedNights() * this.pricePerNight;
  });

  constructor(private availabilityService: AvailabilityService) {
    this.dayNames = this.availabilityService.getDayNames();
  }

  ngOnInit(): void {
    if (this.initialCheckIn) {
      this.checkIn.set(this.initialCheckIn);
      if (this.initialCheckOut) {
        this.checkOut.set(this.initialCheckOut);
      }
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialCheckIn'] && this.initialCheckIn) {
      this.checkIn.set(this.initialCheckIn);
      // Navigate to the month of check-in date
      const date = new Date(this.initialCheckIn);
      this.currentYear.set(date.getFullYear());
      this.currentMonth.set(date.getMonth());
    }
    if (changes['initialCheckOut'] && this.initialCheckOut) {
      this.checkOut.set(this.initialCheckOut);
    }
  }

  previousMonth(): void {
    if (this.currentMonth() === 0) {
      this.currentMonth.set(11);
      this.currentYear.set(this.currentYear() - 1);
    } else {
      this.currentMonth.set(this.currentMonth() - 1);
    }
  }

  nextMonth(): void {
    if (this.currentMonth() === 11) {
      this.currentMonth.set(0);
      this.currentYear.set(this.currentYear() + 1);
    } else {
      this.currentMonth.set(this.currentMonth() + 1);
    }
  }

  canGoToPreviousMonth(): boolean {
    const today = new Date();
    const currentView = new Date(this.currentYear(), this.currentMonth(), 1);
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    return currentView > thisMonth;
  }

  onDayClick(day: CalendarDay): void {
    // Don't allow selection of past dates, booked dates, or non-current month dates
    if (day.isPast || day.isBooked || !day.isCurrentMonth) {
      return;
    }

    const dateStr = this.availabilityService.formatDateToString(day.date);

    if (!this.checkIn() || (this.checkIn() && this.checkOut())) {
      // Start new selection
      this.checkIn.set(dateStr);
      this.checkOut.set(null);
      this.isSelectingCheckOut.set(true);
    } else if (this.isSelectingCheckOut()) {
      // Set checkout date
      const checkInDate = new Date(this.checkIn()!);
      const selectedDate = day.date;

      if (selectedDate <= checkInDate) {
        // If selected date is before or equal to check-in, restart selection
        this.checkIn.set(dateStr);
        this.checkOut.set(null);
      } else {
        // Check if there are any booked dates in the range
        if (this.availabilityService.hasBookedDatesInRange(this.checkIn()!, dateStr, this.bookings)) {
          // Can't select this range, restart
          this.checkIn.set(dateStr);
          this.checkOut.set(null);
        } else {
          this.checkOut.set(dateStr);
          this.isSelectingCheckOut.set(false);
          this.emitSelection();
        }
      }
    }
  }

  clearSelection(): void {
    this.checkIn.set(null);
    this.checkOut.set(null);
    this.isSelectingCheckOut.set(false);
    this.dateRangeCleared.emit();
  }

  private emitSelection(): void {
    this.dateRangeSelected.emit({
      checkIn: this.checkIn(),
      checkOut: this.checkOut()
    });
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return '';
    return this.availabilityService.formatDateForDisplay(dateStr);
  }

  getDayClasses(day: CalendarDay): string {
    const classes: string[] = ['calendar-day'];

    if (!day.isCurrentMonth) {
      classes.push('other-month');
    }
    if (day.isToday) {
      classes.push('today');
    }
    if (day.isPast) {
      classes.push('past');
    }
    if (day.isBooked) {
      classes.push('booked');
    }
    if (day.isCheckIn) {
      classes.push('check-in');
    }
    if (day.isCheckOut) {
      classes.push('check-out');
    }
    if (day.isInRange) {
      classes.push('in-range');
    }
    if (day.isSelected) {
      classes.push('selected');
    }
    if (!day.isPast && !day.isBooked && day.isCurrentMonth) {
      classes.push('available');
    }

    return classes.join(' ');
  }
}
