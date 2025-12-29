import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, map, of, catchError, tap } from 'rxjs';
import { Hotel, HotelSearchParams, Room } from '../models';
import { environment } from '../../../environments/environment';

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

@Injectable({
  providedIn: 'root'
})
export class HotelService {
  private readonly API_URL = environment.apiUrl;
  private hotels = signal<Hotel[]>([]);
  private loading = signal<boolean>(false);
  private hotelsLoaded = false;

  constructor(private http: HttpClient) {}

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
      rooms: apiHotel.rooms?.map((room: any) => this.mapRoomFromApi(room)) || [],
      createdAt: apiHotel.createdAt ? new Date(apiHotel.createdAt) : new Date()
    };
  }

  private mapRoomFromApi(apiRoom: any): Room {
    return {
      id: apiRoom.id,
      hotelId: apiRoom.hotelId,
      roomType: apiRoom.name || apiRoom.type,
      capacity: apiRoom.capacity || 2,
      pricePerNight: apiRoom.price || 100,
      amenities: apiRoom.amenities || [],
      images: apiRoom.images || [],
      available: apiRoom.isAvailable !== false
    };
  }

  private getLowestRoomPrice(rooms: any[]): number {
    if (!rooms || rooms.length === 0) return 100;
    return Math.min(...rooms.map(r => r.price || 100));
  }

  getHotels(params?: HotelSearchParams): Observable<Hotel[]> {
    this.loading.set(true);

    let httpParams = new HttpParams();

    if (params) {
      if (params.query) httpParams = httpParams.set('search', params.query);
      if (params.city) httpParams = httpParams.set('city', params.city);
      if (params.minPrice !== undefined) httpParams = httpParams.set('minPrice', params.minPrice.toString());
      if (params.maxPrice !== undefined) httpParams = httpParams.set('maxPrice', params.maxPrice.toString());
      if (params.starRating) httpParams = httpParams.set('rating', params.starRating.toString());
      if (params.sortBy) httpParams = httpParams.set('sortBy', params.sortBy);
      if (params.sortOrder) httpParams = httpParams.set('sortOrder', params.sortOrder);
    }

    return this.http.get<any>(`${this.API_URL}/hotels`, { params: httpParams }).pipe(
      map(response => {
        // Handle both paginated and array responses
        const hotelsData = Array.isArray(response) ? response : response.data || response;
        const hotels = hotelsData.map((h: any) => this.mapHotelFromApi(h));

        // Apply client-side filtering for amenities (if backend doesn't support it)
        let filteredHotels = hotels;
        if (params?.amenities && params.amenities.length > 0) {
          filteredHotels = hotels.filter((hotel: Hotel) =>
            params.amenities!.every(amenity => hotel.amenities.includes(amenity))
          );
        }

        if (params?.guestRating) {
          filteredHotels = filteredHotels.filter(
            (hotel: Hotel) => hotel.averageRating && hotel.averageRating >= params.guestRating!
          );
        }

        this.hotels.set(filteredHotels);
        this.hotelsLoaded = true;
        this.loading.set(false);
        return filteredHotels;
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Error fetching hotels:', error);
        this.loading.set(false);
        // Return cached hotels if available
        return of(this.hotels());
      })
    );
  }

  getHotelById(id: string): Observable<Hotel | undefined> {
    this.loading.set(true);

    return this.http.get<any>(`${this.API_URL}/hotels/${id}`).pipe(
      map(apiHotel => {
        this.loading.set(false);
        return this.mapHotelFromApi(apiHotel);
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Error fetching hotel:', error);
        this.loading.set(false);
        // Try to find in cached hotels
        const cachedHotel = this.hotels().find(h => h.id === id);
        return of(cachedHotel);
      })
    );
  }

  getFeaturedHotels(limit: number = 6): Observable<Hotel[]> {
    return this.http.get<any>(`${this.API_URL}/hotels/featured`, {
      params: new HttpParams().set('limit', limit.toString())
    }).pipe(
      map(response => {
        const hotelsData = Array.isArray(response) ? response : response.data || response;
        return hotelsData.map((h: any) => this.mapHotelFromApi(h));
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Error fetching featured hotels:', error);
        // Fallback to getting hotels and filtering featured ones
        return this.getHotels().pipe(
          map(hotels => hotels.filter(h => h.featured).slice(0, limit))
        );
      })
    );
  }

  searchHotels(query: string): Observable<Hotel[]> {
    return this.getHotels({ query });
  }

  getCities(): Observable<string[]> {
    return this.getHotels().pipe(
      map(hotels => {
        const cities = [...new Set(hotels.map(hotel => hotel.city))];
        return cities.sort();
      })
    );
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
  }

  // Admin CRUD Methods

  addHotel(hotelData: Partial<Hotel>): Observable<Hotel> {
    const createDto = {
      name: hotelData.name,
      description: hotelData.description,
      address: hotelData.location,
      city: hotelData.city,
      country: hotelData.country || 'Greece',
      rating: hotelData.averageRating || 4.5,
      images: hotelData.images || [],
      amenities: hotelData.amenities || []
    };

    return this.http.post<any>(`${this.API_URL}/hotels`, createDto).pipe(
      map(response => {
        const newHotel = this.mapHotelFromApi(response);
        const updatedHotels = [...this.hotels(), newHotel];
        this.hotels.set(updatedHotels);
        return newHotel;
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Error creating hotel:', error);
        throw error;
      })
    );
  }

  updateHotel(id: string, updates: Partial<Hotel>): Observable<Hotel | undefined> {
    const updateDto: any = {};
    if (updates.name) updateDto.name = updates.name;
    if (updates.description) updateDto.description = updates.description;
    if (updates.location) updateDto.address = updates.location;
    if (updates.city) updateDto.city = updates.city;
    if (updates.country) updateDto.country = updates.country;
    if (updates.images) updateDto.images = updates.images;
    if (updates.amenities) updateDto.amenities = updates.amenities;

    return this.http.patch<any>(`${this.API_URL}/hotels/${id}`, updateDto).pipe(
      map(response => {
        const updatedHotel = this.mapHotelFromApi(response);
        const updatedHotels = this.hotels().map(hotel =>
          hotel.id === id ? updatedHotel : hotel
        );
        this.hotels.set(updatedHotels);
        return updatedHotel;
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Error updating hotel:', error);
        return of(undefined);
      })
    );
  }

  deleteHotel(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/hotels/${id}`).pipe(
      tap(() => {
        const updatedHotels = this.hotels().filter(hotel => hotel.id !== id);
        this.hotels.set(updatedHotels);
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Error deleting hotel:', error);
        throw error;
      })
    );
  }

  // Room management methods
  addRoom(hotelId: string, roomData: Partial<Room>): Observable<Room | undefined> {
    const createDto = {
      hotelId,
      type: this.mapRoomTypeToEnum(roomData.roomType || 'STANDARD'),
      name: roomData.roomType,
      description: `${roomData.roomType} - Capacity for ${roomData.capacity} guests`,
      price: roomData.pricePerNight || 100,
      capacity: roomData.capacity || 2,
      amenities: roomData.amenities || [],
      images: roomData.images || [],
      isAvailable: roomData.available !== false
    };

    return this.http.post<any>(`${this.API_URL}/rooms`, createDto).pipe(
      map(response => {
        const newRoom = this.mapRoomFromApi(response);

        // Update the hotel's rooms in cache
        const updatedHotels = this.hotels().map(hotel => {
          if (hotel.id === hotelId) {
            const rooms = hotel.rooms || [];
            return { ...hotel, rooms: [...rooms, newRoom] };
          }
          return hotel;
        });
        this.hotels.set(updatedHotels);

        return newRoom;
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Error creating room:', error);
        return of(undefined);
      })
    );
  }

  updateRoom(hotelId: string, roomId: string, updates: Partial<Room>): Observable<Room | undefined> {
    const updateDto: any = {};
    if (updates.roomType) {
      updateDto.type = this.mapRoomTypeToEnum(updates.roomType);
      updateDto.name = updates.roomType;
    }
    if (updates.pricePerNight) updateDto.price = updates.pricePerNight;
    if (updates.capacity) updateDto.capacity = updates.capacity;
    if (updates.amenities) updateDto.amenities = updates.amenities;
    if (updates.images) updateDto.images = updates.images;
    if (updates.available !== undefined) updateDto.isAvailable = updates.available;

    return this.http.patch<any>(`${this.API_URL}/rooms/${roomId}`, updateDto).pipe(
      map(response => {
        const updatedRoom = this.mapRoomFromApi(response);

        // Update the hotel's rooms in cache
        const updatedHotels = this.hotels().map(hotel => {
          if (hotel.id === hotelId && hotel.rooms) {
            const updatedRooms = hotel.rooms.map(room =>
              room.id === roomId ? updatedRoom : room
            );
            return { ...hotel, rooms: updatedRooms };
          }
          return hotel;
        });
        this.hotels.set(updatedHotels);

        return updatedRoom;
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Error updating room:', error);
        return of(undefined);
      })
    );
  }

  deleteRoom(hotelId: string, roomId: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/rooms/${roomId}`).pipe(
      tap(() => {
        // Update the hotel's rooms in cache
        const updatedHotels = this.hotels().map(hotel => {
          if (hotel.id === hotelId && hotel.rooms) {
            return {
              ...hotel,
              rooms: hotel.rooms.filter(room => room.id !== roomId)
            };
          }
          return hotel;
        });
        this.hotels.set(updatedHotels);
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Error deleting room:', error);
        throw error;
      })
    );
  }

  toggleRoomAvailability(hotelId: string, roomId: string): Observable<Room | undefined> {
    // First get current room state
    const hotel = this.hotels().find(h => h.id === hotelId);
    const room = hotel?.rooms?.find(r => r.id === roomId);

    if (!room) {
      return of(undefined);
    }

    return this.updateRoom(hotelId, roomId, { available: !room.available });
  }

  private mapRoomTypeToEnum(roomType: string): string {
    const typeMap: Record<string, string> = {
      'Standard': 'STANDARD',
      'Standard Room': 'STANDARD',
      'Deluxe': 'DELUXE',
      'Deluxe Room': 'DELUXE',
      'Suite': 'SUITE',
      'Presidential': 'PRESIDENTIAL',
      'Presidential Suite': 'PRESIDENTIAL'
    };

    return typeMap[roomType] || 'STANDARD';
  }

  // Add to favorites
  addToFavorites(hotelId: string): Observable<void> {
    return this.http.post<void>(`${this.API_URL}/hotels/${hotelId}/favorites`, {}).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Error adding to favorites:', error);
        throw error;
      })
    );
  }

  removeFromFavorites(hotelId: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/hotels/${hotelId}/favorites`).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Error removing from favorites:', error);
        throw error;
      })
    );
  }

  // Get hotel availability for date range
  getHotelAvailability(hotelId: string, checkIn: Date, checkOut: Date): Observable<any> {
    const params = new HttpParams()
      .set('checkIn', checkIn.toISOString())
      .set('checkOut', checkOut.toISOString());

    return this.http.get<any>(`${this.API_URL}/hotels/${hotelId}/availability`, { params }).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Error fetching availability:', error);
        return of({ available: true, rooms: [] });
      })
    );
  }
}
