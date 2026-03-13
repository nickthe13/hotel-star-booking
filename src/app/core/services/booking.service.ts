import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Booking, BookingRequest, BookingConfirmation, BookingStatus, CancelBookingResult } from '../models/booking.model';
import { PaymentStatus } from '../models/payment.model';

@Injectable({
  providedIn: 'root'
})
export class BookingService {
  private readonly API_URL = environment.apiUrl;
  loading = signal<boolean>(false);
  private bookingsCache = signal<Booking[]>([]);
  private cacheTimestamp = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor(private http: HttpClient) {}

  private isCacheValid(): boolean {
    return this.bookingsCache().length > 0 && (Date.now() - this.cacheTimestamp) < this.CACHE_DURATION;
  }

  invalidateCache(): void {
    this.cacheTimestamp = 0;
  }

  private mapBookingFromApi(apiBooking: any): Booking {
    return {
      id: apiBooking.id,
      userId: apiBooking.userId,
      hotelId: apiBooking.room?.hotelId || apiBooking.hotelId,
      roomId: apiBooking.roomId,
      checkIn: new Date(apiBooking.checkIn),
      checkOut: new Date(apiBooking.checkOut),
      guests: apiBooking.numberOfGuests || apiBooking.guests || 1,
      totalPrice: apiBooking.totalPrice,
      status: apiBooking.status as BookingStatus,
      createdAt: new Date(apiBooking.createdAt),
      specialRequests: apiBooking.specialRequests,
      hotel: apiBooking.room?.hotel ? {
        name: apiBooking.room.hotel.name,
        image: apiBooking.room.hotel.images?.[0] || '',
        location: `${apiBooking.room.hotel.city}, ${apiBooking.room.hotel.country}`
      } : undefined,
      room: apiBooking.room ? {
        roomType: apiBooking.room.name || apiBooking.room.type
      } : undefined,
      isPaid: apiBooking.isPaid || false,
      paidAt: apiBooking.paidAt ? new Date(apiBooking.paidAt) : undefined,
      paymentTransactionId: apiBooking.paymentTransactionId,
      paymentStatus: apiBooking.paymentStatus as PaymentStatus,
      pointsEarned: apiBooking.pointsEarned,
      pointsRedeemed: apiBooking.pointsRedeemed,
      discountFromPoints: apiBooking.discountFromPoints
    };
  }

  createBooking(bookingData: BookingRequest): Observable<BookingConfirmation> {
    this.loading.set(true);

    const createDto: any = {
      roomId: bookingData.roomId,
      checkIn: new Date(bookingData.checkIn).toISOString(),
      checkOut: new Date(bookingData.checkOut).toISOString(),
      guests: bookingData.guests
    };

    // Only add specialRequests if provided
    if (bookingData.specialRequests) {
      createDto.specialRequests = bookingData.specialRequests;
    }

    return this.http.post<any>(`${this.API_URL}/bookings`, createDto).pipe(
      tap(() => this.invalidateCache()),
      map(response => {
        this.loading.set(false);
        const booking = this.mapBookingFromApi(response);

        return {
          booking,
          confirmationNumber: `CONF-${booking.id}`,
          estimatedCheckInTime: '3:00 PM',
          message: 'Your booking has been created! Please complete payment to confirm.',
          requiresPayment: true
        };
      }),
      catchError((error: HttpErrorResponse) => {
        this.loading.set(false);
        const message = error.error?.message || 'Failed to create booking';
        return throwError(() => new Error(message));
      })
    );
  }

  getUserBookings(forceRefresh = false): Observable<Booking[]> {
    if (!forceRefresh && this.isCacheValid()) {
      return of(this.bookingsCache());
    }

    this.loading.set(true);

    return this.http.get<any[]>(`${this.API_URL}/bookings`).pipe(
      map(response => {
        this.loading.set(false);
        const bookings = response.map(b => this.mapBookingFromApi(b));
        this.bookingsCache.set(bookings);
        this.cacheTimestamp = Date.now();
        return bookings;
      }),
      catchError((error: HttpErrorResponse) => {
        this.loading.set(false);
        console.error('Error fetching bookings:', error);
        return of([]);
      })
    );
  }

  getBookingById(id: string): Observable<Booking> {
    return this.http.get<any>(`${this.API_URL}/bookings/${id}`).pipe(
      map(response => this.mapBookingFromApi(response)),
      catchError((error: HttpErrorResponse) => {
        const message = error.error?.message || 'Booking not found';
        return throwError(() => new Error(message));
      })
    );
  }

