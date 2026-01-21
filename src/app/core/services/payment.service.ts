import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { loadStripe, Stripe, StripeError } from '@stripe/stripe-js';
import { environment } from '../../../environments/environment';
import {
  PaymentTransaction,
  SavedPaymentMethod,
  CreatePaymentIntentRequest,
  CreatePaymentIntentResponse,
  RefundRequest,
  RefundResponse,
  PaymentResult
} from '../models/payment.model';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private stripe: Stripe | null = null;
  private stripeLoaded = signal<boolean>(false);

  private readonly API_URL = environment.apiUrl;

  constructor(private http: HttpClient) {
    this.initializeStripe();
  }

  /**
   * Initialize Stripe SDK
   */
  private async initializeStripe(): Promise<void> {
    try {
      console.log('Initializing Stripe with key:', environment.stripePublishableKey.substring(0, 20) + '...');
      this.stripe = await loadStripe(environment.stripePublishableKey);
      this.stripeLoaded.set(true);
      console.log('Stripe loaded successfully:', !!this.stripe);
    } catch (error) {
      console.error('Failed to load Stripe:', error);
      this.stripeLoaded.set(false);
    }
  }

  /**
   * Get Stripe instance
   */
  async getStripe(): Promise<Stripe | null> {
    if (!this.stripe && !this.stripeLoaded()) {
      await this.initializeStripe();
    }
    return this.stripe;
  }

  /**
   * Create payment intent
   */
  createPaymentIntent(request: CreatePaymentIntentRequest): Observable<CreatePaymentIntentResponse> {
    return this.http.post<CreatePaymentIntentResponse>(`${this.API_URL}/payments/create-intent`, request);
  }

  /**
   * Confirm payment with Stripe
   */
  async confirmPayment(
    clientSecret: string,
    paymentMethodId?: string
  ): Promise<PaymentResult> {
    try {
      const stripe = await this.getStripe();
      if (!stripe) {
        return {
          success: false,
          error: 'Stripe not initialized'
        };
      }

      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: paymentMethodId
      });

      if (result.error) {
        return {
          success: false,
          error: this.getUserFriendlyErrorMessage(result.error)
        };
      }

      if (result.paymentIntent?.status === 'succeeded') {
        // Notify backend about successful payment
        try {
          await this.http.post(`${this.API_URL}/payments/confirm`, {
            paymentIntentId: result.paymentIntent.id,
            paymentMethodId: result.paymentIntent.payment_method
          }).toPromise();
        } catch (err) {
          console.error('Failed to confirm payment with backend:', err);
        }

        return {
          success: true,
          paymentIntentId: result.paymentIntent.id
        };
      }

      return {
        success: false,
        error: 'Payment was not successful'
      };
    } catch (error) {
      console.error('Payment confirmation error:', error);
      return {
        success: false,
        error: 'An unexpected error occurred'
      };
    }
  }

  /**
   * Get user-friendly error message from Stripe error
   */
  private getUserFriendlyErrorMessage(error: StripeError): string {
    switch (error.type) {
      case 'card_error':
        return error.message || 'Your card was declined. Please try another payment method.';
      case 'validation_error':
        return 'Please check your card details and try again.';
      case 'api_error':
      case 'api_connection_error':
        return 'Unable to process payment. Please try again.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  /**
   * Get user's saved payment methods
   */
  getUserPaymentMethods(): Observable<SavedPaymentMethod[]> {
    return this.http.get<SavedPaymentMethod[]>(`${this.API_URL}/payments/saved-methods`);
  }

  /**
   * Save payment method
   * Note: Backend endpoint not yet implemented
   */
  savePaymentMethod(_paymentMethodId: string, _setAsDefault: boolean = false): Observable<SavedPaymentMethod> {
    console.warn('savePaymentMethod: Backend endpoint not implemented');
    return throwError(() => new Error('Saving payment methods is not yet supported'));
  }

  /**
   * Delete payment method
   * Note: Backend endpoint not yet implemented
   */
  deletePaymentMethod(_id: string): Observable<void> {
    console.warn('deletePaymentMethod: Backend endpoint not implemented');
    return throwError(() => new Error('Deleting payment methods is not yet supported'));
  }

  /**
   * Set default payment method
   * Note: Backend endpoint not yet implemented
   */
  setDefaultPaymentMethod(_id: string): Observable<void> {
    console.warn('setDefaultPaymentMethod: Backend endpoint not implemented');
    return throwError(() => new Error('Setting default payment method is not yet supported'));
  }

  /**
   * Get user's payment history
   */
  getUserPaymentHistory(): Observable<PaymentTransaction[]> {
    return this.http.get<PaymentTransaction[]>(`${this.API_URL}/payments/history`);
  }

  /**
   * Get payment transaction by ID
   * Note: Backend endpoint not yet implemented
   */
  getPaymentTransaction(_id: string): Observable<PaymentTransaction> {
    console.warn('getPaymentTransaction: Backend endpoint not implemented');
    return throwError(() => new Error('Getting individual transaction is not yet supported'));
  }

  /**
   * Process refund (admin only)
   */
  processRefund(request: RefundRequest): Observable<RefundResponse> {
    return this.http.post<RefundResponse>(`${this.API_URL}/payments/refund`, {
      paymentIntentId: request.paymentTransactionId,
      amount: request.amount,
      reason: request.reason
    });
  }

}
