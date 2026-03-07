import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { BookingService } from './booking.service';
import { BookingStatus } from '../models/booking.model';

describe('BookingService', () => {
  let service: BookingService;
  let httpMock: HttpTestingController;

  function createMockApiBooking(overrides: any = {}): any {
    return {
      id: 'b1',
      userId: 'u1',
      roomId: 'r1',
      checkIn: '2026-04-01T00:00:00.000Z',
      checkOut: '2026-04-05T00:00:00.000Z',
      numberOfGuests: 2,
      totalPrice: 400,
      status: 'CONFIRMED',
      createdAt: '2026-03-01T00:00:00.000Z',
      specialRequests: 'Late check-in',
      isPaid: true,
      paidAt: '2026-03-01T12:00:00.000Z',
      paymentTransactionId: 'txn_1',
      paymentStatus: 'COMPLETED',
      room: {
        name: 'Deluxe Suite',
        type: 'DELUXE',
        hotelId: 'h1',
        hotel: {
          name: 'Grand Hotel',
          images: ['img1.jpg', 'img2.jpg'],
          city: 'Athens',
          country: 'Greece'
        }
      },
      ...overrides
    };
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        BookingService
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    service = TestBed.inject(BookingService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // --- Utility Methods (pure functions) ---

  describe('calculateNights', () => {
    it('should return 0 for same day', () => {
      const date = new Date('2026-04-01');
      expect(service.calculateNights(date, date)).toBe(0);
    });

    it('should return 1 for consecutive days', () => {
      const checkIn = new Date('2026-04-01');
      const checkOut = new Date('2026-04-02');
      expect(service.calculateNights(checkIn, checkOut)).toBe(1);
    });

    it('should return 7 for a week', () => {
      const checkIn = new Date('2026-04-01');
      const checkOut = new Date('2026-04-08');
      expect(service.calculateNights(checkIn, checkOut)).toBe(7);
    });

    it('should ceil fractional days', () => {
      const checkIn = new Date('2026-04-01T00:00:00');
      const checkOut = new Date('2026-04-02T12:00:00');
      expect(service.calculateNights(checkIn, checkOut)).toBe(2);
    });
  });

  describe('calculateTotalPrice', () => {
    it('should multiply price by nights', () => {
      const checkIn = new Date('2026-04-01');
      const checkOut = new Date('2026-04-04');
      expect(service.calculateTotalPrice(100, checkIn, checkOut)).toBe(300);
    });

    it('should return 0 for 0 price', () => {
      const checkIn = new Date('2026-04-01');
      const checkOut = new Date('2026-04-04');
      expect(service.calculateTotalPrice(0, checkIn, checkOut)).toBe(0);
    });

    it('should return price for 1 night', () => {
      const checkIn = new Date('2026-04-01');
      const checkOut = new Date('2026-04-02');
      expect(service.calculateTotalPrice(150, checkIn, checkOut)).toBe(150);
    });
  });

  describe('isValidDateRange', () => {
    beforeEach(() => {
      jasmine.clock().install();
      jasmine.clock().mockDate(new Date('2026-03-15'));
    });

    afterEach(() => {
      jasmine.clock().uninstall();
    });

    it('should return true for future dates with checkOut after checkIn', () => {
      const checkIn = new Date('2026-04-01');
      const checkOut = new Date('2026-04-05');
      expect(service.isValidDateRange(checkIn, checkOut)).toBeTrue();
    });

    it('should return true when checkIn is today', () => {
      const checkIn = new Date('2026-03-15');
      const checkOut = new Date('2026-03-16');
      expect(service.isValidDateRange(checkIn, checkOut)).toBeTrue();
    });

    it('should return false for past checkIn', () => {
      const checkIn = new Date('2026-03-10');
      const checkOut = new Date('2026-03-16');
      expect(service.isValidDateRange(checkIn, checkOut)).toBeFalse();
    });

    it('should return false when checkOut equals checkIn', () => {
      const date = new Date('2026-04-01');
      expect(service.isValidDateRange(date, date)).toBeFalse();
    });

    it('should return false when checkOut is before checkIn', () => {
      const checkIn = new Date('2026-04-05');
      const checkOut = new Date('2026-04-01');
      expect(service.isValidDateRange(checkIn, checkOut)).toBeFalse();
    });
  });

  // --- loading signal ---

  describe('loading signal', () => {
    it('should be false initially', () => {
      expect(service.loading()).toBeFalse();
    });
  });

  // --- API mapping (via getUserBookings) ---

  describe('API response mapping', () => {
    it('should map nested room.hotel data', () => {
      service.getUserBookings().subscribe(bookings => {
        expect(bookings[0].hotel?.name).toBe('Grand Hotel');
        expect(bookings[0].hotel?.image).toBe('img1.jpg');
        expect(bookings[0].hotel?.location).toBe('Athens, Greece');
      });

      const req = httpMock.expectOne(r => r.url.includes('/bookings'));
      req.flush([createMockApiBooking()]);
    });

    it('should set hotel to undefined when room.hotel is missing', () => {
      service.getUserBookings().subscribe(bookings => {
        expect(bookings[0].hotel).toBeUndefined();
      });

      const req = httpMock.expectOne(r => r.url.includes('/bookings'));
      req.flush([createMockApiBooking({ room: { name: 'Standard', hotelId: 'h1' } })]);
    });

    it('should map numberOfGuests to guests', () => {
      service.getUserBookings().subscribe(bookings => {
        expect(bookings[0].guests).toBe(2);
      });

      const req = httpMock.expectOne(r => r.url.includes('/bookings'));
      req.flush([createMockApiBooking({ numberOfGuests: 2 })]);
    });

    it('should default guests to 1 when missing', () => {
      service.getUserBookings().subscribe(bookings => {
        expect(bookings[0].guests).toBe(1);
      });

      const req = httpMock.expectOne(r => r.url.includes('/bookings'));
      req.flush([createMockApiBooking({ numberOfGuests: undefined, guests: undefined })]);
    });

    it('should convert date strings to Date objects', () => {
      service.getUserBookings().subscribe(bookings => {
        expect(bookings[0].checkIn instanceof Date).toBeTrue();
        expect(bookings[0].checkOut instanceof Date).toBeTrue();
        expect(bookings[0].createdAt instanceof Date).toBeTrue();
      });

      const req = httpMock.expectOne(r => r.url.includes('/bookings'));
      req.flush([createMockApiBooking()]);
    });

    it('should map paidAt to Date when present', () => {
      service.getUserBookings().subscribe(bookings => {
        expect(bookings[0].paidAt instanceof Date).toBeTrue();
      });

      const req = httpMock.expectOne(r => r.url.includes('/bookings'));
      req.flush([createMockApiBooking()]);
    });

    it('should set paidAt to undefined when missing', () => {
      service.getUserBookings().subscribe(bookings => {
        expect(bookings[0].paidAt).toBeUndefined();
      });

      const req = httpMock.expectOne(r => r.url.includes('/bookings'));
      req.flush([createMockApiBooking({ paidAt: null })]);
    });

    it('should prefer room.name over room.type for roomType', () => {
      service.getUserBookings().subscribe(bookings => {
        expect(bookings[0].room?.roomType).toBe('Deluxe Suite');
      });

      const req = httpMock.expectOne(r => r.url.includes('/bookings'));
      req.flush([createMockApiBooking()]);
    });

    it('should fallback to room.hotelId for hotelId', () => {
      service.getUserBookings().subscribe(bookings => {
        expect(bookings[0].hotelId).toBe('h1');
      });

      const req = httpMock.expectOne(r => r.url.includes('/bookings'));
      req.flush([createMockApiBooking()]);
    });

    it('should fallback to top-level hotelId when room is missing', () => {
      service.getUserBookings().subscribe(bookings => {
        expect(bookings[0].hotelId).toBe('h_top');
      });

      const req = httpMock.expectOne(r => r.url.includes('/bookings'));
      req.flush([createMockApiBooking({ room: undefined, hotelId: 'h_top' })]);
    });
  });

  // --- createBooking ---

  describe('createBooking', () => {
    const bookingRequest = {
      hotelId: 'h1',
      roomId: 'r1',
      checkIn: '2026-04-01',
      checkOut: '2026-04-05',
      guests: 2
    };

    it('should POST to /bookings and return confirmation', () => {
      service.createBooking(bookingRequest).subscribe(result => {
        expect(result.confirmationNumber).toBe('CONF-b1');
        expect(result.estimatedCheckInTime).toBe('3:00 PM');
        expect(result.requiresPayment).toBeTrue();
        expect(result.booking.id).toBe('b1');
      });

      const req = httpMock.expectOne(r => r.url.includes('/bookings') && r.method === 'POST');
      expect(req.request.body.roomId).toBe('r1');
      expect(req.request.body.guests).toBe(2);
      req.flush(createMockApiBooking());
    });

    it('should send dates as ISO strings', () => {
      service.createBooking(bookingRequest).subscribe();

      const req = httpMock.expectOne(r => r.method === 'POST');
      expect(req.request.body.checkIn).toContain('2026-04-01');
      req.flush(createMockApiBooking());
    });

    it('should include specialRequests when provided', () => {
      service.createBooking({ ...bookingRequest, specialRequests: 'Late check-in' }).subscribe();

      const req = httpMock.expectOne(r => r.method === 'POST');
      expect(req.request.body.specialRequests).toBe('Late check-in');
      req.flush(createMockApiBooking());
    });

    it('should not include specialRequests when not provided', () => {
      service.createBooking(bookingRequest).subscribe();

      const req = httpMock.expectOne(r => r.method === 'POST');
      expect(req.request.body.specialRequests).toBeUndefined();
      req.flush(createMockApiBooking());
    });

    it('should toggle loading signal', () => {
      expect(service.loading()).toBeFalse();

      service.createBooking(bookingRequest).subscribe();
      expect(service.loading()).toBeTrue();

      const req = httpMock.expectOne(r => r.method === 'POST');
      req.flush(createMockApiBooking());
      expect(service.loading()).toBeFalse();
    });

    it('should reset loading on error', () => {
      service.createBooking(bookingRequest).subscribe({ error: () => {} });

      const req = httpMock.expectOne(r => r.method === 'POST');
      req.flush({ message: 'Room unavailable' }, { status: 400, statusText: 'Bad Request' });
      expect(service.loading()).toBeFalse();
    });

    it('should return error message from backend', () => {
      service.createBooking(bookingRequest).subscribe({
        error: (err: Error) => {
          expect(err.message).toBe('Room unavailable');
        }
      });

      const req = httpMock.expectOne(r => r.method === 'POST');
      req.flush({ message: 'Room unavailable' }, { status: 400, statusText: 'Bad Request' });
    });
  });

  // --- getUserBookings ---

  describe('getUserBookings', () => {
    it('should GET /bookings and return mapped array', () => {
      service.getUserBookings().subscribe(bookings => {
        expect(bookings.length).toBe(2);
        expect(bookings[0].id).toBe('b1');
      });

      const req = httpMock.expectOne(r => r.url.includes('/bookings') && r.method === 'GET');
      req.flush([createMockApiBooking(), createMockApiBooking({ id: 'b2' })]);
    });

    it('should return cached bookings on second call', () => {
      // First call fetches from API
      service.getUserBookings().subscribe();
      const req = httpMock.expectOne(r => r.url.includes('/bookings') && r.method === 'GET');
      req.flush([createMockApiBooking()]);

      // Second call should use cache — no HTTP request
      service.getUserBookings().subscribe(bookings => {
        expect(bookings.length).toBe(1);
        expect(bookings[0].id).toBe('b1');
      });
      httpMock.expectNone(r => r.url.includes('/bookings') && r.method === 'GET');
    });

    it('should bypass cache when forceRefresh is true', () => {
      // First call
      service.getUserBookings().subscribe();
      httpMock.expectOne(r => r.method === 'GET').flush([createMockApiBooking()]);

      // Force refresh should make a new HTTP call
      service.getUserBookings(true).subscribe(bookings => {
        expect(bookings.length).toBe(2);
      });
      const req = httpMock.expectOne(r => r.url.includes('/bookings') && r.method === 'GET');
      req.flush([createMockApiBooking(), createMockApiBooking({ id: 'b2' })]);
    });

    it('should refetch after cache is invalidated', () => {
      // First call
      service.getUserBookings().subscribe();
      httpMock.expectOne(r => r.method === 'GET').flush([createMockApiBooking()]);

      // Invalidate cache
      service.invalidateCache();

      // Should make a new HTTP call
      service.getUserBookings().subscribe();
      const req = httpMock.expectOne(r => r.url.includes('/bookings') && r.method === 'GET');
      req.flush([createMockApiBooking()]);
    });

    it('should return empty array on error', () => {
      service.getUserBookings().subscribe(bookings => {
        expect(bookings).toEqual([]);
      });

      const req = httpMock.expectOne(r => r.method === 'GET');
      req.flush(null, { status: 500, statusText: 'Server Error' });
    });

    it('should handle empty response', () => {
      service.getUserBookings().subscribe(bookings => {
        expect(bookings).toEqual([]);
      });

      const req = httpMock.expectOne(r => r.method === 'GET');
      req.flush([]);
    });
  });

  // --- getBookingById ---

  describe('getBookingById', () => {
    it('should GET /bookings/:id and return mapped booking', () => {
      service.getBookingById('b1').subscribe(booking => {
        expect(booking.id).toBe('b1');
        expect(booking.hotel?.name).toBe('Grand Hotel');
      });

      const req = httpMock.expectOne(r => r.url.includes('/bookings/b1'));
      req.flush(createMockApiBooking());
    });

    it('should return error on 404', () => {
      service.getBookingById('missing').subscribe({
        error: (err: Error) => {
          expect(err.message).toBe('Booking not found');
        }
      });

      const req = httpMock.expectOne(r => r.url.includes('/bookings/missing'));
      req.flush({ message: 'Booking not found' }, { status: 404, statusText: 'Not Found' });
    });
  });

  // --- cancelBooking ---

  describe('cancelBooking', () => {
    it('should POST to /bookings/:id/cancel', () => {
      service.cancelBooking('b1').subscribe();

      const req = httpMock.expectOne(r => r.url.includes('/bookings/b1/cancel') && r.method === 'POST');
      req.flush({});
    });

    it('should return error on failure', () => {
      service.cancelBooking('b1').subscribe({
        error: (err: Error) => {
          expect(err.message).toBe('Cannot cancel');
        }
      });

      const req = httpMock.expectOne(r => r.url.includes('/cancel'));
      req.flush({ message: 'Cannot cancel' }, { status: 400, statusText: 'Bad Request' });
    });
  });

  // --- cancelBookingWithRefund ---

  describe('cancelBookingWithRefund', () => {
    it('should POST with refundAmount and return result', () => {
      const refundResponse = {
        booking: createMockApiBooking({ status: 'CANCELLED' }),
        refund: { refundId: 're_123', amount: 200, status: 'succeeded' },
        message: 'Refund processed'
      };

      service.cancelBookingWithRefund('b1', 200).subscribe(result => {
        expect(result.booking.status).toBe(BookingStatus.CANCELLED);
        expect(result.refund?.refundId).toBe('re_123');
        expect(result.message).toBe('Refund processed');
      });

      const req = httpMock.expectOne(r => r.url.includes('/cancel'));
      expect(req.request.body.refundAmount).toBe(200);
      req.flush(refundResponse);
    });

    it('should generate fallback refund when backend omits it', () => {
      service.cancelBookingWithRefund('b1', 150).subscribe(result => {
        expect(result.refund?.amount).toBe(150);
        expect(result.refund?.status).toBe('succeeded');
        expect(result.refund?.refundId).toContain('re_');
      });

      const req = httpMock.expectOne(r => r.url.includes('/cancel'));
      req.flush(createMockApiBooking({ status: 'CANCELLED' }));
    });
  });

  // --- updateBooking ---

  describe('updateBooking', () => {
    it('should PATCH /bookings/:id with converted dates', () => {
      service.updateBooking('b1', { checkIn: '2026-05-01', checkOut: '2026-05-05' }).subscribe();

      const req = httpMock.expectOne(r => r.url.includes('/bookings/b1') && r.method === 'PATCH');
      expect(req.request.body.checkIn).toContain('2026-05-01');
      expect(req.request.body.checkOut).toContain('2026-05-05');
      req.flush(createMockApiBooking());
    });

    it('should map guests to numberOfGuests', () => {
      service.updateBooking('b1', { guests: 3 }).subscribe();

      const req = httpMock.expectOne(r => r.method === 'PATCH');
      expect(req.request.body.numberOfGuests).toBe(3);
      expect(req.request.body.guests).toBeUndefined();
      req.flush(createMockApiBooking());
    });

    it('should only include provided fields', () => {
      service.updateBooking('b1', { specialRequests: 'Extra pillow' }).subscribe();

      const req = httpMock.expectOne(r => r.method === 'PATCH');
      expect(req.request.body.specialRequests).toBe('Extra pillow');
      expect(req.request.body.checkIn).toBeUndefined();
      req.flush(createMockApiBooking());
    });
  });

  // --- updateBookingStatus ---

  describe('updateBookingStatus', () => {
    it('should POST to /check-in for CHECKED_IN', () => {
      service.updateBookingStatus('b1', BookingStatus.CHECKED_IN).subscribe();

      const req = httpMock.expectOne(r => r.url.includes('/bookings/b1/check-in') && r.method === 'POST');
      req.flush({});
    });

    it('should POST to /check-out for CHECKED_OUT', () => {
      service.updateBookingStatus('b1', BookingStatus.CHECKED_OUT).subscribe();

      const req = httpMock.expectOne(r => r.url.includes('/bookings/b1/check-out') && r.method === 'POST');
      req.flush({});
    });

    it('should POST to /check-out for COMPLETED', () => {
      service.updateBookingStatus('b1', BookingStatus.COMPLETED).subscribe();

      const req = httpMock.expectOne(r => r.url.includes('/bookings/b1/check-out') && r.method === 'POST');
      req.flush({});
    });

    it('should POST to /cancel for CANCELLED', () => {
      service.updateBookingStatus('b1', BookingStatus.CANCELLED).subscribe();

      const req = httpMock.expectOne(r => r.url.includes('/bookings/b1/cancel') && r.method === 'POST');
      req.flush({});
    });

    it('should PATCH with status for other statuses', () => {
      service.updateBookingStatus('b1', BookingStatus.CONFIRMED).subscribe();

      const req = httpMock.expectOne(r => r.url.includes('/bookings/b1') && r.method === 'PATCH');
      expect(req.request.body.status).toBe(BookingStatus.CONFIRMED);
      req.flush({});
    });
  });

  // --- applyPointsRedemption ---

  describe('applyPointsRedemption', () => {
    it('should POST points and return mapped booking', () => {
      service.applyPointsRedemption('b1', 500).subscribe(booking => {
        expect(booking.id).toBe('b1');
      });

      const req = httpMock.expectOne(r => r.url.includes('/apply-points'));
      expect(req.request.body.points).toBe(500);
      req.flush(createMockApiBooking());
    });
  });

  // --- removeBooking ---

  describe('removeBooking', () => {
    it('should DELETE /bookings/:id', () => {
      service.removeBooking('b1').subscribe();

      const req = httpMock.expectOne(r => r.url.includes('/bookings/b1') && r.method === 'DELETE');
      req.flush(null);
    });

    it('should return error on failure', () => {
      service.removeBooking('b1').subscribe({
        error: (err: Error) => {
          expect(err.message).toBe('Failed to delete booking');
        }
      });

      const req = httpMock.expectOne(r => r.method === 'DELETE');
      req.flush(null, { status: 500, statusText: 'Server Error' });
    });
  });
});
