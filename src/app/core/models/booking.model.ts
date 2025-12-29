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
  // Loyalty fields
  pointsEarned?: number;
  pointsRedeemed?: number;
  discountFromPoints?: number;
}

export enum BookingStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CHECKED_IN = 'CHECKED_IN',
  CHECKED_OUT = 'CHECKED_OUT',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  NO_SHOW = 'NO_SHOW'
}

export interface BookingRequest {
  hotelId: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  specialRequests?: string;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
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
