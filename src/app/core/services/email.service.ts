import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EmailService {
  private readonly API_URL = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Send payment receipt email
   */
  sendPaymentReceipt(bookingId: string, transactionId: string): Observable<void> {
    // In production:
    // return this.http.post<void>(`${this.API_URL}/email/receipt`, {
    //   bookingId,
    //   transactionId
    // });

    // Mock implementation - simulate API call
    console.log(`📧 Sending payment receipt for booking ${bookingId}, transaction ${transactionId}`);
    return of(void 0).pipe(delay(500));
  }

  /**
   * Send booking confirmation email
   */
  sendBookingConfirmation(bookingId: string): Observable<void> {
    // In production:
    // return this.http.post<void>(`${this.API_URL}/email/booking-confirmation`, {
    //   bookingId
    // });

    // Mock implementation
    console.log(`📧 Sending booking confirmation for booking ${bookingId}`);
    return of(void 0).pipe(delay(500));
  }

  /**
   * Send refund notification email
   */
  sendRefundNotification(bookingId: string, refundId: string): Observable<void> {
    // In production:
    // return this.http.post<void>(`${this.API_URL}/email/refund-notification`, {
    //   bookingId,
    //   refundId
    // });

    // Mock implementation
    console.log(`📧 Sending refund notification for booking ${bookingId}, refund ${refundId}`);
    return of(void 0).pipe(delay(500));
  }

  /**
   * Send cancellation confirmation email
   */
  sendCancellationConfirmation(bookingId: string): Observable<void> {
    // In production:
    // return this.http.post<void>(`${this.API_URL}/email/cancellation-confirmation`, {
    //   bookingId
    // });

    // Mock implementation
    console.log(`📧 Sending cancellation confirmation for booking ${bookingId}`);
    return of(void 0).pipe(delay(500));
  }
}
