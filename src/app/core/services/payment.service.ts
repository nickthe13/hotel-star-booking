import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { loadStripe, Stripe, StripeError } from '@stripe/stripe-js';
import { environment } from '../../../environments/environment';
import {
  PaymentTransaction,
  PaymentStatus,
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

  // Mock storage for development
  private mockPaymentMethods: SavedPaymentMethod[] = [];
  private mockTransactions: PaymentTransaction[] = [];

  private readonly API_URL = `${environment.apiUrl}/${environment.apiVersion}`;

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
    // In production, this would call the backend API:
    // return this.http.post<CreatePaymentIntentResponse>(`${this.API_URL}/payment/create-intent`, request);

    // Mock implementation for development
    const mockResponse: CreatePaymentIntentResponse = {
      clientSecret: `pi_mock_secret_${Date.now()}`,
      paymentIntentId: `pi_${Date.now()}`
    };

    return of(mockResponse);
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
    // In production:
    // return this.http.get<SavedPaymentMethod[]>(`${this.API_URL}/payment/methods`);

    // Mock implementation
    return of(this.mockPaymentMethods);
  }

  /**
   * Save payment method
   */
  savePaymentMethod(paymentMethodId: string, setAsDefault: boolean = false): Observable<SavedPaymentMethod> {
    // In production:
    // return this.http.post<SavedPaymentMethod>(`${this.API_URL}/payment/methods`, {
    //   paymentMethodId,
    //   setAsDefault
    // });

    // Mock implementation
    const newMethod: SavedPaymentMethod = {
      id: `pm_${Date.now()}`,
      userId: '1',
      stripePaymentMethodId: paymentMethodId,
      type: 'card',
      card: {
        brand: 'visa',
        last4: '4242',
        expMonth: 12,
        expYear: 2025
      },
      isDefault: setAsDefault || this.mockPaymentMethods.length === 0,
      createdAt: new Date()
    };

    // If setting as default, unset other defaults
    if (setAsDefault) {
      this.mockPaymentMethods.forEach(method => {
        method.isDefault = false;
      });
    }

    this.mockPaymentMethods.push(newMethod);
    return of(newMethod);
  }

  /**
   * Delete payment method
   */
  deletePaymentMethod(id: string): Observable<void> {
    // In production:
    // return this.http.delete<void>(`${this.API_URL}/payment/methods/${id}`);

    // Mock implementation
    this.mockPaymentMethods = this.mockPaymentMethods.filter(method => method.id !== id);
    return of(void 0);
  }

  /**
   * Set default payment method
   */
  setDefaultPaymentMethod(id: string): Observable<void> {
    // In production:
    // return this.http.patch<void>(`${this.API_URL}/payment/methods/${id}/default`, {});

    // Mock implementation
    this.mockPaymentMethods.forEach(method => {
      method.isDefault = method.id === id;
    });
    return of(void 0);
  }

  /**
   * Get user's payment history
   */
  getUserPaymentHistory(): Observable<PaymentTransaction[]> {
    // In production:
    // return this.http.get<PaymentTransaction[]>(`${this.API_URL}/payment/history`);

    // Mock implementation
    return of(this.mockTransactions.filter(tx => tx.userId === '1'));
  }

  /**
   * Get payment transaction by ID
   */
  getPaymentTransaction(id: string): Observable<PaymentTransaction> {
    // In production:
    // return this.http.get<PaymentTransaction>(`${this.API_URL}/payment/transaction/${id}`);

    // Mock implementation
    const transaction = this.mockTransactions.find(tx => tx.id === id);
    if (!transaction) {
      return throwError(() => new Error('Transaction not found'));
    }
    return of(transaction);
  }

  /**
   * Process refund (admin only)
   */
  processRefund(request: RefundRequest): Observable<RefundResponse> {
    // In production:
    // return this.http.post<RefundResponse>(`${this.API_URL}/payment/refund`, request);

    // Mock implementation
    const transaction = this.mockTransactions.find(
      tx => tx.id === request.paymentTransactionId
    );

    if (!transaction) {
      return throwError(() => new Error('Transaction not found'));
    }

    if (transaction.status !== PaymentStatus.SUCCEEDED) {
      return throwError(() => new Error('Can only refund successful payments'));
    }

    const refundAmount = request.amount || transaction.amount;

    // Update transaction
    transaction.status = request.amount && request.amount < transaction.amount
      ? PaymentStatus.PARTIALLY_REFUNDED
      : PaymentStatus.REFUNDED;
    transaction.refundedAt = new Date();
    transaction.refundAmount = refundAmount;
    transaction.refundReason = request.reason;
    transaction.updatedAt = new Date();

    const response: RefundResponse = {
      refundId: `re_${Date.now()}`,
      amount: refundAmount,
      status: 'succeeded'
    };

    return of(response);
  }

  /**
   * Create mock transaction (for testing)
   */
  createMockTransaction(transaction: Partial<PaymentTransaction>): PaymentTransaction {
    const newTransaction: PaymentTransaction = {
      id: transaction.id || `txn_${Date.now()}`,
      bookingId: transaction.bookingId || '',
      userId: transaction.userId || '1',
      amount: transaction.amount || 0,
      currency: transaction.currency || 'usd',
      status: transaction.status || PaymentStatus.SUCCEEDED,
      stripePaymentIntentId: transaction.stripePaymentIntentId || `pi_${Date.now()}`,
      createdAt: transaction.createdAt || new Date(),
      updatedAt: transaction.updatedAt || new Date(),
      metadata: transaction.metadata
    };

    this.mockTransactions.push(newTransaction);
    return newTransaction;
  }

  /**
   * Get mock transactions (for development)
   */
  getMockTransactions(): PaymentTransaction[] {
    return this.mockTransactions;
  }
}
