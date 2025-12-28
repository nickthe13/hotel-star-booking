import { Injectable, signal } from '@angular/core';
import { Booking, BookingStatus } from '../models/booking.model';
import { CalendarDay, CalendarMonth, DateRange } from '../models/availability.model';

@Injectable({
  providedIn: 'root'
})
export class AvailabilityService {
  private readonly MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  private readonly DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  getMonthName(month: number): string {
    return this.MONTHS[month];
  }

  getDayNames(): string[] {
    return this.DAYS;
  }

  /**
   * Generate calendar days for a specific month
   */
  generateCalendarMonth(
    year: number,
    month: number,
    bookings: Booking[],
    selectedRange: DateRange,
    pricePerNight?: number
  ): CalendarDay[] {
    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const startingDayOfWeek = firstDayOfMonth.getDay();

    // Add days from previous month to fill the first week
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay - i);
      days.push(this.createCalendarDay(date, false, today, bookings, selectedRange, pricePerNight));
    }

    // Add days of current month
    for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
      const date = new Date(year, month, day);
      days.push(this.createCalendarDay(date, true, today, bookings, selectedRange, pricePerNight));
    }

    // Add days from next month to complete the last week
    const remainingDays = 42 - days.length; // 6 rows * 7 days = 42
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push(this.createCalendarDay(date, false, today, bookings, selectedRange, pricePerNight));
    }

    return days;
  }

  /**
   * Create a CalendarDay object
   */
  private createCalendarDay(
    date: Date,
    isCurrentMonth: boolean,
    today: Date,
    bookings: Booking[],
    selectedRange: DateRange,
    pricePerNight?: number
  ): CalendarDay {
    const dateStr = this.formatDateToString(date);
    const checkIn = selectedRange.checkIn;
    const checkOut = selectedRange.checkOut;

    const isToday = date.getTime() === today.getTime();
    const isPast = date < today;
    const isBooked = this.isDateBooked(date, bookings);

    let isSelected = false;
    let isInRange = false;
    let isCheckIn = false;
    let isCheckOut = false;

    if (checkIn) {
      isCheckIn = dateStr === checkIn;
      isSelected = isCheckIn;

      if (checkOut) {
        isCheckOut = dateStr === checkOut;
        isSelected = isCheckIn || isCheckOut;
        isInRange = this.isDateInRange(dateStr, checkIn, checkOut);
      }
    }

    return {
      date,
      dayOfMonth: date.getDate(),
      isCurrentMonth,
      isToday,
      isPast,
      isBooked,
      isSelected,
      isInRange,
      isCheckIn,
      isCheckOut,
      price: pricePerNight
    };
  }

  /**
   * Check if a date is booked based on existing bookings
   */
  isDateBooked(date: Date, bookings: Booking[]): boolean {
    const dateTime = date.getTime();

    return bookings.some(booking => {
      // Skip cancelled bookings
      if (booking.status === BookingStatus.CANCELLED) {
        return false;
      }

      const checkIn = new Date(booking.checkIn);
      const checkOut = new Date(booking.checkOut);
      checkIn.setHours(0, 0, 0, 0);
      checkOut.setHours(0, 0, 0, 0);

      // Date is booked if it falls within the booking range (excluding checkout day)
      return dateTime >= checkIn.getTime() && dateTime < checkOut.getTime();
    });
  }

  /**
   * Check if a date string is within a range
   */
  private isDateInRange(dateStr: string, checkIn: string, checkOut: string): boolean {
    const date = new Date(dateStr);
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    return date > checkInDate && date < checkOutDate;
  }

  /**
   * Format date to YYYY-MM-DD string
   */
  formatDateToString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Parse YYYY-MM-DD string to Date
   */
  parseStringToDate(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  /**
   * Get the number of nights between two dates
   */
  calculateNights(checkIn: string, checkOut: string): number {
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const diffTime = checkOutDate.getTime() - checkInDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if a date range has any booked dates
   */
  hasBookedDatesInRange(checkIn: string, checkOut: string, bookings: Booking[]): boolean {
    const startDate = new Date(checkIn);
    const endDate = new Date(checkOut);

    for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
      if (this.isDateBooked(new Date(d), bookings)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Format date for display (e.g., "Jan 15, 2025")
   */
  formatDateForDisplay(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
}
