import { PaymentStatus, SavedPaymentMethodInfo, PaymentTransaction } from './payment.model';

export interface Booking {
  id: string;
  userId: string;
  hotelId: string;
  roomId: string;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  totalPrice: number;
  status: BookingStatus;
  specialRequests?: string;
  createdAt: Date;
  hotel?: {
    name: string;
    image: string;
    location: string;
  };
  room?: {
    roomType: string;
  };
  paymentTransactionId?: string;
  stripePaymentIntentId?: string;
  paymentStatus?: PaymentStatus;
  paymentMethod?: SavedPaymentMethodInfo;
  isPaid?: boolean;
  paidAt?: Date;
  refundedAt?: Date;
  refundAmount?: number;
}

export enum BookingStatus {
  PENDING_PAYMENT = 'pending_payment',
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed'
}

export interface BookingRequest {
  hotelId: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  specialRequests?: string;
}

export interface BookingConfirmation {
  booking: Booking;
  confirmationNumber: string;
  estimatedCheckInTime: string;
  message: string;
  paymentTransaction?: PaymentTransaction;
  requiresPayment?: boolean;
}

export interface CancelBookingResult {
  booking: Booking;
  refund?: {
    refundId: string;
    amount: number;
    status: string;
  };
  message: string;
}
