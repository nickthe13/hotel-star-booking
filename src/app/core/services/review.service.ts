import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Review } from '../models/hotel.model';

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

  constructor(private http: HttpClient) {}

  /**
   * Create a new review
   */
  createReview(reviewData: CreateReviewDto): Observable<Review> {
    return this.http.post<Review>(this.apiUrl, reviewData);
  }

  /**
   * Get all reviews (optionally filtered by hotel)
   */
  getAllReviews(hotelId?: string): Observable<Review[]> {
    let params = new HttpParams();
    if (hotelId) {
      params = params.set('hotelId', hotelId);
    }
    return this.http.get<Review[]>(this.apiUrl, { params });
  }

  /**
   * Get all reviews for a specific hotel
   */
  getHotelReviews(hotelId: string): Observable<Review[]> {
    return this.http.get<Review[]>(`${this.apiUrl}/hotel/${hotelId}`);
  }

  /**
   * Get current user's review for a specific hotel
   */
  getUserReview(hotelId: string): Observable<Review | null> {
    return this.http.get<Review | null>(`${this.apiUrl}/user/${hotelId}`);
  }

  /**
   * Get a specific review by ID
   */
  getReviewById(id: string): Observable<Review> {
    return this.http.get<Review>(`${this.apiUrl}/${id}`);
  }

  /**
   * Update a review
   */
  updateReview(id: string, reviewData: UpdateReviewDto): Observable<Review> {
    return this.http.patch<Review>(`${this.apiUrl}/${id}`, reviewData);
  }

  /**
   * Delete a review
   */
  deleteReview(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }
}
