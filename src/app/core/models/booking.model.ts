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
}

export enum BookingStatus {
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
}
