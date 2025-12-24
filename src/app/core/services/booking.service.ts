import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { API_ENDPOINTS } from '../constants/api.constants';
import { Booking, BookingRequest, BookingConfirmation, BookingStatus } from '../models/booking.model';
import { AuthService } from './auth.service';
import { HotelService } from './hotel.service';

@Injectable({
  providedIn: 'root'
})
export class BookingService {
  private readonly API_URL = environment.apiUrl;
  loading = signal<boolean>(false);
  private nextBookingNumber = 3; // Start from 3 since we have 2 initial bookings

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
      createdAt: new Date('2025-12-01'),
      hotel: {
        name: 'Grand Plaza Hotel',
        image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400',
        location: 'New York, USA'
      }
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
      createdAt: new Date('2025-11-01'),
      hotel: {
        name: 'Sunset Beach Resort',
        image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400',
        location: 'Miami, USA'
      }
    }
  ];

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private hotelService: HotelService
  ) {}

  createBooking(bookingData: BookingRequest): Observable<BookingConfirmation> {
    // In production, this would be:
    // return this.http.post<BookingConfirmation>(`${this.API_URL}${API_ENDPOINTS.bookings}`, bookingData);

    // Mock implementation - fetch hotel data and create booking
    return this.hotelService.getHotelById(bookingData.hotelId).pipe(
      map(hotel => {
        if (!hotel) {
          throw new Error('Hotel not found');
        }

        // Find the selected room
        const selectedRoom = hotel.rooms?.find(room => room.id === bookingData.roomId);
        if (!selectedRoom) {
          throw new Error('Room not found');
        }

        const userId = this.authService.isAuthenticated() ? '1' : '1';
        const totalPrice = this.calculateTotalPrice(
          selectedRoom.pricePerNight,
          new Date(bookingData.checkIn),
          new Date(bookingData.checkOut)
        );

        const bookingNumber = this.nextBookingNumber++;
        const newBooking: Booking = {
          id: bookingNumber.toString(),
          userId: userId,
          hotelId: bookingData.hotelId,
          roomId: bookingData.roomId,
          checkIn: new Date(bookingData.checkIn),
          checkOut: new Date(bookingData.checkOut),
          guests: bookingData.guests,
          totalPrice: totalPrice,
          status: BookingStatus.CONFIRMED,
          createdAt: new Date(),
          specialRequests: bookingData.specialRequests,
          hotel: {
            name: hotel.name,
            image: hotel.images[0],
            location: hotel.location
          },
          room: {
            roomType: selectedRoom.roomType
          }
        };

        // Add the new booking to the mock array
        this.mockBookings.unshift(newBooking);

        return {
          booking: newBooking,
          confirmationNumber: `CONF-${Date.now()}`,
          estimatedCheckInTime: '3:00 PM',
          message: 'Your booking has been confirmed!'
        };
      })
    );
  }

  getUserBookings(): Observable<Booking[]> {
    // In production, this would be:
    // return this.http.get<Booking[]>(`${this.API_URL}${API_ENDPOINTS.bookings}`);

    // Mock implementation
    const userId = '1'; // Would get from authService.currentUser()?.id

    // Filter bookings for the user
    const userBookings = this.mockBookings.filter(booking => booking.userId === userId);

    return of(userBookings);
  }

  getAllBookings(): Observable<Booking[]> {
    // In production, this would be:
    // return this.http.get<Booking[]>(`${this.API_URL}${API_ENDPOINTS.admin.bookings}`);

    // Mock implementation - return all bookings for admin view
    return of([...this.mockBookings]);
  }

  removeBooking(id: string): Observable<void> {
    // Remove booking from the array
    const index = this.mockBookings.findIndex(b => b.id === id);
    if (index > -1) {
      this.mockBookings.splice(index, 1);
    }
    return of(undefined);
  }

  getBookingById(id: string): Observable<Booking> {
    // In production, this would be:
    // return this.http.get<Booking>(`${this.API_URL}${API_ENDPOINTS.bookings}/${id}`);

    // Mock implementation
    const booking = this.mockBookings.find(b => b.id === id);
    if (!booking) {
      return throwError(() => new Error('Booking not found'));
    }
    return of(booking);
  }

  cancelBooking(id: string): Observable<void> {
    // In production, this would be:
    // return this.http.delete<void>(`${this.API_URL}${API_ENDPOINTS.bookings}/${id}`);

    // Mock implementation
    const booking = this.mockBookings.find(b => b.id === id);
    if (booking) {
      booking.status = BookingStatus.CANCELLED;
    }
    return of(undefined);
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

    return of(updatedBooking);
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
