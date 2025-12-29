import { Injectable, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Hotel } from '../models/hotel.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class FavoritesService {
  private readonly API_URL = environment.apiUrl;

  // Signal to store favorite hotel IDs for quick lookup
  private favoriteIds = signal<Set<string>>(new Set());

  // Signal to store full favorite hotels data
  private favoriteHotels = signal<Hotel[]>([]);

  // Loading state
  loading = signal<boolean>(false);

  // Computed values
  readonly favorites = computed(() => this.favoriteHotels());
  readonly favoritesCount = computed(() => this.favoriteIds().size);

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    // Load favorites when user logs in
    if (this.authService.isAuthenticated()) {
      this.loadFavorites();
    }
  }

  /**
   * Check if a hotel is in favorites
   */
  isFavorite(hotelId: string): boolean {
    return this.favoriteIds().has(hotelId);
  }

  /**
   * Get observable for checking if hotel is favorite (for async pipe)
   */
  isFavorite$(hotelId: string): Observable<boolean> {
    return of(this.isFavorite(hotelId));
  }

  /**
   * Load user's favorites from the API
   */
  loadFavorites(): Observable<Hotel[]> {
    if (!this.authService.isAuthenticated()) {
      return of([]);
    }

    this.loading.set(true);
    const userId = this.authService.getCurrentUserId();

    return this.http.get<any[]>(`${this.API_URL}/users/${userId}/favorites`).pipe(
      map(response => {
        // Map API response to Hotel objects
        const hotels = response.map(fav => this.mapHotelFromApi(fav.hotel || fav));
        return hotels;
      }),
      tap(hotels => {
        this.favoriteHotels.set(hotels);
        this.favoriteIds.set(new Set(hotels.map(h => h.id)));
        this.loading.set(false);
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Error loading favorites:', error);
        this.loading.set(false);
        return of([]);
      })
    );
  }

  /**
   * Add a hotel to favorites
   */
  addToFavorites(hotel: Hotel): Observable<void> {
    if (!this.authService.isAuthenticated()) {
      return throwError(() => new Error('Please log in to save favorites'));
    }

    // Optimistic update
    const currentIds = new Set(this.favoriteIds());
    currentIds.add(hotel.id);
    this.favoriteIds.set(currentIds);

    const currentHotels = [...this.favoriteHotels()];
    if (!currentHotels.find(h => h.id === hotel.id)) {
      currentHotels.unshift(hotel);
      this.favoriteHotels.set(currentHotels);
    }

    return this.http.post<void>(`${this.API_URL}/hotels/${hotel.id}/favorites`, {}).pipe(
      catchError((error: HttpErrorResponse) => {
        // Revert optimistic update on error
        const revertIds = new Set(this.favoriteIds());
        revertIds.delete(hotel.id);
        this.favoriteIds.set(revertIds);
        this.favoriteHotels.set(this.favoriteHotels().filter(h => h.id !== hotel.id));

        const message = error.error?.message || 'Failed to add to favorites';
        return throwError(() => new Error(message));
      })
    );
  }

  /**
   * Remove a hotel from favorites
   */
  removeFromFavorites(hotelId: string): Observable<void> {
    if (!this.authService.isAuthenticated()) {
      return throwError(() => new Error('Please log in to manage favorites'));
    }

    // Store current state for potential rollback
    const previousIds = new Set(this.favoriteIds());
    const previousHotels = [...this.favoriteHotels()];

    // Optimistic update
    const currentIds = new Set(this.favoriteIds());
    currentIds.delete(hotelId);
    this.favoriteIds.set(currentIds);
    this.favoriteHotels.set(this.favoriteHotels().filter(h => h.id !== hotelId));

    return this.http.delete<void>(`${this.API_URL}/hotels/${hotelId}/favorites`).pipe(
      catchError((error: HttpErrorResponse) => {
        // Revert optimistic update on error
        this.favoriteIds.set(previousIds);
        this.favoriteHotels.set(previousHotels);

        const message = error.error?.message || 'Failed to remove from favorites';
        return throwError(() => new Error(message));
      })
    );
  }

  /**
   * Toggle favorite status for a hotel
   */
  toggleFavorite(hotel: Hotel): Observable<void> {
    if (this.isFavorite(hotel.id)) {
      return this.removeFromFavorites(hotel.id);
    } else {
      return this.addToFavorites(hotel);
    }
  }

  /**
   * Clear all favorites (used on logout)
   */
  clearFavorites(): void {
    this.favoriteIds.set(new Set());
    this.favoriteHotels.set([]);
  }

  /**
   * Refresh favorites from server
   */
  refreshFavorites(): void {
    this.loadFavorites().subscribe();
  }

  private mapHotelFromApi(apiHotel: any): Hotel {
    return {
      id: apiHotel.id,
      name: apiHotel.name,
      description: apiHotel.description || '',
      location: apiHotel.address || '',
      city: apiHotel.city,
      country: apiHotel.country,
      starRating: Math.round(apiHotel.rating) || 4,
      images: apiHotel.images || [],
      amenities: apiHotel.amenities || [],
      pricePerNight: this.getLowestRoomPrice(apiHotel.rooms) || 100,
      featured: apiHotel.rating >= 4.7,
      averageRating: apiHotel.rating || 0,
      totalReviews: apiHotel._count?.reviews || 0,
      rooms: apiHotel.rooms || [],
      createdAt: apiHotel.createdAt ? new Date(apiHotel.createdAt) : new Date()
    };
  }

  private getLowestRoomPrice(rooms: any[]): number {
    if (!rooms || rooms.length === 0) return 100;
    return Math.min(...rooms.map(r => r.price || 100));
  }
}
