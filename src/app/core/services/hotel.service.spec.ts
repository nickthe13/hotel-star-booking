import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { HotelService } from './hotel.service';

describe('HotelService', () => {
  let service: HotelService;
  let httpMock: HttpTestingController;

  function createMockApiHotel(overrides: any = {}): any {
    return {
      id: 'h1',
      name: 'Grand Hotel',
      description: 'A lovely hotel',
      address: '123 Main St',
      city: 'Athens',
      country: 'Greece',
      rating: 4.8,
      images: ['img1.jpg'],
      amenities: ['wifi', 'pool'],
      rooms: [
        { id: 'r1', hotelId: 'h1', name: 'Deluxe Room', type: 'DELUXE', price: 150, capacity: 2, isAvailable: true, amenities: [], images: [] },
        { id: 'r2', hotelId: 'h1', name: 'Standard Room', type: 'STANDARD', price: 100, capacity: 2, isAvailable: true, amenities: [], images: [] }
      ],
      _count: { reviews: 42 },
      createdAt: '2026-01-01T00:00:00.000Z',
      ...overrides
    };
  }

  function flushPreload(hotels: any[] = [createMockApiHotel()]): void {
    const req = httpMock.expectOne(r => r.url.includes('/hotels') && r.method === 'GET');
    req.flush(hotels);
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        HotelService
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    service = TestBed.inject(HotelService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // --- Constructor / Preload ---

  describe('preload', () => {
    it('should fire GET /hotels on construction', () => {
      const req = httpMock.expectOne(r => r.url.includes('/hotels') && r.method === 'GET');
      expect(req).toBeTruthy();
      req.flush([]);
    });

    it('should populate hotels signal after preload', () => {
      flushPreload([createMockApiHotel()]);

      service.getHotels().subscribe(hotels => {
        expect(hotels.length).toBe(1);
        expect(hotels[0].name).toBe('Grand Hotel');
      });
    });

    it('should return empty array on preload error', () => {
      const req = httpMock.expectOne(r => r.url.includes('/hotels'));
      req.flush(null, { status: 500, statusText: 'Server Error' });

      // After error, getHotels should still work (fallback fetch)
      service.getHotels().subscribe(hotels => {
        expect(hotels).toBeDefined();
      });

      const fallbackReq = httpMock.expectOne(r => r.url.includes('/hotels'));
      fallbackReq.flush([]);
    });
  });

  // --- Hotel mapping ---

  describe('hotel mapping', () => {
    it('should map address to location', () => {
      flushPreload([createMockApiHotel({ address: '456 Oak Ave' })]);

      service.getHotels().subscribe(hotels => {
        expect(hotels[0].location).toBe('456 Oak Ave');
      });
    });

    it('should round rating to starRating', () => {
      flushPreload([createMockApiHotel({ rating: 4.7 })]);

      service.getHotels().subscribe(hotels => {
        expect(hotels[0].starRating).toBe(5);
      });
    });

    it('should default starRating to 4 when rating missing', () => {
      flushPreload([createMockApiHotel({ rating: undefined })]);

      service.getHotels().subscribe(hotels => {
        expect(hotels[0].starRating).toBe(4);
      });
    });

    it('should set featured true for rating >= 4.7', () => {
      flushPreload([createMockApiHotel({ rating: 4.7 })]);

      service.getHotels().subscribe(hotels => {
        expect(hotels[0].featured).toBeTrue();
      });
    });

    it('should set featured false for rating < 4.7', () => {
      flushPreload([createMockApiHotel({ rating: 4.6 })]);

      service.getHotels().subscribe(hotels => {
        expect(hotels[0].featured).toBeFalse();
      });
    });

    it('should map _count.reviews to totalReviews', () => {
      flushPreload([createMockApiHotel({ _count: { reviews: 99 } })]);

      service.getHotels().subscribe(hotels => {
        expect(hotels[0].totalReviews).toBe(99);
      });
    });

    it('should default totalReviews to 0 when _count missing', () => {
      flushPreload([createMockApiHotel({ _count: undefined })]);

      service.getHotels().subscribe(hotels => {
        expect(hotels[0].totalReviews).toBe(0);
      });
    });

    it('should default description to empty string', () => {
      flushPreload([createMockApiHotel({ description: undefined })]);

      service.getHotels().subscribe(hotels => {
        expect(hotels[0].description).toBe('');
      });
    });

    it('should default images and amenities to empty arrays', () => {
      flushPreload([createMockApiHotel({ images: undefined, amenities: undefined })]);

      service.getHotels().subscribe(hotels => {
        expect(hotels[0].images).toEqual([]);
        expect(hotels[0].amenities).toEqual([]);
      });
    });

    it('should default rooms to empty array when missing', () => {
      flushPreload([createMockApiHotel({ rooms: undefined })]);

      service.getHotels().subscribe(hotels => {
        expect(hotels[0].rooms).toEqual([]);
      });
    });

    it('should set pricePerNight to lowest room price', () => {
      flushPreload([createMockApiHotel()]);

      service.getHotels().subscribe(hotels => {
        expect(hotels[0].pricePerNight).toBe(100);
      });
    });

    it('should default pricePerNight to 100 when no rooms', () => {
      flushPreload([createMockApiHotel({ rooms: [] })]);

      service.getHotels().subscribe(hotels => {
        expect(hotels[0].pricePerNight).toBe(100);
      });
    });
  });

  // --- Room mapping ---

  describe('room mapping', () => {
    it('should prefer room.name over room.type for roomType', () => {
      flushPreload([createMockApiHotel()]);

      service.getHotels().subscribe(hotels => {
        expect(hotels[0].rooms![0].roomType).toBe('Deluxe Room');
      });
    });

    it('should fallback to room.type when name missing', () => {
      flushPreload([createMockApiHotel({
        rooms: [{ id: 'r1', hotelId: 'h1', type: 'SUITE', price: 200, capacity: 4, isAvailable: true, amenities: [], images: [] }]
      })]);

      service.getHotels().subscribe(hotels => {
        expect(hotels[0].rooms![0].roomType).toBe('SUITE');
      });
    });

    it('should default capacity to 2', () => {
      flushPreload([createMockApiHotel({
        rooms: [{ id: 'r1', hotelId: 'h1', name: 'Room', price: 100, amenities: [], images: [] }]
      })]);

      service.getHotels().subscribe(hotels => {
        expect(hotels[0].rooms![0].capacity).toBe(2);
      });
    });

    it('should default price to 100', () => {
      flushPreload([createMockApiHotel({
        rooms: [{ id: 'r1', hotelId: 'h1', name: 'Room', capacity: 2, amenities: [], images: [] }]
      })]);

      service.getHotels().subscribe(hotels => {
        expect(hotels[0].rooms![0].pricePerNight).toBe(100);
      });
    });

    it('should set available to true by default', () => {
      flushPreload([createMockApiHotel({
        rooms: [{ id: 'r1', hotelId: 'h1', name: 'Room', price: 100, capacity: 2, amenities: [], images: [] }]
      })]);

      service.getHotels().subscribe(hotels => {
        expect(hotels[0].rooms![0].available).toBeTrue();
      });
    });

    it('should set available to false when isAvailable is false', () => {
      flushPreload([createMockApiHotel({
        rooms: [{ id: 'r1', hotelId: 'h1', name: 'Room', price: 100, capacity: 2, isAvailable: false, amenities: [], images: [] }]
      })]);

      service.getHotels().subscribe(hotels => {
        expect(hotels[0].rooms![0].available).toBeFalse();
      });
    });
  });

  // --- getHotels ---

  describe('getHotels', () => {
    it('should return cached hotels without HTTP call', () => {
      flushPreload([createMockApiHotel()]);

      service.getHotels().subscribe(hotels => {
        expect(hotels.length).toBe(1);
      });

      // No additional request should be made
      httpMock.expectNone(r => r.url.includes('/hotels'));
    });

    it('should handle paginated {data:[]} response', () => {
      const req = httpMock.expectOne(r => r.url.includes('/hotels'));
      req.flush({ data: [createMockApiHotel()], total: 1, page: 1, limit: 10 });

      service.getHotels().subscribe(hotels => {
        expect(hotels.length).toBe(1);
        expect(hotels[0].name).toBe('Grand Hotel');
      });
    });
  });

  // --- getHotelById ---

  describe('getHotelById', () => {
    it('should return cached hotel without HTTP call', () => {
      flushPreload([createMockApiHotel()]);

      service.getHotelById('h1').subscribe(hotel => {
        expect(hotel?.name).toBe('Grand Hotel');
        expect(hotel?.city).toBe('Athens');
      });

      // No HTTP call should be made — served from cache
      httpMock.expectNone(r => r.url.includes('/hotels/h1'));
    });

    it('should GET /hotels/:id when not in cache', () => {
      flushPreload([]);

      service.getHotelById('h1').subscribe(hotel => {
        expect(hotel?.name).toBe('Grand Hotel');
      });

      const req = httpMock.expectOne(r => r.url.includes('/hotels/h1'));
      req.flush(createMockApiHotel());
    });

    it('should return undefined when not in cache and error', () => {
      flushPreload([]);

      service.getHotelById('missing').subscribe(hotel => {
        expect(hotel).toBeUndefined();
      });

      const req = httpMock.expectOne(r => r.url.includes('/hotels/missing'));
      req.flush(null, { status: 404, statusText: 'Not Found' });
    });
  });

  // --- getFeaturedHotels ---

  describe('getFeaturedHotels', () => {
    it('should return featured hotels up to limit', () => {
      const hotels = [
        createMockApiHotel({ id: 'h1', rating: 4.9 }),
        createMockApiHotel({ id: 'h2', rating: 4.8 }),
        createMockApiHotel({ id: 'h3', rating: 4.0 })
      ];
      flushPreload(hotels);

      service.getFeaturedHotels(2).subscribe(featured => {
        expect(featured.length).toBe(2);
        expect(featured.every(h => h.featured)).toBeTrue();
      });
    });

    it('should fill with highest-rated when not enough featured', () => {
      const hotels = [
        createMockApiHotel({ id: 'h1', rating: 4.9 }),
        createMockApiHotel({ id: 'h2', rating: 4.5 }),
        createMockApiHotel({ id: 'h3', rating: 4.0 })
      ];
      flushPreload(hotels);

      service.getFeaturedHotels(3).subscribe(featured => {
        expect(featured.length).toBe(3);
      });
    });

    it('should return empty array when no hotels', () => {
      flushPreload([]);

      service.getFeaturedHotels().subscribe(featured => {
        expect(featured).toEqual([]);
      });
    });
  });

  // --- getCities ---

  describe('getCities', () => {
    it('should return unique sorted city names', () => {
      const hotels = [
        createMockApiHotel({ id: 'h1', city: 'Athens' }),
        createMockApiHotel({ id: 'h2', city: 'Crete' }),
        createMockApiHotel({ id: 'h3', city: 'Athens' })
      ];
      flushPreload(hotels);

      service.getCities().subscribe(cities => {
        expect(cities).toEqual(['Athens', 'Crete']);
      });
    });

    it('should return empty array when no hotels', () => {
      flushPreload([]);

      service.getCities().subscribe(cities => {
        expect(cities).toEqual([]);
      });
    });
  });

  // --- updateHotelRating ---

  describe('updateHotelRating', () => {
    it('should update the matching hotel in cache', () => {
      flushPreload([createMockApiHotel({ id: 'h1', rating: 4.0 })]);

      service.updateHotelRating('h1', 4.9, 50);

      service.getHotels().subscribe(hotels => {
        expect(hotels[0].averageRating).toBe(4.9);
        expect(hotels[0].totalReviews).toBe(50);
      });
    });

    it('should not modify other hotels', () => {
      flushPreload([
        createMockApiHotel({ id: 'h1' }),
        createMockApiHotel({ id: 'h2', rating: 4.0 })
      ]);

      service.updateHotelRating('h1', 4.9, 50);

      service.getHotels().subscribe(hotels => {
        expect(hotels[1].averageRating).toBe(4.0);
      });
    });
  });

  // --- Admin CRUD ---

  describe('addHotel', () => {
    it('should POST and add to cache', () => {
      flushPreload([]);

      service.addHotel({ name: 'New Hotel', city: 'Crete' }).subscribe(hotel => {
        expect(hotel.name).toBe('New Hotel');
      });

      const req = httpMock.expectOne(r => r.url.includes('/hotels') && r.method === 'POST');
      expect(req.request.body.name).toBe('New Hotel');
      expect(req.request.body.country).toBe('Greece');
      req.flush(createMockApiHotel({ id: 'h_new', name: 'New Hotel', city: 'Crete' }));

      service.getHotels().subscribe(hotels => {
        expect(hotels.length).toBe(1);
      });
    });
  });

  describe('updateHotel', () => {
    it('should PATCH and update cache', () => {
      flushPreload([createMockApiHotel()]);

      service.updateHotel('h1', { name: 'Updated Hotel' }).subscribe(hotel => {
        expect(hotel?.name).toBe('Updated Hotel');
      });

      const req = httpMock.expectOne(r => r.url.includes('/hotels/h1') && r.method === 'PATCH');
      expect(req.request.body.name).toBe('Updated Hotel');
      req.flush(createMockApiHotel({ name: 'Updated Hotel' }));
    });

    it('should return undefined on error', () => {
      flushPreload();

      service.updateHotel('h1', { name: 'Updated' }).subscribe(result => {
        expect(result).toBeUndefined();
      });

      const req = httpMock.expectOne(r => r.method === 'PATCH');
      req.flush(null, { status: 500, statusText: 'Error' });
    });
  });

  describe('deleteHotel', () => {
    it('should DELETE and remove from cache', () => {
      flushPreload([createMockApiHotel({ id: 'h1' }), createMockApiHotel({ id: 'h2' })]);

      service.deleteHotel('h1').subscribe();

      const req = httpMock.expectOne(r => r.url.includes('/hotels/h1') && r.method === 'DELETE');
      req.flush(null);

      service.getHotels().subscribe(hotels => {
        expect(hotels.length).toBe(1);
        expect(hotels[0].id).toBe('h2');
      });
    });
  });

  // --- Room management ---

  describe('addRoom', () => {
    it('should POST and add room to hotel cache', () => {
      flushPreload([createMockApiHotel({ rooms: [] })]);

      service.addRoom('h1', { roomType: 'Suite', pricePerNight: 300, capacity: 4 }).subscribe(room => {
        expect(room?.roomType).toBe('Suite');
      });

      const req = httpMock.expectOne(r => r.url.includes('/rooms') && r.method === 'POST');
      expect(req.request.body.type).toBe('SUITE');
      expect(req.request.body.hotelId).toBe('h1');
      req.flush({ id: 'r_new', hotelId: 'h1', name: 'Suite', price: 300, capacity: 4, isAvailable: true, amenities: [], images: [] });
    });

    it('should map room types to enum values', () => {
      flushPreload();

      service.addRoom('h1', { roomType: 'Deluxe Room' }).subscribe();
      const req1 = httpMock.expectOne(r => r.url.includes('/rooms') && r.method === 'POST');
      expect(req1.request.body.type).toBe('DELUXE');
      req1.flush({ id: 'r1', hotelId: 'h1', name: 'Deluxe Room', price: 100, capacity: 2, amenities: [], images: [] });
    });

    it('should default unknown room types to STANDARD', () => {
      flushPreload();

      service.addRoom('h1', { roomType: 'Unknown Type' }).subscribe();
      const req = httpMock.expectOne(r => r.method === 'POST');
      expect(req.request.body.type).toBe('STANDARD');
      req.flush({ id: 'r1', hotelId: 'h1', name: 'Unknown Type', price: 100, capacity: 2, amenities: [], images: [] });
    });
  });

  describe('deleteRoom', () => {
    it('should DELETE and remove room from hotel cache', () => {
      flushPreload([createMockApiHotel()]);

      service.deleteRoom('h1', 'r1').subscribe();

      const req = httpMock.expectOne(r => r.url.includes('/rooms/r1') && r.method === 'DELETE');
      req.flush(null);

      service.getHotels().subscribe(hotels => {
        expect(hotels[0].rooms!.length).toBe(1);
        expect(hotels[0].rooms![0].id).toBe('r2');
      });
    });
  });

  describe('toggleRoomAvailability', () => {
    it('should toggle room available state', () => {
      flushPreload([createMockApiHotel()]);

      service.toggleRoomAvailability('h1', 'r1').subscribe();

      const req = httpMock.expectOne(r => r.url.includes('/rooms/r1') && r.method === 'PATCH');
      expect(req.request.body.isAvailable).toBeFalse();
      req.flush({ id: 'r1', hotelId: 'h1', name: 'Deluxe Room', price: 150, capacity: 2, isAvailable: false, amenities: [], images: [] });
    });

    it('should return undefined when room not found', () => {
      flushPreload([createMockApiHotel()]);

      service.toggleRoomAvailability('h1', 'missing').subscribe(result => {
        expect(result).toBeUndefined();
      });
    });
  });

  // --- Favorites ---

  describe('favorites', () => {
    it('should POST to add favorite', () => {
      flushPreload();

      service.addToFavorites('h1').subscribe();
      const req = httpMock.expectOne(r => r.url.includes('/hotels/h1/favorites') && r.method === 'POST');
      req.flush(null);
    });

    it('should DELETE to remove favorite', () => {
      flushPreload();

      service.removeFromFavorites('h1').subscribe();
      const req = httpMock.expectOne(r => r.url.includes('/hotels/h1/favorites') && r.method === 'DELETE');
      req.flush(null);
    });
  });

  // --- getHotelAvailability ---

  describe('getHotelAvailability', () => {
    it('should GET availability with date params', () => {
      flushPreload();

      const checkIn = new Date('2026-04-01');
      const checkOut = new Date('2026-04-05');
      service.getHotelAvailability('h1', checkIn, checkOut).subscribe();

      const req = httpMock.expectOne(r => r.url.includes('/hotels/h1/availability'));
      expect(req.request.params.get('checkIn')).toBeTruthy();
      expect(req.request.params.get('checkOut')).toBeTruthy();
      req.flush({ available: true, rooms: [] });
    });

    it('should return fallback on error', () => {
      flushPreload();

      service.getHotelAvailability('h1', new Date(), new Date()).subscribe(result => {
        expect(result.available).toBeTrue();
        expect(result.rooms).toEqual([]);
      });

      const req = httpMock.expectOne(r => r.url.includes('/availability'));
      req.flush(null, { status: 500, statusText: 'Error' });
    });
  });
});
