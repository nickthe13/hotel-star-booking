import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Review } from '../models/hotel.model';
import { AuthService } from './auth.service';

export interface CreateReviewDto {
  hotelId: string;
  rating: number;
  comment?: string;
}

export interface UpdateReviewDto {
  rating?: number;
  comment?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReviewService {
  private apiUrl = `${environment.apiUrl}/reviews`;

  // Mock reviews data for demo
  private mockReviews: Review[] = [
    {
      id: 'rev_1',
      hotelId: '1',
      userId: 'user_2',
      userName: 'Sarah Johnson',
      rating: 5,
      comment: 'Absolutely wonderful stay! The staff was incredibly friendly and the room was spotless. The location is perfect for exploring the city. Will definitely come back!',
      createdAt: new Date('2025-12-15')
    },
    {
      id: 'rev_2',
      hotelId: '1',
      userId: 'user_3',
      userName: 'Michael Chen',
      rating: 4,
      comment: 'Great hotel with excellent amenities. The breakfast buffet was amazing. Only minor issue was the noise from the street at night.',
      createdAt: new Date('2025-12-10')
    },
    {
      id: 'rev_3',
      hotelId: '2',
      userId: 'user_4',
      userName: 'Emily Davis',
      rating: 5,
      comment: 'Perfect beachfront location! The ocean view from our room was breathtaking. The pool area is fantastic for families.',
      createdAt: new Date('2025-12-08')
    },
    {
      id: 'rev_4',
      hotelId: '3',
      userId: 'user_5',
      userName: 'Robert Wilson',
      rating: 4,
      comment: 'Lovely boutique hotel with great character. The rooftop bar has stunning views. Rooms are a bit small but very cozy.',
      createdAt: new Date('2025-12-05')
    },
    {
      id: 'rev_5',
      hotelId: '4',
      userId: 'user_6',
      userName: 'Jennifer Martinez',
      rating: 5,
      comment: 'The seaside resort exceeded all expectations! Beautiful grounds, excellent service, and the spa was divine. Highly recommend the sunset dinner cruise.',
      createdAt: new Date('2025-12-20')
    },
    {
      id: 'rev_6',
      hotelId: '4',
      userId: 'user_7',
      userName: 'David Thompson',
      rating: 4,
      comment: 'Great resort for a relaxing getaway. The private beach is pristine. Food options could be more varied but overall excellent.',
      createdAt: new Date('2025-12-18')
    },
    {
      id: 'rev_7',
      hotelId: '5',
      userId: 'user_8',
      userName: 'Amanda Brown',
      rating: 5,
      comment: 'Luxury at its finest! Every detail was perfect. The concierge went above and beyond to make our anniversary special.',
      createdAt: new Date('2025-12-12')
    }
  ];

  private nextReviewId = 8;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  /**
   * Create a new review
   */
  createReview(reviewData: CreateReviewDto): Observable<Review> {
    // In production:
    // return this.http.post<Review>(this.apiUrl, reviewData);

    // Mock implementation
    const user = this.authService.user();
    if (!user) {
      return throwError(() => new Error('User not authenticated'));
    }

    const newReview: Review = {
      id: `rev_${this.nextReviewId++}`,
      hotelId: reviewData.hotelId,
      userId: user.id,
      userName: user.name,
      rating: reviewData.rating,
      comment: reviewData.comment || '',
      createdAt: new Date()
    };

    this.mockReviews.unshift(newReview);
    return of(newReview).pipe(delay(300));
  }

  /**
   * Get all reviews (optionally filtered by hotel)
   */
  getAllReviews(hotelId?: string): Observable<Review[]> {
    // In production:
    // let params = new HttpParams();
    // if (hotelId) {
    //   params = params.set('hotelId', hotelId);
    // }
    // return this.http.get<Review[]>(this.apiUrl, { params });

    // Mock implementation
    let reviews = [...this.mockReviews];
    if (hotelId) {
      reviews = reviews.filter(r => r.hotelId === hotelId);
    }
    return of(reviews).pipe(delay(200));
  }

  /**
   * Get all reviews for a specific hotel
   */
  getHotelReviews(hotelId: string): Observable<Review[]> {
    // In production:
    // return this.http.get<Review[]>(`${this.apiUrl}/hotel/${hotelId}`);

    // Mock implementation
    const reviews = this.mockReviews.filter(r => r.hotelId === hotelId);
    return of(reviews).pipe(delay(200));
  }

  /**
   * Get current user's review for a specific hotel
   */
  getUserReview(hotelId: string): Observable<Review | null> {
    // In production:
    // return this.http.get<Review | null>(`${this.apiUrl}/user/${hotelId}`);

    // Mock implementation
    const user = this.authService.user();
    if (!user) {
      return of(null);
    }

    const review = this.mockReviews.find(
      r => r.hotelId === hotelId && r.userId === user.id
    );
    return of(review || null).pipe(delay(100));
  }

  /**
   * Get a specific review by ID
   */
  getReviewById(id: string): Observable<Review> {
    // In production:
    // return this.http.get<Review>(`${this.apiUrl}/${id}`);

    // Mock implementation
    const review = this.mockReviews.find(r => r.id === id);
    if (!review) {
      return throwError(() => new Error('Review not found'));
    }
    return of(review).pipe(delay(100));
  }

  /**
   * Update a review
   */
  updateReview(id: string, reviewData: UpdateReviewDto): Observable<Review> {
    // In production:
    // return this.http.patch<Review>(`${this.apiUrl}/${id}`, reviewData);

    // Mock implementation
    const index = this.mockReviews.findIndex(r => r.id === id);
    if (index === -1) {
      return throwError(() => new Error('Review not found'));
    }

    const updatedReview: Review = {
      ...this.mockReviews[index],
      ...reviewData
    };
    this.mockReviews[index] = updatedReview;

    return of(updatedReview).pipe(delay(300));
  }

  /**
   * Delete a review
   */
  deleteReview(id: string): Observable<{ message: string }> {
    // In production:
    // return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);

    // Mock implementation
    const index = this.mockReviews.findIndex(r => r.id === id);
    if (index === -1) {
      return throwError(() => new Error('Review not found'));
    }

    this.mockReviews.splice(index, 1);
    return of({ message: 'Review deleted successfully' }).pipe(delay(200));
  }

  /**
   * Get mock reviews (for admin)
   */
  getMockReviews(): Review[] {
    return [...this.mockReviews];
  }
}
