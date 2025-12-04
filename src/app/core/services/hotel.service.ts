import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of } from 'rxjs';
import { Hotel, HotelSearchParams } from '../models';
import hotelsData from '../../../assets/data/hotels.json';

@Injectable({
  providedIn: 'root'
})
export class HotelService {
  private hotels = signal<Hotel[]>([]);
  private loading = signal<boolean>(false);

  constructor(private http: HttpClient) {
    this.loadHotels();
  }

  private loadHotels(): void {
    const baseHotels = hotelsData as Hotel[];

    // Load persisted ratings from localStorage
    const storedRatings = localStorage.getItem('hotel_aggregate_ratings');
    if (storedRatings) {
      try {
        const ratings = JSON.parse(storedRatings);
        const hotelsWithRatings = baseHotels.map(hotel => {
          const hotelRating = ratings[hotel.id];
          if (hotelRating) {
            return {
              ...hotel,
              averageRating: hotelRating.averageRating,
              totalReviews: hotelRating.totalReviews
            };
          }
          return hotel;
        });
        this.hotels.set(hotelsWithRatings);
      } catch (error) {
        console.error('Error loading hotel ratings:', error);
        this.hotels.set(baseHotels);
      }
    } else {
      this.hotels.set(baseHotels);
    }
  }

  getHotels(params?: HotelSearchParams): Observable<Hotel[]> {
    this.loading.set(true);

    let filteredHotels = [...this.hotels()];

    if (params) {
      if (params.city) {
        filteredHotels = filteredHotels.filter(hotel =>
          hotel.city.toLowerCase().includes(params.city!.toLowerCase())
        );
      }

      if (params.minPrice !== undefined) {
        filteredHotels = filteredHotels.filter(hotel => hotel.pricePerNight >= params.minPrice!);
      }

      if (params.maxPrice !== undefined) {
        filteredHotels = filteredHotels.filter(hotel => hotel.pricePerNight <= params.maxPrice!);
      }

      if (params.starRating) {
        filteredHotels = filteredHotels.filter(hotel => hotel.starRating === params.starRating);
      }

      if (params.amenities && params.amenities.length > 0) {
        filteredHotels = filteredHotels.filter(hotel =>
          params.amenities!.every(amenity => hotel.amenities.includes(amenity))
        );
      }

      if (params.guestRating) {
        filteredHotels = filteredHotels.filter(
          hotel => hotel.averageRating && hotel.averageRating >= params.guestRating!
        );
      }

      if (params.sortBy) {
        filteredHotels.sort((a, b) => {
          const order = params.sortOrder === 'desc' ? -1 : 1;

          switch (params.sortBy) {
            case 'price':
              return (a.pricePerNight - b.pricePerNight) * order;
            case 'rating':
              return ((a.averageRating || 0) - (b.averageRating || 0)) * order;
            case 'popularity':
              return ((a.totalReviews || 0) - (b.totalReviews || 0)) * order;
            default:
              return 0;
          }
        });
      }
    }

    return of(filteredHotels).pipe(
      map(hotels => {
        this.loading.set(false);
        return hotels;
      })
    );
  }

  getHotelById(id: string): Observable<Hotel | undefined> {
    this.loading.set(true);
    const hotel = this.hotels().find(h => h.id === id);

    return of(hotel).pipe(
      map(h => {
        this.loading.set(false);
        return h;
      })
    );
  }

  getFeaturedHotels(): Observable<Hotel[]> {
    const featured = this.hotels().filter(hotel => hotel.featured);
    return of(featured);
  }

  searchHotels(query: string): Observable<Hotel[]> {
    this.loading.set(true);
    const results = this.hotels().filter(hotel =>
      hotel.name.toLowerCase().includes(query.toLowerCase()) ||
      hotel.city.toLowerCase().includes(query.toLowerCase()) ||
      hotel.location.toLowerCase().includes(query.toLowerCase())
    );

    return of(results).pipe(
      map(hotels => {
        this.loading.set(false);
        return hotels;
      })
    );
  }

  getCities(): string[] {
    const cities = [...new Set(this.hotels().map(hotel => hotel.city))];
    return cities.sort();
  }

  isLoading(): boolean {
    return this.loading();
  }

  updateHotelRating(hotelId: string, averageRating: number, totalReviews: number): void {
    // Update the hotel in the signal
    const updatedHotels = this.hotels().map(hotel => {
      if (hotel.id === hotelId) {
        return {
          ...hotel,
          averageRating,
          totalReviews
        };
      }
      return hotel;
    });
    this.hotels.set(updatedHotels);

    // Persist to localStorage
    const storedRatings = localStorage.getItem('hotel_aggregate_ratings');
    let ratings: Record<string, { averageRating: number; totalReviews: number }> = {};

    if (storedRatings) {
      try {
        ratings = JSON.parse(storedRatings);
      } catch (error) {
        console.error('Error parsing hotel ratings:', error);
      }
    }

    ratings[hotelId] = { averageRating, totalReviews };
    localStorage.setItem('hotel_aggregate_ratings', JSON.stringify(ratings));
  }
}
