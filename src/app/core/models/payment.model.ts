export interface PaymentTransaction {
  id: string;
  bookingId: string;
  userId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  stripePaymentIntentId: string;
  stripeChargeId?: string;
  paymentMethod?: SavedPaymentMethodInfo;
  createdAt: Date;
  updatedAt: Date;
  refundedAt?: Date;
  refundAmount?: number;
  refundReason?: string;
  failureReason?: string;
  metadata?: {
    hotelName?: string;
    roomType?: string;
    checkIn?: string;
    checkOut?: string;
  };
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
  CANCELLED = 'cancelled'
}

export interface SavedPaymentMethod {
  id: string;
  userId: string;
  stripePaymentMethodId: string;
  type: 'card';
  card: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  isDefault: boolean;
  createdAt: Date;
}

export interface SavedPaymentMethodInfo {
  id: string;
  type: 'card';
  last4: string;
  brand: string;
}

export interface CreatePaymentIntentRequest {
  amount: number;
  currency: string;
  bookingId?: string;
  savePaymentMethod?: boolean;
  paymentMethodId?: string;
  metadata?: Record<string, string>;
}

export interface CreatePaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
}

export interface ConfirmPaymentRequest {
  paymentIntentId: string;
  bookingId: string;
}

export interface RefundRequest {
  paymentTransactionId: string;
  amount?: number;
  reason?: string;
}

export interface RefundResponse {
  refundId: string;
  amount: number;
  status: string;
}

export interface PaymentResult {
  success: boolean;
  paymentIntentId?: string;
  error?: string;
}
