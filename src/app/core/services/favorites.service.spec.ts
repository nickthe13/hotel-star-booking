import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { FavoritesService } from './favorites.service';
import { AuthService } from './auth.service';
import { signal } from '@angular/core';

describe('FavoritesService', () => {
  let service: FavoritesService;
  let httpMock: HttpTestingController;
  let mockAuthService: jasmine.SpyObj<AuthService>;

  const mockIsAuthenticated = signal(true);

  function createMockApiFavorite(overrides: any = {}): any {
    return {
      hotel: {
        id: 'h1',
        name: 'Grand Hotel',
        description: 'A wonderful hotel',
        address: 'Athens, Greece',
        city: 'Athens',
        country: 'Greece',
        rating: 4.8,
        images: ['img1.jpg'],
        amenities: ['wifi', 'pool'],
        rooms: [{ price: 120 }],
        _count: { reviews: 10 },
        createdAt: '2026-01-01T00:00:00.000Z',
        ...overrides
      }
    };
  }

  beforeEach(() => {
    mockAuthService = jasmine.createSpyObj('AuthService', ['getCurrentUserId'], {
      isAuthenticated: mockIsAuthenticated
    });
    mockAuthService.getCurrentUserId.and.returnValue('u1');
    mockIsAuthenticated.set(true);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        FavoritesService,
        { provide: AuthService, useValue: mockAuthService }
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    service = TestBed.inject(FavoritesService);

    // The constructor calls loadFavorites when authenticated — flush that request
    const initReq = httpMock.match(r => r.url.includes('/favorites') && r.method === 'GET');
    initReq.forEach(req => req.flush([]));
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // --- Caching ---

  describe('caching', () => {
    it('should return cached favorites on second call', () => {
      // First call fetches from API
      service.loadFavorites().subscribe();
      const req = httpMock.expectOne(r => r.url.includes('/favorites') && r.method === 'GET');
      req.flush([createMockApiFavorite()]);

      // Second call should use cache — no HTTP request
      service.loadFavorites().subscribe(hotels => {
        expect(hotels.length).toBe(1);
        expect(hotels[0].id).toBe('h1');
      });
      httpMock.expectNone(r => r.url.includes('/favorites') && r.method === 'GET');
    });

    it('should bypass cache when forceRefresh is true', () => {
      // First call
      service.loadFavorites().subscribe();
      httpMock.expectOne(r => r.method === 'GET').flush([createMockApiFavorite()]);

      // Force refresh should make a new HTTP call
      service.loadFavorites(true).subscribe(hotels => {
        expect(hotels.length).toBe(2);
      });
      const req = httpMock.expectOne(r => r.url.includes('/favorites') && r.method === 'GET');
      req.flush([createMockApiFavorite(), createMockApiFavorite({ id: 'h2', name: 'Beach Resort' })]);
    });

    it('should reset cache on clearFavorites', () => {
      // First call — populates cache
      service.loadFavorites().subscribe();
      httpMock.expectOne(r => r.method === 'GET').flush([createMockApiFavorite()]);

      // Clear favorites
      service.clearFavorites();

      // Should make a new HTTP call since cache was cleared
      service.loadFavorites().subscribe();
      const req = httpMock.expectOne(r => r.url.includes('/favorites') && r.method === 'GET');
      req.flush([]);
    });

    it('should refetch after cache is invalidated', () => {
      // First call
      service.loadFavorites().subscribe();
      httpMock.expectOne(r => r.method === 'GET').flush([createMockApiFavorite()]);

      // Invalidate cache
      service.invalidateCache();

      // Should make a new HTTP call
      service.loadFavorites().subscribe();
      const req = httpMock.expectOne(r => r.url.includes('/favorites') && r.method === 'GET');
      req.flush([createMockApiFavorite()]);
    });
  });

  // --- loadFavorites ---

  describe('loadFavorites', () => {
    it('should return empty array when not authenticated', () => {
      mockIsAuthenticated.set(false);
      service.invalidateCache();

      service.loadFavorites().subscribe(hotels => {
        expect(hotels).toEqual([]);
      });

      httpMock.expectNone(r => r.url.includes('/favorites'));
    });

    it('should map API response to Hotel objects', () => {
      service.loadFavorites(true).subscribe(hotels => {
        expect(hotels[0].name).toBe('Grand Hotel');
        expect(hotels[0].city).toBe('Athens');
        expect(hotels[0].pricePerNight).toBe(120);
      });

      const req = httpMock.expectOne(r => r.url.includes('/favorites') && r.method === 'GET');
      req.flush([createMockApiFavorite()]);
    });

    it('should return empty array on error', () => {
      service.loadFavorites(true).subscribe(hotels => {
        expect(hotels).toEqual([]);
      });

      const req = httpMock.expectOne(r => r.method === 'GET');
      req.flush(null, { status: 500, statusText: 'Server Error' });
    });
  });

  // --- isFavorite ---

  describe('isFavorite', () => {
    it('should return true for a favorited hotel', () => {
      service.loadFavorites(true).subscribe();
      httpMock.expectOne(r => r.method === 'GET').flush([createMockApiFavorite()]);

      expect(service.isFavorite('h1')).toBeTrue();
    });

    it('should return false for a non-favorited hotel', () => {
      expect(service.isFavorite('h999')).toBeFalse();
    });
  });

  // --- toggleFavorite ---

  describe('toggleFavorite', () => {
    it('should add when not favorite', () => {
      const hotel = { id: 'h2', name: 'Beach Resort' } as any;
      service.toggleFavorite(hotel).subscribe();

      const req = httpMock.expectOne(r => r.url.includes('/hotels/h2/favorites') && r.method === 'POST');
      req.flush(null);
    });

    it('should remove when already favorite', () => {
      // Load a favorite first
      service.loadFavorites(true).subscribe();
      httpMock.expectOne(r => r.method === 'GET').flush([createMockApiFavorite()]);

      const hotel = { id: 'h1', name: 'Grand Hotel' } as any;
      service.toggleFavorite(hotel).subscribe();

      const req = httpMock.expectOne(r => r.url.includes('/hotels/h1/favorites') && r.method === 'DELETE');
      req.flush(null);
    });
  });
});
