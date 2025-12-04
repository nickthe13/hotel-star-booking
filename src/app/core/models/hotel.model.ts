export interface Hotel {
  id: string;
  name: string;
  description: string;
  location: string;
  city: string;
  country: string;
  starRating: number;
  images: string[];
  amenities: string[];
  pricePerNight: number;
  featured: boolean;
  createdAt: Date;
  rooms?: Room[];
  reviews?: Review[];
  averageRating?: number;
  totalReviews?: number;
}

export interface Room {
  id: string;
  hotelId: string;
  roomType: string;
  capacity: number;
  pricePerNight: number;
  amenities: string[];
  images: string[];
  available: boolean;
}

export interface Review {
  id: string;
  userId: string;
  hotelId: string;
  rating: number;
  comment: string;
  createdAt: Date;
  userName?: string;
  userAvatar?: string;
}

export interface HotelFilters {
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  starRating?: number;
  amenities?: string[];
  propertyType?: string;
  guestRating?: number;
}

export interface HotelSearchParams extends HotelFilters {
  query?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  sortBy?: 'price' | 'rating' | 'popularity';
  sortOrder?: 'asc' | 'desc';
}