  cancelBooking(id: string): Observable<void> {
    return this.http.post<any>(`${this.API_URL}/bookings/${id}/cancel`, {}).pipe(
      tap(() => this.invalidateCache()),
      map(() => undefined),
      catchError((error: HttpErrorResponse) => {
        const message = error.error?.message || 'Failed to cancel booking';
        return throwError(() => new Error(message));
      })
    );
  }

  cancelBookingWithRefund(id: string, refundAmount: number): Observable<CancelBookingResult> {
    return this.http.post<any>(`${this.API_URL}/bookings/${id}/cancel`, {
      refundAmount
    }).pipe(
      tap(() => this.invalidateCache()),
      map(response => {
        const booking = this.mapBookingFromApi(response.booking || response);

        return {
          booking,
          refund: response.refund || {
            refundId: `re_${Date.now()}`,
            amount: refundAmount,
            status: 'succeeded'
          },
          message: response.message || 'Booking cancelled and refund processed'
        };
      }),
      catchError((error: HttpErrorResponse) => {
        const message = error.error?.message || 'Failed to cancel booking';
        return throwError(() => new Error(message));
      })
    );
  }

  updateBooking(id: string, updates: Partial<BookingRequest>): Observable<Booking> {
    const updateDto: any = {};

    if (updates.checkIn) updateDto.checkIn = new Date(updates.checkIn).toISOString();
    if (updates.checkOut) updateDto.checkOut = new Date(updates.checkOut).toISOString();
    if (updates.guests) updateDto.numberOfGuests = updates.guests;
    if (updates.specialRequests) updateDto.specialRequests = updates.specialRequests;

    return this.http.patch<any>(`${this.API_URL}/bookings/${id}`, updateDto).pipe(
      tap(() => this.invalidateCache()),
      map(response => this.mapBookingFromApi(response)),
      catchError((error: HttpErrorResponse) => {
        const message = error.error?.message || 'Failed to update booking';
        return throwError(() => new Error(message));
      })
    );
  }

  updateBookingStatus(id: string, status: BookingStatus): Observable<void> {
    let endpoint = '';

    switch (status) {
      case BookingStatus.CHECKED_IN:
        endpoint = `${this.API_URL}/bookings/${id}/check-in`;
        break;
      case BookingStatus.CHECKED_OUT:
      case BookingStatus.COMPLETED:
        endpoint = `${this.API_URL}/bookings/${id}/check-out`;
        break;
      case BookingStatus.CANCELLED:
        endpoint = `${this.API_URL}/bookings/${id}/cancel`;
        break;
      default:
        return this.http.patch<any>(`${this.API_URL}/bookings/${id}`, { status }).pipe(
          tap(() => this.invalidateCache()),
          map(() => undefined),
          catchError((error: HttpErrorResponse) => {
            const message = error.error?.message || 'Failed to update booking status';
            return throwError(() => new Error(message));
          })
        );
    }

    return this.http.post<any>(endpoint, {}).pipe(
      tap(() => this.invalidateCache()),
      map(() => undefined),
      catchError((error: HttpErrorResponse) => {
        const message = error.error?.message || 'Failed to update booking status';
        return throwError(() => new Error(message));
      })
    );
  }

  applyPointsRedemption(id: string, points: number): Observable<Booking> {
    return this.http.post<any>(`${this.API_URL}/bookings/${id}/apply-points`, { points }).pipe(
      map(response => this.mapBookingFromApi(response)),
      catchError((error: HttpErrorResponse) => {
        const message = error.error?.message || 'Failed to apply points';
        return throwError(() => new Error(message));
      })
    );
  }

  removeBooking(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/bookings/${id}`).pipe(
      tap(() => this.invalidateCache()),
      catchError((error: HttpErrorResponse) => {
        const message = error.error?.message || 'Failed to delete booking';
        return throwError(() => new Error(message));
      })
    );
  }

  getRoomBookings(roomId: string): Observable<Booking[]> {
    return this.http.get<any[]>(`${this.API_URL}/bookings/room/${roomId}`).pipe(
      map(response => response.map(b => ({
        id: b.id,
        userId: '',
        hotelId: '',
        roomId: roomId,
        checkIn: new Date(b.checkIn),
        checkOut: new Date(b.checkOut),
        guests: 0,
        totalPrice: 0,
        status: b.status as BookingStatus,
        createdAt: new Date(),
      }))),
      catchError(() => of([]))
    );
  }

  // Utility methods
  calculateTotalPrice(pricePerNight: number, checkIn: Date, checkOut: Date): number {
    const nights = this.calculateNights(checkIn, checkOut);
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
