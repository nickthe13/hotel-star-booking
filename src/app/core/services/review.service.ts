import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Review } from '../models/hotel.model';
import { AuthService } from './auth.service';
import { HotelService } from './hotel.service';

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
  private readonly API_URL = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private hotelService: HotelService
  ) {}

  private mapReviewFromApi(apiReview: any): Review {
    return {
      id: apiReview.id,
      hotelId: apiReview.hotelId,
      userId: apiReview.userId,
      userName: apiReview.user?.name || 'Anonymous',
      rating: apiReview.rating,
      comment: apiReview.comment || '',
      createdAt: new Date(apiReview.createdAt)
    };
  }

  createReview(reviewData: CreateReviewDto): Observable<Review> {
    const user = this.authService.user();
    if (!user) {
      return throwError(() => new Error('User not authenticated'));
    }

    return this.http.post<any>(`${this.API_URL}/reviews`, {
      hotelId: reviewData.hotelId,
      rating: reviewData.rating,
      comment: reviewData.comment
    }).pipe(
      map(response => this.mapReviewFromApi(response)),
      tap(review => {
        // Update hotel rating in cache after creating review
        this.refreshHotelRating(review.hotelId);
      }),
      catchError((error: HttpErrorResponse) => {
        const message = error.error?.message || 'Failed to create review';
        return throwError(() => new Error(message));
      })
    );
  }

  getAllReviews(hotelId?: string): Observable<Review[]> {
    let params = new HttpParams();
    if (hotelId) {
      params = params.set('hotelId', hotelId);
    }

    return this.http.get<any[]>(`${this.API_URL}/reviews`, { params }).pipe(
      map(response => response.map(r => this.mapReviewFromApi(r))),
      catchError((error: HttpErrorResponse) => {
        console.error('Error fetching reviews:', error);
        return of([]);
      })
    );
  }

  getHotelReviews(hotelId: string): Observable<Review[]> {
    return this.http.get<any[]>(`${this.API_URL}/reviews`, {
      params: new HttpParams().set('hotelId', hotelId)
    }).pipe(
      map(response => response.map(r => this.mapReviewFromApi(r))),
      catchError((error: HttpErrorResponse) => {
        console.error('Error fetching hotel reviews:', error);
        return of([]);
      })
    );
  }

  getUserReview(hotelId: string): Observable<Review | null> {
    const user = this.authService.user();
    if (!user) {
      return of(null);
    }

    return this.getHotelReviews(hotelId).pipe(
      map(reviews => {
        const userReview = reviews.find(r => r.userId === user.id);
        return userReview || null;
      })
    );
  }

  getReviewById(id: string): Observable<Review> {
    return this.http.get<any>(`${this.API_URL}/reviews/${id}`).pipe(
      map(response => this.mapReviewFromApi(response)),
      catchError((error: HttpErrorResponse) => {
        const message = error.error?.message || 'Review not found';
        return throwError(() => new Error(message));
      })
    );
  }

  updateReview(id: string, reviewData: UpdateReviewDto): Observable<Review> {
    return this.http.patch<any>(`${this.API_URL}/reviews/${id}`, reviewData).pipe(
      map(response => this.mapReviewFromApi(response)),
      tap(review => {
        // Update hotel rating in cache after updating review
        this.refreshHotelRating(review.hotelId);
      }),
      catchError((error: HttpErrorResponse) => {
        const message = error.error?.message || 'Failed to update review';
        return throwError(() => new Error(message));
      })
    );
  }

  deleteReview(id: string): Observable<{ message: string }> {
    return this.http.delete<any>(`${this.API_URL}/reviews/${id}`).pipe(
      map(() => ({ message: 'Review deleted successfully' })),
      catchError((error: HttpErrorResponse) => {
        const message = error.error?.message || 'Failed to delete review';
        return throwError(() => new Error(message));
      })
    );
  }

  private refreshHotelRating(hotelId: string): void {
    // Fetch updated hotel data to refresh the rating
    this.getHotelReviews(hotelId).subscribe(reviews => {
      if (reviews.length > 0) {
        const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
        const averageRating = totalRating / reviews.length;
        this.hotelService.updateHotelRating(hotelId, averageRating, reviews.length);
      }
    });
  }
}
