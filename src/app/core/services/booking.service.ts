import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, delay, map, of, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { API_ENDPOINTS } from '../constants/api.constants';
import { Booking, BookingRequest, BookingConfirmation, BookingStatus } from '../models/booking.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class BookingService {
  private readonly API_URL = environment.apiUrl;
  loading = signal<boolean>(false);

  // Mock bookings data
  private mockBookings: Booking[] = [
    {
      id: '1',
      userId: '1',
      hotelId: '1',
      roomId: '101',
      checkIn: new Date('2025-12-15'),
      checkOut: new Date('2025-12-20'),
      guests: 3,
      totalPrice: 1250,
      status: BookingStatus.CONFIRMED,
      createdAt: new Date('2025-12-01')
    },
    {
      id: '2',
      userId: '1',
      hotelId: '3',
      roomId: '201',
      checkIn: new Date('2025-11-10'),
      checkOut: new Date('2025-11-15'),
      guests: 2,
      totalPrice: 900,
      status: BookingStatus.COMPLETED,
      createdAt: new Date('2025-11-01')
    }
  ];

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  createBooking(bookingData: BookingRequest): Observable<BookingConfirmation> {
    // In production, this would be:
    // return this.http.post<BookingConfirmation>(`${this.API_URL}${API_ENDPOINTS.bookings}`, bookingData);

    // Mock implementation
    const userId = this.authService.isAuthenticated() ? '1' : '1'; // Would get from authService
    const totalPrice = this.calculateTotalPrice(200, new Date(bookingData.checkIn), new Date(bookingData.checkOut));

    return of({
      booking: {
        id: Math.random().toString(36).substring(7),
        userId: userId,
        hotelId: bookingData.hotelId,
        roomId: bookingData.roomId,
        checkIn: new Date(bookingData.checkIn),
        checkOut: new Date(bookingData.checkOut),
        guests: bookingData.guests,
        totalPrice: totalPrice,
        status: BookingStatus.CONFIRMED,
        createdAt: new Date()
      },
      confirmationNumber: `CONF-${Date.now()}`,
      estimatedCheckInTime: '3:00 PM',
      message: 'Your booking has been confirmed!'
    }).pipe(delay(1000)); // Simulate API delay
  }

  getUserBookings(): Observable<Booking[]> {
    // In production, this would be:
    // return this.http.get<Booking[]>(`${this.API_URL}${API_ENDPOINTS.bookings}`);

    // Mock implementation
    const userId = '1'; // Would get from authService.currentUser()?.id
    return of(
      this.mockBookings.filter(booking => booking.userId === userId)
    ).pipe(delay(500));
  }

  getBookingById(id: string): Observable<Booking> {
    // In production, this would be:
    // return this.http.get<Booking>(`${this.API_URL}${API_ENDPOINTS.bookings}/${id}`);

    // Mock implementation
    const booking = this.mockBookings.find(b => b.id === id);
    if (!booking) {
      return throwError(() => new Error('Booking not found'));
    }
    return of(booking).pipe(delay(500));
  }

  cancelBooking(id: string): Observable<void> {
    // In production, this would be:
    // return this.http.delete<void>(`${this.API_URL}${API_ENDPOINTS.bookings}/${id}`);

    // Mock implementation
    const booking = this.mockBookings.find(b => b.id === id);
    if (booking) {
      booking.status = BookingStatus.CANCELLED;
    }
    return of(undefined).pipe(delay(500));
  }

  updateBooking(id: string, updates: Partial<BookingRequest>): Observable<Booking> {
    // In production, this would be:
    // return this.http.put<Booking>(`${this.API_URL}${API_ENDPOINTS.bookings}/${id}`, updates);

    // Mock implementation
    const booking = this.mockBookings.find(b => b.id === id);
    if (!booking) {
      return throwError(() => new Error('Booking not found'));
    }

    // Convert string dates to Date objects
    const updatedBooking: Booking = {
      ...booking,
      ...updates,
      checkIn: updates.checkIn ? new Date(updates.checkIn) : booking.checkIn,
      checkOut: updates.checkOut ? new Date(updates.checkOut) : booking.checkOut
    };

    const index = this.mockBookings.findIndex(b => b.id === id);
    this.mockBookings[index] = updatedBooking;

    return of(updatedBooking).pipe(delay(500));
  }

  calculateTotalPrice(pricePerNight: number, checkIn: Date, checkOut: Date): number {
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    return pricePerNight * nights;
  }

  calculateNights(checkIn: Date, checkOut: Date): number {
    return Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
  }

  isValidDateRange(checkIn: Date, checkOut: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return checkIn >= today && checkOut > checkIn;
  }
}
